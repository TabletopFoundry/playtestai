/**
 * Shared API response helpers.
 *
 * Centralises common error-response patterns so API routes stay
 * consistent and terse. Every error response includes a machine-readable
 * `error` field.
 */

import { NextResponse } from "next/server";
import type { z } from "zod";
import { formatZodErrors } from "@/lib/validation";

/** Return a 400 Bad Request with a message. */
export function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

/** Return a 400 from a Zod validation error. */
export function validationError(prefix: string, error: z.ZodError) {
  return NextResponse.json(
    { error: `${prefix}: ${formatZodErrors(error)}` },
    { status: 400 },
  );
}

/** Return a 404 Not Found with a message. */
export function notFound(resource = "Resource") {
  return NextResponse.json(
    { error: `${resource} not found.` },
    { status: 404 },
  );
}

/** Return a 500 Internal Server Error. */
export function serverError(message = "An internal error occurred.") {
  return NextResponse.json({ error: message }, { status: 500 });
}

export function withApiErrorHandling<TArgs extends unknown[]>(
  handler: (...args: TArgs) => Promise<Response> | Response,
) {
  return async (...args: TArgs): Promise<Response> => {
    try {
      return await handler(...args);
    } catch (error) {
      console.error("API handler failed", error);
      return serverError();
    }
  };
}

/**
 * Safely parse a JSON request body.
 *
 * Returns the parsed value on success, or a pre-built 400 response
 * on failure so callers can short-circuit with an early return.
 */
export async function parseJsonBody(
  request: Request,
): Promise<{ data: unknown } | { error: NextResponse }> {
  try {
    const data: unknown = await request.json();
    return { data };
  } catch {
    return { error: badRequest("Invalid JSON body.") };
  }
}
