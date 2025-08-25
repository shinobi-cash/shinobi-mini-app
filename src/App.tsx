import { MainScreen } from "@/components/MainScreen"
import { SplashScreen } from "@/components/SplashScreen"
import { ThemeProvider } from "@/contexts/ThemeContext"
import { AuthProvider, useAuth } from "@/contexts/AuthContext"
import { TransactionTrackingProvider } from "@/components/AppBanner"
import { ErrorBoundary } from "@/components/ErrorBoundary"
import { PasswordAuthDrawer } from "@/components/auth/PasswordAuthDrawer"
import { Toaster } from "sonner"
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
      <Toaster richColors position="top-center" />
    </>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <TransactionTrackingProvider>
            <AppContent />
          </TransactionTrackingProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  )
}

export default App;