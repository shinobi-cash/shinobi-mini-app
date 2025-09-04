import type { KeyGenerationResult } from "@/utils/crypto";
import { Check, Copy, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { Button } from "../../ui/button";

interface BackupMnemonicSectionProps {
  generatedKeys: KeyGenerationResult | null;
  onBackupMnemonicComplete: () => void;
}

export function BackupMnemonicSection({ generatedKeys, onBackupMnemonicComplete }: BackupMnemonicSectionProps) {
  const [isRevealed, setIsRevealed] = useState(false);
  const [hasConfirmed, setHasConfirmed] = useState(false);
  const [hasCopied, setHasCopied] = useState(false);
  const displayMnemonic = generatedKeys?.mnemonic;

  const handleCopyMnemonic = async () => {
    if (!displayMnemonic) return;

    try {
      await navigator.clipboard.writeText(displayMnemonic.join(" "));
      setHasCopied(true);
      setTimeout(() => setHasCopied(false), 3000);
    } catch (error) {
      console.warn("Copy failed:", error);
      // Visual feedback will remain showing copy icon, indicating failure
    }
  };

  return (
    <div className="space-y-2">
      {/* Mnemonic Display */}
      <div className="bg-app-surface rounded-xl p-2 border border-app shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-app-primary">Your 12 Words</h3>
          <Button variant="ghost" size="sm" onClick={() => setIsRevealed(!isRevealed)} className="h-8 w-8 p-0">
            {isRevealed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </Button>
        </div>

        {isRevealed && displayMnemonic ? (
          <div>
            <div className="mb-3">
              <div className="grid grid-cols-3 gap-1">
                {displayMnemonic.map((word, index) => (
                  <div key={word} className="bg-app-background rounded-lg text-center border border-app">
                    <span className="text-xs text-app-tertiary block mb-0.5">{index + 1}</span>
                    <span className="font-mono text-xs text-app-primary font-medium">{word}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={handleCopyMnemonic} className="w-full h-10 rounded-xl text-sm">
                {hasCopied ? (
                  <>
                    <Check className="w-4 h-4 mr-1" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-1" />
                    Copy
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            className="w-full py-8 flex items-center justify-center cursor-pointer bg-orange-50 rounded-xl border-2 border-dashed border-orange-300 hover:border-orange-400 hover:bg-orange-100 transition-all"
            onClick={() => setIsRevealed(true)}
          >
            <div className="text-center space-y-2">
              <div className="w-12 h-12 mx-auto flex items-center justify-center rounded-full bg-orange-100">
                <Eye className="w-6 h-6 text-orange-600" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 justify-center">
                  <Eye className="w-4 h-4 text-orange-600" />
                  <p className="text-sm font-medium text-orange-600">Tap to reveal recovery phrase</p>
                </div>
                <p className="text-xs text-orange-600/80">Required to continue</p>
              </div>
            </div>
          </button>
        )}
      </div>

      {/* Confirmation */}
      <div className="bg-app-surface rounded-xl p-2 border border-app shadow-sm">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="backup-confirmation"
            checked={hasConfirmed}
            onChange={(e) => setHasConfirmed(e.target.checked)}
            disabled={!isRevealed}
            className="w-4 h-4 text-blue-600 border-2 border-gray-300 rounded focus:ring-blue-500 flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <label
            htmlFor="backup-confirmation"
            className={`text-sm cursor-pointer ${!isRevealed ? "text-app-tertiary" : "text-app-secondary"}`}
          >
            I've saved my recovery phrase securely
          </label>
        </div>
      </div>

      <Button onClick={onBackupMnemonicComplete} disabled={!isRevealed || !hasConfirmed} className="w-full" size="lg">
        {!isRevealed ? "Reveal Recovery Phrase First" : "Continue to Setup"}
      </Button>
    </div>
  );
}
