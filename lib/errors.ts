import { NextResponse } from "next/server";

export function errorResponse(
  code: string,
  message: string,
  status: number = 400
) {
  return NextResponse.json({ error: { code, message } }, { status });
}
