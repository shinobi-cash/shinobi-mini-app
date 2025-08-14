import { useAuth } from '../contexts/AuthContext'
import { useState } from 'react'
import { useSetupStore } from '../stores/setupStore'
import { SetupFlow } from './setup/SetupFlow'

import { User } from 'lucide-react'
import { LoadAccountGrid } from './LoadAccountGrid'
import { Button } from './ui/button'

export const ProfileScreen = () => {
  const { isAuthenticated, signOut } = useAuth()
  const { currentStep, setCurrentStep, setKeys, completeSetup } = useSetupStore()
  const [showLoadAccount, setShowLoadAccount] = useState(false)
  const [loadError, setLoadError] = useState<string | undefined>()

  // Simulate mnemonic to keys/address (replace with real crypto in production)
  function deriveKeysFromMnemonic(mnemonic: string[]): { publicKey: string, privateKey: string, address: string } {
    // For demo: join words, hash, and mock keys
    const seed = mnemonic.join('-')
    return {
      publicKey: 'pub_' + seed.slice(0, 16),
      privateKey: 'priv_' + seed.slice(0, 16),
      address: '0x' + seed.replace(/[^a-zA-Z0-9]/g, '').slice(0, 40)
    }
  }

  const handleLoad = (mnemonicWords: string[]) => {
    if (!mnemonicWords || mnemonicWords.length !== 12 || mnemonicWords.some(w => !w)) {
      setLoadError('Please enter all 12 words of your recovery phrase.')
      return
    }
    setLoadError(undefined)
    const { publicKey, privateKey, address } = deriveKeysFromMnemonic(mnemonicWords)
    setKeys({ publicKey, privateKey, mnemonic: mnemonicWords, address })
    completeSetup()
    setShowLoadAccount(false)
  }
  if (!isAuthenticated) {
    // Only show onboarding if user has started it (currentStep !== null)
    if (currentStep !== null) {
      return <SetupFlow />;
    }

    // Always show welcome screen until onboarding starts
    return (
      <div className="h-full flex flex-col items-center justify-center">
        <div className="w-full max-w-sm mx-auto flex flex-col items-center justify-center px-4 py-10">
          <h2 className="text-2xl font-bold mb-4 text-center text-app-primary dark:text-app-primary font-sans">Welcome to Shinobi</h2>
          <p className="text-base mb-8 text-center text-app-secondary dark:text-app-secondary">Choose how you want to get started:</p>
          <div className="w-full flex flex-col gap-4">
            <Button
              variant="default"
              className="w-full h-12 text-base font-medium rounded-2xl"
              onClick={() => setCurrentStep('generate-keys')}
              size="lg"
            >
              Create Account
            </Button>
            <Button
              variant="outline"
              className="w-full h-12 text-base font-medium rounded-2xl border border-app"
              onClick={() => setShowLoadAccount(true)}
              size="lg"
            >
              Load Account
            </Button>
          </div>
          {showLoadAccount && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
              <LoadAccountGrid onLoad={handleLoad} error={loadError} onClose={() => setShowLoadAccount(false)} />
            </div>
          )}
        </div>
      </div>
    );
  }
  return <AuthenticatedProfile onSignOut={signOut} />
}


const AuthenticatedProfile = ({ onSignOut }: { onSignOut: () => void }) => (
  <div className="flex flex-col items-center justify-center h-full gap-8 px-4 py-10">
    <div className="w-16 h-16 mb-4 flex items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30">
      <User className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
    </div>
    <h2 className="text-2xl font-bold text-center text-app-primary font-sans mb-2">Welcome, User!</h2>
    <div className="w-full max-w-xs flex flex-col gap-4">
      <Button
        className="w-full h-12 rounded-2xl text-base font-medium"
        size="lg"
        onClick={() => window.location.href = '/deposit'}
      >
        Go to Deposit
      </Button>
      <Button
        className="w-full h-12 rounded-2xl text-base font-medium"
        size="lg"
        onClick={() => window.location.href = '/'}
      >
        Go to Home
      </Button>
      <Button
        onClick={onSignOut}
        variant="destructive"
        className="w-full h-12 rounded-2xl text-base font-medium"
        size="lg"
      >
        Sign Out
      </Button>
    </div>
  </div>
)