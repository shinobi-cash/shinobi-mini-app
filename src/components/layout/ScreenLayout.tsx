/**
 * Native App Screen Layout System
 *
 * Implements iOS/Android-style view controller pattern where each screen
 * has defined boundaries and manages its own content within a fixed viewport.
 */

import React from "react";

/**
 * Main App Container - Fixed viewport like native apps
 * Contains header, banner, content area, and bottom navigation
 */
interface AppLayoutProps {
  header?: React.ReactNode;
  banner?: React.ReactNode;
  bottomNav?: React.ReactNode;
  children: React.ReactNode;
}

export function AppLayout({ header, banner, bottomNav, children }: AppLayoutProps) {
  return (
    <div className="h-screen sm:h-[70vh] flex flex-col bg-app-background overflow-hidden">
      {/* Header - Fixed at top */}
      {header && <div className="flex-shrink-0">{header}</div>}

      {/* Banner - Fixed below header */}
      {banner && <div className="flex-shrink-0">{banner}</div>}

      {/* Main content area - Takes remaining space */}
      <main className="flex-1 overflow-hidden relative">{children}</main>

      {/* Bottom navigation - Fixed at bottom */}
      {bottomNav && <div className="flex-shrink-0">{bottomNav}</div>}
    </div>
  );
}

/**
 * Native Screen Container - Each screen is a view controller
 * Manages its own content within the allocated space
 */
interface ScreenProps {
  children: React.ReactNode;
  className?: string;
  scrollable?: boolean;
}

export function Screen({ children, className = "", scrollable = true }: ScreenProps) {
  return (
    <div className={`absolute inset-0 flex flex-col ${className}`}>
      {scrollable ? (
        <div className="flex-1 overflow-y-auto scrollbar-hide">{children}</div>
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden">{children}</div>
      )}
    </div>
  );
}

/**
 * Screen Content - Standard content container with mobile-first padding
 */
interface ScreenContentProps {
  children: React.ReactNode;
  className?: string;
  padding?: "none" | "sm" | "md" | "lg";
}

export function ScreenContent({ children, className = "", padding = "md" }: ScreenContentProps) {
  const paddingClasses = {
    none: "",
    sm: "p-3",
    md: "p-4",
    lg: "p-6",
  };

  return <div className={`${paddingClasses[padding]} ${className}`}>{children}</div>;
}

/**
 * Screen Section - For organizing content within screens
 */
interface ScreenSectionProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  flex?: boolean;
}

export function ScreenSection({ children, className = "", title, flex = false }: ScreenSectionProps) {
  const Container = flex ? "div" : "section";
  const containerClass = flex ? "flex-1 flex flex-col" : "";

  return (
    <Container className={`${containerClass} ${className}`}>
      {title && <h2 className="text-lg font-semibold text-app-primary mb-4">{title}</h2>}
      {children}
    </Container>
  );
}

/**
 * Scrollable List Container - For lists that need proper scroll behavior
 */
interface ScrollableListProps {
  children: React.ReactNode;
  className?: string;
  emptyState?: React.ReactNode;
}

export function ScrollableList({ children, className = "", emptyState }: ScrollableListProps) {
  const hasChildren = React.Children.count(children) > 0;

  if (!hasChildren && emptyState) {
    return <div className="flex-1 flex items-center justify-center">{emptyState}</div>;
  }

  return (
    <div className={`flex-1 overflow-y-auto scrollbar-hide ${className}`}>
      <div className="space-y-2">{children}</div>
    </div>
  );
}
