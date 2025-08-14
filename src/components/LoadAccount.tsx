import { useState } from 'react'
import { Button } from './ui/button'
import { Card } from './ui/card'
import { Key } from 'lucide-react'

interface LoadAccountProps {
  onLoad: (mnemonic: string) => void
  isLoading?: boolean
  error?: string
}

export const LoadAccount = ({ onLoad, isLoading = false, error }: LoadAccountProps) => {
  const [mnemonic, setMnemonic] = useState('')

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText()
      setMnemonic(text)
    } catch (e) {
      // Optionally handle clipboard error
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onLoad(mnemonic.trim())
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-2 py-2 sm:px-4 sm:py-4">
      <Card className="w-full max-w-xs sm:max-w-sm space-y-8 p-6 rounded-2xl shadow-md">
        <div className="text-center space-y-3">
          <Key className="w-8 h-8 mx-auto text-app-primary mb-2" />
          <h2 className="text-xl font-bold text-app-primary">Load your Account</h2>
          <p className="text-base text-app-secondary">Enter your Recovery Phrase to load your account. You can paste it from your clipboard.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <textarea
            className="w-full h-24 p-3 rounded-xl border border-app focus:outline-none focus:ring-2 focus:ring-blue-500 text-base font-mono"
            placeholder="Paste your recovery phrase here..."
            value={mnemonic}
            onChange={e => setMnemonic(e.target.value)}
            disabled={isLoading}
          />
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={handlePaste} disabled={isLoading}>
              Paste from Clipboard
            </Button>
            <Button type="submit" className="flex-1" disabled={isLoading || !mnemonic.trim()}>
              {isLoading ? 'Loading...' : 'Load Account'}
            </Button>
          </div>
          {error && <p className="text-sm text-red-500 text-center mt-2">{error}</p>}
        </form>
      </Card>
    </div>
  )
}
