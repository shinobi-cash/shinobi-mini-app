/**
 * Banner Context - Global banner notification system
 * Shows temporary messages in app banner area like transaction tracking
 */

import type React from "react";
import { createContext, useCallback, useContext, useRef, useState } from "react";
import Confetti from "react-confetti";

export interface BannerMessage {
  id: string;
  type: "error" | "success" | "warning" | "info";
  message: string;
}

interface BannerContextValue {
  currentBanner: BannerMessage | null;
  showBanner: (banner: Omit<BannerMessage, "id">, duration?: number) => void;
  dismissBanner: () => void;
  banner: {
    error: (message: string, options?: { duration?: number }) => void;
    success: (message: string, options?: { duration?: number; confetti?: boolean }) => void;
    warning: (message: string, options?: { duration?: number }) => void;
    info: (message: string, options?: { duration?: number }) => void;
  };
}

const BannerContext = createContext<BannerContextValue | undefined>(undefined);

let bannerId = 0;
const generateId = () => `banner-${++bannerId}-${Date.now()}`;

// Simple message shortening - inline since it's just one function
const shortenMessage = (message: string, maxLength = 60): string => {
  if (message.length <= maxLength) return message;
  return `${message.substring(0, maxLength - 3).trim()}...`;
};

export const BannerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentBanner, setCurrentBanner] = useState<BannerMessage | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const confettiTimeoutRef = useRef<NodeJS.Timeout>();

  const showBanner = useCallback((banner: Omit<BannerMessage, "id">, duration = 4000) => {
    const id = generateId();
    const newBanner: BannerMessage = {
      ...banner,
      id,
    };

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Show new banner (replaces current one)
    setCurrentBanner(newBanner);

    // Auto-dismiss after duration
    timeoutRef.current = setTimeout(() => {
      setCurrentBanner(null);
    }, duration);
  }, []);

  const dismissBanner = useCallback(() => {
    setCurrentBanner(null);

    // Clear timeouts
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = undefined;
    }
    if (confettiTimeoutRef.current) {
      clearTimeout(confettiTimeoutRef.current);
      confettiTimeoutRef.current = undefined;
    }
  }, []);

  // Direct banner API
  const banner = {
    error: useCallback(
      (message: string, options?: { duration?: number }) => {
        const shortMessage = shortenMessage(message);
        showBanner({ type: "error", message: shortMessage }, options?.duration);
      },
      [showBanner],
    ),

    success: useCallback(
      (message: string, options?: { duration?: number; confetti?: boolean }) => {
        const shortMessage = shortenMessage(message);
        showBanner({ type: "success", message: shortMessage }, options?.duration);
        
        // Show confetti for success messages if explicitly requested
        if (options?.confetti === true) {
          // Clear existing confetti timeout
          if (confettiTimeoutRef.current) {
            clearTimeout(confettiTimeoutRef.current);
          }
          
          setShowConfetti(true);
          confettiTimeoutRef.current = setTimeout(() => setShowConfetti(false), 3000);
        }
      },
      [showBanner],
    ),

    warning: useCallback(
      (message: string, options?: { duration?: number }) => {
        const shortMessage = shortenMessage(message);
        showBanner({ type: "warning", message: shortMessage }, options?.duration);
      },
      [showBanner],
    ),

    info: useCallback(
      (message: string, options?: { duration?: number }) => {
        const shortMessage = shortenMessage(message);
        showBanner({ type: "info", message: shortMessage }, options?.duration);
      },
      [showBanner],
    ),
  };

  const value: BannerContextValue = {
    currentBanner,
    showBanner,
    dismissBanner,
    banner,
  };

  return (
    <BannerContext.Provider value={value}>
      {showConfetti && (
        <Confetti
          width={window.innerWidth}
          height={window.innerHeight}
          recycle={false}
          numberOfPieces={500}
          gravity={0.3}
        />
      )}
      {children}
    </BannerContext.Provider>
  );
};

export const useBanner = () => {
  const context = useContext(BannerContext);
  if (!context) {
    throw new Error("useBanner must be used within BannerProvider");
  }
  return context;
};
