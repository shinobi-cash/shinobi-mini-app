import { LaunchScreen } from "@/components/LaunchScreen"
import { ThemeProvider } from "@/contexts/ThemeContext"
import { AuthProvider, useAuth } from "@/contexts/AuthContext"
import { ErrorBoundary } from "@/components/ErrorBoundary"
import { QuickAuthModal } from "@/components/auth/QuickAuthModal"
import { Toaster } from "sonner"

function AppContent() {
  const { isRestoringSession } = useAuth();

  if (isRestoringSession) {
    return (
      <div className="min-h-screen bg-app-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-app-secondary">Restoring your session...</p>
        </div>
      </div>
    );
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