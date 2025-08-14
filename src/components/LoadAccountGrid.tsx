import { useState } from 'react'
import { Button } from './ui/button'
import { Card } from './ui/card'
import { Key } from 'lucide-react'

interface LoadAccountGridProps {
  onLoad: (mnemonic: string[]) => void
  isLoading?: boolean
  error?: string
  onClose?: () => void
}

export const LoadAccountGrid = ({ onLoad, isLoading = false, error, onClose }: LoadAccountGridProps) => {
  const [words, setWords] = useState<string[]>(Array(12).fill(''))

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText()
      const pastedWords = text.trim().split(/\s+/)
      if (pastedWords.length === 12) {
        setWords(pastedWords)
      } else {
        // Optionally show error for invalid phrase
      }
    } catch (e) {
      // Optionally handle clipboard error
    }
  }

  const handleChange = (idx: number, value: string) => {
    const updated = [...words]
    updated[idx] = value.trim()
    setWords(updated)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (words.every(w => w)) {
      onLoad(words)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <Card className="w-full max-w-md mx-auto p-6 rounded-2xl shadow-lg">
        <div className="text-center space-y-3 mb-6">
          <Key className="w-8 h-8 mx-auto text-app-primary mb-2" />
          <h2 className="text-xl font-bold text-app-primary">Load your Account</h2>
          <p className="text-base text-app-secondary">Enter your Recovery Phrase to load your account. You can paste it from your clipboard.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-3 gap-2 mb-2">
            {words.map((word, idx) => (
              <input
                key={idx}
                type="text"
                className="p-2 rounded-lg border border-app text-base font-mono text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={`Word ${idx + 1}`}
                value={word}
                onChange={e => handleChange(idx, e.target.value)}
                disabled={isLoading}
                autoComplete="off"
              />
            ))}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={handlePaste} disabled={isLoading}>
              Paste Recovery Phrase
            </Button>
            <Button type="submit" className="flex-1" disabled={isLoading || !words.every(w => w)}>
              {isLoading ? 'Loading...' : 'Load Account'}
            </Button>
          </div>
          {error && <p className="text-sm text-red-500 text-center mt-2">{error}</p>}
          {onClose && (
            <Button type="button" variant="ghost" className="w-full mt-2" onClick={onClose}>
              Cancel
            </Button>
          )}
        </form>
      </Card>
    </div>
  )
}
