import { prisma, decryptToken, decryptFromParts } from './config'

export interface UnifiProtectConfig {
  host: string
  username: string
  password: string
  channel: number
}

export async function getUnifiProtectConfig(): Promise<UnifiProtectConfig | null> {
  try {
    const record = await prisma.systemConfig.findUnique({
      where: { key: 'global_layout_config' }
    })
    
    if (!record) {
      console.log('[UniFi] No global config found')
      return null
    }
    
    let config: { unifi?: { controllerUrl?: string; rtspUsername?: string; rtspPassword?: string; rtspChannel?: number } }
    
    if (record.encrypted) {
      const decrypted = decryptToken(record.value)
      config = JSON.parse(decrypted)
    } else {
      config = JSON.parse(record.value)
    }
    
    const unifi = config.unifi
    if (!unifi?.controllerUrl || !unifi?.rtspUsername || !unifi?.rtspPassword) {
      console.log('[UniFi] Incomplete config:', { 
        hasHost: !!unifi?.controllerUrl, 
        hasUser: !!unifi?.rtspUsername, 
        hasPass: !!unifi?.rtspPassword 
      })
      return null
    }
    
    let password = unifi.rtspPassword
    if (password.startsWith('enc:')) {
      const data = Buffer.from(password.slice(4), 'base64')
      const nonce = data.slice(0, 12)
      const ciphertext = data.slice(12)
      password = decryptFromParts(ciphertext, nonce)
    }
    
    let host = unifi.controllerUrl
    host = host.replace(/^https?:\/\//, '').replace(/\/+$/, '')
    
    console.log('[UniFi] Config loaded:', { host, username: unifi.rtspUsername, channel: unifi.rtspChannel })
    
    return {
      host,
      username: unifi.rtspUsername,
      password,
      channel: unifi.rtspChannel ?? 1
    }
  } catch (error) {
    console.error('[UniFi] Error loading config:', error)
    return null
  }
}
