import { useEffect, useRef } from "react";
import { CONTRACTS } from "../../config/constants";
import { NavigationProvider } from "../../contexts/NavigationContext";
import { useActivities } from "../../hooks/data/useActivities";
import { showToast } from "../../lib/toast";
import { PoolDashboard } from "../features/pool/PoolDashboard";
import { AppBanner } from "../layout/AppBanner";
import { AppHeader } from "../layout/AppHeader";
import { AppLayout } from "../layout/ScreenLayout";
import { type ScreenConfig, ScreenManager } from "../layout/ScreenManager";
import { DepositScreen } from "./DepositScreen";
import { MyNotesScreen } from "./MyNotesScreen";

/**
 * Home Screen View Controller - Pool Dashboard
 */
function HomeScreenController() {
  const lastErrorRef = useRef<string | null>(null);

  const { activities, loading, error, fetchMore, hasNextPage, refetch, hasData } = useActivities({
    poolId: CONTRACTS.ETH_PRIVACY_POOL,
    limit: 10,
  });

  // Show toast error when we have data but error on refresh
  useEffect(() => {
    const errorMessage = error?.message || null;

    if (errorMessage && hasData && errorMessage !== lastErrorRef.current) {
      showToast.error("Failed to refresh activities");
      lastErrorRef.current = errorMessage;
    } else if (!errorMessage) {
      lastErrorRef.current = null;
    }
  }, [error?.message, hasData]);

  return (
    <PoolDashboard
      activities={activities || []}
      loading={loading}
      error={error && !hasData ? "Failed to load activities" : undefined}
      hasNextPage={hasNextPage}
      onFetchMore={async () => {
        await fetchMore?.();
      }}
      onRefresh={async () => {
        await refetch?.();
      }}
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
    title: "Pool",
    scrollable: true,
  },
  {
    id: "deposit",
    component: DepositScreen,
    title: "Deposit",
    scrollable: true,
  },
  {
    id: "my-notes",
    component: MyNotesScreen,
    title: "My Notes",
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
    <AppLayout header={<AppHeader />} banner={<AppBanner />}>
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
