import { MainScreen } from "@/components/screens/MainScreen"
import { SplashScreen } from "@/components/SplashScreen"
import { ThemeProvider } from "@/contexts/ThemeContext"
import { AuthProvider, useAuth } from "@/contexts/AuthContext"
import { BannerProvider } from "@/contexts/BannerContext"
import { TransactionTrackingProvider } from "@/components/layout/AppBanner"
import { ErrorBoundary } from "@/components/ErrorBoundary"
import { PasswordAuthDrawer } from "@/components/features/auth/PasswordAuthDrawer"
import { useEffect } from "react"
import { sdk } from '@farcaster/miniapp-sdk'

function AppContent() {
  const { isRestoringSession, quickAuthState } = useAuth();

  // Call ready() immediately to hide Farcaster native splash screen
  useEffect(() => {
    sdk.actions.ready().catch(console.error);
  }, []);

  // Show custom splash screen during session restoration
  if (isRestoringSession) {
    return (
      <>
        <SplashScreen subtitle="Restoring your session..." />
        {quickAuthState?.show && <PasswordAuthDrawer />}
      </>
    );
  }

  // Show normal app after session restoration is complete
  return (
    <>
      <MainScreen />
      <PasswordAuthDrawer />
    </>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <BannerProvider>
          <AuthProvider>
            <TransactionTrackingProvider>
              <AppContent />
            </TransactionTrackingProvider>
          </AuthProvider>
        </BannerProvider>
      </ThemeProvider>
    </ErrorBoundary>
  )
}

export default App;