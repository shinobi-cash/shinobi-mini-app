/**
 * Toast utility functions using sonner
 * Provides consistent toast messaging across the app
 */

import { toast } from "sonner";

export const showToast = {
  success: (message: string, options?: Parameters<typeof toast.success>[1]) => {
    return toast.success(message, options);
  },

  error: (message: string, options?: Parameters<typeof toast.error>[1]) => {
    return toast.error(message, options);
  },

  info: (message: string, options?: Parameters<typeof toast>[1]) => {
    return toast(message, options);
  },

  warning: (message: string, options?: Parameters<typeof toast>[1]) => {
    return toast(message, {
      ...options,
      className: "toast-warning",
    });
  },


  // Utility for authentication actions
  auth: {
    success: (action: string) => {
      return toast.success(`${action} successful!`, {
        duration: 3000,
      });
    },
    error: (action: string) => {
      return toast.error(`${action} failed`, {
        duration: 4000,
      });
    },
  },
};