import { useTheme } from '../contexts/ThemeContext'
import { Moon, Sun, LogOut } from 'lucide-react'
import { useAccount, useDisconnect } from 'wagmi'

export const AppHeader = () => {
  const { theme, toggleTheme } = useTheme()
  const { isConnected } = useAccount()
  const { disconnect } = useDisconnect()
  
  return (
    <header className="sticky top-0 z-50 border-b border-app py-3 px-2 sm:py-4 sm:px-4 bg-app-header backdrop-blur-md">
      <div className="grid grid-cols-3 items-center">
        <div className="flex justify-start">
          <button 
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="w-10 h-10 rounded-full bg-app-surface-hover flex items-center justify-center hover:bg-app-surface active:scale-95 transition-all shadow-sm"
          >
            {theme === 'light' ? (
              <Moon className="w-5 h-5 text-app-secondary" />
            ) : (
              <Sun className="w-5 h-5 text-app-secondary" />
            )}
          </button>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-app-primary font-sans text-center">Shinobi</h1>
        <div className="flex justify-end">
          {isConnected && (
            <button 
              onClick={() => disconnect()}
              aria-label="Disconnect wallet"
              className="w-10 h-10 rounded-full bg-app-surface-hover flex items-center justify-center hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 active:scale-95 transition-all shadow-sm"
            >
              <LogOut className="w-4 h-4 text-app-secondary hover:text-red-600" />
            </button>
          )}
        </div>
      </div>
    </header>
  )
}