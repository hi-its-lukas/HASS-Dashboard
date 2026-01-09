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

function getGo2rtcBinaryPath(): string | null {
  const possiblePaths = [
    // Manually installed binary in Docker (most reliable on ARM64)
    '/usr/local/bin/go2rtc',
  ]
  
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      console.log('[go2rtc] Found binary at:', p)
      return p
    }
  }
  
  console.log('[go2rtc] Binary not found - ensure go2rtc is installed at /usr/local/bin/go2rtc')
  return null
}

const GO2RTC_CONFIG_PATH = '/tmp/go2rtc.json'

function generateConfig(streams: StreamConfig[]): string {
  const streamsConfig: Record<string, string[]> = {}
  
  for (const stream of streams) {
    streamsConfig[stream.cameraId] = [stream.rtspUrl]
  }
  
  const config = {
    log: {
      level: "debug",
      api: "debug",
      rtsp: "debug",
      exec: "debug"
    },
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

export function writeGo2rtcConfig(streams: StreamConfig[]): void {
  const configContent = generateConfig(streams)
  fs.writeFileSync(GO2RTC_CONFIG_PATH, configContent)
  console.log('[go2rtc] Config written to:', GO2RTC_CONFIG_PATH)
  console.log('[go2rtc] Configured', streams.length, 'streams')
}

interface StartResult {
  success: boolean
  error?: string
}

export async function startGo2rtc(streams: StreamConfig[]): Promise<StartResult> {
  if (go2rtcProcess) {
    console.log('[go2rtc] Already running')
    return { success: true }
  }
  
  if (isStarting) {
    console.log('[go2rtc] Already starting')
    return { success: false, error: 'go2rtc is already starting' }
  }
  
  if (streams.length === 0) {
    console.log('[go2rtc] No streams configured')
    return { success: false, error: 'No streams configured' }
  }
  
  isStarting = true
  
  try {
    const binaryPath = getGo2rtcBinaryPath()
    
    if (!binaryPath) {
      return { success: false, error: 'go2rtc binary not found' }
    }
    
    if (!fs.existsSync(binaryPath)) {
      return { success: false, error: `go2rtc binary not found at: ${binaryPath}` }
    }
    
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
    
    go2rtcProcess.on('close', (code, signal) => {
      const timestamp = new Date().toISOString()
      const crashMsg = `[${timestamp}] go2rtc exited - code: ${code}, signal: ${signal}`
      console.log('[go2rtc] Process exited with code:', code, 'signal:', signal)
      if (code !== 0) {
        console.error('[go2rtc] CRASH DETECTED - exit code:', code, 'signal:', signal)
        // Write crash log to persistent storage
        try {
          const crashLogPath = '/app/data/go2rtc_crash.log'
          fs.appendFileSync(crashLogPath, crashMsg + '\n')
        } catch (e) {
          // Ignore if we can't write to data directory
        }
      }
      go2rtcProcess = null
    })
    
    go2rtcProcess.on('error', (err) => {
      console.error('[go2rtc] Process spawn error:', err.message)
      go2rtcProcess = null
    })
    
    go2rtcProcess.on('exit', (code, signal) => {
      console.log('[go2rtc] Process exit event - code:', code, 'signal:', signal)
    })
    
    // Wait longer for ARM64/Docker startup
    await new Promise(resolve => setTimeout(resolve, 5000))
    
    console.log('[go2rtc] Started successfully on port', GO2RTC_PORT)
    return { success: true }
  } catch (error) {
    console.error('[go2rtc] Failed to start:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    return { success: false, error: `Failed to start go2rtc: ${errorMessage}` }
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
  // Check if we have a process reference and it's not killed
  if (go2rtcProcess === null || go2rtcProcess.killed) {
    return false
  }
  
  // Also verify the process is actually still alive
  try {
    process.kill(go2rtcProcess.pid!, 0)
    return true
  } catch {
    // Process doesn't exist anymore
    go2rtcProcess = null
    return false
  }
}

export async function checkGo2rtcHealth(): Promise<boolean> {
  try {
    const response = await fetch(`http://127.0.0.1:${GO2RTC_PORT}/api`)
    return response.ok
  } catch {
    return false
  }
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
  channel: number = 1,
  secure: boolean = true
): string {
  const protocol = secure ? 'rtspx' : 'rtsp'
  const port = secure ? 7441 : 7447
  const encodedUser = encodeURIComponent(username)
  const encodedPass = encodeURIComponent(password)
  
  const url = `${protocol}://${encodedUser}:${encodedPass}@${nvrHost}:${port}/${cameraId}_channel_${channel}`
  console.log(`[go2rtc] RTSP URL for ${cameraId}: ${protocol}://***:***@${nvrHost}:${port}/${cameraId}_channel_${channel}`)
  return url
}

export function buildTokenRtspUrl(
  nvrHost: string,
  rtspToken: string,
  secure: boolean = true
): string {
  if (secure) {
    // UniFi Protect RTSPS on port 7441
    // go2rtc uses rtspx:// notation for RTSPS (TLS without cert verification)
    // Token-based URLs don't need ?enableSrtp - the token itself enables SRTP
    const url = `rtspx://${nvrHost}:7441/${rtspToken}`
    console.log(`[go2rtc] Token-based RTSP URL (secure): rtspx://${nvrHost}:7441/${rtspToken.substring(0, 4)}...`)
    return url
  } else {
    const url = `rtsp://${nvrHost}:7447/${rtspToken}`
    console.log(`[go2rtc] Token-based RTSP URL (unsecure): rtsp://${nvrHost}:7447/${rtspToken.substring(0, 4)}...`)
    return url
  }
}

export { GO2RTC_PORT, GO2RTC_WEBRTC_PORT }
