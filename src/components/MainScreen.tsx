import { AppHeader } from './AppHeader'
import { ActivityFeed } from './ActivityFeed'
import { ProfileScreen } from './ProfileScreen'
import { BottomNavBar } from './BottomNavBar'
import { NavigationProvider, useNavigation } from '../contexts/NavigationContext'
import { MOCK_ACTIVITIES } from '../data/mockActivities'

const MainContent = () => {
  const { currentScreen } = useNavigation()

  const renderScreen = () => {
    switch (currentScreen) {
      case 'home':
        return <ActivityFeed activities={MOCK_ACTIVITIES} />
      case 'deposit':
        return <div className="flex-1 flex items-center justify-center"><p className="text-app-secondary">Deposit Screen (Coming Soon)</p></div>
      case 'history':
        return <div className="flex-1 flex items-center justify-center"><p className="text-app-secondary">History Screen (Coming Soon)</p></div>
      case 'profile':
        return <ProfileScreen />
      default:
        return <ActivityFeed activities={MOCK_ACTIVITIES} />
    }
  }

  return (
    <div className="h-screen bg-app-background flex flex-col overflow-hidden">
      <AppHeader />
      <div className="flex-1 min-h-0 overflow-hidden">
        {renderScreen()}
      </div>
      <BottomNavBar />
    </div>
  )
}

export const MainScreen = () => (
  <NavigationProvider>
    <MainContent />
  </NavigationProvider>
)