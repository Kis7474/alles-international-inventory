import { NextResponse } from 'next/server'

export interface ApiResponse<T = unknown> {
  statusCode: number
  message: string
  data: T | null
  error: string | null
}

export function createSuccessResponse<T>(data: T, message = 'OK', statusCode = 200): ApiResponse<T> {
  return {
    statusCode,
    message,
    data,
    error: null,
  }
}

export function createErrorResponse(error: string, message = 'ERROR', statusCode = 500): ApiResponse<null> {
  return {
    statusCode,
    message,
    data: null,
    error,
  }
}

// Legacy passthrough for existing client response shapes
export function jsonSuccess<T>(body: T, init?: ResponseInit): NextResponse<T> {
  return NextResponse.json(body, init)
}

export function jsonError(error: string, status = 500): NextResponse<{ error: string }> {
  return NextResponse.json({ error }, { status })
}
