import 'server-only';
import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { AuthorizationError } from './authorization';
import { RagBackendError, RagUnreachableError } from './rag';

/**
 * Standardized, sanitized server response helpers.
 * Guarantees that internal IPs, database details, stack traces,
 * and server paths are NEVER returned in API responses.
 */

function generateRequestId(): string {
  const chars = '0123456789ABCDEF';
  let id = 'REQ-';
  for (let i = 0; i < 6; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

export function apiSuccess<T>(data: T, status: number = 200) {
  return NextResponse.json(
    {
      success: true,
      data,
      timestamp: new Date().toISOString(),
      requestId: generateRequestId(),
    },
    { status }
  );
}

export function apiError(
  error: unknown,
  fallbackMessage: string = 'An error occurred while processing the request.',
  status: number = 500
) {

  const requestId = generateRequestId();

  // Log full internal error details securely to server stdout/audit log
  if (error instanceof Error) {
    console.error(`[SERVER ERROR ${requestId}]`, error.message, error.stack);
  } else {
    console.error(`[SERVER ERROR ${requestId}]`, error);
  }

  // Handle Input Validation Errors (Zod)
  if (error instanceof ZodError) {
    const errorDetails = error.issues.map(i => ({ field: i.path.join('.'), message: i.message }));
    const firstMessage = errorDetails[0]?.message || 'Invalid input data provided.';
    return NextResponse.json(
      {
        success: false,
        error: 'Validation Error',
        message: firstMessage,
        details: errorDetails,
        requestId,
      },
      { status: 400 }
    );
  }


  // Handle Authorization Errors (Anti-IDOR / Multi-tenant)
  if (error instanceof AuthorizationError || (error instanceof Error && error.message === 'UNAUTHORIZED')) {
    return NextResponse.json(
      {
        success: false,
        error: 'Access Denied',
        message: 'You are not authorized to access this resource or project enclave.',
        requestId,
      },
      { status: 403 }
    );
  }

  // Handle Not Found
  if (
    (error instanceof Error && error.message === 'NOT_FOUND') ||
    (error instanceof RagBackendError && error.status === 404)
  ) {
    return NextResponse.json(
      {
        success: false,
        error: 'Resource Not Found',
        message: 'The requested intelligence record or project could not be found.',
        requestId,
      },
      { status: 404 }
    );
  }

  if (error instanceof RagUnreachableError) {
    return NextResponse.json(
      {
        success: false,
        error: 'RAG Unavailable',
        message: 'RAG unavailable',
        requestId,
      },
      { status: 503 }
    );
  }

  if (error instanceof RagBackendError && error.status >= 400 && error.status < 500) {
    let message = fallbackMessage;
    try {
      const parsed = JSON.parse(error.body);
      const detail = parsed?.detail;
      if (typeof detail === 'string') {
        message = detail;
      } else if (detail && typeof detail === 'object' && typeof detail.error === 'string') {
        message = detail.error;
      } else if (typeof parsed?.error === 'string') {
        message = parsed.error;
      }
    } catch {
      if (error.body) message = error.body.slice(0, 300);
    }
    return NextResponse.json(
      {
        success: false,
        error: 'Request Error',
        message,
        requestId,
      },
      { status: error.status }
    );
  }

  if (error instanceof Error && error.message && error.message !== 'An error occurred' && !error.message.includes('fetch failed')) {
    return NextResponse.json(
      {
        success: false,
        error: 'Request Error',
        message: error.message,
        requestId,
      },
      { status: 400 }
    );
  }

  // Generic Sanitized Internal Server Error
  return NextResponse.json(
    {
      success: false,
      error: 'Service Error',
      message: fallbackMessage,
      requestId,
    },
    { status }
  );

}

export function apiRateLimitExceeded(resetSeconds: number) {
  return NextResponse.json(
    {
      success: false,
      error: 'Too Many Requests',
      message: `Rate limit exceeded for this operation. Please try again in ${resetSeconds} seconds.`,
      requestId: generateRequestId(),
    },
    {
      status: 429,
      headers: {
        'Retry-After': resetSeconds.toString(),
      },
    }
  );
}
