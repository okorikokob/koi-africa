import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/insforge-auth";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getAdminUser();
  if (!user) redirect("/admin/login");

  return (
    <div className="flex min-h-svh bg-background">
      <AdminSidebar />
      <main className="flex-1 px-8 py-8">{children}</main>
    </div>
  );
}
