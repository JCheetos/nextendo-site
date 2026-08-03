// Root layout — required by Next.js. All actual rendering happens in
// src/app/[locale]/layout.tsx. The root layout stays empty because we
// need the locale-aware <html> tag (lang, dir) inside the locale segment.
import type { ReactNode } from 'react'
import './globals.css'

export default function RootLayout({ children }: { children: ReactNode }) {
  return children
}
