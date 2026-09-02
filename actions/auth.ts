"use server";

import { redirect } from "next/navigation";
import { rotateAdminPassword, signInAdmin, signOutAdmin } from "@/lib/admin-auth";
import { validateAdminPasswordChange } from "@/lib/admin-password";

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

export type PasswordChangeState = { error: string | null; success: boolean };

export async function changePasswordAction(
  _previousState: PasswordChangeState,
  formData: FormData,
): Promise<PasswordChangeState> {
  const input = {
    currentPassword: String(formData.get("currentPassword") ?? ""),
    newPassword: String(formData.get("newPassword") ?? ""),
    confirmPassword: String(formData.get("confirmPassword") ?? ""),
  };
  const validationError = validateAdminPasswordChange(input);
  if (validationError) return { error: validationError, success: false };

  try {
    const result = await rotateAdminPassword(input.currentPassword, input.newPassword);
    if (result === "invalid_current_password") {
      return { error: "Current password is incorrect.", success: false };
    }
    if (result === "unauthenticated") {
      return { error: "Your session expired. Sign in again before changing your password.", success: false };
    }
    return { error: null, success: true };
  } catch (error) {
    console.error("Admin password change failed:", error instanceof Error ? error.message : "Unknown error");
    return { error: "Password could not be changed. Try again.", success: false };
  }
}
