/**
 * Pool Action Buttons
 * Primary actions for interacting with the selected pool
 * Handles deposit and withdrawal navigation
 */

import { useNavigation } from "@/contexts/NavigationContext";
import { Minus, Plus } from "lucide-react";
import { Button } from "../../ui/button";

interface PoolAction {
  id: "deposit" | "withdraw";
  icon: React.ReactNode;
  label: string;
  screen: "deposit" | "withdraw";
}

const poolActions: PoolAction[] = [
  { id: "deposit", icon: <Plus className="w-5 h-5" />, label: "Deposit", screen: "deposit" },
  { id: "withdraw", icon: <Minus className="w-5 h-5" />, label: "Withdraw", screen: "withdraw" },
];

interface PoolActionsProps {
  disabled?: boolean;
}

export function PoolActions({ disabled = false }: PoolActionsProps) {
  const { currentScreen, setCurrentScreen } = useNavigation();

  return (
    <div className="flex gap-3">
      {poolActions.map((action) => {
        const isActive = currentScreen === action.screen;
        return (
          <Button
            key={action.id}
            onClick={() => setCurrentScreen(action.screen)}
            disabled={disabled}
            variant={isActive ? "default" : "outline"}
            size="lg"
            className="flex-1 h-12 text-sm font-semibold transition-all duration-200 active:scale-95"
          >
            {action.icon}
            <span className="ml-2">{action.label}</span>
          </Button>
        );
      })}
    </div>
  );
}