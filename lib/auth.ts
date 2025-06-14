"use client"

// Token management utilities
const TOKEN_KEY = 'token'
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60 // 30 days in seconds

export const getToken = (): string | null => {
  if (typeof window === 'undefined') return null
  
  // Try localStorage first
  const localToken = localStorage.getItem(TOKEN_KEY)
  if (localToken) return localToken
  
  // Fallback to cookie
  const cookieToken = getCookie(TOKEN_KEY)
  if (cookieToken) {
    // Sync to localStorage if found in cookie
    localStorage.setItem(TOKEN_KEY, cookieToken)
    return cookieToken
  }
  
  return null
}

export const setToken = (token: string): void => {
  if (typeof window === 'undefined') return
  
  // Store in localStorage
  localStorage.setItem(TOKEN_KEY, token)
  
  // Store in cookie with 30 days expiration
  setCookie(TOKEN_KEY, token, COOKIE_MAX_AGE)
}

export const removeToken = (): void => {
  if (typeof window === 'undefined') return
  
  // Remove from localStorage
  localStorage.removeItem(TOKEN_KEY)
  
  // Remove cookie
  deleteCookie(TOKEN_KEY)
}

export const isAuthenticated = (): boolean => {
  return !!getToken()
}

// Cookie helper functions
const getCookie = (name: string): string | null => {
  if (typeof document === 'undefined') return null
  
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length === 2) {
    const cookieValue = parts.pop()?.split(';').shift()
    return cookieValue || null
  }
  return null
}

const setCookie = (name: string, value: string, maxAge: number): void => {
  if (typeof document === 'undefined') return
  
  document.cookie = `${name}=${value}; path=/; max-age=${maxAge}; SameSite=Strict`
}

const deleteCookie = (name: string): void => {
  if (typeof document === 'undefined') return
  
  document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT`
}

// Function to check if we're on the client side
export const isClient = (): boolean => {
  return typeof window !== 'undefined'
}

export const handleTokenExpiration = (): void => {
  if (typeof window === 'undefined') return
  
  // Remove the expired token
  removeToken()
  
  // Redirect to login page
  window.location.href = 'https://field-eyes.com/app/login'
} 