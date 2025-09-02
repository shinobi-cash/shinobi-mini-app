import type React from "react";
import { useAuth } from "@/contexts/AuthContext";
import { AuthenticationActions } from "./AuthenticationActions";

interface AuthenticationGateProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  context?: "profile" | "deposit" | "withdraw";
}

export const AuthenticationGate = ({
  children,
  title = "Welcome to Shinobi",
  description = "Choose how you want to get started:",
  context = "profile",
}: AuthenticationGateProps) => {
  const { isAuthenticated } = useAuth();

  // If user is authenticated, show children (the protected content)
  if (isAuthenticated) {
    return <>{children}</>;
  }

  // Otherwise show authentication options
  return (
    <div className="h-full flex flex-col items-center justify-center">
      <div className="w-full max-w-sm mx-auto flex flex-col items-center justify-center px-4 py-10">
        <h2 className="text-2xl font-bold mb-4 text-center text-app-primary dark:text-app-primary font-sans">
          {title}
        </h2>
        <p className="text-base mb-8 text-center text-app-secondary dark:text-app-secondary">{description}</p>

        <AuthenticationActions context={context} />
      </div>
    </div>
  );
};
