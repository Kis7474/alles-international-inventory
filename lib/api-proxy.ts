/**
 * Cloudflare Workers API Proxy
 * 
 * Provides a proxy layer for Korean government APIs through Cloudflare Workers.
 * This solves connection issues when calling Korean government APIs from overseas servers (Vercel).
 * 
 * Usage:
 * 1. Deploy the Cloudflare Worker (see cloudflare-worker/README.md)
 * 2. Set CLOUDFLARE_PROXY_URL environment variable in Vercel
 * 3. Use proxyFetch() instead of direct fetch() for Korean government APIs
 */

/**
 * Get the Cloudflare Workers proxy URL from environment variables
 * @returns Proxy URL or null if not configured
 */
export function getProxyUrl(): string | null {
  return process.env.CLOUDFLARE_PROXY_URL || null
}

/**
 * Fetch data through Cloudflare Workers proxy
 * Falls back to direct fetch if proxy URL is not configured
 * 
 * @param targetUrl - The target API URL to fetch
 * @param options - Optional fetch options (method, headers, etc.)
 * @returns Response text
 */
export async function proxyFetch(
  targetUrl: string,
  options?: {
    method?: string
    timeout?: number
  }
): Promise<string> {
  const proxyUrl = getProxyUrl()
  
  // If proxy is not configured, throw an error to use fallback
  if (!proxyUrl) {
    throw new Error('PROXY_NOT_CONFIGURED')
  }
  
  // Build proxy request URL
  const proxyRequestUrl = `${proxyUrl}?url=${encodeURIComponent(targetUrl)}`
  
  // Create fetch with timeout
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), options?.timeout || 15000)
  
  try {
    const response = await fetch(proxyRequestUrl, {
      method: options?.method || 'GET',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
      },
    })
    
    clearTimeout(timeoutId)
    
    if (!response.ok) {
      const errorText = await response.text()
      let errorMessage = `프록시 오류: HTTP ${response.status}`
      
      try {
        const errorJson = JSON.parse(errorText)
        if (errorJson.error) {
          errorMessage = `프록시 오류: ${errorJson.error}${errorJson.message ? ` - ${errorJson.message}` : ''}`
        }
      } catch {
        // If not JSON, use the status code message
      }
      
      throw new Error(errorMessage)
    }
    
    return await response.text()
  } catch (error) {
    clearTimeout(timeoutId)
    
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error('프록시 요청 시간 초과')
      }
      throw error
    }
    
    throw new Error('프록시 요청 중 알 수 없는 오류가 발생했습니다')
  }
}

/**
 * Check if proxy is configured and available
 * @returns true if proxy is configured
 */
export function isProxyConfigured(): boolean {
  return getProxyUrl() !== null
}
