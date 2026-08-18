import QRCode from 'qrcode';

/**
 * Generates a dynamic cryptographic-like session token
 */
export function generateSessionToken(sessionId: string): string {
  const randomPart = Math.random().toString(36).substring(2, 10).toUpperCase();
  const timestamp = Date.now().toString(36).toUpperCase();
  return `CT-${sessionId.substring(0, 4).toUpperCase()}-${randomPart}-${timestamp}`;
}

/**
 * Creates the formatted payload for the QR code
 */
export function formatQRPayload(sessionId: string, token: string): string {
  // In production this can be a deep link URL or standard JSON protocol
  return JSON.stringify({
    app: 'ClassTrack',
    version: '1.0',
    sessionId,
    token,
    t: Date.now(),
  });
}

/**
 * Parses scanned QR text into session and token
 */
export function parseQRPayload(
  rawText: string
): { sessionId: string; token: string } | null {
  try {
    // Try JSON format first
    const data = JSON.parse(rawText);
    if (data.sessionId && data.token) {
      return { sessionId: data.sessionId, token: data.token };
    }
  } catch {
    // Check if it's formatted as standard URL e.g. https://.../attendance/SESSION_ID?token=TOKEN
    try {
      const url = new URL(rawText);
      const parts = url.pathname.split('/');
      const sessionId = parts[parts.length - 1];
      const token = url.searchParams.get('token') || sessionId;
      if (sessionId) {
        return { sessionId, token };
      }
    } catch {
      // Direct raw string format: "SESSION_ID:TOKEN"
      if (rawText.includes(':')) {
        const [sessionId, token] = rawText.split(':');
        return { sessionId, token };
      }
    }
  }
  return null;
}

/**
 * Generates a QR Code as Data URL for canvas/image display
 */
export async function generateQRCodeDataUrl(text: string): Promise<string> {
  return QRCode.toDataURL(text, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 320,
    color: {
      dark: '#0f172a', // Deep slate / navy
      light: '#ffffff',
    },
  });
}
