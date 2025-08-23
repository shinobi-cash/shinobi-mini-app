/**
 * Password Setup Section - For Account Creation Flow
 * Takes provided keys and creates password-based encryption for the account
 */

import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Lock, Eye, EyeOff } from 'lucide-react';
import { KeyGenerationResult } from '@/utils/crypto';
import { KDF } from '@/lib/keyDerivation';
import { noteCache } from '@/lib/noteCache';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface PasswordSetupSectionProps {
  accountName: string;
  accountNameError?: string;
  generatedKeys: KeyGenerationResult | null;
  onSuccess: () => void;
}

export function PasswordSetupSection({
  accountName,
  accountNameError,
  generatedKeys,
  onSuccess
}: PasswordSetupSectionProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const { setKeys } = useAuth();

  const validatePassword = (pass: string) => {
    if (pass.length < 8) {
      return 'Password must be at least 8 characters long';
    }
    if (!/(?=.*[a-z])/.test(pass)) {
      return 'Password must contain at least one lowercase letter';
    }
    if (!/(?=.*[A-Z])/.test(pass)) {
      return 'Password must contain at least one uppercase letter';
    }
    if (!/(?=.*\d)/.test(pass)) {
      return 'Password must contain at least one number';
    }
    return '';
  };

  const handlePasswordSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (accountNameError || !accountName.trim() || !generatedKeys) {
      return;
    }

    const passError = validatePassword(password);
    if (passError) {
      setPasswordError(passError);
      return;
    }

    if (password !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }

    setIsProcessing(true);

    try {
      // Derive encryption key from password
      const { symmetricKey } = await KDF.deriveKeyFromPassword(password, accountName.trim());
      
      // Initialize session with the derived key
      await noteCache.initializeAccountSession(accountName.trim(), symmetricKey);

      // Store account data using the session
      const accountData = {
        accountName: accountName.trim(),
        mnemonic: generatedKeys.mnemonic,
        createdAt: Date.now()
      };
      await noteCache.storeAccountData(accountData);

      // Store session info for future restoration
      KDF.storeSessionInfo(accountName.trim(), 'password');
        
      // Set keys in auth context
      setKeys(generatedKeys);
      
      toast.success('Account created successfully with password');
      onSuccess();
    } catch (error) {
      console.error('Password setup failed:', error);
      toast.error(error instanceof Error ? error.message : 'Setup failed');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handlePasswordSetup} className="space-y-4">
      <div className="space-y-3">
        <div className="relative">
          <input
            id="setup-password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (passwordError) setPasswordError('');
            }}
            className="w-full px-3 py-2 pr-10 border border-app rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-app-background text-app-primary"
            placeholder="Create a secure password"
            required
            disabled={isProcessing}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
            disabled={isProcessing}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4 text-app-tertiary" />
            ) : (
              <Eye className="h-4 w-4 text-app-tertiary" />
            )}
          </button>
        </div>

        <div className="relative">
          <input
            id="confirm-password"
            type={showPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              if (passwordError) setPasswordError('');
            }}
            className="w-full px-3 py-2 border border-app rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-app-background text-app-primary"
            placeholder="Confirm your password"
            required
            disabled={isProcessing}
          />
        </div>
      </div>

      {passwordError && (
        <p className="text-red-600 text-xs">{passwordError}</p>
      )}

      <div className="text-xs text-app-tertiary space-y-1">
        <p>Password requirements:</p>
        <ul className="list-disc list-inside space-y-0.5">
          <li>At least 8 characters</li>
          <li>One uppercase and lowercase letter</li>
          <li>One number</li>
        </ul>
      </div>

      <Button
        type="submit"
        disabled={isProcessing || !!accountNameError || !accountName.trim() || !password || !confirmPassword}
        className="w-full"
        size="lg"
      >
        {isProcessing ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            Setting up Password...
          </>
        ) : (
          <>
            <Lock className="w-4 h-4 mr-2" />
            Set up Password Access
          </>
        )}
      </Button>
    </form>
  );
}