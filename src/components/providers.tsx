'use client'

import { SessionProvider } from 'next-auth/react'
import { ThemeProvider } from 'next-themes'
import { LayoutProvider } from '@/contexts/layout-context'
import { UserDataProvider } from '@/lib/userdata/provider'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider refetchOnWindowFocus={false}>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange={false}
        storageKey="eduskript-theme"
        themes={['light', 'dark', 'system']}
      >
        <UserDataProvider>
          <LayoutProvider>
            {children}
          </LayoutProvider>
        </UserDataProvider>
      </ThemeProvider>
    </SessionProvider>
  )
}
