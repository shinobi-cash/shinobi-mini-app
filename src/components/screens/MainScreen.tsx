import { NavigationProvider } from "../../contexts/NavigationContext";
import { useIndexerActivities } from "../../hooks/data/useIndexerActivities";
import { ActivityFeed } from "../features/profile/ActivityFeed";
import { AppBanner } from "../layout/AppBanner";
import { AppHeader } from "../layout/AppHeader";
import { BottomNavBar } from "../layout/BottomNavBar";
import { AppLayout } from "../layout/ScreenLayout";
import { type ScreenConfig, ScreenManager } from "../layout/ScreenManager";
import { DepositScreen } from "./DepositScreen";
import { ProfileScreen } from "./ProfileScreen";
import { WithdrawalScreen } from "./WithdrawalScreen";

/**
 * Home Screen View Controller
 */
function HomeScreenController() {
  const { activities, loading, error, loadMore, hasNextPage, refresh } = useIndexerActivities();

  return (
    <ActivityFeed
      activities={activities}
      loading={loading}
      error={error ? "Failed to load activities" : undefined}
      hasNextPage={hasNextPage}
      onFetchMore={() => loadMore?.() ?? Promise.resolve()}
      onRefresh={() => refresh?.() ?? Promise.resolve()}
    />
  );
}

/**
 * Screen Registry - Define all available screens
 */
const screenRegistry: ScreenConfig[] = [
  {
    id: "home",
    component: HomeScreenController,
    title: "Activity",
    scrollable: true,
  },
  {
    id: "deposit",
    component: DepositScreen,
    title: "Deposit",
    scrollable: true,
  },
  {
    id: "withdraw",
    component: WithdrawalScreen,
    title: "Withdraw",
    scrollable: true,
  },
  {
    id: "profile",
    component: ProfileScreen,
    title: "Profile",
    scrollable: true,
  },
];

/**
 * Fallback Screen - Shown when screen not found
 */
function FallbackScreen() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-app-primary mb-2">Screen Not Found</h2>
        <p className="text-app-secondary">The requested screen could not be found.</p>
      </div>
    </div>
  );
}

/**
 * Main Screen Content - Uses Native App Layout
 */
function MainContent() {
  return (
    <AppLayout header={<AppHeader />} banner={<AppBanner />} bottomNav={<BottomNavBar />}>
      <ScreenManager screens={screenRegistry} fallbackScreen={FallbackScreen} />
    </AppLayout>
  );
}

/**
 * Main Screen with Navigation Provider
 */
export const MainScreen = () => (
  <NavigationProvider>
    <MainContent />
  </NavigationProvider>
);
