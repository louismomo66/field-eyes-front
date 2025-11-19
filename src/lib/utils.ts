import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

const rawBasePath = process.env.NEXT_PUBLIC_BASE_PATH || ""
const normalizedBasePath = rawBasePath
  ? `/${rawBasePath.replace(/^\/+|\/+$/g, "")}`
  : ""

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getBasePath(): string {
  return normalizedBasePath
}

export function withBasePath(path: string): string {
  if (path.startsWith("http") || path.startsWith("data:")) {
    return path
  }

  const basePath = getBasePath()
  const normalizedPath = path.startsWith("/") ? path : `/${path}`

  if (!basePath) {
    return normalizedPath
  }

  if (normalizedPath.startsWith(basePath)) {
    return normalizedPath
  }

  return `${basePath}${normalizedPath}`
}

// Backwards compatible helper for assets/static URLs
export const getAssetPath = withBasePath
