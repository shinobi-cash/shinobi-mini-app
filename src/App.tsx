import { LaunchScreen } from "@/components/LaunchScreen"
import { ThemeProvider } from "@/contexts/ThemeContext"
import { AuthProvider } from "@/contexts/AuthContext"
import { ErrorBoundary } from "@/components/ErrorBoundary"
import { Toaster } from "sonner"

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <LaunchScreen />
          <Toaster richColors position="top-center" />
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  )
}

export default App;