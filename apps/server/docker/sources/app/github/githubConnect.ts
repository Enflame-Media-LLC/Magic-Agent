import { db } from "@/storage/db";
import { Context } from "@/context";
import { encryptString } from "@/modules/encrypt";
import { uploadImage } from "@/storage/uploadImage";
import { separateName } from "@/utils/separateName";
import { GitHubProfile } from "@/app/api/types";
import { allocateUserSeq } from "@/storage/seq";
import { buildUpdateAccountUpdate, eventRouter } from "@/app/events/eventRouter";
import { randomKeyNaked } from "@/utils/randomKeyNaked";
import { githubDisconnect } from "./githubDisconnect";

// SSRF guardrails for the server-side avatar fetch: only GitHub's avatar CDN
// over HTTPS is allowed, and the download is bounded in time and size.
const ALLOWED_AVATAR_HOSTS = new Set(['avatars.githubusercontent.com']);
const AVATAR_FETCH_TIMEOUT_MS = 10_000;
const AVATAR_MAX_SIZE_BYTES = 5 * 1024 * 1024;

/**
 * Connects a GitHub account to a user profile.
 * 
 * Flow:
 * 1. Check if already connected to same account - early exit if yes
 * 2. If GitHub account is connected to another user - disconnect it first
 * 3. Upload avatar to S3 (non-transactional operation)
 * 4. In transaction: persist GitHub account and link to user with GitHub username
 * 5. Send socket update after transaction completes
 * 
 * @param ctx - Request context containing user ID
 * @param githubProfile - GitHub profile data from OAuth
 * @param accessToken - GitHub access token for API access
 */
export async function githubConnect(
    ctx: Context,
    githubProfile: GitHubProfile,
    accessToken: string
): Promise<void> {
    const userId = ctx.uid;

    // Validate externally-sourced profile fields before they reach database queries.
    // The GitHub API response is cast without runtime validation, so enforce the
    // expected scalar types here to block query-operator object injection.
    if (typeof githubProfile.id !== 'number' || typeof githubProfile.login !== 'string' || typeof githubProfile.avatar_url !== 'string') {
        throw new Error('Invalid GitHub profile data');
    }

    const githubUserId = githubProfile.id.toString();

    // Step 1: Check if user is already connected to this exact GitHub account
    const currentUser = await db.account.findFirstOrThrow({
        where: { id: userId },
        select: { githubUserId: true, username: true }
    });
    if (currentUser.githubUserId === githubUserId) {
        return;
    }

    // Step 2: Check if GitHub account is connected to another user
    const existingConnection = await db.account.findFirst({
        where: {
            githubUserId: githubUserId,
            NOT: { id: userId }
        }
    });
    if (existingConnection) {
        const disconnectCtx: Context = Context.create(existingConnection.id);
        await githubDisconnect(disconnectCtx);
    }

    // Step 3: Upload avatar to S3 (outside transaction for performance)
    // Enforce a URL policy before fetching: the avatar_url value is externally
    // sourced, so require HTTPS and an allowlisted GitHub avatar host, and use
    // a bounded fetch (no redirects, timeout, response-size cap).
    const avatarUrl = new URL(githubProfile.avatar_url);
    if (avatarUrl.protocol !== 'https:' || !ALLOWED_AVATAR_HOSTS.has(avatarUrl.hostname)) {
        throw new Error('Invalid GitHub avatar URL');
    }
    const imageResponse = await fetch(avatarUrl, {
        redirect: 'error',
        signal: AbortSignal.timeout(AVATAR_FETCH_TIMEOUT_MS)
    });
    if (!imageResponse.ok) {
        throw new Error('Failed to fetch GitHub avatar');
    }
    const contentLength = Number(imageResponse.headers.get('content-length'));
    if (Number.isFinite(contentLength) && contentLength > AVATAR_MAX_SIZE_BYTES) {
        throw new Error('GitHub avatar exceeds size limit');
    }
    const imageBuffer = await imageResponse.arrayBuffer();
    if (imageBuffer.byteLength > AVATAR_MAX_SIZE_BYTES) {
        throw new Error('GitHub avatar exceeds size limit');
    }
    const avatar = await uploadImage(userId, 'avatars', 'github', githubProfile.avatar_url, Buffer.from(imageBuffer));

    // Extract name from GitHub profile
    const name = separateName(githubProfile.name);

    // Step 4: Start transaction for atomic database operations
    await db.$transaction(async (tx) => {

        // Upsert GitHub user record with encrypted token
        await tx.githubUser.upsert({
            where: { id: githubUserId },
            update: {
                profile: githubProfile,
                token: encryptString(['user', userId, 'github', 'token'], accessToken)
            },
            create: {
                id: githubUserId,
                profile: githubProfile,
                token: encryptString(['user', userId, 'github', 'token'], accessToken)
            }
        });

        // Link GitHub account to user
        await tx.account.update({
            where: { id: userId },
            data: {
                githubUserId: githubUserId,
                username: githubProfile.login,
                firstName: name.firstName,
                lastName: name.lastName,
                avatar: avatar
            }
        });

        // Link any existing GitHub App installations for this GitHub user to their Happy account
        await tx.githubInstallation.updateMany({
            where: {
                accountLogin: githubProfile.login,
                accountType: 'User',
                accountId: null
            },
            data: {
                accountId: userId
            }
        });
    });

    // Step 5: Send update via socket (after transaction completes)
    const updSeq = await allocateUserSeq(userId);
    const updatePayload = buildUpdateAccountUpdate(userId, {
        github: githubProfile,
        username: githubProfile.login,
        firstName: name.firstName,
        lastName: name.lastName,
        avatar: avatar
    }, updSeq, randomKeyNaked(12));

    eventRouter.emitUpdate({
        userId,
        payload: updatePayload,
        recipientFilter: { type: 'user-scoped-only' }
    });
}