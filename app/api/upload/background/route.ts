import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromCookie } from '@/lib/auth/session'
import { csrfProtection } from '@/lib/auth/csrf'
import prisma from '@/lib/db/client'
import { writeFile, mkdir, unlink } from 'fs/promises'
import { existsSync, readdirSync } from 'fs'
import path from 'path'
import sharp from 'sharp'

export const dynamic = 'force-dynamic'

const DATA_DIR = process.env.NODE_ENV === 'production' ? '/data' : './.data'
const UPLOAD_DIR = path.join(DATA_DIR, 'backgrounds')

const MAX_WIDTH = 1920
const MAX_HEIGHT = 1080
const QUALITY = 80

export async function POST(request: NextRequest) {
  try {
    const csrfError = csrfProtection(request)
    if (csrfError) return csrfError
    
    const session = await getSessionFromCookie()
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }
    
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 })
    }
    
    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 })
    }
    
    if (!existsSync(UPLOAD_DIR)) {
      await mkdir(UPLOAD_DIR, { recursive: true })
    } else {
      const files = readdirSync(UPLOAD_DIR)
      const oldFile = files.find((f) => f.startsWith(session.userId + '.'))
      if (oldFile) {
        await unlink(path.join(UPLOAD_DIR, oldFile))
      }
    }
    
    const filename = `${session.userId}.webp`
    const filepath = path.join(UPLOAD_DIR, filename)
    
    const buffer = Buffer.from(await file.arrayBuffer())
    
    const optimizedBuffer = await sharp(buffer)
      .resize(MAX_WIDTH, MAX_HEIGHT, { 
        fit: 'inside', 
        withoutEnlargement: true 
      })
      .webp({ quality: QUALITY })
      .toBuffer()
    
    await writeFile(filepath, optimizedBuffer)
    
    const backgroundUrl = `/api/upload/background/${session.userId}`
    
    const existingConfig = await prisma.dashboardConfig.findUnique({
      where: { userId: session.userId }
    })
    
    let layoutConfig: Record<string, unknown> = {}
    if (existingConfig?.layoutConfig) {
      try {
        layoutConfig = JSON.parse(existingConfig.layoutConfig)
      } catch {
        layoutConfig = {}
      }
    }
    
    layoutConfig.backgroundUrl = backgroundUrl
    
    await prisma.dashboardConfig.upsert({
      where: { userId: session.userId },
      create: {
        userId: session.userId,
        layoutConfig: JSON.stringify(layoutConfig),
      },
      update: {
        layoutConfig: JSON.stringify(layoutConfig),
      }
    })
    
    return NextResponse.json({ url: backgroundUrl })
  } catch (error) {
    console.error('[API] /upload/background error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const csrfError = csrfProtection(request)
    if (csrfError) return csrfError
    
    const session = await getSessionFromCookie()
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    if (existsSync(UPLOAD_DIR)) {
      const files = readdirSync(UPLOAD_DIR)
      const userFile = files.find((f) => f.startsWith(session.userId + '.'))
      if (userFile) {
        await unlink(path.join(UPLOAD_DIR, userFile))
      }
    }
    
    const existingConfig = await prisma.dashboardConfig.findUnique({
      where: { userId: session.userId }
    })
    
    if (existingConfig?.layoutConfig) {
      let layoutConfig: Record<string, unknown> = {}
      try {
        layoutConfig = JSON.parse(existingConfig.layoutConfig)
      } catch {
        layoutConfig = {}
      }
      
      delete layoutConfig.backgroundUrl
      
      await prisma.dashboardConfig.update({
        where: { userId: session.userId },
        data: { layoutConfig: JSON.stringify(layoutConfig) }
      })
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[API] DELETE /upload/background error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
