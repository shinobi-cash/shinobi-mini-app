import { KeyGenerationResult } from "@/utils/crypto";
import { noteCache } from "@/lib/storage/noteCache";
import { useState, useRef, useEffect } from "react";
import { Input } from "../../ui/input";
import { AuthSection } from "./AuthSection";

export default function SetupConvenientAuth({
  generatedKeys,
  onSetupConvenientAuthComplete,
}: {
  generatedKeys: KeyGenerationResult | null;
  onSetupConvenientAuthComplete: () => void;
}) {
  // Account setup state (moved to convenient auth step)
  const [accountName, setAccountName] = useState("");
  const [accountNameError, setAccountNameError] = useState("");
  const validationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current);
      }
    };
  }, []);

  // Account name validation (used in convenient auth step)
  const validateAccountName = async (name: string): Promise<string | null> => {
    if (!name.trim()) {
      return "Account name is required";
    }
    if (name.length < 2) {
      return "Account name must be at least 2 characters";
    }
    if (name.length > 30) {
      return "Account name must be less than 30 characters";
    }
    if (!/^[a-zA-Z0-9\s\-_]+$/.test(name)) {
      return "Account name can only contain letters, numbers, spaces, hyphens, and underscores";
    }
    // Check if account already exists
    const exists = await noteCache.accountExists(name.trim());
    if (exists) {
      return "An account with this name already exists";
    }
    return null;
  };
  return (
    <div className="space-y-4">
      <Input
        id="account-name"
        type="text"
        value={accountName}
        onChange={(e) => {
          setAccountName(e.target.value);
          if (accountNameError) setAccountNameError("");

          // Debounce the validation to avoid excessive database calls
          if (validationTimeoutRef.current) {
            clearTimeout(validationTimeoutRef.current);
          }

          if (e.target.value.trim()) {
            validationTimeoutRef.current = setTimeout(async () => {
              try {
                const error = await validateAccountName(e.target.value);
                setAccountNameError(error || "");
              } catch (err) {
                console.warn("Account validation failed:", err);
                // Don't set an error - just skip validation if DB is not ready
              }
            }, 500); // Wait 500ms after user stops typing
          }
        }}
        placeholder="Account Name"
        maxLength={30}
        autoComplete="off"
        aria-invalid={!!accountNameError}
        className="mt-3 mb-2"
      />
      {accountNameError && <p className="text-red-600 text-xs mb-2">{accountNameError}</p>}

      <AuthSection
        mode="setup"
        accountName={accountName}
        accountNameError={accountNameError}
        generatedKeys={generatedKeys}
        onSuccess={onSetupConvenientAuthComplete}
      />
    </div>
  );
}
