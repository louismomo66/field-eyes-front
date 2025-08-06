/**
 * Client-side only authentication utilities
 * These functions should only be called in client components
 */

import { jwtDecode } from 'jwt-decode'

interface TokenPayload {
  user_id: number
  email: string
  role: string
  exp: number
}

/**
 * Get token from local storage (client-side only)
 */
export function getToken(): string | null {
  return localStorage.getItem('token')
}

/**
 * Set token in local storage (client-side only)
 */
export function setToken(token: string): void {
  localStorage.setItem('token', token)
}

/**
 * Remove token from local storage (client-side only)
 */
export function removeToken(): void {
  localStorage.removeItem('token')
}

/**
 * Handle token expiration (client-side only)
 */
export function handleTokenExpiration(): void {
  removeToken()
  window.location.href = '/login'
}

/**
 * Check if current user is admin (client-side only)
 */
export function isAdmin(): boolean {
  try {
    const token = getToken()
    if (!token) return false
    
    const decoded = jwtDecode<TokenPayload>(token)
    
    // Check if token is expired
    if (decoded.exp * 1000 < Date.now()) {
      removeToken()
      return false
    }
    
    return decoded.role === 'admin'
  } catch (error) {
    console.error('Error checking admin status:', error)
    return false
  }
}

/**
 * Check if user is authenticated (client-side only)
 */
export function isAuthenticated(): boolean {
  try {
    const token = getToken()
    if (!token) return false
    
    const decoded = jwtDecode<TokenPayload>(token)
    
    // Check if token is expired
    if (decoded.exp * 1000 < Date.now()) {
      removeToken()
      return false
    }
    
    return true
  } catch (error) {
    console.error('Error checking authentication:', error)
    return false
  }
}

/**
 * Log out user (client-side only)
 */
export function logout(): void {
  removeToken()
  window.location.href = '/login'
}