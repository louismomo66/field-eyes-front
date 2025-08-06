import { jwtDecode } from 'jwt-decode'
import { User } from '@/types/field-eyes'

interface TokenPayload {
  user_id: number
  email: string
  role: string
  exp: number
}

// Functions for token management
export function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('token')
}

export function setToken(token: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem('token', token)
}

export function removeToken(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem('token')
}

export function handleTokenExpiration(): void {
  removeToken()
  if (typeof window !== 'undefined') {
    window.location.href = '/login'
  }
}

// Keep this for backward compatibility
export function getTokenFromStorage(): string | null {
  return getToken()
}

export function getUserFromToken(): User | null {
  const token = getTokenFromStorage()
  if (!token) return null

  try {
    const decoded = jwtDecode<TokenPayload>(token)
    
    // Check if token is expired
    if (decoded.exp * 1000 < Date.now()) {
      localStorage.removeItem('token')
      return null
    }

    return {
      id: decoded.user_id,
      name: '', // Name not included in token, would need separate call
      email: decoded.email,
      role: decoded.role,
      created_at: '',
      updated_at: ''
    }
  } catch (error) {
    console.error('Error decoding token:', error)
    localStorage.removeItem('token')
    return null
  }
}

export function isAdmin(): boolean {
  try {
    // Only run on client side
    if (typeof window === 'undefined') return false
    
    const user = getUserFromToken()
    return user?.role === 'admin'
  } catch (error) {
    console.error('Error in isAdmin check:', error)
    return false
  }
}

export function isAuthenticated(): boolean {
  try {
    // Only run on client side
    if (typeof window === 'undefined') return false
    
    const user = getUserFromToken()
    return user !== null
  } catch (error) {
    console.error('Error in isAuthenticated check:', error)
    return false
  }
}

export function logout() {
  try {
    // Only run on client side
    if (typeof window === 'undefined') return
    
    localStorage.removeItem('token')
    window.location.href = '/login'
  } catch (error) {
    console.error('Error in logout:', error)
  }
}