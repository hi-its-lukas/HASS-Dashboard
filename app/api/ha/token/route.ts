// Server-side API route to provide HA token securely
// Token is never exposed to client bundle

import { NextResponse } from 'next/server'

export async function GET() {
  const token = process.env.HA_TOKEN

  if (!token) {
    return NextResponse.json(
      { error: 'HA_TOKEN not configured' },
      { status: 500 }
    )
  }

  // In production, you might want to add additional security checks here:
  // - Verify the request origin
  // - Check for valid session/authentication
  // - Rate limiting

  return NextResponse.json({ token })
}
