/**
 * Screen Layout Component
 * Provides consistent layout structure with safe area between header and bottom nav
 */

import React from 'react'

interface ScreenLayoutProps {
  children: React.ReactNode
  className?: string
}

export function ScreenLayout({ children, className = '' }: ScreenLayoutProps) {
  return (
    <div className={`
      flex-1 
      flex 
      flex-col 
      overflow-hidden
      min-h-0
      ${className}
    `}>
      {/* 
        Content area that stays within safe bounds
        - pb-20: Bottom padding to account for fixed bottom nav (80px base)
        - pb-safe-area-bottom: Additional padding for devices with home indicators
        - scrollbar-hide: Hide scrollbars for cleaner mobile experience
      */}
      <div className="
        flex-1 
        overflow-auto
        pb-24
        scrollbar-hide
        supports-[padding-bottom:env(safe-area-inset-bottom)]:pb-[calc(6rem+env(safe-area-inset-bottom))]
      ">
        {children}
      </div>
    </div>
  )
}

/**
 * Full Screen Layout Component
 * For screens that need to manage their own scrolling (like setup flows)
 */
export function FullScreenLayout({ children, className = '' }: ScreenLayoutProps) {
  return (
    <div className={`
      h-screen 
      bg-app-background 
      flex 
      flex-col 
      overflow-hidden
      ${className}
    `}>
      {children}
    </div>
  )
}

/**
 * Screen Container Component
 * Standard container for screen content with proper mobile-first responsive design
 */
interface ScreenContainerProps {
  children: React.ReactNode
  className?: string
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl'
  padding?: 'sm' | 'md' | 'lg'
}

export function ScreenContainer({ 
  children, 
  className = '',
  maxWidth = 'md',
  padding = 'md'
}: ScreenContainerProps) {
  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md', 
    lg: 'max-w-lg',
    xl: 'max-w-xl'
  }
  
  const paddingClasses = {
    sm: 'p-3 sm:p-4',
    md: 'p-4 sm:p-6', 
    lg: 'p-6 sm:p-8'
  }

  return (
    <div className={`
      w-full 
      ${maxWidthClasses[maxWidth]} 
      mx-auto 
      ${paddingClasses[padding]}
      ${className}
    `}>
      {children}
    </div>
  )
}