import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { logger } from "./logger";

export interface ApiResponse<T = any> {
  success: boolean;
  data: T | null;
  error: string | null;
  message: string | null;
  meta: {
    requestId: string;
    timestamp: string;
    pagination?: {
      page: number;
      limit: number;
      total: number;
    };
  };
}

export function apiSuccess<T>(data: T, message?: string, status = 200, pagination?: ApiResponse["meta"]["pagination"]) {
  const response: ApiResponse<T> = {
    success: true,
    data,
    error: null,
    message: message || "Success",
    meta: {
      requestId: randomUUID(),
      timestamp: new Date().toISOString(),
      ...(pagination ? { pagination } : {}),
    },
  };
  return NextResponse.json(response, { status });
}

export function apiError(error: unknown, status = 500, message?: string) {
  const requestId = randomUUID();
  
  let errorMsg = "Internal Server Error";
  if (error instanceof Error) {
    errorMsg = error.message;
  } else if (typeof error === "string") {
    errorMsg = error;
  }

  // Log all errors
  if (status >= 500) {
    logger.error({ err: error, requestId, status }, message || errorMsg);
    // Don't expose internal server error details to the client in production
    if (process.env.NODE_ENV === "production") {
      errorMsg = "Internal Server Error";
    }
  } else {
    logger.warn({ err: error, requestId, status }, message || errorMsg);
  }

  const response: ApiResponse = {
    success: false,
    data: null,
    error: errorMsg,
    message: message || "An error occurred",
    meta: {
      requestId,
      timestamp: new Date().toISOString(),
    },
  };
  
  return NextResponse.json(response, { status });
}
