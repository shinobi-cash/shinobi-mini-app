/**
 * Pool Action Buttons
 * Primary actions for interacting with the selected pool
 * Handles deposit and withdrawal navigation
 */

import { useNavigation, type Asset } from "@/contexts/NavigationContext";
import { useAuth } from "@/contexts/AuthContext";
import { useAccount } from "wagmi";
import { FileText, Minus, Plus } from "lucide-react";
import { Button } from "../../ui/button";
import { Tooltip, TooltipTrigger, TooltipContent } from "../../ui/tooltip";

interface PoolAction {
  id: "deposit" | "withdraw" | "my-notes";
  icon: React.ReactNode;
  label: string;
  screen: "deposit" | "withdraw" | "my-notes";
}

const poolActions: PoolAction[] = [
  { id: "deposit", icon: <Plus className="w-5 h-5" />, label: "Deposit", screen: "deposit" },
  { id: "withdraw", icon: <Minus className="w-5 h-5" />, label: "Withdraw", screen: "withdraw" },
  { id: "my-notes", icon: <FileText className="w-5 h-5" />, label: "My Notes", screen: "my-notes" },
];

interface PoolActionsProps {
  asset: Asset;
  disabled?: boolean;
}

export function PoolActions({ asset, disabled = false }: PoolActionsProps) {
  const { currentScreen, navigateToScreen } = useNavigation();
  const { isAuthenticated } = useAuth();
  const { isConnected } = useAccount();

  const getTooltipMessage = (actionId: "deposit" | "withdraw" | "my-notes") => {
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
      case "my-notes":
        if (!isAuthenticated) {
          return "Sign in to view your notes";
        }
        return null;
      default:
        return null;
    }
  };

  return (
    <div className="overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      <div className="flex gap-3 min-w-max px-1">
        {poolActions.map((action) => {
        const isActive = currentScreen === action.screen;

        // Different requirements for each action
        const isDisabled =
          disabled ||
          (() => {
            switch (action.id) {
              case "deposit":
                // Deposit requires both account auth AND wallet connection
                return !isAuthenticated || !isConnected;
              case "withdraw":
              case "my-notes":
                // Withdrawal and My Notes only require account auth
                return !isAuthenticated;
              default:
                return false;
            }
          })();

        const tooltipMessage = getTooltipMessage(action.id);

        const buttonElement = (
          <Button
            key={action.id}
            onClick={() => navigateToScreen(action.screen, asset)}
            disabled={isDisabled}
            variant={isActive ? "default" : "outline"}
            size="lg"
            className={`whitespace-nowrap px-6 h-12 text-sm font-semibold transition-all duration-200 active:scale-95 ${
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
            <Tooltip key={action.id}>
              <TooltipTrigger asChild>
                <div>{buttonElement}</div>
              </TooltipTrigger>
              <TooltipContent>{tooltipMessage}</TooltipContent>
            </Tooltip>
          );
        }

        return buttonElement;
      })}
      </div>
    </div>
  );
}
