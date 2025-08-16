import { useState } from 'react'
import { Button } from './ui/button'
import { 
  Drawer, 
  DrawerContent, 
  DrawerHeader, 
  DrawerTitle,
  DrawerClose 
} from './ui/drawer'
import { Key, X, Download, Copy, Eye, EyeOff, Check, FileText, Sparkles } from 'lucide-react'
import { useSetupStore } from '../stores/setupStore'
import { generateKeysFromRandomSeed } from '../utils/crypto'
import { toast } from 'sonner'

type CreateAccountStep = 'intro' | 'generating' | 'backup' | 'complete'

interface CreateAccountDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const CreateAccountDrawer = ({ open, onOpenChange }: CreateAccountDrawerProps) => {
  const [currentStep, setCurrentStep] = useState<CreateAccountStep>('intro')
  const [isGenerating, setIsGenerating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentTask, setCurrentTask] = useState('')
  const [isRevealed, setIsRevealed] = useState(false)
  const [hasConfirmed, setHasConfirmed] = useState(false)
  const [hasCopied, setHasCopied] = useState(false)
  const [canDownload, setCanDownload] = useState(true)
  
  const { setKeys, mnemonic, completeSetup } = useSetupStore()

  const handleGenerateKeys = async () => {
    setCurrentStep('generating')
    setIsGenerating(true)
    setProgress(0)
    
    try {
      // Simulate progress for better UX
      const tasks = [
        { name: 'Generating entropy...', duration: 600 },
        { name: 'Creating mnemonic...', duration: 700 },
        { name: 'Deriving keys...', duration: 500 },
        { name: 'Validating security...', duration: 400 },
      ]
      
      let completedProgress = 0
      for (let i = 0; i < tasks.length; i++) {
        const task = tasks[i]
        setCurrentTask(task.name)
        const taskProgress = 100 / tasks.length
        const startProgress = completedProgress
        
        await new Promise(resolve => {
          const interval = setInterval(() => {
            completedProgress += taskProgress / 20
            setProgress(Math.min(completedProgress, startProgress + taskProgress))
            if (completedProgress >= startProgress + taskProgress) {
              clearInterval(interval)
              resolve(void 0)
            }
          }, task.duration / 20)
        })
      }
      
      setCurrentTask('Finalizing keys...')
      const randomSeed = Math.random().toString(36).slice(2)
      const keys = await generateKeysFromRandomSeed(randomSeed)
      setKeys(keys)
      setProgress(100)
      setCurrentTask('Keys generated successfully!')
      
      toast.success('Account created successfully!')
      
      setTimeout(() => {
        setCurrentStep('backup')
      }, 1500)
    } catch (error) {
      console.error('Failed to generate keys:', error)
      toast.error('Failed to generate keys. Please try again.')
      setCurrentStep('intro')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleCopyMnemonic = async () => {
    if (!mnemonic) return
    
    try {
      await navigator.clipboard.writeText(mnemonic.join(' '))
      setHasCopied(true)
      toast.success('Recovery phrase copied to clipboard')
      setTimeout(() => setHasCopied(false), 3000)
    } catch (error) {
      toast.error('Failed to copy to clipboard')
    }
  }

  const handleDownloadMnemonic = () => {
    if (!mnemonic || !canDownload) {
      toast.error('Download not available')
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

Shinobi Privacy App`

      const blob = new Blob([content], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `shinobi-recovery-${Date.now()}.txt`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      toast.success('Recovery phrase downloaded')
    } catch (error) {
      toast.error('Failed to download file')
    }
  }

  const handleCompleteSetup = () => {
    if (!hasConfirmed) {
      toast.error('Please confirm you have backed up your recovery phrase')
      return
    }
    
    completeSetup()
    setCurrentStep('complete')
    
    setTimeout(() => {
      onOpenChange(false)
      // Reset state for next time
      setCurrentStep('intro')
      setIsRevealed(false)
      setHasConfirmed(false)
      setHasCopied(false)
    }, 2000)
  }

  const renderContent = () => {
    switch (currentStep) {
      case 'intro':
        return (
          <div className="space-y-4">
            {/* Introduction */}
            <div className="bg-app-surface rounded-xl p-4 border border-app shadow-sm">
              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-3 flex items-center justify-center rounded-full bg-blue-100">
                  <Sparkles className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-app-primary mb-2">Create New Account</h3>
                <p className="text-sm text-app-secondary mb-4">
                  We'll generate a secure recovery phrase for your new account. This phrase is the only way to recover your account, so you'll need to back it up safely.
                </p>
                <div className="text-left space-y-2 text-xs text-app-tertiary">
                  <p>• ✅ Your keys are generated locally</p>
                  <p>• ✅ We never see your recovery phrase</p>
                  <p>• ✅ You have full control of your account</p>
                </div>
              </div>
            </div>

            <Button 
              onClick={handleGenerateKeys}
              className="w-full"
              size="lg"
            >
              <Key className="w-4 h-4 mr-2" />
              Generate Keys
            </Button>
          </div>
        )

      case 'generating':
        return (
          <div className="space-y-4">
            <div className="bg-app-surface rounded-xl p-4 border border-app shadow-sm">
              <div className="text-center">
                <div className="w-full h-2 bg-gray-200 rounded-full mb-4">
                  <div
                    className="h-2 bg-blue-500 rounded-full transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-sm font-medium text-app-primary text-center mb-2">
                  {currentTask || 'Preparing key generation...'}
                </p>
                <p className="text-xs text-app-secondary">
                  Please wait while we generate your secure keys...
                </p>
              </div>
            </div>
          </div>
        )

      case 'backup':
        return (
          <div className="space-y-4">
            {/* Mnemonic Display */}
            <div className="bg-app-surface rounded-xl p-3 border border-app shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-app-primary">
                  Your 12 Words
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsRevealed(!isRevealed)}
                  className="h-8 w-8 p-0 rounded-full"
                >
                  {isRevealed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>

              {isRevealed && mnemonic ? (
                <div>
                  <div className="mb-3">
                    <div className="grid grid-cols-3 gap-2">
                      {mnemonic.map((word, index) => (
                        <div 
                          key={index}
                          className="bg-app-background rounded-lg p-2 text-center border border-app"
                        >
                          <span className="text-xs text-app-tertiary block mb-0.5">
                            {index + 1}
                          </span>
                          <span className="font-mono text-xs text-app-primary font-medium">
                            {word}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button 
                      variant="outline"
                      onClick={handleCopyMnemonic}
                      className="flex-1 h-10 rounded-xl text-sm"
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
                  className="py-8 flex items-center justify-center cursor-pointer bg-app-background/60 rounded-xl border-2 border-dashed border-gray-300 hover:border-gray-400 transition-all"
                  onClick={() => setIsRevealed(true)}
                >
                  <div className="text-center space-y-3">
                    <div className="w-12 h-12 mx-auto flex items-center justify-center rounded-full bg-orange-100">
                      <FileText className="w-6 h-6 text-orange-600" />
                    </div>
                    <div className="flex items-center gap-2 justify-center">
                      <Eye className="w-4 h-4 text-app-tertiary" />
                      <p className="text-sm text-app-secondary">
                        Tap to reveal
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Confirmation */}
            <div className="bg-app-surface rounded-xl p-3 border border-app shadow-sm">
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
                  className="text-sm text-app-secondary cursor-pointer"
                >
                  I've saved my recovery phrase securely
                </label>
              </div>
            </div>

            <Button 
              onClick={handleCompleteSetup}
              disabled={!hasConfirmed}
              className="w-full"
              size="lg"
            >
              Complete Setup
            </Button>
          </div>
        )

      case 'complete':
        return (
          <div className="space-y-4">
            <div className="bg-app-surface rounded-xl p-4 border border-app shadow-sm">
              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-3 flex items-center justify-center rounded-full bg-green-100">
                  <Check className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-app-primary mb-2">Account Created!</h3>
                <p className="text-sm text-app-secondary">
                  Your account has been created successfully. You can now start using Shinobi for private transactions.
                </p>
              </div>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  const getTitle = () => {
    switch (currentStep) {
      case 'intro': return 'Create Account'
      case 'generating': return 'Generating Keys'
      case 'backup': return 'Backup Recovery Phrase'
      case 'complete': return 'Setup Complete'
      default: return 'Create Account'
    }
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="bg-app-background border-app max-h-[85vh]">
        {/* iOS-style drag handle */}
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-app-tertiary/30" />
        
        <DrawerHeader className="pb-0 px-4 pt-2">
          <div className="flex items-center justify-between">
            <DrawerTitle className="text-lg font-semibold text-app-primary tracking-tight">
              {getTitle()}
            </DrawerTitle>
            {currentStep === 'intro' || currentStep === 'complete' ? (
              <DrawerClose className="rounded-full h-7 w-7 flex items-center justify-center bg-app-surface hover:bg-app-surface-hover transition-colors duration-200">
                <X className="h-3.5 w-3.5 text-app-secondary" />
              </DrawerClose>
            ) : null}
          </div>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto px-4 pb-6">
          {renderContent()}
        </div>
      </DrawerContent>
    </Drawer>
  )
}