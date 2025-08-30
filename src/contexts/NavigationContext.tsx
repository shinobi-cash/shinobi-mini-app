import { type ReactNode, createContext, useContext, useState } from "react";

type Screen = "home" | "deposit" | "withdraw" | "profile";

interface NavigationContextType {
  currentScreen: Screen;
  setCurrentScreen: (screen: Screen) => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [currentScreen, setCurrentScreen] = useState<Screen>("home");

  return (
    <NavigationContext.Provider value={{ currentScreen, setCurrentScreen }}>{children}</NavigationContext.Provider>
  );
}

export function useNavigation() {
  const context = useContext(NavigationContext);
  if (context === undefined) {
    throw new Error("useNavigation must be used within a NavigationProvider");
  }
  return context;
}
