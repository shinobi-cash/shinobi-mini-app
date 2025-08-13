import { useTheme } from '../contexts/ThemeContext'
import { Moon, Sun } from 'lucide-react'

export const AppHeader = () => {
  const { theme, toggleTheme } = useTheme()
  
  return (
    <div className="sticky top-0 z-50 border-b border-app py-4 px-4 bg-app-header backdrop-blur-md">
      <div className="flex items-center justify-between">
        <div className="w-8" /> {/* Spacer */}
        <h1 className="text-3xl font-semibold tracking-tight text-app-primary">Shinobi</h1>
        <button 
          onClick={toggleTheme}
          className="w-8 h-8 rounded-full bg-app-surface-hover flex items-center justify-center hover:bg-app-surface active:scale-95 transition-all"
        >
          {theme === 'light' ? (
            <Moon className="w-4 h-4 text-app-secondary" />
          ) : (
            <Sun className="w-4 h-4 text-app-secondary" />
          )}
        </button>
      </div>
    </div>
  )
}