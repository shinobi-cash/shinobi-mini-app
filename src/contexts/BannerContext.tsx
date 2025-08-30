/**
 * Banner Context - Global banner notification system
 * Shows temporary messages in app banner area like transaction tracking
 */

import React, { createContext, useContext, useState, useCallback, useRef } from "react";

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
    success: (message: string, options?: { duration?: number }) => void;
    warning: (message: string, options?: { duration?: number }) => void;
    info: (message: string, options?: { duration?: number }) => void;
  };
}

const BannerContext = createContext<BannerContextValue | undefined>(undefined);

let bannerId = 0;
const generateId = () => `banner-${++bannerId}-${Date.now()}`;

// Simple message shortening - inline since it's just one function
const shortenMessage = (message: string, maxLength: number = 60): string => {
  if (message.length <= maxLength) return message;
  return message.substring(0, maxLength - 3).trim() + "...";
};

export const BannerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentBanner, setCurrentBanner] = useState<BannerMessage | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

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

    // Clear timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = undefined;
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
      (message: string, options?: { duration?: number }) => {
        const shortMessage = shortenMessage(message);
        showBanner({ type: "success", message: shortMessage }, options?.duration);
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

  return <BannerContext.Provider value={value}>{children}</BannerContext.Provider>;
};

export const useBanner = () => {
  const context = useContext(BannerContext);
  if (!context) {
    throw new Error("useBanner must be used within BannerProvider");
  }
  return context;
};
