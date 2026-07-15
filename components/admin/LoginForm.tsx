"use client";

import { useActionState } from "react";
import { ArrowRight } from "lucide-react";
import { loginAction, type LoginState } from "@/actions/auth";

const initialState: LoginState = { error: null };

const inputCls =
  "w-full rounded-[12px] border-[1.5px] border-border bg-surface px-4 py-3.5 font-sans text-sm text-text-primary placeholder:text-text-muted outline-none transition-all duration-150 focus:border-primary focus:ring-4 focus:ring-primary-soft";

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="flex flex-col">
      {state.error && (
        <p
          role="alert"
          className="mb-5 rounded-[10px] border border-[#F5C2BE] bg-[#FEEEED] px-3.5 py-3 font-sans text-[13px] font-semibold text-[#C0392B]"
        >
          {state.error}
        </p>
      )}

      <div className="mb-5 flex flex-col gap-2">
        <label htmlFor="email" className="font-sans text-xs font-bold text-text-primary">
          Work email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@koiafrica.com"
          className={inputCls}
        />
      </div>

      <div className="mb-5 flex flex-col gap-2">
        <label htmlFor="password" className="font-sans text-xs font-bold text-text-primary">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          placeholder="••••••••••"
          className={inputCls}
        />
      </div>

      <div className="mb-7 flex items-center justify-between font-sans text-[13px]">
        <label className="flex cursor-pointer items-center gap-2 font-medium text-text-secondary">
          <input
            type="checkbox"
            name="remember"
            className="h-4 w-4 cursor-pointer accent-primary"
          />
          Remember me
        </label>
        <a
          href="mailto:hello@koiafrica.com?subject=Admin%20password%20reset"
          className="font-bold text-primary hover:underline"
        >
          Forgot password?
        </a>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="flex w-full items-center justify-center gap-2 rounded-[13px] bg-primary px-4 py-4 font-sans text-[15px] font-extrabold text-primary-foreground transition-all duration-150 hover:-translate-y-px hover:bg-primary-hover hover:shadow-[0_8px_24px_rgba(0,74,173,0.3)] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-none"
      >
        {pending ? "Signing in…" : "Sign In"}
        {!pending && <ArrowRight className="h-4 w-4" strokeWidth={2.5} />}
      </button>
    </form>
  );
}
