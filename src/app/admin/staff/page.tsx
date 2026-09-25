import { getStaffOverviewAdminAction, getEmployeesAdminAction } from "@/actions/admin";
import StaffClient from "@/components/admin/StaffClient";

export const metadata = {
  title: "Staff & Employees | Lumière Admin",
  description: "Maintain employee records, workforce directory, and Lumière system access.",
};

export default async function AdminStaffPage() {
  const [staffResult, empResult] = await Promise.all([
    getStaffOverviewAdminAction(),
    getEmployeesAdminAction(),
  ]);

  if (!staffResult.ok) {
    return (
      <div className="bg-white border border-cream2 p-8 rounded-xl text-center space-y-3">
        <h2 className="font-serif text-xl text-wine">Access Restricted</h2>
        <p className="text-sm text-neutral-600 max-w-md mx-auto">
          {staffResult.error || "You do not have permission to view staff & employee management."}
        </p>
      </div>
    );
  }

  return (
    <StaffClient
      initialStaff={staffResult.data}
      initialInvitations={staffResult.invitations}
      currentRole={staffResult.currentRole!}
      currentUserId={staffResult.currentUserId!}
      initialStats={staffResult.stats!}
      initialEmployees={empResult.ok ? empResult.data : []}
      initialEmployeeStats={
        empResult.ok
          ? empResult.stats
          : { totalEmployees: 0, activeEmployees: 0, pendingEmployees: 0, withLumiereAccess: 0 }
      }
    />
  );
}
