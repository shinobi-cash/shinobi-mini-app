import { Home, Plus, History, User } from 'lucide-react'
import { useNavigation } from '../contexts/NavigationContext'

interface NavItem {
  icon: React.ReactNode
  label: string
  screen: 'home' | 'deposit' | 'history' | 'profile'
}

const navItems: NavItem[] = [
  { icon: <Home className="w-6 h-6" />, label: 'Home', screen: 'home' },
  { icon: <Plus className="w-6 h-6" />, label: 'Deposit', screen: 'deposit' },
  { icon: <History className="w-6 h-6" />, label: 'History', screen: 'history' },
  { icon: <User className="w-6 h-6" />, label: 'Profile', screen: 'profile' },
]

export const BottomNavBar = () => {
  const { currentScreen, setCurrentScreen } = useNavigation()

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-app-surface/95 backdrop-blur-lg border-t border-app/50 pb-safe-area-bottom z-50">
      <div className="flex items-center justify-around">
        {navItems.map((item, index) => {
          const isActive = currentScreen === item.screen
          return (
            <button
              key={index}
              onClick={() => setCurrentScreen(item.screen)}
              className={`flex flex-col items-center space-y-1 py-2 px-4 min-w-0 flex-1 transition-colors duration-200 ${
                isActive
                  ? 'text-blue-600'
                  : 'text-gray-500 active:text-gray-700'
              }`}
            >
              <div className={`transition-all duration-200 ${isActive ? 'scale-110' : ''}`}>
                {item.icon}
              </div>
              <span className={`text-xs font-medium transition-colors duration-200 ${
                isActive 
                  ? 'text-blue-600' 
                  : 'text-gray-500'
              }`}>
                {item.label}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}