import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/client'

export async function GET() {
  try {
    const setupComplete = await prisma.systemConfig.findUnique({
      where: { key: 'setup_complete' }
    })
    
    const hasUsers = await prisma.user.count() > 0
    
    return NextResponse.json({
      setupComplete: setupComplete?.value === 'true' && hasUsers,
      hasUsers,
    })
  } catch (error) {
    console.error('[Setup] Status check error:', error)
    return NextResponse.json({ setupComplete: false, hasUsers: false })
  }
}
