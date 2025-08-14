import { useTheme } from '../contexts/ThemeContext'
import { Moon, Sun } from 'lucide-react'

export const AppHeader = () => {
  const { theme, toggleTheme } = useTheme()
  
  return (
    <header className="sticky top-0 z-50 border-b border-app py-3 px-2 sm:py-4 sm:px-4 bg-app-header backdrop-blur-md">
      <div className="flex items-center justify-between">
        <div className="w-10" /> {/* Spacer for alignment */}
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-app-primary font-sans">Shinobi</h1>
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
    </header>
  )
}