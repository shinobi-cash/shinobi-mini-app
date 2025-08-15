import { AppHeader } from './AppHeader'
import { ActivityFeed } from './ActivityFeed'
import { ProfileScreen } from './ProfileScreen'
import { DepositScreen } from './DepositScreen'
import { BottomNavBar } from './BottomNavBar'
import { ScreenLayout, ScreenContainer } from './layout/ScreenLayout'
import { NavigationProvider, useNavigation } from '../contexts/NavigationContext'
import { MOCK_ACTIVITIES } from '../data/mockActivities'

const MainContent = () => {
  const { currentScreen } = useNavigation()

  const renderScreen = () => {
    switch (currentScreen) {
      case 'home':
        return (
          <ScreenLayout>
            <ActivityFeed activities={MOCK_ACTIVITIES} />
          </ScreenLayout>
        )
      case 'deposit':
        return (
          <ScreenLayout>
            <DepositScreen />
          </ScreenLayout>
        )
      case 'history':
        return (
          <ScreenLayout>
            <ScreenContainer>
              <div className="flex-1 flex items-center justify-center min-h-[60vh]">
                <p className="text-app-secondary">History Screen (Coming Soon)</p>
              </div>
            </ScreenContainer>
          </ScreenLayout>
        )
      case 'profile':
        return (
          <ScreenLayout>
            <ProfileScreen />
          </ScreenLayout>
        )
      default:
        return (
          <ScreenLayout>
            <ActivityFeed activities={MOCK_ACTIVITIES} />
          </ScreenLayout>
        )
    }
  }

  return (
    <main className="min-h-screen bg-app-background flex flex-col font-sans text-[system-ui]">
      <AppHeader />
      <section className="flex-1 flex flex-col px-2 py-2 sm:px-4 sm:py-4 overflow-y-auto">
        {renderScreen()}
      </section>
      <BottomNavBar />
    </main>
  )
}

export const MainScreen = () => (
  <NavigationProvider>
    <MainContent />
  </NavigationProvider>
)