import { BackButton } from "../ui/back-button";

interface ScreenHeaderProps {
  title: string;
  backTo?: "home" | "my-notes";
  showBackButton?: boolean;
}

export function ScreenHeader({ title, backTo = "home", showBackButton = true }: ScreenHeaderProps) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-app-background border-b border-app-border">
      {showBackButton && <BackButton to={backTo} />}
      <h1 className="text-lg font-semibold text-app-primary tracking-tight">{title}</h1>
    </div>
  );
}