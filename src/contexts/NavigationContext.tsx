import { type ReactNode, createContext, useContext, useState } from "react";

export type Screen = "home" | "deposit" | "my-notes";

export interface Asset {
  symbol: string;
  name: string;
  icon: string;
}

interface NavigationState {
  screen: Screen;
  asset?: Asset;
}

interface NavigationContextType {
  currentScreen: Screen;
  currentAsset?: Asset;
  setCurrentScreen: (screen: Screen) => void;
  navigateToScreen: (screen: Screen, asset?: Asset) => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [navigationState, setNavigationState] = useState<NavigationState>({
    screen: "home",
  });

  const setCurrentScreen = (screen: Screen) => {
    setNavigationState((prev) => ({ ...prev, screen }));
  };

  const navigateToScreen = (screen: Screen, asset?: Asset) => {
    setNavigationState({ screen, asset });
  };

  return (
    <NavigationContext.Provider
      value={{
        currentScreen: navigationState.screen,
        currentAsset: navigationState.asset,
        setCurrentScreen,
        navigateToScreen,
      }}
    >
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  const context = useContext(NavigationContext);
  if (context === undefined) {
    throw new Error("useNavigation must be used within a NavigationProvider");
  }
  return context;
}
