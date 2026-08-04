/**
 * Auth Composable
 *
 * Vue composable for managing authentication and CLI connection flows.
 * Provides reactive state and actions for QR-based authentication.
 *
 * Features:
 * - Real keypair generation for secure key exchange
 * - Challenge-response authentication flow
 * - CLI connection approval with proper encryption
 * - Error handling with user-friendly messages
 *
 * @example
 * ```vue
 * <script setup>
 * import { useAuth } from '@/composables/useAuth';
 *
 * const { connectToCli, isConnecting, error } = useAuth();
 *
 * async function handleScan(qrData: string) {
 *   const result = await connectToCli(qrData);
 *   if (result.success) {
 *     // Connection established
 *   }
 * }
 * </script>
 * ```
 *
 * @see HAP-814 - Implement real QR connection logic in mobile auth
 */

import { ref, computed } from "vue";
import { useAuthStore } from "@/stores/auth";
import {
  parseConnectionCode,
  approveCliConnection,
  formatTerminalFingerprint,
  authenticateWithSecretKey,
  createAuthSession,
  CliApprovalError,
  CliConnectionError,
  type CliConnectionErrorCode,
} from "@/services/auth";
import type { StoredCredentials } from "@/services/storage";

/**
 * Connection result with typed error codes
 */
export interface ConnectionResult {
  success: boolean;
  errorCode?:
    | CliConnectionErrorCode
    | "parse_error"
    | "not_authenticated"
    | "cancelled"
    | "unknown";
  errorMessage?: string;
}

/**
 * Auth session state for QR-based web authentication
 */
export interface AuthSessionState {
  qrData: string;
  waitForAuth: (
    onProgress?: (dots: number) => void,
    shouldCancel?: () => boolean,
  ) => Promise<StoredCredentials | null>;
}

/**
 * Composable for authentication and CLI connection management.
 *
 * @returns Auth state and control functions
 */
