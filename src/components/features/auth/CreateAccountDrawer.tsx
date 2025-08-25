import { useState } from 'react'
import { 
  Drawer, 
  DrawerContent, 
  DrawerHeader, 
  DrawerTitle,
  DrawerDescription,
  DrawerClose, 
} from '../../ui/drawer'
import { Button } from '../../ui/button'
import { X, ChevronLeft } from 'lucide-react'
import { KeyGenerationResult } from '@/utils/crypto'
import { KeyGenerationSection } from './KeyGenerationSection'
import { BackupMnemonicSection } from './BackupMnemonicSection'
import SetupConvenientAuth from './SetupConvenientAuth'

type CreateAccountStep = 'KeyGeneration' | 'BackupMnemonic' | 'SetupConvenientAuth'

interface CreateAccountDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

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
          <KeyGenerationSection onKeyGenerationComplete={onKeyGenerationComplete} />
        )
      case 'BackupMnemonic':
        return (
          <BackupMnemonicSection
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