import { getStaffOverviewAdminAction } from "@/actions/admin";
import StaffClient from "@/components/admin/StaffClient";

export const metadata = {
  title: "Staff Management | Lumière Admin",
  description: "Manage restaurant staff members, roles, permissions, and tenant invitations.",
};

export default async function AdminStaffPage() {
  const result = await getStaffOverviewAdminAction();

  if (!result.ok) {
    return (
      <div className="bg-white border border-cream2 p-8 rounded-xl text-center space-y-3">
        <h2 className="font-serif text-xl text-wine">Access Restricted</h2>
        <p className="text-sm text-neutral-600 max-w-md mx-auto">
          {result.error || "You do not have permission to view staff management."}
        </p>
      </div>
    );
  }

  return (
    <StaffClient
      initialStaff={result.data}
      initialInvitations={result.invitations}
      currentRole={result.currentRole!}
      currentUserId={result.currentUserId!}
      initialStats={result.stats!}
    />
  );
}
