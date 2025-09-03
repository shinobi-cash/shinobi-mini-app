/**
 * App Menu Component
 * Hamburger menu for app-wide settings and options
 * Includes wallet connection, settings, about, and other app features
 */

import { BookOpen, HelpCircle, LogOut, Menu, Settings, UserPlus, LogIn, WalletIcon, FileText } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAccount, useDisconnect } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigation } from "@/contexts/NavigationContext";
import { LogInDrawer } from "../auth/LogInDrawer";
import { CreateAccountDrawer } from "../auth/CreateAccountDrawer";

export function AppMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [openLogin, setOpenLogin] = useState(false);
  const [openCreateAccount, setOpenCreateAccount] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Wallet state
  const { isConnected, address } = useAccount();
  const { disconnect } = useDisconnect();
  const { openConnectModal } = useConnectModal();
  
  // Authentication state
  const { isAuthenticated, signOut } = useAuth();
  
  // Navigation
  const { setCurrentScreen } = useNavigation();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleDisconnect = () => {
    disconnect();
    setIsOpen(false);
  };

  const handleConnect = () => {
    openConnectModal?.();
    setIsOpen(false);
  };

  const handleLogin = () => {
    setOpenLogin(true);
    setIsOpen(false);
  };

  const handleCreateAccount = () => {
    setOpenCreateAccount(true);
    setIsOpen(false);
  };

  const handleSignOut = async () => {
    await signOut();
    setIsOpen(false);
  };

  const handleViewNotes = () => {
    setCurrentScreen("my-notes");
    setIsOpen(false);
  };

  const shortenAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="App menu"
        className="flex items-center gap-1 p-2 hover:bg-app-surface-hover rounded-lg active:scale-95 transition-all"
      >
        <Menu className="w-5 h-5 text-app-secondary" />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 top-12 w-56 bg-app-surface border border-app rounded-xl shadow-lg z-50 overflow-hidden">
          {/* Account Section */}
          <div className="px-3 py-2 border-b border-app">
            <p className="text-xs text-app-tertiary mb-2">Account</p>
            
            {isAuthenticated ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <p className="text-xs text-green-600 dark:text-green-400">Signed In</p>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                  <p className="text-xs text-app-secondary">Not Signed In</p>
                </div>
              </div>
            )}
          </div>

          {/* Account Actions */}
          <div className="border-b border-app">
            <div className="py-1">
              {/* My Notes - only enabled when authenticated */}
              <button
                type="button"
                onClick={isAuthenticated ? handleViewNotes : undefined}
                disabled={!isAuthenticated}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                  isAuthenticated
                    ? "text-app-secondary hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950/20 cursor-pointer"
                    : "text-app-tertiary opacity-50 cursor-not-allowed"
                }`}
                title={!isAuthenticated ? "Sign in to access your notes" : "View your notes"}
              >
                <FileText className="w-4 h-4" />
                My Notes
              </button>

              {/* Authentication actions */}
              {isAuthenticated ? (
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-app-secondary hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/20 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleLogin}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-app-secondary hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950/20 transition-colors"
                  >
                    <LogIn className="w-4 h-4" />
                    Log In
                  </button>
                  <button
                    type="button"
                    onClick={handleCreateAccount}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-app-secondary hover:bg-green-50 hover:text-green-600 dark:hover:bg-green-950/20 transition-colors"
                  >
                    <UserPlus className="w-4 h-4" />
                    Create Account
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Wallet Section */}
          <div className="px-3 py-2 border-b border-app">
            <p className="text-xs text-app-tertiary mb-2">Wallet Connection</p>
            
            {isConnected ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <p className="text-xs text-green-600 dark:text-green-400">Connected</p>
                </div>
                <p className="text-sm font-mono text-app-primary truncate bg-app-card px-2 py-1 rounded">
                  {address && shortenAddress(address)}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                  <p className="text-xs text-app-secondary">Not Connected</p>
                </div>
              </div>
            )}
          </div>

          {/* Wallet Actions */}
          <div className="border-b border-app">
            {isConnected ? (
              <button
                type="button"
                onClick={handleDisconnect}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-app-secondary hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/20 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Disconnect Wallet
              </button>
            ) : (
              <button
                type="button"
                onClick={handleConnect}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-app-secondary hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950/20 transition-colors"
              >
                <WalletIcon className="w-4 h-4" />
                Connect Wallet
              </button>
            )}
          </div>

          {/* App Options - Future implementation */}
          <div className="py-1">
            <button
              type="button"
              disabled
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-app-tertiary opacity-50 cursor-not-allowed"
            >
              <Settings className="w-4 h-4" />
              Settings
            </button>
            <button
              type="button"
              disabled
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-app-tertiary opacity-50 cursor-not-allowed"
            >
              <HelpCircle className="w-4 h-4" />
              About
            </button>
            <button
              type="button"
              disabled
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-app-tertiary opacity-50 cursor-not-allowed"
            >
              <BookOpen className="w-4 h-4" />
              Documentation
            </button>
          </div>
        </div>
      )}

      {/* Authentication Drawers */}
      <LogInDrawer
        open={openLogin}
        onOpenChange={setOpenLogin}
        onSessionInitialized={() => setOpenLogin(false)}
      />
      
      <CreateAccountDrawer
        open={openCreateAccount}
        onOpenChange={setOpenCreateAccount}
      />
    </div>
  );
}