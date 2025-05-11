import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Sensors for Precision Agriculture',
  description: 'Smart sensors for precision agriculture',
  generator: 'v0.dev',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/Sponsor.png', type: 'image/png' }
    ],
    apple: '/Sponsor.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
