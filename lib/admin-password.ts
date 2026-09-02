import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { ADMIN_PASSWORD_MIN_LENGTH } from "@/lib/admin-auth-constants";

const scrypt = promisify(scryptCallback);
const KEY_LENGTH = 64;
export { ADMIN_PASSWORD_MIN_LENGTH } from "@/lib/admin-auth-constants";

export type AdminPasswordChangeInput = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

export function validateAdminPasswordChange(input: AdminPasswordChangeInput): string | null {
  if (!input.currentPassword || !input.newPassword || !input.confirmPassword) {
    return "Complete all password fields.";
  }
  if (input.newPassword.length < ADMIN_PASSWORD_MIN_LENGTH) {
    return `New password must contain at least ${ADMIN_PASSWORD_MIN_LENGTH} characters.`;
  }
  if (input.newPassword.length > 128) {
    return "New password must contain no more than 128 characters.";
  }
  if (input.newPassword !== input.confirmPassword) {
    return "New passwords do not match.";
  }
  if (input.currentPassword === input.newPassword) {
    return "Choose a password different from your current password.";
  }
  return null;
}

export async function hashAdminPassword(password: string): Promise<string> {
  if (password.length < ADMIN_PASSWORD_MIN_LENGTH) {
    throw new Error(`Admin passwords must contain at least ${ADMIN_PASSWORD_MIN_LENGTH} characters.`);
  }
  const salt = randomBytes(16);
  const key = await scrypt(password, salt, KEY_LENGTH) as Buffer;
  return `scrypt$${salt.toString("base64url")}$${key.toString("base64url")}`;
}

export async function verifyAdminPassword(password: string, encoded: string): Promise<boolean> {
  const [algorithm, saltText, keyText] = encoded.split("$");
  if (algorithm !== "scrypt" || !saltText || !keyText) return false;
  try {
    const salt = Buffer.from(saltText, "base64url");
    const expected = Buffer.from(keyText, "base64url");
    if (expected.length !== KEY_LENGTH) return false;
    const actual = await scrypt(password, salt, expected.length) as Buffer;
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}
