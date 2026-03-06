import type { Metadata } from 'next'
import { DM_Sans, DM_Mono } from 'next/font/google'
import { Toaster } from 'react-hot-toast'
import './globals.css'

const dm = DM_Sans({
  subsets: ['latin'],
  variable: '--font-geist',
  weight: ['300', '400', '500', '600', '700'],
})
const dmDisplay = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm',
  weight: ['600', '700'],
})
const mono = DM_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  weight: ['400', '500'],
})

export const metadata: Metadata = {
  title: 'ITDesk — Soporte IT Interno',
  description: 'Sistema de tickets de soporte técnico para equipos de IT',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={`${dm.variable} ${dmDisplay.variable} ${mono.variable} scanline`}>
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: '#12151a',
              color: '#c9d1dc',
              border: '1px solid #1f2937',
              borderRadius: '6px',
              fontSize: '13px',
              fontFamily: 'var(--font-geist)',
            },
            success: { iconTheme: { primary: '#22c55e', secondary: '#12151a' } },
            error:   { iconTheme: { primary: '#ef4444', secondary: '#12151a' } },
          }}
        />
      </body>
    </html>
  )
}