export function useAuth() {
  const authStore = useAuthStore();

  // ─────────────────────────────────────────────────────────────────────────
  // State
  // ─────────────────────────────────────────────────────────────────────────

  /** Whether a connection attempt is in progress */
  const isConnecting = ref(false);

  /** Current error message, if any */
  const errorMessage = ref<string | null>(null);

  /** Current error code, if any */
  const errorCode = ref<ConnectionResult["errorCode"] | null>(null);

  // ─────────────────────────────────────────────────────────────────────────
  // Computed
  // ─────────────────────────────────────────────────────────────────────────

  /** Whether the user can approve CLI connections (authenticated with secret) */
  const canApproveConnections = computed(() => authStore.canApproveConnections);

  /** Whether the user is authenticated */
  const isAuthenticated = computed(() => authStore.isAuthenticated);

  /** Whether there's an error */
  const hasError = computed(() => errorMessage.value !== null);

  // ─────────────────────────────────────────────────────────────────────────
  // Actions
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Clear any existing error state
   */
  function clearError(): void {
    errorMessage.value = null;
    errorCode.value = null;
  }

  /**
   * Parse a QR code or connection URL to extract connection info
   *
   * @param data - QR code data or connection URL
   * @returns Parsed connection info or null if invalid
   */
  function parseQRCode(data: string) {
    try {
      return parseConnectionCode(data);
    } catch {
      return null;
    }
  }

  /**
   * Connect to a CLI by approving its auth request.
   *
   * This performs the full key exchange:
   * 1. Parse the QR code to get CLI's public key
   * 2. Check auth request status on server
   * 3. Encrypt shared secret with CLI's public key
   * 4. Send encrypted response to server
   *
   * @param qrData - The scanned QR code data
   * @returns Connection result with success/error info
   */
  async function connectToCli(qrData: string): Promise<ConnectionResult> {
    clearError();
    isConnecting.value = true;

    try {
      // Parse the QR code
      let connectionInfo;
      try {
        connectionInfo = parseConnectionCode(qrData);
      } catch {
        errorCode.value = "parse_error";
        errorMessage.value = "Invalid QR code format. Please scan a valid Happy CLI QR code.";
        return {
          success: false,
          errorCode: "parse_error",
          errorMessage: errorMessage.value,
        };
      }

      // Check if we're authenticated and have the secret
      if (!authStore.canApproveConnections || !authStore.token || !authStore.secret) {
        errorCode.value = "not_authenticated";
        errorMessage.value = "Please log in first before connecting a CLI.";
        return {
          success: false,
          errorCode: "not_authenticated",
          errorMessage: errorMessage.value,
        };
      }

      const fingerprint = formatTerminalFingerprint(connectionInfo.publicKey);
      const confirmed = window.confirm(
        `Only continue if this fingerprint is shown in the terminal you intend to connect:

${fingerprint}`,
      );

      if (!confirmed) {
        return {
          success: false,
          errorCode: "cancelled",
          errorMessage: "Terminal pairing cancelled.",
        };
      }

      // Approve the CLI connection with real encryption
      await approveCliConnection(authStore.token, connectionInfo.publicKey, authStore.secret);

      return { success: true };
    } catch (error) {
      if (error instanceof CliApprovalError) {
        errorCode.value = error.code;
        errorMessage.value = error.message;

        // Provide user-friendly messages for specific error codes
        if (error.code === CliConnectionError.NOT_FOUND) {
          errorMessage.value =
            'This QR code has expired. Please generate a new one in your CLI by running "happy" again.';
        } else if (error.code === CliConnectionError.ALREADY_AUTHORIZED) {
          // This is actually a success case - the CLI is already connected
          return { success: true };
        }

        return {
          success: false,
          errorCode: error.code,
          errorMessage: errorMessage.value,
        };
      }

      // Unknown error
      const message = error instanceof Error ? error.message : "Connection failed";
      errorCode.value = "unknown";
      errorMessage.value = message;

      return {
        success: false,
        errorCode: "unknown",
        errorMessage: message,
      };
    } finally {
      isConnecting.value = false;
    }
  }

  /**
   * Authenticate using a secret key directly.
   *
   * @param secretKey - The secret key (base64, base64url, or formatted)
   * @returns Connection result with success/error info
   */
  async function authenticateWithSecret(secretKey: string): Promise<ConnectionResult> {
    clearError();
    isConnecting.value = true;

    try {
      const credentials = await authenticateWithSecretKey(secretKey);

      // Update auth store with credentials
      authStore.setCredentials(credentials.token, "temp-account-id");
      authStore.setSecret(credentials.secret);

      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Authentication failed";
      errorCode.value = "unknown";
      errorMessage.value = message;

      return {
        success: false,
        errorCode: "unknown",
        errorMessage: message,
      };
    } finally {
      isConnecting.value = false;
    }
  }

  /**
   * Create a new auth session for QR-based authentication.
   *
   * This is used when the web app displays a QR code for mobile to scan.
   *
   * @returns Auth session with QR data and wait function
   */
  function createSession(): AuthSessionState {
    const session = createAuthSession();
    return {
      qrData: session.qrData,
      waitForAuth: session.waitForAuth,
    };
  }

  /**
   * Complete authentication after mobile app scans the QR code.
   *
   * @param credentials - The credentials from the auth session
   */
  function completeAuthentication(credentials: StoredCredentials): void {
    authStore.setCredentials(credentials.token, "temp-account-id");
    authStore.setSecret(credentials.secret);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Return API
  // ─────────────────────────────────────────────────────────────────────────

  return {
    // State (reactive)
    isConnecting,
    errorMessage,
    errorCode,

    // Computed
    canApproveConnections,
    isAuthenticated,
    hasError,

    // Actions
    clearError,
    parseQRCode,
    connectToCli,
    authenticateWithSecret,
    createSession,
    completeAuthentication,
  };
}
