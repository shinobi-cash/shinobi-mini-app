import { LaunchScreen } from "@/components/LaunchScreen"
import { ThemeProvider } from "@/contexts/ThemeContext"
import { AuthProvider } from "@/contexts/AuthContext"

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <LaunchScreen />
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App;