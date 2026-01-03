import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromCookie } from '@/lib/auth/session'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromCookie()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const cameraEntityId = formData.get('cameraEntityId') as string
    const eventType = formData.get('eventType') as string

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    
    const sanitize = (str: string) => str.replace(/[^a-zA-Z0-9_-]/g, '_')
    const safeCameraName = sanitize(cameraEntityId.split('.')[1] || 'camera')
    const safeEventType = sanitize(eventType || 'event')
    
    const snapshotDir = path.join(process.cwd(), 'data', 'snapshots', session.userId)
    await mkdir(snapshotDir, { recursive: true })

    const timestamp = Date.now()
    const filename = `${safeCameraName}_${safeEventType}_${timestamp}.jpg`
    const filepath = path.join(snapshotDir, filename)

    await writeFile(filepath, buffer)

    const relativePath = `/api/ha/surveillance/snapshot/${session.userId}/${filename}`

    return NextResponse.json({ path: relativePath })
  } catch (error) {
    console.error('[API] Snapshot upload error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
