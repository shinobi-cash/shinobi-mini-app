/**
 * Shared validation utilities
 */

import { storageManager } from "@/lib/storage";

export async function validateAccountName(name: string): Promise<string | null> {
  const trimmed = name.trim();
  if (!trimmed) return "Account name is required";
  if (trimmed.length < 2) return "Account name must be at least 2 characters";
  if (trimmed.length > 30) return "Account name must be less than 30 characters";
  if (!/^[a-zA-Z0-9\s\-_]+$/.test(trimmed))
    return "Account name can only contain letters, numbers, spaces, hyphens, and underscores";

  const exists = await storageManager.accountExists(trimmed);
  if (exists) return "An account with this name already exists";

  return null;
}
