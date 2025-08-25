import { useState } from 'react'
import { Button } from './ui/button'
import { 
  Drawer, 
  DrawerContent, 
  DrawerHeader, 
  DrawerTitle,
  DrawerDescription,
  DrawerClose, 
} from './ui/drawer'
import { Key, X, Download, Copy, Eye, EyeOff, Check, FileText, ChevronLeft} from 'lucide-react'
import { generateKeysFromRandomSeed, KeyGenerationResult} from '../utils/crypto'
import { useBanner } from "@/contexts/BannerContext"
import SetupConvenientAuth from './auth/SetupConvenientAuth'
import { getEnvironmentType } from '@/utils/environment'

type CreateAccountStep = 'KeyGeneration' | 'BackupMnemonic' | 'SetupConvenientAuth'

interface CreateAccountDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

// Use centralized environment detection;

function KeyGeneration({ onKeyGenerationComplete }: {onKeyGenerationComplete: (keys: KeyGenerationResult) => void}) {
  const [progress, setProgress] = useState(0)
  const [currentTask, setCurrentTask] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const { banner } = useBanner()
  
  const handleGenerateKeys = async () => {
    setProgress(0)
    setIsGenerating(true)
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
      const keys = generateKeysFromRandomSeed(randomSeed)
      
      onKeyGenerationComplete(keys)
      setProgress(100)
      setCurrentTask('Keys generated successfully!')
      
    } catch (error) {
      console.error('Failed to generate keys:', error)
      banner.error('Key generation failed')
    } 
  }
  if (!isGenerating){
    return <div className="space-y-4">
      <div className="bg-app-surface rounded-xl p-4 border border-app shadow-sm">
        <div className="text-left">
          <p className="text-sm text-app-secondary mb-4">
            {`You will receive a secure recovery phrase. Please back it up safely—this is the only way to restore your account.`}
          </p>
          <div className="text-left space-y-2 text-xs text-app-tertiary">
            <p>• Your keys are generated locally</p>
            <p>• We never see your recovery phrase</p>
            <p>• You have full control of your account</p>
          </div>
        </div>
      </div>
      <Button 
        onClick={handleGenerateKeys}
        className="w-full"
        size="lg"
      >
        <Key className="w-4 h-4 mr-2" />
        Generate Key
      </Button>
    </div>
  }
  return (
    <div className="space-y-4">
      <div className="bg-app-surface rounded-xl p-4 border border-app shadow-sm">
        <div className="text-center">
          <div className="w-full h-2 bg-gray-200 rounded-full mb-4">
            <div
              className="h-2 bg-violet-500 rounded-full transition-all"
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
  );
}

