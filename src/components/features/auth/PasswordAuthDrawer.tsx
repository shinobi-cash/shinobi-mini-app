/**
 * Quick Auth Drawer - For Session Restoration
 * Shows when user needs to re-enter password for their account after page refresh
 */

import { useAuth } from "@/contexts/AuthContext";
import { useBanner } from "@/contexts/BannerContext";
import { Eye, EyeOff, Lock, X } from "lucide-react";
import type React from "react";
import { useState, useEffect } from "react";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "../../ui/drawer";

export function PasswordAuthDrawer() {
  const { banner } = useBanner();
  const { quickAuthState, handleQuickPasswordAuth, dismissQuickAuth } = useAuth();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Auto-focus on password input when drawer opens
  useEffect(() => {
    if (quickAuthState?.show) {
      const input = document.querySelector('[placeholder="Enter your password"]') as HTMLInputElement;
      if (input) {
        input.focus();
      }
    }
  }, [quickAuthState?.show]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;

    setIsProcessing(true);
    setError(null);

    try {
      await handleQuickPasswordAuth(password);
      banner.success("Session restored successfully");
    } catch (error) {
      console.error("Quick auth failed:", error);
      const errorMessage = error instanceof Error ? error.message : "Authentication failed";
      setError(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDismiss = () => {
    dismissQuickAuth();
    setPassword("");
    setError(null);
  };

  return (
    <Drawer open={quickAuthState?.show ?? false} onOpenChange={(open) => !open && handleDismiss()}>
      <DrawerContent className="bg-app-background border-app">
        {/* iOS-style drag handle */}
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-app-tertiary/30" />

        <DrawerHeader className="pb-0 px-4 pt-2">
          <div className="flex items-center justify-between">
            <DrawerTitle className="text-lg font-semibold text-app-primary tracking-tight">Welcome Back</DrawerTitle>
            <DrawerClose className="h-8 w-8 flex items-center justify-center hover:bg-app-surface-hover transition-colors duration-200">
              <X className="h-4 w-4 text-app-secondary" />
            </DrawerClose>
          </div>
          <DrawerDescription className="text-sm items-start text-app-secondary">
            Detected an old session for '{quickAuthState?.accountName}'
          </DrawerDescription>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto px-4 pb-6">
          <form onSubmit={handleSubmit} className="space-y-2 pt-4">
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="Enter your password"
                className="pr-10"
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

            {error && <p className="text-red-600 text-sm">{error}</p>}

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
              <Button type="submit" disabled={isProcessing || !password.trim()} className="flex-1">
                {isProcessing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
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
      </DrawerContent>
    </Drawer>
  );
}
