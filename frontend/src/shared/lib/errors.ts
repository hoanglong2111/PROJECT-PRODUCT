/**
 * Central hook for render-time errors caught by error boundaries.
 * Today it just logs; swap the body for real telemetry (Sentry, etc.) later
 * without touching the boundaries.
 */
export function reportRenderError(error: unknown, info?: { componentStack?: string | null }) {
  console.error('[render-error]', error, info?.componentStack ?? '');
}

export function getApiErrorMessage(error: unknown, fallback = 'Could not determine error details.') {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim().length > 0) {
      return message;
    }
  }

  return fallback;
}
