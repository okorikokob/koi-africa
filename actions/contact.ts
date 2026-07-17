"use server";

import { z } from "zod";
import { contactFormSchema } from "@/lib/schemas";
import { createInsforgeServer } from "@/lib/insforge-server";

export type ContactActionState = { success: boolean; error?: string };

const SUPPORT_EMAIL = "hello@koiafrica.com";

export async function submitContactForm(
  _prevState: ContactActionState,
  formData: FormData,
): Promise<ContactActionState> {
  let input;
  try {
    input = contactFormSchema.parse({
      name: formData.get("name"),
      email: formData.get("email"),
      message: formData.get("message"),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message };
    }
    throw error;
  }

  try {
    const insforge = createInsforgeServer();
    const { error } = await insforge.emails.send({
      to: SUPPORT_EMAIL,
      replyTo: input.email,
      subject: `New contact form message from ${input.name}`,
      html: `<p><strong>From:</strong> ${input.name} (${input.email})</p><p>${input.message.replace(/\n/g, "<br>")}</p>`,
    });

    if (error) {
      console.error("[actions/contact] email send failed", error);
      return { success: false, error: "Failed to send your message. Please try again." };
    }

    return { success: true };
  } catch (error) {
    console.error("[actions/contact]", error);
    return { success: false, error: "Failed to send your message. Please try again." };
  }
}
