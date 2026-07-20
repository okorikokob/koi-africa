import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/insforge-auth";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminMobileNavProvider } from "@/components/admin/AdminMobileNavProvider";

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getAdminUser();
  if (!user) redirect("/admin/login");

  return (
    <AdminMobileNavProvider>
      <div className="flex min-h-svh bg-background">
        <AdminSidebar name={user.profile?.name ?? ""} email={user.email ?? ""} />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </AdminMobileNavProvider>
  );
}
