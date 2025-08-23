import { LaunchScreen } from "@/components/LaunchScreen"
import { SplashScreen } from "@/components/SplashScreen"
import { ThemeProvider } from "@/contexts/ThemeContext"
import { AuthProvider, useAuth } from "@/contexts/AuthContext"
import { ErrorBoundary } from "@/components/ErrorBoundary"
import { QuickAuthModal } from "@/components/auth/QuickAuthModal"
import { Toaster } from "sonner"

function AppContent() {
  const { isRestoringSession } = useAuth();

  if (isRestoringSession) {
    return <SplashScreen subtitle="Restoring your session..." />;
  }

  return (
    <>
      <LaunchScreen />
      <QuickAuthModal />
      <Toaster richColors position="top-center" />
    </>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  )
}

export default App;