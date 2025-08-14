/**
 * Generate & Backup Step
 * Combines key generation and mnemonic backup into one flow
 */

import { useState, useEffect } from 'react'
import { Copy, Eye, EyeOff, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useSetupStore } from '@/stores/setupStore'
import { generateKeysFromRandomSeed } from '@/utils/crypto'
import { toast } from 'sonner'

export function GenerateAndBackupStep() {
  const {
  // ...existing code...
    setKeys,
    mnemonic,
    setCurrentStep
  } = useSetupStore()
  const [isGenerating, setIsGenerating] = useState(false)
  const [isRevealed, setIsRevealed] = useState(false)
  const [hasCopied, setHasCopied] = useState(false)
  // Removed unused canDownload

  // Removed unused canDownload effect

  useEffect(() => {
    if (!mnemonic && !isGenerating) {
      handleGenerateKeys()
    }
  }, [mnemonic, isGenerating])

  const handleGenerateKeys = async () => {
    setIsGenerating(true)
    try {
      const randomSeed = Math.random().toString(36).slice(2);
      const keys = await generateKeysFromRandomSeed(randomSeed);
      setKeys(keys);
      toast.success('Keys generated!');
    } catch (err) {
      toast.error('Failed to generate keys');
    } finally {
      setIsGenerating(false);
    }
  } 

  const handleCopyMnemonic = async () => {
    if (!mnemonic) return;
    try {
      await navigator.clipboard.writeText(mnemonic.join(' '));
      setHasCopied(true);
      toast.success('Recovery phrase copied to clipboard', {
        description: 'Paste it in a secure location',
      });
    } catch (e) {
      toast.error('Failed to copy');
    }
  } 

  const handleContinue = () => {
    setCurrentStep('complete')
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
      <div className="w-full max-w-sm mx-auto flex flex-col items-center space-y-8">
        <div className="text-center space-y-6">
          <div className="text-8xl">🔑</div>
          <h1 className="text-2xl font-bold text-app-primary">Generate & Backup</h1>
          <p className="text-app-secondary">Your recovery phrase is shown below. Save it securely.</p>
        </div>
        <div className="w-full space-y-4">
          <div className="bg-app-surface rounded-xl p-4 text-center">
            {mnemonic ? (
              <>
                <div className="mb-2">
                  <Button variant="ghost" size="sm" onClick={() => setIsRevealed(!isRevealed)}>
                    {isRevealed ? <EyeOff className="w-4 h-4 mr-1" /> : <Eye className="w-4 h-4 mr-1" />}
                    {isRevealed ? 'Hide' : 'Reveal'}
                  </Button>
                </div>
                <div className={`font-mono text-base text-app-primary mb-2 ${isRevealed ? '' : 'blur-sm select-none'}`}>{mnemonic.join(' ')}</div>
                <Button variant="outline" size="sm" onClick={handleCopyMnemonic}>
                  <Copy className="w-4 h-4 mr-1" />
                  {hasCopied ? 'Copied!' : 'Copy'}
                </Button>
              </>
            ) : (
              <div className="text-app-secondary">Generating recovery phrase...</div>
            )}
          </div>
          <Button
            onClick={handleContinue}
            className="w-full h-12 text-base font-medium rounded-2xl shadow-sm"
            size="lg"
            disabled={!mnemonic}
          >
            <Check className="w-5 h-5 mr-2" />
            Continue
          </Button>
        </div>
      </div>
    </div>
  )
}
