/**
 * Korean API Proxy Module
 * 
 * This module provides proxy functionality to access Korean government APIs
 * that have SSL/network issues when called directly from Vercel serverless functions.
 * 
 * The proxy server is deployed on Railway and handles:
 * - Korean Export-Import Bank Exchange Rate API (www.koreaexim.go.kr)
 * - UNI-PASS Customs API (unipass.customs.go.kr:38010)
 */

/**
 * Get proxy server URL from environment variable
 * Falls back to direct API calls if not configured
 */
export function getProxyServerUrl(): string | undefined {
  return process.env.PROXY_SERVER_URL
}

/**
 * Encode URL for proxy query parameter
 * @param url - The target URL to encode
 * @returns Encoded URL string
 */
export function encodeUrlForProxy(url: string): string {
  return encodeURIComponent(url)
}

/**
 * Fetch data through proxy server
 * @param targetUrl - The target URL to fetch
 * @param proxyUrl - The proxy server URL (optional, defaults to env variable)
 * @returns Promise with the response text
 */
export async function fetchThroughProxy(
  targetUrl: string,
  proxyUrl?: string
): Promise<string> {
  const proxy = proxyUrl || getProxyServerUrl()
  
  if (!proxy) {
    throw new Error('Proxy server URL is not configured')
  }
  
  const encodedUrl = encodeUrlForProxy(targetUrl)
  const proxyRequestUrl = `${proxy}/proxy?url=${encodedUrl}`
  
  const response = await fetch(proxyRequestUrl, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })
  
  if (!response.ok) {
    throw new Error(`Proxy request failed: ${response.status} ${response.statusText}`)
  }
  
  return await response.text()
}

/**
 * Check if proxy server is available and configured
 */
export function isProxyEnabled(): boolean {
  return !!getProxyServerUrl()
}
