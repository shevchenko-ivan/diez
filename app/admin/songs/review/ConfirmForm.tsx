"use client";

import type { ReactNode } from "react";

/** Server-action form that asks first — for the moderation decisions that
 *  can't be undone from the UI (merge deletes the submission). */
export function ConfirmForm({
  action,
  message,
  children,
}: {
  action: (formData: FormData) => void | Promise<void>;
  message: string;
  children: ReactNode;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </form>
  );
}
