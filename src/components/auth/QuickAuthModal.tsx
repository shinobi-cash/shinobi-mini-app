/**
 * Quick Auth Modal - For Session Restoration
 * Shows when user needs to re-enter password for their account after page refresh
 */

import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Lock, Eye, EyeOff, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export function QuickAuthModal() {
  const { quickAuthState, handleQuickPasswordAuth, dismissQuickAuth } = useAuth();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!quickAuthState?.show) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;

    setIsProcessing(true);
    setError(null);

    try {
      await handleQuickPasswordAuth(password);
      toast.success('Session restored successfully');
    } catch (error) {
      console.error('Quick auth failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
      setError(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDismiss = () => {
    dismissQuickAuth();
    setPassword('');
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-app-background rounded-2xl border border-app shadow-xl w-full max-w-sm">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-app">
          <h2 className="text-lg font-semibold text-app-primary">
            Welcome Back
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="h-8 w-8 p-0 rounded-full"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          <div className="text-center">
            <p className="text-app-secondary">
              Enter your password for
            </p>
            <p className="font-semibold text-app-primary">
              {quickAuthState.accountName}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="Enter your password"
                className="w-full px-3 py-2 pr-10 border border-app rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-app-background text-app-primary"
                disabled={isProcessing}
                autoFocus
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

            {error && (
              <p className="text-red-600 text-sm">{error}</p>
            )}

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleDismiss}
                disabled={isProcessing}
                className="flex-1"
              >
                Use Different Account
              </Button>
              <Button
                type="submit"
                disabled={isProcessing || !password.trim()}
                className="flex-1"
              >
                {isProcessing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Signing In...
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4 mr-2" />
                    Sign In
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}