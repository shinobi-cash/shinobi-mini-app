import { useTheme } from '../contexts/ThemeContext'
import { Moon, Sun } from 'lucide-react'
import { WalletDropdown } from './WalletDropdown'
import { Switch } from './ui/switch'

export const AppHeader = () => {
  const { effectiveTheme, toggleTheme } = useTheme()
  
  return (
    <header className="sticky top-0 z-50 border-b border-app py-3 px-2 sm:py-4 sm:px-4 bg-app-header">
      <div className="grid grid-cols-3 items-center">
        <div className="flex justify-start">
          <Switch 
            checked={effectiveTheme === 'dark'}
            onCheckedChange={toggleTheme}
            aria-label="Toggle dark mode"
            className="data-[state=checked]:bg-slate-700 data-[state=unchecked]:bg-amber-200"
            checkedIcon={<Moon className="w-3 h-3 text-slate-700" />}
            uncheckedIcon={<Sun className="w-3 h-3 text-amber-500" />}
          />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-app-primary font-sans text-center">shinobi.cash</h1>
        <div className="flex justify-end">
          <WalletDropdown />
        </div>
      </div>
    </header>
  )
}