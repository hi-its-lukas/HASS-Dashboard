import { spawn, ChildProcess } from 'child_process'
import path from 'path'
import fs from 'fs'
import os from 'os'

let go2rtcProcess: ChildProcess | null = null
let isStarting = false

const GO2RTC_PORT = 1984
const GO2RTC_RTSP_PORT = 8554
const GO2RTC_WEBRTC_PORT = 8555

interface StreamConfig {
  cameraId: string
  name: string
  rtspUrl: string
}

function getGo2rtcBinaryPath(): string {
  try {
    const go2rtcStatic = require('go2rtc-static')
    return typeof go2rtcStatic === 'string' ? go2rtcStatic : go2rtcStatic.default || go2rtcStatic.path
  } catch {
    return 'go2rtc'
  }
}

function generateConfig(streams: StreamConfig[]): string {
  const streamsConfig: Record<string, string[]> = {}
  
  for (const stream of streams) {
    streamsConfig[stream.cameraId] = [stream.rtspUrl]
  }
  
  const config = {
    api: {
      listen: `:${GO2RTC_PORT}`,
      origin: '*'
    },
    rtsp: {
      listen: `:${GO2RTC_RTSP_PORT}`
    },
    webrtc: {
      listen: `:${GO2RTC_WEBRTC_PORT}`,
      ice_servers: [
        { urls: ['stun:stun.l.google.com:19302'] }
      ]
    },
    streams: streamsConfig
  }
  
  return JSON.stringify(config, null, 2)
}

export async function startGo2rtc(streams: StreamConfig[]): Promise<boolean> {
  if (go2rtcProcess) {
    console.log('[go2rtc] Already running')
    return true
  }
  
  if (isStarting) {
    console.log('[go2rtc] Already starting')
    return false
  }
  
  if (streams.length === 0) {
    console.log('[go2rtc] No streams configured')
    return false
  }
  
  isStarting = true
  
  try {
    const binaryPath = getGo2rtcBinaryPath()
    const configPath = path.join(os.tmpdir(), 'go2rtc.json')
    const configContent = generateConfig(streams)
    
    fs.writeFileSync(configPath, configContent)
    console.log('[go2rtc] Config written to:', configPath)
    console.log('[go2rtc] Configured', streams.length, 'streams')
    
    go2rtcProcess = spawn(binaryPath, ['-config', configPath], {
      stdio: ['ignore', 'pipe', 'pipe']
    })
    
    go2rtcProcess.stdout?.on('data', (data) => {
      console.log('[go2rtc]', data.toString().trim())
    })
    
    go2rtcProcess.stderr?.on('data', (data) => {
      console.error('[go2rtc ERROR]', data.toString().trim())
    })
    
    go2rtcProcess.on('close', (code) => {
      console.log('[go2rtc] Process exited with code:', code)
      go2rtcProcess = null
    })
    
    go2rtcProcess.on('error', (err) => {
      console.error('[go2rtc] Process error:', err)
      go2rtcProcess = null
    })
    
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    console.log('[go2rtc] Started successfully on port', GO2RTC_PORT)
    return true
  } catch (error) {
    console.error('[go2rtc] Failed to start:', error)
    return false
  } finally {
    isStarting = false
  }
}

export function stopGo2rtc(): void {
  if (go2rtcProcess) {
    console.log('[go2rtc] Stopping...')
    go2rtcProcess.kill('SIGTERM')
    go2rtcProcess = null
  }
}

export function isGo2rtcRunning(): boolean {
  return go2rtcProcess !== null && !go2rtcProcess.killed
}

export function getGo2rtcApiUrl(): string {
  return `http://127.0.0.1:${GO2RTC_PORT}`
}

export function getStreamWebRtcUrl(cameraId: string): string {
  return `${getGo2rtcApiUrl()}/api/webrtc?src=${encodeURIComponent(cameraId)}`
}

export function getStreamMseUrl(cameraId: string): string {
  return `${getGo2rtcApiUrl()}/api/ws?src=${encodeURIComponent(cameraId)}`
}

export function buildRtspUrl(
  nvrHost: string,
  cameraId: string,
  username: string,
  password: string,
  channel: number = 0,
  secure: boolean = true
): string {
  const protocol = secure ? 'rtsps' : 'rtsp'
  const port = secure ? 7441 : 7447
  const encodedUser = encodeURIComponent(username)
  const encodedPass = encodeURIComponent(password)
  
  return `${protocol}://${encodedUser}:${encodedPass}@${nvrHost}:${port}/${cameraId}_channel_${channel}`
}

export { GO2RTC_PORT, GO2RTC_WEBRTC_PORT }
