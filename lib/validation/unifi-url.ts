import { z } from 'zod'

const PRIVATE_IP_RANGES = [
  /^10\./,
  /^172\.(1[6-9]|2[0-9]|3[01])\./,
  /^192\.168\./,
  /^127\./,
  /^localhost$/i,
  /^0\.0\.0\.0$/,
  /\.local$/i,
]

const BLOCKED_HOSTS = [
  /^metadata\.google\.internal$/i,
  /^169\.254\./,
  /^100\.100\.100\.200$/,
  /^instance-data$/i,
]

function isPrivateHost(hostname: string): boolean {
  return PRIVATE_IP_RANGES.some(pattern => pattern.test(hostname))
}

function isBlockedHost(hostname: string): boolean {
  return BLOCKED_HOSTS.some(pattern => pattern.test(hostname))
}

export function validateUnifiControllerUrl(url: string): { valid: boolean; error?: string; sanitized?: string } {
  if (!url || url.trim() === '') {
    return { valid: true }
  }

  const trimmedUrl = url.trim()

  try {
    const parsed = new URL(trimmedUrl)

    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return { valid: false, error: 'Only HTTP or HTTPS URLs are allowed' }
    }
    
    if (parsed.protocol === 'http:' && process.env.NODE_ENV === 'production') {
      if (!isPrivateHost(parsed.hostname)) {
        return { valid: false, error: 'HTTP is only allowed for private network hosts' }
      }
    }

    if (parsed.username || parsed.password) {
      return { valid: false, error: 'Credentials in URL are not allowed (user:pass@host)' }
    }

    if (isBlockedHost(parsed.hostname)) {
      return { valid: false, error: 'This host is not allowed (cloud metadata endpoint)' }
    }

    if (process.env.NODE_ENV === 'production') {
      const allowPublicNetwork = process.env.ALLOW_PUBLIC_UNIFI === 'true'
      if (!allowPublicNetwork && !isPrivateHost(parsed.hostname)) {
        return { valid: false, error: 'Only private network hosts are allowed. Set ALLOW_PUBLIC_UNIFI=true to allow external URLs.' }
      }
    }

    if (parsed.pathname && parsed.pathname !== '/' && parsed.pathname.length > 100) {
      return { valid: false, error: 'URL path is too long' }
    }

    const sanitized = `${parsed.protocol}//${parsed.host}`.replace(/\/$/, '')
    
    return { valid: true, sanitized }
  } catch {
    return { valid: false, error: 'Invalid URL format' }
  }
}

export const UnifiConfigSchema = z.object({
  controllerUrl: z.string().max(500).optional().transform(val => val?.trim()),
  protectApiKey: z.string().max(500).optional(),
  accessApiKey: z.string().max(500).optional(),
  cameras: z.array(z.string().max(100)).max(50).optional(),
  accessDevices: z.array(z.object({
    id: z.string().max(100),
    name: z.string().max(200),
    type: z.string().max(50),
    doorId: z.string().max(100).optional()
  })).max(50).optional(),
  aiSurveillanceEnabled: z.boolean().optional()
})

export type ValidatedUnifiConfig = z.infer<typeof UnifiConfigSchema>
