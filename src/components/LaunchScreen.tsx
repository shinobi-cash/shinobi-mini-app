import { useState, useEffect } from 'react'
import { sdk } from '@farcaster/miniapp-sdk'
import { MainScreen } from './MainScreen'

// Main component
export function LaunchScreen() {
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    sdk.actions.ready().then(() => {
      setIsReady(true)
    })
  }, [])

  if (!isReady) {
    return <div />
  }

  return <MainScreen />
}