/**
 * ConvenientLogin
 * Single component for login via passkey (if supported) or password otherwise.
 */
import { useAuth } from "@/contexts/AuthContext";
import { showToast } from "@/lib/toast";
import { isPasskeySupported } from "@/utils/environment";
import { Fingerprint, Lock } from "lucide-react";
import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { PasswordField } from "../../ui/password-field";
import { performPasskeyLogin, performPasswordLogin } from "./helpers/authFlows";
import { AuthError, AuthErrorCode } from "@/lib/errors/AuthError";

interface ConvenientLoginProps {
  onSuccess: () => void;
}

export function ConvenientLogin({ onSuccess }: ConvenientLoginProps) {
  const { setKeys } = useAuth();
  const passkey = useMemo(() => isPasskeySupported(), []);

  const [accountName, setAccountName] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // password-only state
  const [password, setPassword] = useState("");
  

  useEffect(() => {
    const id = passkey ? "username-login" : "username-password-login";
    const input = document.getElementById(id) as HTMLInputElement | null;
    input?.focus();
  }, [passkey]);

  const doPasskeyLogin = async () => {
    if (!accountName.trim()) {
      setError("Please enter an account name");
      return;
    }
    setIsProcessing(true);
    setError(null);
    try {
      const result = await performPasskeyLogin(accountName);
      setKeys(result);
      showToast.auth.success("Passkey login");
      onSuccess();
    } catch (err) {
      console.error("Passkey login failed:", err);
      let msg = "Authentication failed. Please try again.";
      if (err instanceof AuthError) {
        switch (err.code) {
          case AuthErrorCode.PASSKEY_PRF_UNSUPPORTED:
            msg = "Your device doesn’t support required passkey features. Use password instead.";
            break;
          case AuthErrorCode.PASSKEY_NOT_FOUND:
            msg = err.message;
            break;
          case AuthErrorCode.PASSKEY_CANCELLED:
            msg = "Authentication was cancelled. Please try again.";
            break;
          default:
            msg = err.message || msg;
        }
      }
      setError(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  const onPasswordSubmit: React.FormEventHandler = async (e) => {
    e.preventDefault();
    if (!password.trim() || !accountName.trim()) {
      setError("Please enter both account name and password");
      return;
    }
    setIsProcessing(true);
    setError(null);
    try {
      const result = await performPasswordLogin(accountName, password);
      setKeys(result);
      showToast.auth.success("Login");
      onSuccess();
    } catch (err) {
      console.error("Password login failed:", err);
      const msg = err instanceof AuthError ? err.message : err instanceof Error ? err.message : "Authentication failed";
      setError(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  if (passkey) {
    return (
      <div className="space-y-2">
        <Input
          id="username-login"
          type="text"
          value={accountName}
          onChange={(e) => {
            setAccountName(e.target.value);
            if (error) setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && accountName.trim() && !isProcessing) {
              void doPasskeyLogin();
            }
          }}
          placeholder="Account Name"
          autoComplete="username webauthn"
          className="mt-3 mb-2"
          disabled={isProcessing}
        />
        {error && <p className="text-red-600 text-xs mb-2">{error}</p>}
        <Button onClick={doPasskeyLogin} disabled={isProcessing || !accountName.trim()} className="w-full" size="lg">
          {isProcessing ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              Authenticating...
            </>
          ) : (
            <>
              <Fingerprint className="w-4 h-4 mr-2" />
              Login with Passkey
            </>
          )}
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onPasswordSubmit} className="space-y-2">
      <Input
        id="username-password-login"
        type="text"
        value={accountName}
        onChange={(e) => {
          setAccountName(e.target.value);
          if (error) setError(null);
        }}
        placeholder="Account Name"
        autoComplete="username"
        className="mt-3 mb-2"
        disabled={isProcessing}
      />
      <PasswordField
        id="login-password"
        value={password}
        onChange={(val) => {
          setPassword(val);
          if (error) setError(null);
        }}
        placeholder="Enter your password"
        required
        disabled={isProcessing}
        autoComplete="current-password"
        errorText={error ?? undefined}
      />
      {error && <p className="text-red-600 text-xs">{error}</p>}
      <Button type="submit" disabled={isProcessing || !password.trim() || !accountName.trim()} className="w-full" size="lg">
        {isProcessing ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
            Logging in...
          </>
        ) : (
          <>
            <Lock className="w-4 h-4 mr-2" />
            Login with Password
          </>
        )}
      </Button>
    </form>
  );
}
