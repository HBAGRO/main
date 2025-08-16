import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'AI Chatbot',
  description: 'Supabase ile güçlendirilmiş AI chatbot uygulaması',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
