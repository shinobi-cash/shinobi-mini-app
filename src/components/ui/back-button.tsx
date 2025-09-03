import { useNavigation } from "@/contexts/NavigationContext";
import { ChevronLeft } from "lucide-react";
import { Button } from "./button";

interface BackButtonProps {
  to?: "home" | "my-notes";
  className?: string;
}

export function BackButton({ to = "home", className = "" }: BackButtonProps) {
  const { setCurrentScreen } = useNavigation();

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setCurrentScreen(to)}
      className={`h-8 w-8 p-0 hover:bg-app-surface-hover transition-colors duration-200 ${className}`}
      aria-label="Go back"
    >
      <ChevronLeft className="h-4 w-4 text-app-secondary" />
    </Button>
  );
}