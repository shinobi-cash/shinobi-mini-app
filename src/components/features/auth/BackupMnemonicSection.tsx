import { useState } from 'react';
import { Button } from '../../ui/button';
import { Download, Copy, Eye, EyeOff, Check, FileText } from 'lucide-react';
import { KeyGenerationResult } from '@/utils/crypto';
import { useBanner } from "@/contexts/BannerContext";
import { getEnvironmentType } from '@/utils/environment';

interface BackupMnemonicSectionProps {
  generatedKeys: KeyGenerationResult | null;
  onBackupMnemonicComplete: () => void;
}

export function BackupMnemonicSection({ 
  generatedKeys, 
  onBackupMnemonicComplete 
}: BackupMnemonicSectionProps) {
  const [isRevealed, setIsRevealed] = useState(false);
  const [hasConfirmed, setHasConfirmed] = useState(false);
  const [hasCopied, setHasCopied] = useState(false);
  const [canDownload] = useState(getEnvironmentType() === 'web' || getEnvironmentType() === 'standalone');
  const { banner } = useBanner();
  const displayMnemonic = generatedKeys?.mnemonic;

  const handleCopyMnemonic = async () => {
    if (!displayMnemonic) return;
    
    try {
      await navigator.clipboard.writeText(displayMnemonic.join(' '));
      setHasCopied(true);
      banner.success('Copied to clipboard');
      setTimeout(() => setHasCopied(false), 3000);
    } catch (error) {
      banner.error('Copy failed');
    }
  };

  const handleDownloadMnemonic = () => {
    if (!displayMnemonic || !canDownload) {
      banner.error('Download unavailable');
      return;
    }
    
    try {
      const content = `Shinobi Recovery Phrase

IMPORTANT: Keep this phrase secure and private. Anyone with access to this phrase can control your account.

Recovery Phrase:
${displayMnemonic.join(' ')}

Generated: ${new Date().toISOString()}

Instructions:
1. Store this phrase in a secure location
2. Never share it with anyone  
3. You'll need all 12 words in the correct order to recover your account
4. If you lose this phrase, your account cannot be recovered

Shinobi Privacy App`;

      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `shinobi-recovery-${Date.now()}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      banner.success('Download complete');
    } catch (error) {
      banner.error('Download failed');
    }
  };

  return (
    <div className="space-y-4">
      {/* Mnemonic Display */}
      <div className="bg-app-surface rounded-xl p-3 border border-app shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-app-primary">
            Your 12 Words
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsRevealed(!isRevealed)}
            className="h-8 w-8 p-0"
          >
            {isRevealed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </Button>
        </div>

        {isRevealed && displayMnemonic ? (
          <div>
            <div className="mb-3">
              <div className="grid grid-cols-3 gap-1">
                {displayMnemonic.map((word, index) => (
                  <div 
                    key={index}
                    className="bg-app-background rounded-lg text-center border border-app"
                  >
                    <span className="text-xs text-app-tertiary block mb-0.5">
                      {index + 1}
                    </span>
                    <span className="font-mono text-xs text-app-primary font-medium">
                      {word}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button 
                variant="outline"
                onClick={handleCopyMnemonic}
                className="flex-1 h-10 rounded-xl text-sm"
              >
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
              {canDownload && (
                <Button 
                  variant="outline"
                  onClick={handleDownloadMnemonic}
                  className="flex-1 h-10 rounded-xl text-sm"
                >
                  <Download className="w-4 h-4 mr-1" />
                  Save
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div 
            className="py-8 flex items-center justify-center cursor-pointer bg-orange-50 rounded-xl border-2 border-dashed border-orange-300 hover:border-orange-400 hover:bg-orange-100 transition-all"
            onClick={() => setIsRevealed(true)}
          >
            <div className="text-center space-y-3">
              <div className="w-12 h-12 mx-auto flex items-center justify-center rounded-full bg-orange-100">
                <FileText className="w-6 h-6 text-orange-600" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 justify-center">
                  <Eye className="w-4 h-4 text-orange-600" />
                  <p className="text-sm font-medium text-orange-600">
                    Tap to reveal recovery phrase
                  </p>
                </div>
                <p className="text-xs text-orange-600/80">
                  Required to continue
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation */}
      <div className="bg-app-surface rounded-xl p-3 border border-app shadow-sm">
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
            className={`text-sm cursor-pointer ${!isRevealed ? 'text-app-tertiary' : 'text-app-secondary'}`}
          >
            I've saved my recovery phrase securely
          </label>
        </div>
      </div>

      <Button 
        onClick={onBackupMnemonicComplete}
        disabled={!isRevealed || !hasConfirmed}
        className="w-full"
        size="lg"
      >
        {!isRevealed ? 'Reveal Recovery Phrase First' : 'Continue to Setup'}
      </Button>
    </div>
  );
}