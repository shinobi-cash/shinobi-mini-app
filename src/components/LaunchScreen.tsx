import { useState, useEffect } from 'react'
import { sdk } from '@farcaster/frame-sdk'
import { SplashScreen } from './SplashScreen'
import { MainScreen } from './MainScreen'

// Main component
export function LaunchScreen() {
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    sdk.actions.ready().then(() => {
      setTimeout(() => {
        setIsReady(true)
      }, 2000)
    })
  }, [])

  return isReady ? <MainScreen /> : <SplashScreen />
}