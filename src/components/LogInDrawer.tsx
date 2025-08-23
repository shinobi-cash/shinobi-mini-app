/**
 * Authentication Drawer - Environment-specific secure access
 * Shows passkey authentication in non-iframe environments
 * Shows password authentication in iframe/Farcaster environments
 * Follows mobile-first drawer design patterns
 */

import React, { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { 
  Drawer, 
  DrawerContent, 
  DrawerHeader, 
  DrawerTitle,
  DrawerClose,
  DrawerDescription
} from './ui/drawer';
import { X, Lock, Fingerprint } from 'lucide-react';
import { KeyGenerationResult, restoreFromMnemonic, validateMnemonic } from '../utils/crypto';
import { noteCache } from '../lib/noteCache';
import { AuthSection } from './auth/AuthSection';
import SetupConvenientAuth from './auth/SetupConvenientAuth';

interface LogInDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSessionInitialized: () => void;
}

type AuthStep = 'ChooseLoginMethod' | 'LoginWithConvenientAuth' | 'LoginWithBackupPhrase' | 'SetupConvenientAuth'

function LoginWithBackupPhrase( {onRecoverAccountKey}: {onRecoverAccountKey: (key: KeyGenerationResult) => void}) {
    // State for recovery
    const [words, setWords] = useState<string[]>(Array(12).fill(''))
    const firstInputRef = useRef<HTMLInputElement>(null)
    const [error, setError] = useState<string>()
    const [isProcessing, setIsProcessing] = useState(false)
    const handlePaste = (e: React.ClipboardEvent, idx: number) => {
      e.preventDefault()
      const pastedText = e.clipboardData.getData('text/plain')
      const pastedWords = pastedText.trim().split(/\s+/)
      
      if (pastedWords.length === 12) {
        // Full seed phrase pasted - populate all fields
        setWords(pastedWords)
      } else if (pastedWords.length === 1) {
        // Single word pasted - just update current field
        const updated = [...words]
        updated[idx] = pastedWords[0].trim()
        setWords(updated)
      }
      // For other lengths, ignore the paste to prevent partial corruption
    }
  
    const handleChange = (idx: number, value: string) => {
      const updated = [...words]
      updated[idx] = value.trim()
      setWords(updated)
    }

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      
      if (!words.every(w => w.trim())) {
        setError('Please enter all 12 words of your Login with Backup Phrase.');
        return;
      }

      // Validate mnemonic words using proper crypto validation
      if (!validateMnemonic(words)) {
        setError('Invalid Backup phrase. Please check your words and try again.');
        return;
      }

      setIsProcessing(true);

      try {
        // Restore account from mnemonic
        const restoredKey = restoreFromMnemonic(words);
        onRecoverAccountKey(restoredKey);
        
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Failed to recover account. Please try again.');
      } finally {
        setIsProcessing(false);
      }
    };

  return (
    <div className="space-y-4">
      <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-4">
        {/* Word Grid */}
        <div className="bg-app-surface rounded-xl p-3 border border-app shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              {words.map((word, idx) => (
                <div key={idx} className="flex flex-col">
                  <label className="text-xs font-medium text-app-secondary text-center mb-1">
                    {idx + 1}
                  </label>
                  <input
                    ref={idx === 0 ? firstInputRef : undefined}
                    type="text"
                    className="p-2 rounded-lg border border-app text-sm font-mono text-center focus:outline-none focus:ring-2 focus:ring-blue-500 bg-app-background"
                    placeholder="word"
                    value={word}
                    onChange={e => handleChange(idx, e.target.value)}
                    onPaste={e => handlePaste(e, idx)}
                    disabled={isProcessing}
                    autoComplete="off"
                  />
                </div>
              ))}
            </div>
            
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isProcessing || !words.every(w => w)}
            >
              {isProcessing ? 'Processing...' : 'Load Account'}
            </Button>
            
            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                <p className="text-sm text-red-600 text-center">{error}</p>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}

// Detect if running in iframe/Farcaster environment
const isIframeEnvironment = () => {
  try {
    return window.self !== window.top;
  } catch {
    return true; // If we can't access window.top, assume iframe
  }
};

