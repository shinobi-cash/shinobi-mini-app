import { LaunchScreen } from "@/components/LaunchScreen"
import { ThemeProvider } from "@/contexts/ThemeContext"
import { AuthProvider } from "@/contexts/AuthContext"
import { ErrorBoundary } from "@/components/ErrorBoundary"

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <LaunchScreen />
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  )
}

export default App;