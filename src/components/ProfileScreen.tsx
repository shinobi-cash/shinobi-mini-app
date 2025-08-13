import { useAuth } from '../contexts/AuthContext'
import { Fingerprint, ChevronRight } from 'lucide-react'

export const ProfileScreen = () => {
  const { isAuthenticated, signInWithPasskey, createPasskey, signOut, isLoading } = useAuth()

  if (!isAuthenticated) {
    return <UnauthenticatedProfile onSignIn={signInWithPasskey} onCreate={createPasskey} isLoading={isLoading} />
  }

  return <AuthenticatedProfile onSignOut={signOut} />
}

const UnauthenticatedProfile = ({ 
  onSignIn, 
  onCreate, 
  isLoading 
}: { 
  onSignIn: () => void
  onCreate: () => void
  isLoading: boolean
}) => (
  <div className="flex flex-col h-full px-4">
    {/* Centered Content */}
    <div className="flex-1 flex flex-col items-center justify-center">
      <div className="text-8xl mb-8">🔐</div>
      
      <div className="w-full space-y-3">
        <button
          onClick={onSignIn}
          disabled={isLoading}
          className="w-full bg-blue-600 text-white py-4 rounded-2xl font-semibold active:scale-95 transition-all disabled:opacity-50"
        >
          <div className="flex items-center justify-center space-x-2">
            <Fingerprint className="w-5 h-5" />
            <span>Sign In</span>
          </div>
        </button>

        <button
          onClick={onCreate}
          disabled={isLoading}
          className="w-full bg-app-surface border border-app text-app-primary py-4 rounded-2xl font-semibold active:scale-95 transition-all disabled:opacity-50"
        >
          Create Passkey
        </button>
      </div>
    </div>
  </div>
)

const AuthenticatedProfile = ({ onSignOut }: { onSignOut: () => void }) => (
  <div className="flex flex-col h-full">
    {/* Profile Header */}
    <div className="px-4 py-8 text-center">
      <div className="text-6xl mb-4">🥷</div>
      <h2 className="text-2xl font-semibold text-app-primary">Ninja</h2>
    </div>

    {/* Settings List - Apple Style */}
    <div className="px-4 flex-1">
      <div className="bg-app-surface rounded-xl overflow-hidden border border-app">
        <button className="w-full p-4 flex items-center justify-between active:bg-app-surface-hover">
          <div className="flex items-center space-x-3">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-app-primary">Passkey</span>
          </div>
          <ChevronRight className="w-5 h-5 text-app-tertiary" />
        </button>
        
        <div className="border-t border-app"></div>
        
        <button className="w-full p-4 flex items-center justify-between active:bg-app-surface-hover">
          <div className="flex items-center space-x-3">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-app-primary">Privacy Keys</span>
          </div>
          <ChevronRight className="w-5 h-5 text-app-tertiary" />
        </button>
      </div>
    </div>

    {/* Sign Out */}
    <div className="px-4 pb-4">
      <button
        onClick={onSignOut}
        className="w-full bg-red-500 text-white py-4 rounded-2xl font-semibold active:scale-95 transition-all"
      >
        Sign Out
      </button>
    </div>
  </div>
)