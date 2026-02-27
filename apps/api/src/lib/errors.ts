import type { FastifyError, FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";

export type ApiErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "AUTH_INVALID_CREDENTIALS"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "INTERNAL_ERROR";

export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly code: ApiErrorCode;
  public readonly details?: unknown;

  constructor(args: {
    statusCode: number;
    code: ApiErrorCode;
    message: string;
    details?: unknown;
  }) {
    super(args.message);
    this.statusCode = args.statusCode;
    this.code = args.code;
    this.details = args.details;
  }
}

export function errorHandler(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const requestId = request.id;

  if (error instanceof ApiError) {
    reply.status(error.statusCode).send({
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
      },
      requestId,
    });
    return;
  }

  if (error instanceof ZodError) {
    reply.status(400).send({
      error: {
        code: "VALIDATION_ERROR",
        message: "Validation error",
        details: error.issues,
      },
      requestId,
    });
    return;
  }

  const maybePrisma = error as unknown as { code?: unknown; meta?: unknown };
  if (maybePrisma.code === "P2002") {
    reply.status(409).send({
      error: {
        code: "CONFLICT",
        message: "Unique constraint violation",
        details: maybePrisma.meta,
      },
      requestId,
    });
    return;
  }

  reply.status(500).send({
    error: {
      code: "INTERNAL_ERROR",
      message: "Internal server error",
    },
    requestId,
  });
}
