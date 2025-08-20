import { useState, useEffect, useRef } from 'react'
import { Button } from './ui/button'
import { 
  Drawer, 
  DrawerContent, 
  DrawerHeader, 
  DrawerTitle,
  DrawerClose, 
  DrawerDescription
} from './ui/drawer'
import { X } from 'lucide-react'

interface LoadAccountDrawerProps {
  onLoad: (mnemonic: string[]) => void
  isLoading?: boolean
  error?: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const LoadAccountDrawer = ({ onLoad, isLoading = false, error, open, onOpenChange }: LoadAccountDrawerProps) => {
  const [words, setWords] = useState<string[]>(Array(12).fill(''))
  const firstInputRef = useRef<HTMLInputElement>(null)

  // Manage focus when drawer opens/closes
  useEffect(() => {
    if (open) {
      // Delay focus to ensure drawer animation completes and DOM is ready
      const timer = setTimeout(() => {
        if (firstInputRef.current) {
          firstInputRef.current.focus()
        }
      }, 200)
      return () => clearTimeout(timer)
    }
  }, [open])

  const handlePaste = (e: React.ClipboardEvent, idx: number) => {
    e.preventDefault()
    const pastedText = e.clipboardData.getData('text/plain')
    const pastedWords = pastedText.trim().split(/\s+/)
    
    if (pastedWords.length === 12) {
      // Full seed phrase pasted - populate all fields
      setWords(pastedWords)
    } else if (pastedWords.length === 1) {
      // Single word pasted - just update current field
      const updated = [...words]
      updated[idx] = pastedWords[0].trim()
      setWords(updated)
    }
    // For other lengths, ignore the paste to prevent partial corruption
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
    <Drawer open={open} onOpenChange={onOpenChange} modal={true}>
      <DrawerContent className="bg-app-background border-app max-h-[85vh]">
        <DrawerHeader className="pb-0 px-4 pt-2">
          <div className="flex items-center justify-between">
            <DrawerTitle className="text-lg font-semibold text-app-primary capitalize tracking-tight">
              Load Account
            </DrawerTitle>
            <DrawerClose className="rounded-full h-7 w-7 flex items-center justify-center bg-app-surface hover:bg-app-surface-hover transition-colors duration-200">
              <X className="h-3.5 w-3.5 text-app-secondary" />
            </DrawerClose>
          </div>
          <DrawerDescription className="text-sm items-start text-app-secondary">  
            Enter your Recovery Phrase to load your account. You can paste the entire phrase into any field.
          </DrawerDescription>
        </DrawerHeader>
        
        <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-4">
          {/* Word Grid */}
          <div className="bg-app-surface rounded-xl p-3 border border-app shadow-sm">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-3 gap-2">
                {words.map((word, idx) => (
                  <div key={idx} className="flex flex-col">
                    <label className="text-xs font-medium text-app-secondary text-center mb-1">
                      {idx + 1}
                    </label>
                    <input
                      ref={idx === 0 ? firstInputRef : undefined}
                      type="text"
                      className="p-2 rounded-lg border border-app text-sm font-mono text-center focus:outline-none focus:ring-2 focus:ring-blue-500 bg-app-background"
                      placeholder="word"
                      value={word}
                      onChange={e => handleChange(idx, e.target.value)}
                      onPaste={e => handlePaste(e, idx)}
                      disabled={isLoading}
                      autoComplete="off"
                    />
                  </div>
                ))}
              </div>
              
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading || !words.every(w => w)}
              >
                {isLoading ? 'Loading...' : 'Load Account'}
              </Button>
              
              {error && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                  <p className="text-sm text-red-600 text-center">{error}</p>
                </div>
              )}
            </form>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  )
}