export function LogInDrawer({ 
  open,
  onOpenChange,
}: LogInDrawerProps) {
  const [currentStep, setCurrentStep] = useState<AuthStep>('ChooseLoginMethod');
  const [isIframe] = useState(isIframeEnvironment());
  const [loginKey, setLoginKey] = useState<KeyGenerationResult | null>(null)
  const [hasEncryptedAccount, setHasEncryptedAccount] = useState(false);
  const [, setAvailableAccounts] = useState<string[]>([]);

  // Load available accounts when drawer opens
  useEffect(() => {
    if (open) {
      const loadAccounts = async () => {
        try {
          const accounts = await noteCache.listAccountNames();
          setAvailableAccounts(accounts);
          setHasEncryptedAccount(accounts.length > 0);
          
        } catch (error) {
          console.error('Failed to load accounts:', error);
        }
      };
      loadAccounts();
    }
  }, [open]);

  const onRecoverAccountKey = (key: KeyGenerationResult) => {
    setLoginKey(key);
    setCurrentStep('SetupConvenientAuth');
  };

   const onSetupConvenientAuthComplete = () => {
    resetState()
    onOpenChange(false)
  }

  const onLoginWithConvenientAuthComplete = () => {
    resetState()
    onOpenChange(false)
  }

  const resetState = () => {
    setCurrentStep('ChooseLoginMethod')
    setLoginKey(null)
  }

  const renderContent = () => {
    switch (currentStep) {
      case 'ChooseLoginMethod':
        return (
          <div className="space-y-4">

            {hasEncryptedAccount ? (
              <>
                <Button 
                  onClick={() => setCurrentStep('LoginWithConvenientAuth')}
                  className="w-full"
                  size="lg"
                >
                  {!isIframe ? (
                    <>
                      <Fingerprint className="w-4 h-4 mr-2" />
                      Continue with Passkey
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4 mr-2" />
                      Continue with Password
                    </>
                  )}
                </Button>

                <Button 
                  variant="outline"
                  onClick={() => setCurrentStep('LoginWithBackupPhrase')}
                  className="w-full"
                >
                  Continue with Backup Phrase
                </Button>
              </>
            ) : (
              <Button 
                variant="outline"
                onClick={() => setCurrentStep('LoginWithBackupPhrase')}
                className="w-full"
                size="lg"
              >
                 Continue with Backup Phrase
              </Button>
            )}
          </div>
        );

      case 'LoginWithConvenientAuth':
        return (
          <AuthSection 
            mode={'login'} 
            onSuccess={onLoginWithConvenientAuthComplete}
          />
        );
      
      case 'LoginWithBackupPhrase':
        return (
          <LoginWithBackupPhrase onRecoverAccountKey={onRecoverAccountKey} />
        );

      case 'SetupConvenientAuth':
        return (
          <SetupConvenientAuth 
            generatedKeys={loginKey} 
            onSetupConvenientAuthComplete={onSetupConvenientAuthComplete} 
          />
        );

      default:
        return null;
    }
  };

  const getTitle = () => {
    switch (currentStep) {
      case 'ChooseLoginMethod': return 'Choose Login Method'
      case 'LoginWithConvenientAuth': return !isIframe ? 'Passkey' : 'Password'
      case 'LoginWithBackupPhrase': return 'Account Recovery'
      case 'SetupConvenientAuth': return 'Setup Passkey'
      default: return 'Authentication'
    }
  };

  const getDescription = () => {
    switch (currentStep) {
      case 'ChooseLoginMethod': return 'Choose how you want to login to your account'
      case 'LoginWithConvenientAuth': return !isIframe ? 'Use biometric authentication' : 'Enter your password to continue'
      case 'LoginWithBackupPhrase': return 'Enter your 12-word backup phrase to recover access'
      case 'SetupConvenientAuth': return 'Configure convenient access for future logins'
      default: return ''
    }
  };

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
            <DrawerClose className="h-8 w-8 flex items-center justify-center hover:bg-app-surface-hover transition-colors duration-200">
              <X className="h-4 w-4 text-app-secondary" />
            </DrawerClose>
          </div>
          <DrawerDescription className="text-sm items-start text-app-secondary">
            {getDescription()}
          </DrawerDescription>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto px-4 pb-6">
          {renderContent()}

          <div className="text-center mt-4">
            <p className="text-xs text-app-tertiary">
              🔐 Your data is encrypted locally and never leaves your device
            </p>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}