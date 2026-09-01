"use server";

import { redirect } from "next/navigation";
import { signInAdmin, signOutAdmin } from "@/lib/admin-auth";

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
    const user = await signInAdmin(email, password, formData.get("remember") === "on");
    if (!user) {
      return { error: "Invalid email or password." };
    }
  } catch (err) {
    console.error("Admin login failed:", err);
    return { error: "Something went wrong. Try again." };
  }

  redirect("/admin");
}

export async function logoutAction() {
  await signOutAdmin();
  redirect("/admin/login");
}
