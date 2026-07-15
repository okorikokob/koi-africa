"use server";

import { redirect } from "next/navigation";
import { getAuthActions } from "@/lib/insforge-auth";

export type LoginState = { error: string | null };

export async function loginAction(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Enter your email and password." };
  }

  try {
    const auth = await getAuthActions();
    const { error } = await auth.signInWithPassword({ email, password });
    if (error) {
      return { error: "Invalid email or password." };
    }
  } catch (err) {
    console.error("Admin login failed:", err);
    return { error: "Something went wrong. Try again." };
  }

  redirect("/admin");
}

export async function logoutAction() {
  const auth = await getAuthActions();
  await auth.signOut();
  redirect("/admin/login");
}
