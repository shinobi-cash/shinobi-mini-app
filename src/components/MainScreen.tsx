import { AppHeader } from './AppHeader'
import { ActivityFeed } from './ActivityFeed'
import { ProfileScreen } from './ProfileScreen'
import { DepositScreen } from './DepositScreen'
import { WithdrawalScreen } from './WithdrawalScreen'
import { BottomNavBar } from './BottomNavBar'
import { ScreenLayout } from './layout/ScreenLayout'
import { NavigationProvider, useNavigation } from '../contexts/NavigationContext'
import { useIndexerActivities } from '../hooks/useIndexerActivities'

const MainContent = () => {
  const { currentScreen } = useNavigation()
  const {
    activities,
    loading,
    error,
    loadMore,
    hasNextPage,
    refresh,
  } = useIndexerActivities()

  const renderScreen = () => {
    switch (currentScreen) {
      case 'home':
        return (
          <ScreenLayout>
            <ActivityFeed
              activities={activities}
              loading={loading}
              error={error ? 'Failed to load activities' : undefined}
              hasNextPage={hasNextPage}
              onFetchMore={() => loadMore?.() ?? Promise.resolve()} 
              onRefresh={() => refresh?.() ?? Promise.resolve()}  
            />
          </ScreenLayout>
        )
      case 'deposit':
        return (
          <ScreenLayout>
            <DepositScreen />
          </ScreenLayout>
        )
      case 'withdraw':
        return (
          <ScreenLayout>
            <WithdrawalScreen />
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
            <div className="flex-1 flex items-center justify-center min-h-[60vh]">
              <p className="text-app-secondary">Unknown screen</p>
            </div>
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
