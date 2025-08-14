/**
 * Backup Mnemonic Step
 * Displays and handles backup of the recovery phrase
 */

import { useState, useEffect } from 'react'
import { Download, Copy, Eye, EyeOff, Check, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useSetupStore } from '@/stores/setupStore'
import { toast } from 'sonner'

export function BackupMnemonicStep() {
  const { mnemonic, completeSetup } = useSetupStore()
  const [isRevealed, setIsRevealed] = useState(false)
  const [hasConfirmed, setHasConfirmed] = useState(false)
  const [hasCopied, setHasCopied] = useState(false)
  const [canDownload, setCanDownload] = useState(true)

  useEffect(() => {
    // Check if we're in a sandboxed iframe that doesn't allow downloads
    if (window.parent !== window) {
      setCanDownload(false)
    }
  }, [])

  if (!mnemonic) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-app-secondary">No mnemonic found. Please restart the setup.</p>
      </div>
    )
  }

  const handleCopyMnemonic = async () => {
    try {
      await navigator.clipboard.writeText(mnemonic.join(' '))
      setHasCopied(true)
      toast.success('Recovery phrase copied to clipboard', {
        description: 'Paste it in a secure location'
      })
      
      // Reset copy state after 3 seconds
      setTimeout(() => setHasCopied(false), 3000)
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
      
      let errorMessage = 'Failed to copy to clipboard'
      
      if (error instanceof Error) {
        if (error.message.includes('permission')) {
          errorMessage = 'Clipboard permission denied. Please copy manually.'
        } else if (error.message.includes('secure')) {
          errorMessage = 'Clipboard not available. Use download instead.'
        }
      }
      
      toast.error(errorMessage, {
        duration: 4000,
        action: canDownload ? {
          label: 'Download Instead',
          onClick: () => handleDownloadMnemonic()
        } : undefined
      })
    }
  }

  const handleDownloadMnemonic = () => {
    if (!canDownload) {
      toast.error('Downloads not available in this environment', {
        description: 'Please copy the phrase manually'
      })
      return
    }
    
    try {
      const content = `Shinobi Recovery Phrase

IMPORTANT: Keep this phrase secure and private. Anyone with access to this phrase can control your account.

Recovery Phrase:
${mnemonic.join(' ')}

Generated: ${new Date().toISOString()}

Instructions:
1. Store this phrase in a secure location
2. Never share it with anyone
3. You'll need all 12 words in the correct order to recover your account
4. If you lose this phrase, your account cannot be recovered

Shinobi Privacy App - https://shinobi.privacy.app`

      const blob = new Blob([content], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `shinobi-recovery-${Date.now()}.txt`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      toast.success('Recovery phrase downloaded', {
        description: 'File saved to your downloads folder'
      })
    } catch (error) {
      console.error('Failed to download recovery phrase:', error)
      toast.error('Failed to download file. Please copy manually.', {
        action: {
          label: 'Try Copy',
          onClick: () => handleCopyMnemonic()
        }
      })
    }
  }

  const handleCompleteSetup = () => {
    if (!hasConfirmed) {
      toast.error('Please confirm you have backed up your recovery phrase', {
        description: 'Check the box to continue',
        duration: 3000
      })
      return
    }
    toast.success('Setup almost complete!', {
      description: 'Finishing account creation...'
    })
    completeSetup()
  }

  return (
    <div className="h-full flex flex-col justify-center px-2 py-2 sm:px-4 sm:py-4 font-sans">
      <div className="w-full max-w-xs sm:max-w-sm mx-auto flex flex-col">
        {/* Mnemonic container */}
        <div className="mb-4">
          <div className="bg-app-surface dark:bg-app-surface rounded-2xl p-3">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm-app font-medium text-app-primary">
                Your 12 Words
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsRevealed(!isRevealed)}
                className="h-8 w-8 p-0 rounded-full"
              >
                <EyeOff className="w-4 h-4" />
              </Button>
            </div>

            {isRevealed ? (
              <div>
                {/* 4x3 grid for 12 words */}
                <div className="mb-3">
                  <div className="grid grid-cols-4 gap-1.5">
                    {mnemonic.map((word, index) => (
                      <div 
                        key={index}
                        className="bg-app-surface dark:bg-app-surface rounded-lg p-1.5 text-center border border-gray-200 dark:border-gray-600"
                      >
                        <span className="text-xs-app text-app-tertiary block mb-0.5">
                          {index + 1}
                        </span>
                        <span className="font-mono text-xs-app text-app-primary font-medium">
                          {word}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Action buttons */}
                <div className="flex gap-2">
                  <Button 
                    variant="outline"
                    onClick={handleCopyMnemonic}
                    className={`${canDownload ? 'flex-1' : 'w-full'} h-10 rounded-xl text-sm`}
                  >
                    {hasCopied ? (
                      <>
                        <Check className="w-4 h-4 mr-1" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 mr-1" />
                        Copy
                      </>
                    )}
                  </Button>
                  {canDownload && (
                    <Button 
                      variant="outline"
                      onClick={handleDownloadMnemonic}
                      className="flex-1 h-10 rounded-xl text-sm"
                    >
                      <Download className="w-4 h-4 mr-1" />
                      Save
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div 
                className="py-8 flex items-center justify-center cursor-pointer backdrop-blur-sm bg-app-surface/60 dark:bg-app-surface/60 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 transition-all"
                onClick={() => setIsRevealed(true)}
              >
                <div className="text-center space-y-3">
                  <div className="w-12 h-12 mx-auto flex items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/30">
                    <FileText className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div className="flex items-center gap-2 justify-center">
                    <Eye className="w-4 h-4 text-app-tertiary" />
                    <p className="text-sm-app text-app-secondary">
                      Tap to reveal
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Confirmation */}
  <div className="bg-app-surface dark:bg-app-surface rounded-2xl p-3 mb-4">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="backup-confirmation"
              checked={hasConfirmed}
              onChange={(e) => setHasConfirmed(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-2 border-gray-300 rounded focus:ring-blue-500 flex-shrink-0"
            />
            <label 
              htmlFor="backup-confirmation"
              className="text-sm-app text-app-secondary cursor-pointer"
            >
              I've saved my recovery phrase
            </label>
          </div>
        </div>

        {/* Continue button */}
        <Button 
          onClick={handleCompleteSetup}
          disabled={!hasConfirmed}
          className="w-full h-12 text-base font-medium rounded-2xl shadow-sm"
          size="lg"
        >
          Continue
        </Button>
      </div>
    </div>
  )
}