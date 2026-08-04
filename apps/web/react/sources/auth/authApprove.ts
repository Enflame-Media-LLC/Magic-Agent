import axios from 'axios';
import { encodeBase64 } from "../encryption/base64";
import { getServerUrl } from "@/sync/serverConfig";
import { logger } from '@/utils/logger';

interface AuthRequestStatus {
    status: 'not_found' | 'pending' | 'authorized';
    supportsV2: boolean;
}

export async function authApprove(token: string, publicKey: Uint8Array, answerV1: Uint8Array, answerV2: Uint8Array) {
    const API_ENDPOINT = getServerUrl();
    const publicKeyBase64 = encodeBase64(publicKey);
    
    // First, check the auth request status
    const statusResponse = await axios.get<AuthRequestStatus>(
        `${API_ENDPOINT}/v1/auth/request/status`,
        {
            params: {
                publicKey: publicKeyBase64
            },
            headers: {
                'Authorization': `Bearer ${token}`,
            }
        }
    );
    
    const { status, supportsV2 } = statusResponse.data;
    
    // Only a pending request can be approved for the current authenticated user.
    if (status === 'not_found') {
        logger.debug('[authApprove] Auth request not found');
        throw new Error('Terminal auth request not found. Please generate a new QR code and try again.');
    }

    if (status === 'authorized') {
        logger.debug('[authApprove] Auth request already authorized');
        throw new Error('Terminal auth request is already authorized. Please generate a new QR code and try again.');
    }
    
    // Handle pending status
    if (status === 'pending') {
        await axios.post(`${API_ENDPOINT}/v1/auth/response`, {
            publicKey: publicKeyBase64,
            response: supportsV2 ? encodeBase64(answerV2) : encodeBase64(answerV1)
        }, {
            headers: {
                'Authorization': `Bearer ${token}`,
            }
        });
    }
}