/**
 * Pool Action Buttons
 * Primary actions for interacting with the selected pool
 * Handles deposit and withdrawal navigation
 */

import { useNavigation } from "@/contexts/NavigationContext";
import { useAuth } from "@/contexts/AuthContext";
import { useAccount } from "wagmi";
import { Minus, Plus } from "lucide-react";
import { Button } from "../../ui/button";
import { Tooltip, TooltipTrigger, TooltipContent } from "../../ui/tooltip";

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
  const { isAuthenticated } = useAuth();
  const { isConnected } = useAccount();

  const getTooltipMessage = (actionId: "deposit" | "withdraw") => {
    switch (actionId) {
      case "deposit":
        if (!isAuthenticated && !isConnected) {
          return "Sign in and connect wallet to deposit";
        }
        if (!isAuthenticated) {
          return "Sign in to deposit";
        }
        if (!isConnected) {
          return "Connect wallet to deposit";
        }
        return null;
      case "withdraw":
        if (!isAuthenticated) {
          return "Sign in to withdraw";
        }
        return null;
      default:
        return null;
    }
  };

  return (
    <div className="flex gap-3">
      {poolActions.map((action) => {
        const isActive = currentScreen === action.screen;
        
        // Different requirements for each action
        const isDisabled = disabled || (() => {
          switch (action.id) {
            case "deposit":
              // Deposit requires both account auth AND wallet connection
              return !isAuthenticated || !isConnected;
            case "withdraw":
              // Withdrawal only requires account auth (uses Account Abstraction)
              return !isAuthenticated;
            default:
              return false;
          }
        })();

        const tooltipMessage = getTooltipMessage(action.id);
        
        const buttonElement = (
          <Button
            key={action.id}
            onClick={() => setCurrentScreen(action.screen)}
            disabled={isDisabled}
            variant={isActive ? "default" : "outline"}
            size="lg"
            className={`w-full h-12 text-sm font-semibold transition-all duration-200 active:scale-95 ${
              isDisabled ? "cursor-not-allowed" : ""
            }`}
          >
            {action.icon}
            <span className="ml-2">{action.label}</span>
          </Button>
        );

        // Wrap with tooltip if disabled and has message
        if (isDisabled && tooltipMessage) {
          return (
            <div key={action.id} className="flex-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    {buttonElement}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  {tooltipMessage}
                </TooltipContent>
              </Tooltip>
            </div>
          );
        }

        return (
          <div key={action.id} className="flex-1">
            {buttonElement}
          </div>
        );
      })}
    </div>
  );
}