import { useTheme } from '../contexts/ThemeContext'
import { Moon, Sun } from 'lucide-react'
import { WalletDropdown } from './WalletDropdown'

export const AppHeader = () => {
  const { theme, toggleTheme } = useTheme()
  
  return (
    <header className="sticky top-0 z-50 border-b border-app py-3 px-2 sm:py-4 sm:px-4 bg-app-header">
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
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-app-primary font-sans text-center">shinobi.cash</h1>
        <div className="flex justify-end">
          <WalletDropdown />
        </div>
      </div>
    </header>
  )
}