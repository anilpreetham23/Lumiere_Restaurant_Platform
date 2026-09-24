"use client";

import { useState, useTransition } from "react";
import {
  updateStaffRoleAdminAction,
  toggleStaffStatusAdminAction,
  createStaffInvitationAdminAction,
  revokeStaffInvitationAdminAction,
} from "@/actions/admin";
import { Role } from "@/lib/tenant";

type StaffMember = {
  id: string;
  userId: string;
  restaurantId: string;
  role: Role;
  status: "active" | "inactive";
  email: string;
  fullName: string;
  createdAt: string;
  lastSignInAt: string | null;
};

type StaffInvitation = {
  id: string;
  restaurantId: string;
  email: string;
  role: Role;
  token: string;
  status: "pending" | "accepted" | "revoked" | "expired";
  invitedBy: string;
  expiresAt: string;
  createdAt: string;
};

type StaffStats = {
  totalStaff: number;
  activeStaff: number;
  ownersCount: number;
  managersCount: number;
  pendingInvites: number;
};

type Props = {
  initialStaff: StaffMember[];
  initialInvitations: StaffInvitation[];
  currentRole: Role;
  currentUserId: string;
  initialStats: StaffStats;
};

export default function StaffClient({
  initialStaff,
  initialInvitations,
  currentRole,
  currentUserId,
  initialStats,
}: Props) {
  const [staff, setStaff] = useState<StaffMember[]>(initialStaff);
  const [invitations, setInvitations] = useState<StaffInvitation[]>(initialInvitations);
  const [stats, setStats] = useState<StaffStats>(initialStats);
  const [isPending, startTransition] = useTransition();

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);

  // Invite Modal state
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<Role>("staff");
  const [inviteResult, setInviteResult] = useState<{ token?: string; link?: string; error?: string } | null>(null);

  // Error/Success Notification
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const canManage = currentRole === "owner" || currentRole === "manager";

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const filteredStaff = staff.filter((member) => {
    const matchesSearch =
      member.fullName.toLowerCase().includes(search.toLowerCase()) ||
      member.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === "all" || member.role === roleFilter;
    const matchesStatus = statusFilter === "all" || member.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const handleRoleChange = (targetUserId: string, newRole: Role) => {
    startTransition(async () => {
      const res = await updateStaffRoleAdminAction(targetUserId, newRole);
      if (res.ok) {
        setStaff((prev) =>
          prev.map((s) => (s.userId === targetUserId ? { ...s, role: newRole } : s))
        );
        showToast("Staff member role updated successfully.");
        if (selectedStaff?.userId === targetUserId) {
          setSelectedStaff((prev) => (prev ? { ...prev, role: newRole } : null));
        }
      } else {
        showToast(res.error || "Failed to update role", "error");
      }
    });
  };

  const handleStatusToggle = (targetUserId: string, currentStatus: "active" | "inactive") => {
    const newStatus = currentStatus === "active" ? "inactive" : "active";
    startTransition(async () => {
      const res = await toggleStaffStatusAdminAction(targetUserId, newStatus);
      if (res.ok) {
        setStaff((prev) =>
          prev.map((s) => (s.userId === targetUserId ? { ...s, status: newStatus } : s))
        );
        setStats((prev) => ({
          ...prev,
          activeStaff: newStatus === "active" ? prev.activeStaff + 1 : prev.activeStaff - 1,
        }));
        showToast(`Staff member status changed to ${newStatus}.`);
        if (selectedStaff?.userId === targetUserId) {
          setSelectedStaff((prev) => (prev ? { ...prev, status: newStatus } : null));
        }
      } else {
        showToast(res.error || "Failed to update status", "error");
      }
    });
  };

  const handleCreateInvite = (e: React.FormEvent) => {
    e.preventDefault();
    setInviteResult(null);
    startTransition(async () => {
      const res = await createStaffInvitationAdminAction(inviteEmail, inviteRole);
      if (res.ok && res.token) {
        const inviteLink = `${window.location.origin}/auth/accept-invite?token=${res.token}`;
        setInviteResult({ token: res.token, link: inviteLink });
        setInvitations((prev) => [
          {
            id: `inv-${Date.now()}`,
            restaurantId: "",
            email: inviteEmail.toLowerCase().trim(),
            role: inviteRole,
            token: res.token!,
            status: "pending",
            invitedBy: currentUserId,
            expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
            createdAt: new Date().toISOString(),
          },
          ...prev,
        ]);
        setStats((prev) => ({ ...prev, pendingInvites: prev.pendingInvites + 1 }));
        showToast("Invitation generated successfully.");
        setInviteEmail("");
      } else {
        setInviteResult({ error: res.error || "Failed to create invitation" });
      }
    });
  };

  const handleRevokeInvite = (invitationId: string) => {
    startTransition(async () => {
      const res = await revokeStaffInvitationAdminAction(invitationId);
      if (res.ok) {
        setInvitations((prev) =>
          prev.map((i) => (i.id === invitationId ? { ...i, status: "revoked" } : i))
        );
        setStats((prev) => ({ ...prev, pendingInvites: Math.max(0, prev.pendingInvites - 1) }));
        showToast("Invitation revoked.");
      } else {
        showToast(res.error || "Failed to revoke invitation", "error");
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium transition-all ${
            toast.type === "success" ? "bg-emerald-800 text-white" : "bg-wine text-white"
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl text-ink">Staff Management</h1>
          <p className="text-sm text-neutral-500 mt-1">
            Manage team members, assign roles, and handle tenant access.
          </p>
        </div>
        {canManage && (
          <button
            onClick={() => {
              setIsInviteOpen(true);
              setInviteResult(null);
            }}
            className="px-4 py-2.5 bg-wine hover:bg-[#5e2329] text-white rounded-md text-sm font-medium transition-colors shadow-sm self-start md:self-auto"
          >
            + Invite Staff Member
          </button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-cream2 p-4 rounded-xl shadow-xs">
          <p className="text-xs uppercase tracking-wider text-neutral-500 font-medium">Total Staff</p>
          <p className="text-2xl font-serif text-ink mt-1">{stats.totalStaff}</p>
        </div>
        <div className="bg-white border border-cream2 p-4 rounded-xl shadow-xs">
          <p className="text-xs uppercase tracking-wider text-neutral-500 font-medium">Active Members</p>
          <p className="text-2xl font-serif text-emerald-700 mt-1">{stats.activeStaff}</p>
        </div>
        <div className="bg-white border border-cream2 p-4 rounded-xl shadow-xs">
          <p className="text-xs uppercase tracking-wider text-neutral-500 font-medium">Owners / Managers</p>
          <p className="text-2xl font-serif text-wine mt-1">
            {stats.ownersCount} <span className="text-sm font-sans text-neutral-400">/ {stats.managersCount}</span>
          </p>
        </div>
        <div className="bg-white border border-cream2 p-4 rounded-xl shadow-xs">
          <p className="text-xs uppercase tracking-wider text-neutral-500 font-medium">Pending Invites</p>
          <p className="text-2xl font-serif text-amber-600 mt-1">{stats.pendingInvites}</p>
        </div>
      </div>

      {/* Controls & Filters */}
      <div className="bg-white border border-cream2 p-4 rounded-xl shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search staff by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3 py-2 border border-cream2 rounded-md text-sm focus:outline-none focus:border-wine"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-2 border border-cream2 rounded-md text-sm focus:outline-none focus:border-wine"
            >
              <option value="all">All Roles</option>
              <option value="owner">Owners</option>
              <option value="manager">Managers</option>
              <option value="staff">Staff</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-cream2 rounded-md text-sm focus:outline-none focus:border-wine"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        {/* Staff Table */}
        <div className="overflow-x-auto border-t border-cream2 pt-4">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-cream2 text-neutral-500 text-xs font-medium uppercase tracking-wider">
                <th className="pb-3 px-2">Member</th>
                <th className="pb-3 px-2">Email</th>
                <th className="pb-3 px-2">Role</th>
                <th className="pb-3 px-2">Status</th>
                <th className="pb-3 px-2">Joined</th>
                <th className="pb-3 px-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream2">
              {filteredStaff.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-neutral-400">
                    No staff members match the selected filters.
                  </td>
                </tr>
              ) : (
                filteredStaff.map((member) => {
                  const isSelf = member.userId === currentUserId;
                  const isOwner = member.role === "owner";

                  return (
                    <tr key={member.id} className="hover:bg-cream/40 transition-colors">
                      <td className="py-3 px-2 font-medium text-ink flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-wine/10 text-wine grid place-items-center font-bold text-xs">
                          {member.fullName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <span>{member.fullName}</span>
                          {isSelf && (
                            <span className="ml-2 text-[10px] bg-wine/10 text-wine px-1.5 py-0.5 rounded font-medium">
                              You
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-2 text-neutral-600">{member.email}</td>
                      <td className="py-3 px-2">
                        {canManage && !isSelf && (currentRole === "owner" || !isOwner) ? (
                          <select
                            value={member.role}
                            disabled={isPending}
                            onChange={(e) => handleRoleChange(member.userId, e.target.value as Role)}
                            className="px-2 py-1 border border-cream2 rounded text-xs font-medium bg-white focus:outline-none focus:border-wine"
                          >
                            <option value="staff">Staff</option>
                            <option value="manager">Manager</option>
                            {currentRole === "owner" && <option value="owner">Owner</option>}
                          </select>
                        ) : (
                          <span
                            className={`inline-flex px-2 py-0.5 text-xs rounded-full font-medium capitalize ${
                              member.role === "owner"
                                ? "bg-amber-100 text-amber-900 border border-amber-300"
                                : member.role === "manager"
                                ? "bg-wine/10 text-wine"
                                : "bg-neutral-100 text-neutral-700"
                            }`}
                          >
                            {member.role}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-2">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs rounded-full font-medium ${
                            member.status === "active"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-neutral-100 text-neutral-500"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              member.status === "active" ? "bg-emerald-600" : "bg-neutral-400"
                            }`}
                          />
                          <span className="capitalize">{member.status}</span>
                        </span>
                      </td>
                      <td className="py-3 px-2 text-neutral-500 text-xs">
                        {new Date(member.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-2 text-right space-x-2">
                        <button
                          onClick={() => setSelectedStaff(member)}
                          className="text-xs text-wine hover:underline font-medium"
                        >
                          Details
                        </button>
                        {canManage && !isSelf && (currentRole === "owner" || !isOwner) && (
                          <button
                            disabled={isPending}
                            onClick={() => handleStatusToggle(member.userId, member.status)}
                            className={`text-xs font-medium ${
                              member.status === "active"
                                ? "text-neutral-500 hover:text-wine"
                                : "text-emerald-700 hover:text-emerald-900"
                            }`}
                          >
                            {member.status === "active" ? "Deactivate" : "Activate"}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invitations Ledger */}
      {invitations.length > 0 && (
        <div className="bg-white border border-cream2 p-4 rounded-xl shadow-xs space-y-3">
          <h2 className="font-serif text-lg text-ink">Staff Invitations</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-cream2 text-neutral-500 text-xs font-medium uppercase tracking-wider">
                  <th className="pb-2 px-2">Invited Email</th>
                  <th className="pb-2 px-2">Assigned Role</th>
                  <th className="pb-2 px-2">Status</th>
                  <th className="pb-2 px-2">Expires</th>
                  <th className="pb-2 px-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cream2">
                {invitations.map((inv) => (
                  <tr key={inv.id} className="text-xs">
                    <td className="py-2.5 px-2 font-medium text-neutral-800">{inv.email}</td>
                    <td className="py-2.5 px-2 capitalize">{inv.role}</td>
                    <td className="py-2.5 px-2">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium capitalize ${
                          inv.status === "pending"
                            ? "bg-amber-100 text-amber-800"
                            : inv.status === "accepted"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-neutral-100 text-neutral-500"
                        }`}
                      >
                        {inv.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-2 text-neutral-500">
                      {new Date(inv.expiresAt).toLocaleDateString()}
                    </td>
                    <td className="py-2.5 px-2 text-right space-x-2">
                      {inv.status === "pending" && (
                        <>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(inv.token);
                              showToast("Invitation token copied to clipboard!");
                            }}
                            className="text-xs text-wine hover:underline"
                          >
                            Copy Token
                          </button>
                          {canManage && (
                            <button
                              disabled={isPending}
                              onClick={() => handleRevokeInvite(inv.id)}
                              className="text-xs text-neutral-400 hover:text-wine"
                            >
                              Revoke
                            </button>
                          )}
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Staff Detail Modal */}
      {selectedStaff && (
        <div className="fixed inset-0 bg-ink/40 backdrop-blur-xs grid place-items-center z-50 p-4">
          <div className="bg-white max-w-md w-full rounded-2xl p-6 shadow-xl border border-cream2 space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-serif text-xl text-ink">{selectedStaff.fullName}</h3>
                <p className="text-sm text-neutral-500">{selectedStaff.email}</p>
              </div>
              <button
                onClick={() => setSelectedStaff(null)}
                className="text-neutral-400 hover:text-ink text-xl"
              >
                ×
              </button>
            </div>

            <div className="space-y-2 border-t border-b border-cream2 py-3 text-sm">
              <div className="flex justify-between">
                <span className="text-neutral-500">Role</span>
                <span className="font-medium capitalize">{selectedStaff.role}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Membership Status</span>
                <span className="font-medium capitalize">{selectedStaff.status}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Joined Date</span>
                <span className="font-medium">
                  {new Date(selectedStaff.createdAt).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Last Sign In</span>
                <span className="font-medium text-xs">
                  {selectedStaff.lastSignInAt
                    ? new Date(selectedStaff.lastSignInAt).toLocaleString()
                    : "Never recorded"}
                </span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedStaff(null)}
                className="px-4 py-2 bg-cream text-neutral-700 rounded-md text-sm font-medium hover:bg-cream2"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invite Staff Modal */}
      {isInviteOpen && (
        <div className="fixed inset-0 bg-ink/40 backdrop-blur-xs grid place-items-center z-50 p-4">
          <div className="bg-white max-w-lg w-full rounded-2xl p-6 shadow-xl border border-cream2 space-y-4">
            <div className="flex justify-between items-center border-b border-cream2 pb-3">
              <h3 className="font-serif text-xl text-ink">Invite Staff Member</h3>
              <button
                onClick={() => setIsInviteOpen(false)}
                className="text-neutral-400 hover:text-ink text-xl"
              >
                ×
              </button>
            </div>

            <div className="bg-amber-50 border border-amber-200 text-amber-900 text-xs p-3 rounded-lg">
              <p className="font-medium">Delivery Notice:</p>
              <p className="mt-0.5">
                Email delivery infrastructure is operating in invitation-token mode. A secure single-use invitation token will be generated upon submission for you to share directly with the member.
              </p>
            </div>

            <form onSubmit={handleCreateInvite} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  placeholder="staff@restaurant.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-cream2 rounded-md text-sm focus:outline-none focus:border-wine"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1">
                  Assigned Role *
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as Role)}
                  className="w-full px-3 py-2 border border-cream2 rounded-md text-sm focus:outline-none focus:border-wine"
                >
                  <option value="staff">Staff</option>
                  <option value="manager">Manager</option>
                  {currentRole === "owner" && <option value="owner">Owner</option>}
                </select>
              </div>

              {inviteResult?.error && (
                <p className="text-xs text-wine font-medium">{inviteResult.error}</p>
              )}

              {inviteResult?.token && (
                <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-lg text-xs space-y-2">
                  <p className="font-medium text-emerald-900">
                    Invitation Generated Successfully!
                  </p>
                  <div>
                    <span className="text-neutral-600">Token:</span>
                    <code className="block bg-white p-1.5 mt-1 rounded border border-emerald-200 font-mono text-xs break-all">
                      {inviteResult.token}
                    </code>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-cream2">
                <button
                  type="button"
                  onClick={() => setIsInviteOpen(false)}
                  className="px-4 py-2 bg-cream text-neutral-700 rounded-md text-sm font-medium hover:bg-cream2"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 bg-wine hover:bg-[#5e2329] text-white rounded-md text-sm font-medium transition-colors"
                >
                  {isPending ? "Generating..." : "Generate Invitation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
