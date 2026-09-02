import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import { AdminTopbar } from "@/components/admin/AdminTopbar";
import { ChangePasswordForm } from "@/components/admin/ChangePasswordForm";

export const metadata: Metadata = {
  title: "Security Settings — KOI Admin",
  robots: { index: false, follow: false },
};

export default function AdminSettingsPage() {
  return (
    <>
      <AdminTopbar title="Settings" />
      <div className="px-4 py-6 sm:px-6 sm:py-8 lg:px-9">
        <section className="max-w-3xl rounded-card border border-border bg-surface p-4.5 shadow-sm sm:p-6.5">
          <div className="flex items-start gap-3">
            <div className="rounded-[11px] bg-primary-soft p-2.5 text-primary">
              <ShieldCheck className="h-5 w-5" strokeWidth={1.75} />
            </div>
            <div>
              <h1 className="font-display text-xl font-black text-text-primary">Password security</h1>
              <p className="mt-1.5 max-w-xl font-sans text-sm leading-relaxed text-text-secondary">
                Change your password and revoke every other signed-in admin session. This browser receives a fresh secure session after the update.
              </p>
            </div>
          </div>
          <ChangePasswordForm />
        </section>
      </div>
    </>
  );
}
