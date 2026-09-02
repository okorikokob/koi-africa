"use client";

import { useActionState, useEffect, useRef } from "react";
import { LockKeyhole } from "lucide-react";
import { changePasswordAction, type PasswordChangeState } from "@/actions/auth";
import { ADMIN_PASSWORD_MIN_LENGTH } from "@/lib/admin-auth-constants";

const initialState: PasswordChangeState = { error: null, success: false };
const inputClass = "w-full rounded-[12px] border-[1.5px] border-border bg-background px-4 py-3.5 font-sans text-sm text-text-primary outline-none transition-all duration-150 placeholder:text-text-muted focus:border-primary focus:ring-4 focus:ring-primary-soft";

export function ChangePasswordForm() {
  const [state, formAction, pending] = useActionState(changePasswordAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state.success]);

  return (
    <form ref={formRef} action={formAction} className="mt-6 flex max-w-xl flex-col gap-5">
      {state.error && (
        <p role="alert" className="rounded-[10px] border border-error/30 bg-error/10 px-3.5 py-3 font-sans text-[13px] font-semibold text-error">
          {state.error}
        </p>
      )}
      {state.success && (
        <p role="status" className="rounded-[10px] border border-success/30 bg-success/10 px-3.5 py-3 font-sans text-[13px] font-semibold text-success">
          Password changed. Every previous admin session has been signed out.
        </p>
      )}

      <div className="flex flex-col gap-2">
        <label htmlFor="currentPassword" className="font-sans text-xs font-bold text-text-primary">Current password</label>
        <input id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" required className={inputClass} />
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="newPassword" className="font-sans text-xs font-bold text-text-primary">New password</label>
        <input id="newPassword" name="newPassword" type="password" autoComplete="new-password" required minLength={ADMIN_PASSWORD_MIN_LENGTH} maxLength={128} className={inputClass} />
        <p className="font-sans text-xs text-text-muted">Use at least {ADMIN_PASSWORD_MIN_LENGTH} characters.</p>
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="confirmPassword" className="font-sans text-xs font-bold text-text-primary">Confirm new password</label>
        <input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" required minLength={ADMIN_PASSWORD_MIN_LENGTH} maxLength={128} className={inputClass} />
      </div>

      <button type="submit" disabled={pending} className="inline-flex w-fit items-center justify-center gap-2 rounded-[13px] bg-primary px-5 py-3.5 font-sans text-sm font-extrabold text-primary-foreground transition-all duration-150 hover:-translate-y-px hover:bg-primary-hover hover:shadow-[0_8px_24px_rgba(0,74,173,0.3)] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-none">
        <LockKeyhole className="h-4 w-4" strokeWidth={2} />
        {pending ? "Changing password…" : "Change password"}
      </button>
    </form>
  );
}
