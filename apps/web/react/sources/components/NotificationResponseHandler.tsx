/**
 * NotificationResponseHandler
 *
 * Handles navigation when user taps on push notifications.
 * This component is ONLY rendered on native platforms (iOS/Android) because
 * useLastNotificationResponse hook calls native methods that don't exist on web.
 *
 * Handles three scenarios:
 * - Foreground: app is active when notification is tapped
 * - Background: app is backgrounded when notification is tapped
 * - Cold start: app was killed and launched by tapping notification
 */
import * as React from 'react';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { isValidOpaqueSessionId } from '@/utils/sessionId';

interface NotificationResponseHandlerProps {
    /** Whether the app has finished initializing - navigation only occurs after init */
    isInitialized: boolean;
}

export function NotificationResponseHandler({ isInitialized }: NotificationResponseHandlerProps) {
    const lastNotificationResponse = Notifications.useLastNotificationResponse();

    React.useEffect(() => {
        if (!isInitialized || !lastNotificationResponse) {
            return;
        }
        // Only handle default tap action (not custom action buttons)
        if (lastNotificationResponse.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) {
            return;
        }
        // Cast to expected notification data shape from CLI
        // Format: { screen: 'session', params: { id: sessionId } }
        const data = lastNotificationResponse.notification.request.content.data as {
            screen?: string;
            params?: { id?: string };
        };
        // Navigate to session if notification contains valid session screen data.
        // Notification payloads are untrusted, so keep the id constrained to the
        // expected opaque session-id formats before using it as a route param.
        if (data?.screen === 'session') {
            const sessionId = data.params?.id;
            if (isValidOpaqueSessionId(sessionId)) {
                router.push({
                    pathname: '/(app)/session/[id]',
                    params: { id: sessionId },
                });
            }
            // Clear the response so we don't navigate again on re-renders.
            Notifications.clearLastNotificationResponseAsync();
        }
    }, [isInitialized, lastNotificationResponse]);

    // This component renders nothing - it's purely for side effects
    return null;
}
