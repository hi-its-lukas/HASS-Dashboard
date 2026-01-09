import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromCookie } from '@/lib/auth/session'
import { getGo2rtcApiUrl, isGo2rtcRunning } from '@/lib/streaming/go2rtc'

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromCookie()
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!isGo2rtcRunning()) {
      return NextResponse.json({ error: 'Streaming server not running' }, { status: 503 })
    }

    const cameraId = request.nextUrl.searchParams.get('src')
    if (!cameraId) {
      return NextResponse.json({ error: 'Missing camera ID' }, { status: 400 })
    }

    const sdpOffer = await request.text()
    if (!sdpOffer) {
      return NextResponse.json({ error: 'Missing SDP offer' }, { status: 400 })
    }

    const go2rtcUrl = getGo2rtcApiUrl()
    console.log(`[WebRTC Proxy] Forwarding SDP offer for camera: ${cameraId} to ${go2rtcUrl}`)
    
    const response = await fetch(`${go2rtcUrl}/api/webrtc?src=${encodeURIComponent(cameraId)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/sdp' },
      body: sdpOffer
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[WebRTC Proxy] go2rtc error:', response.status, errorText)
      return new NextResponse(`WebRTC handshake failed: ${errorText}`, { 
        status: response.status,
        headers: { 'Content-Type': 'text/plain' }
      })
    }

    const sdpAnswer = await response.text()
    console.log(`[WebRTC Proxy] Got SDP answer for camera: ${cameraId}, length: ${sdpAnswer.length}`)
    return new NextResponse(sdpAnswer, {
      status: 200,
      headers: { 'Content-Type': 'application/sdp' }
    })

  } catch (error) {
    console.error('[WebRTC Proxy] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
