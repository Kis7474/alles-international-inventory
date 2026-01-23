import { prisma } from '@/lib/prisma'

export interface UnipassSettings {
  apiKeyCargoProgress?: string
  apiKeyImportDeclaration?: string
  businessNumber?: string
  autoSyncEnabled?: boolean
  syncInterval?: string
}

/**
 * 유니패스 설정을 DB에서 가져와서 파싱
 */
export async function getUnipassSettings(): Promise<UnipassSettings | null> {
  const settings = await prisma.systemSetting.findUnique({
    where: { key: 'unipass_settings' },
  })
  
  if (!settings?.value) {
    return null
  }
  
  return typeof settings.value === 'string' 
    ? JSON.parse(settings.value) 
    : settings.value
}

/**
 * 등록 방식에 따라 올바른 API 키 반환
 */
export function getApiKeyForRegistrationType(
  settings: UnipassSettings,
  registrationType: string
): string | null {
  if (registrationType === 'BL') {
    return settings.apiKeyCargoProgress || null
  } else if (registrationType === 'DECLARATION') {
    return settings.apiKeyImportDeclaration || null
  }
  return null
}

/**
 * 인증 오류 메시지 체크
 */
export function isAuthenticationError(message: string | undefined): boolean {
  if (!message) return false
  return message.includes('인증') || message.includes('키') || message.includes('권한')
}
