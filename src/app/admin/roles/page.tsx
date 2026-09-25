import { requireRole } from "@/lib/tenant";
import RolesClient from "@/components/admin/RolesClient";

export const metadata = {
  title: "Roles & Permissions | Lumière Admin",
  description: "View system roles and permission matrix across all platform modules.",
};

export default async function AdminRolesPage() {
  const auth = await requireRole(["owner", "manager"]);

  if (!auth.ok) {
    return (
      <div className="bg-white border border-cream2 p-8 rounded-xl text-center space-y-3">
        <h2 className="font-serif text-xl text-wine">Access Restricted</h2>
        <p className="text-sm text-neutral-600 max-w-md mx-auto">
          {auth.error || "You do not have permission to view roles & permissions."}
        </p>
      </div>
    );
  }

  return <RolesClient currentRole={auth.context.role} />;
}
