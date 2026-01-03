import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromCookie } from '@/lib/auth/session'
import { readFile } from 'fs/promises'
import { existsSync, readdirSync } from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic'

const DATA_DIR = process.env.NODE_ENV === 'production' ? '/data' : './.data'
const UPLOAD_DIR = path.join(DATA_DIR, 'backgrounds')

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const session = await getSessionFromCookie()
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { userId } = params
    
    if (session.userId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    if (!existsSync(UPLOAD_DIR)) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    
    const files = readdirSync(UPLOAD_DIR)
    const userFile = files.find((f) => f.startsWith(userId + '.'))
    
    if (!userFile) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    
    const filepath = path.join(UPLOAD_DIR, userFile)
    const buffer = await readFile(filepath)
    
    const ext = userFile.split('.').pop()?.toLowerCase()
    const contentType = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      webp: 'image/webp',
      gif: 'image/gif',
    }[ext || 'jpg'] || 'image/jpeg'
    
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'private, max-age=3600',
      },
    })
  } catch (error) {
    console.error('[API] GET /upload/background/[userId] error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