function BackupMnemonic({
  generatedKeys,
  onBackupMnemonicComplete
}: {
  generatedKeys: KeyGenerationResult | null;
  onBackupMnemonicComplete: () => void
}) {

  const [isRevealed, setIsRevealed] = useState(false)
  const [hasConfirmed, setHasConfirmed] = useState(false)
  const [hasCopied, setHasCopied] = useState(false)
  const [canDownload] = useState(getEnvironmentType() === 'web' || getEnvironmentType() === 'standalone')
  const { banner } = useBanner()
  const displayMnemonic = generatedKeys?.mnemonic
  const handleCopyMnemonic = async () => {
    if (!displayMnemonic) return
    
    try {
      await navigator.clipboard.writeText(displayMnemonic.join(' '))
      setHasCopied(true)
      banner.success('Copied to clipboard')
      setTimeout(() => setHasCopied(false), 3000)
    } catch (error) {
      banner.error('Copy failed')
    }
  }
   const handleDownloadMnemonic = () => {
    if (!displayMnemonic || !canDownload) {
      banner.error('Download unavailable')
      return
    }
    
    try {
      const content = `Shinobi Recovery Phrase

          IMPORTANT: Keep this phrase secure and private. Anyone with access to this phrase can control your account.

          Recovery Phrase:
          ${displayMnemonic.join(' ')}

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
      
      banner.success('Download complete')
    } catch (error) {
      banner.error('Download failed')
    }
  }

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
            className="h-8 w-8 p-0"
          >
            {isRevealed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </Button>
        </div>

        {isRevealed && displayMnemonic ? (
          <div>
            <div className="mb-3">
              <div className="grid grid-cols-3 gap-1">
                {displayMnemonic.map((word, index) => (
                  <div 
                    key={index}
                    className="bg-app-background rounded-lg text-center border border-app"
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
            className="py-8 flex items-center justify-center cursor-pointer bg-orange-50 rounded-xl border-2 border-dashed border-orange-300 hover:border-orange-400 hover:bg-orange-100 transition-all"
            onClick={() => setIsRevealed(true)}
          >
            <div className="text-center space-y-3">
              <div className="w-12 h-12 mx-auto flex items-center justify-center rounded-full bg-orange-100">
                <FileText className="w-6 h-6 text-orange-600" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 justify-center">
                  <Eye className="w-4 h-4 text-orange-600" />
                  <p className="text-sm font-medium text-orange-600">
                    Tap to reveal recovery phrase
                  </p>
                </div>
                <p className="text-xs text-orange-600/80">
                  Required to continue
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
            disabled={!isRevealed}
            className="w-4 h-4 text-blue-600 border-2 border-gray-300 rounded focus:ring-blue-500 flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <label 
            htmlFor="backup-confirmation"
            className={`text-sm cursor-pointer ${!isRevealed ? 'text-app-tertiary' : 'text-app-secondary'}`}
          >
            I've saved my recovery phrase securely
          </label>
        </div>
      </div>

      <Button 
        onClick={onBackupMnemonicComplete}
        disabled={!isRevealed || !hasConfirmed}
        className="w-full"
        size="lg"
      >
        {!isRevealed ? 'Reveal Recovery Phrase First' : 'Continue to Setup'}
      </Button>
    </div>
  );
}

// --- Main Component ---
export const CreateAccountDrawer = ({ open, onOpenChange }: CreateAccountDrawerProps) => {
  const [currentStep, setCurrentStep] = useState<CreateAccountStep>('KeyGeneration')
  const [generatedKeys, setGeneratedKeys] = useState<KeyGenerationResult | null>(null)
  
  const onKeyGenerationComplete = (keys: KeyGenerationResult) => {
    setGeneratedKeys(keys)
    setCurrentStep('BackupMnemonic')
  }

  const onBackupMnemonicComplete = () => {
    setCurrentStep('SetupConvenientAuth')
  }

  const onSetupConvenientAuthComplete = () => {
    resetState()
    onOpenChange(false)
  }

  const resetState = () => {
    setCurrentStep('KeyGeneration')
    setGeneratedKeys(null)
  }

  const handleBack = () => {
    switch (currentStep) {
      case 'BackupMnemonic':
        setCurrentStep('KeyGeneration');
        break;
      case 'SetupConvenientAuth':
        setCurrentStep('BackupMnemonic');
        break;
      default:
        setCurrentStep('KeyGeneration');
    }
  }

  const canGoBack = currentStep !== 'KeyGeneration';

  const renderContent = () => {
    switch (currentStep) {
      case 'KeyGeneration':
        return (
          <KeyGeneration onKeyGenerationComplete={onKeyGenerationComplete} />
        )
      case 'BackupMnemonic':
        return (
          <BackupMnemonic
            generatedKeys={generatedKeys}
            onBackupMnemonicComplete={onBackupMnemonicComplete}
          />
        )
      case 'SetupConvenientAuth':
        return (
          <SetupConvenientAuth
            generatedKeys={generatedKeys}
            onSetupConvenientAuthComplete={onSetupConvenientAuthComplete}
          />
        )

      default:
        return null
    }
  }

  const getTitle = () => {
    switch (currentStep) {
      case 'KeyGeneration': return 'Generate Account Keys'
      case 'BackupMnemonic': return 'Backup Recovery Phrase'
      case 'SetupConvenientAuth': return 'Setup Passkey'
      default: return 'Create Account'
    }
  }

  const getDescription = () => {
    switch (currentStep) {
      case 'KeyGeneration': return 'Generate cryptographic keys locally'
      case 'BackupMnemonic': return 'Save your mnemonic phrase to recover account'
      case 'SetupConvenientAuth': return 'Choose your preferred authentication method for account access'
      default: return 'Create a new secure account'
    }
  }

  return (
    <Drawer 
      open={open} 
      onOpenChange={(newOpen) => {
        if (!newOpen) {
          resetState();
        }
        onOpenChange(newOpen);
      }}
    >
      <DrawerContent className="bg-app-background border-app max-h-[85vh]">
        {/* iOS-style drag handle */}
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-app-tertiary/30" />
        
        <DrawerHeader className="pb-0 px-4 pt-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {canGoBack && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBack}
                  className="h-8 w-8 p-0 hover:bg-app-surface-hover transition-colors duration-200"
                >
                  <ChevronLeft className="h-4 w-4 text-app-secondary" />
                </Button>
              )}
              <div className="flex-1">
                <DrawerTitle className="text-lg font-semibold text-app-primary tracking-tight text-left">
                  {getTitle()}
                </DrawerTitle>
                <DrawerDescription className="text-sm text-left text-app-secondary mt-1">
                  {getDescription()}
                </DrawerDescription>
              </div>
            </div>
            <DrawerClose className="h-8 w-8 flex items-center justify-center hover:bg-app-surface-hover transition-colors duration-200">
              <X className="h-4 w-4 text-app-secondary" />
            </DrawerClose>
          </div>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto px-4 pb-6">
          <div className="p-2">
            {renderContent()}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  )
}