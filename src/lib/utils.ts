import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Add our base path prefix utility
export function getAssetPath(path: string): string {
  // For static assets like images that aren't handled by Next.js Link component
  // we need to manually add the basePath
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '/app';
  
  // If the path already starts with the basePath or is an absolute URL, return it as is
  if (path.startsWith(basePath) || path.startsWith('http') || path.startsWith('data:')) {
    return path;
  }
  
  // Make sure we don't double up on slashes
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${basePath}${normalizedPath}`;
}
