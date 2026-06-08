import type { Metadata } from 'next'
import './globals.css'
import Nav from '@/components/nav'

export const metadata: Metadata = {
  title: 'FitAI — Your AI Fitness Coach',
  description: 'Track workouts, nutrition, and progress with AI-powered insights.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen" style={{ background: '#FFFFFF', color: '#0F172A' }}>
        <Nav />
        {/* Offset for desktop sidebar */}
        <main className="md:ml-56 pb-20 md:pb-0 min-h-screen">
          {children}
        </main>
      </body>
    </html>
  )
}
