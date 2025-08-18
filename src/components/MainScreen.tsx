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
  const { activities, loading, error, isEmpty, loadMore, hasNextPage } = useIndexerActivities()

  const renderScreen = () => {
    switch (currentScreen) {
      case 'home':
        return (
          <ScreenLayout>
            {loading ? (
              <ActivityFeed activities={[]} loading={true} />
            ) : error ? (
              <ActivityFeed activities={[]} error="Failed to load activities" />
            ) : (
              <ActivityFeed activities={activities} onLoadMore={loadMore} hasNextPage={hasNextPage} />
            )}
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
            {loading ? (
              <div className="flex-1 flex items-center justify-center min-h-[60vh]">
                <p className="text-app-secondary">Loading activities...</p>
              </div>
            ) : error ? (
              <div className="flex-1 flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                  <p className="text-app-secondary mb-2">Failed to load activities</p>
                  <p className="text-sm text-app-tertiary">Check your connection and try again</p>
                </div>
              </div>
            ) : isEmpty ? (
              <div className="flex-1 flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                  <p className="text-app-secondary mb-2">No activities yet</p>
                  <p className="text-sm text-app-tertiary">Start by making a deposit to see your activity history</p>
                </div>
              </div>
            ) : (
              <ActivityFeed activities={activities} />
            )}
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