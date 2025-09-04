/**
 * Pool Action Buttons
 * Primary actions for interacting with the selected pool
 * Handles deposit and withdrawal navigation
 */

import { type Asset, useNavigation } from "@/contexts/NavigationContext";
import { FileText, Minus, Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "../../ui/button";
import { ActionAuthDrawer } from "./ActionAuthDrawer";

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
  const { currentScreen } = useNavigation();
  const [authDrawerOpen, setAuthDrawerOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState<"deposit" | "withdraw" | "my-notes">("deposit");

  const handleActionClick = (action: PoolAction) => {
    // Always show unified auth drawer - it will handle requirements and navigation
    setSelectedAction(action.id);
    setAuthDrawerOpen(true);
  };

  return (
    <div className="overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      <div className="flex gap-3 min-w-max px-1">
        {poolActions.map((action) => {
          const isActive = currentScreen === action.screen;

          return (
            <Button
              key={action.id}
              onClick={() => handleActionClick(action)}
              disabled={disabled}
              variant={isActive ? "default" : "outline"}
              size="lg"
              className="whitespace-nowrap px-6 h-12 text-sm font-semibold transition-all duration-200 active:scale-95"
            >
              {action.icon}
              <span className="ml-2">{action.label}</span>
            </Button>
          );
        })}
      </div>

      {/* Action Auth Drawer */}
      <ActionAuthDrawer open={authDrawerOpen} onOpenChange={setAuthDrawerOpen} action={selectedAction} asset={asset} />
    </div>
  );
}
