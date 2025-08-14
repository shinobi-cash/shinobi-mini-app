/**
 * Setup Progress Indicator
 * Displays current progress through the setup flow
 */

import { useState, useEffect, useRef } from 'react'
import { RotateCcw, MoreVertical } from 'lucide-react'
import { useSetupStore } from '@/stores/setupStore'
import type { SetupStep } from '@/types/setup'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

export function SetupProgress() {
  const { getCurrentStepConfig, resetSetup, setCurrentStep, environmentType } = useSetupStore()
  const isFarcaster = environmentType === 'farcaster' || environmentType === 'iframe'
  // Use correct steps for each environment
  const stepsOrder: SetupStep[] = isFarcaster
    ? ['generate-keys', 'backup-mnemonic']
  : ['generate-keys', 'backup-mnemonic']
  const stepConfig = getCurrentStepConfig()
  const currentStepId = stepConfig.id
  const currentIndex = stepsOrder.indexOf(currentStepId)
  const progress = Math.round(((currentIndex + 1) / stepsOrder.length) * 100)
  const canGoBack = currentIndex > 0 && currentStepId !== 'complete'

  const handleBack = () => {
    if (canGoBack) {
      setCurrentStep(stepsOrder[currentIndex - 1] as SetupStep)
    }
  }
  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  
  // ...existing code...
  
  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false)
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])
  
  const handleReset = () => {
    resetSetup()
    setShowMenu(false)
    toast.success('Setup reset successfully', {
      description: 'Starting fresh account setup'
    })
  }

  return (
    <div className="bg-app-header backdrop-blur-md border-b border-app-border">
      <div className="px-4 sm:px-6 py-3 sm:py-4">
        {/* Mobile-first header layout */}
        <div className="flex items-center justify-between mb-2 sm:mb-3">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {canGoBack && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBack}
                className="h-8 w-8 p-0 mr-2"
                aria-label="Back"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </Button>
            )}
            <div>
              <h1 className="text-base sm:text-lg font-semibold text-app-primary truncate">
                {stepConfig.title}
              </h1>
              <p className="text-xs sm:text-sm text-app-secondary truncate">
                {stepConfig.description}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 ml-4 flex-shrink-0">
            <div className="text-xs sm:text-sm font-medium text-app-primary">
              {progress}%
            </div>
            <div className="relative" ref={menuRef}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowMenu(!showMenu)}
                className="h-6 w-6 p-0 hover:bg-app-surface"
              >
                <MoreVertical className="w-4 h-4" />
              </Button>
              {showMenu && (
                <div className="absolute right-0 top-8 bg-app-surface border border-app-border rounded-lg shadow-lg z-50 min-w-[140px]">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleReset}
                    className="w-full justify-start h-8 px-3 rounded-md text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <RotateCcw className="w-3 h-3 mr-2" />
                    Reset Setup
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Mobile-optimized progress bar */}
        <Progress 
          value={progress} 
          className="h-1 sm:h-1.5 bg-app-border" 
        />
      </div>
    </div>
  )
}