import { Home, Plus, Minus, User } from "lucide-react";
import { useNavigation } from "@/contexts/NavigationContext";

interface NavItem {
  icon: React.ReactNode;
  label: string;
  screen: "home" | "deposit" | "withdraw" | "profile";
}

const navItems: NavItem[] = [
  { icon: <Home className="w-6 h-6" />, label: "Home", screen: "home" },
  { icon: <Plus className="w-6 h-6" />, label: "Deposit", screen: "deposit" },
  { icon: <Minus className="w-6 h-6" />, label: "Withdraw", screen: "withdraw" },
  { icon: <User className="w-6 h-6" />, label: "Profile", screen: "profile" },
];

export const BottomNavBar = () => {
  const { currentScreen, setCurrentScreen } = useNavigation();

  return (
    <nav className="bg-app-surface border-t border-app-border pb-safe-area-bottom">
      <div className="flex items-center justify-around">
        {navItems.map((item, index) => {
          const isActive = currentScreen === item.screen;
          return (
            <button
              key={index}
              onClick={() => setCurrentScreen(item.screen)}
              aria-label={item.label}
              className={`flex flex-col items-center space-y-1 py-2 px-3 min-w-0 flex-1 transition-colors duration-200 rounded-xl active:scale-95 ${
                isActive
                  ? "text-indigo-600 dark:text-indigo-400 shadow-sm"
                  : "text-app-secondary hover:text-app-primary active:text-app-primary dark:text-app-secondary dark:hover:text-app-primary dark:active:text-app-primary"
              }`}
              style={{ minWidth: 44, minHeight: 44 }}
            >
              <div className={`transition-all duration-200 ${isActive ? "scale-110" : ""}`}>{item.icon}</div>
              <span
                className={`text-xs font-semibold transition-colors duration-200 ${
                  isActive ? "text-indigo-600 dark:text-indigo-400" : "text-app-secondary dark:text-app-secondary"
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
