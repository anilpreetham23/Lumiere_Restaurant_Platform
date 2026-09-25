"use client";

import { useState, useTransition } from "react";
import * as XLSX from "xlsx";
import {
  updateStaffRoleAdminAction,
  toggleStaffStatusAdminAction,
  createStaffInvitationAdminAction,
  revokeStaffInvitationAdminAction,
  createEmployeeAdminAction,
  updateEmployeeAdminAction,
  setEmployeeStatusAdminAction,
  linkEmployeeUserAdminAction,
  unlinkEmployeeUserAdminAction,
  type EmployeeRecordInput,
} from "@/actions/admin";
import { Role } from "@/lib/tenant";
import {
  Users,
  UserCheck,
  Clock,
  KeyRound,
  Plus,
  Download,
  Search,
  Eye,
  Edit,
  Shield,
  UserPlus,
  X,
  Unlink,
} from "lucide-react";

export type StaffMember = {
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

export type StaffInvitation = {
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

export type StaffStats = {
  totalStaff: number;
  activeStaff: number;
  ownersCount: number;
  managersCount: number;
  pendingInvites: number;
};

export type EmployeeRecord = {
  id: string;
  restaurant_id: string;
  employee_code: string;
  full_name: string;
  phone: string;
  email: string | null;
  date_of_birth: string | null;
  gender: string | null;
  address: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  department: string;
  designation: string;
  employment_type: "full_time" | "part_time" | "contract" | "temporary" | "intern";
  joining_date: string;
  status: "active" | "inactive" | "pending";
  notes: string | null;
  user_id: string | null;
  created_at: string;
  updated_at: string;
  linkedUserEmail?: string | null;
  linkedUserRole?: Role | null;
  linkedUserMembershipStatus?: string | null;
};

export type EmployeeStats = {
  totalEmployees: number;
  activeEmployees: number;
  pendingEmployees: number;
  withLumiereAccess: number;
};

type Props = {
  initialStaff: StaffMember[];
  initialInvitations: StaffInvitation[];
  currentRole: Role;
  currentUserId: string;
  initialStats: StaffStats;
  initialEmployees: EmployeeRecord[];
  initialEmployeeStats: EmployeeStats;
};

const DEFAULT_DEPARTMENTS = [
  "Kitchen",
  "Service & Front",
  "Management",
  "Bar & Beverage",
  "Housekeeping & Cleaning",
  "Logistics & Delivery",
  "Other",
];

export default function StaffClient({
  initialStaff,
  initialInvitations,
  currentRole,
  currentUserId,
  initialStats,
  initialEmployees,
  initialEmployeeStats,
}: Props) {
  const [activeTab, setActiveTab] = useState<"employees" | "system_access">("employees");

  // Employee Directory state
  const [employees, setEmployees] = useState<EmployeeRecord[]>(initialEmployees);
  const [empStats, setEmpStats] = useState<EmployeeStats>(initialEmployeeStats);

  // System Staff state
  const [staff, setStaff] = useState<StaffMember[]>(initialStaff);
  const [invitations, setInvitations] = useState<StaffInvitation[]>(initialInvitations);
  const [stats, setStats] = useState<StaffStats>(initialStats);

  const [isPending, startTransition] = useTransition();

  // Search & Filter state
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [deptFilter, setDeptFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  // Modal States
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeRecord | null>(null);
  const [isAddEmployeeOpen, setIsAddEmployeeOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<EmployeeRecord | null>(null);

  // System Invite Modal State
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<Role>("staff");
  const [inviteResult, setInviteResult] = useState<{ token?: string; error?: string } | null>(null);

  // Link User Modal state
  const [linkingEmployee, setLinkingEmployee] = useState<EmployeeRecord | null>(null);
  const [linkTargetUserId, setLinkTargetUserId] = useState<string>("");

  // Notification Toast
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Registration Form State
  const [formState, setFormState] = useState<EmployeeRecordInput>({
    employee_code: "",
    full_name: "",
    phone: "",
    email: "",
    date_of_birth: "",
    gender: "",
    address: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
    department: "Kitchen",
    designation: "Chef",
    employment_type: "full_time",
    joining_date: new Date().toISOString().split("T")[0],
    status: "active",
    notes: "",
  });

  const canManage = currentRole === "owner" || currentRole === "manager";

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Filtered employees
  const filteredEmployees = employees.filter((emp) => {
    const q = search.toLowerCase();
    const matchesSearch =
      emp.full_name.toLowerCase().includes(q) ||
      emp.employee_code.toLowerCase().includes(q) ||
      emp.phone.toLowerCase().includes(q) ||
      (emp.email && emp.email.toLowerCase().includes(q)) ||
      emp.department.toLowerCase().includes(q) ||
      emp.designation.toLowerCase().includes(q);

    const matchesStatus = statusFilter === "all" || emp.status === statusFilter;
    const matchesDept = deptFilter === "all" || emp.department === deptFilter;
    const matchesType = typeFilter === "all" || emp.employment_type === typeFilter;

    return matchesSearch && matchesStatus && matchesDept && matchesType;
  });

  // Handle Export to Excel
  const handleExportExcel = () => {
    if (filteredEmployees.length === 0) {
      showToast("No employee records to export.", "error");
      return;
    }
    const exportData = filteredEmployees.map((emp) => ({
      "Employee ID": emp.employee_code,
      "Full Name": emp.full_name,
      "Phone": emp.phone,
      "Email": emp.email || "",
      "Date of Birth": emp.date_of_birth || "",
      "Gender": emp.gender || "",
      "Address": emp.address || "",
      "Emergency Contact Name": emp.emergency_contact_name || "",
      "Emergency Contact Phone": emp.emergency_contact_phone || "",
      "Department": emp.department,
      "Designation": emp.designation,
      "Employment Type": emp.employment_type ? emp.employment_type.replace("_", " ").toUpperCase() : "",
      "Joining Date": emp.joining_date || "",
      "Employment Status": emp.status ? emp.status.toUpperCase() : "",
      "Lumière Access": emp.user_id ? "Active System User" : "No System Access",
      "Lumière Role": emp.linkedUserRole ? emp.linkedUserRole.toUpperCase() : "N/A",
      "Notes": emp.notes || "",
      "Created At": new Date(emp.created_at).toLocaleString(),
      "Updated At": new Date(emp.updated_at).toLocaleString(),
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Employee Directory");
    XLSX.writeFile(workbook, `Employees_${new Date().toISOString().split("T")[0]}.xlsx`);
    showToast(`Exported ${filteredEmployees.length} employee records to Excel.`);
  };

  // Create Employee Submit
  const handleCreateEmployeeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.full_name.trim() || !formState.phone.trim() || !formState.department.trim() || !formState.designation.trim()) {
      showToast("Please fill in all required fields marked with *", "error");
      return;
    }

    startTransition(async () => {
      const res = await createEmployeeAdminAction(formState);
      if (res.ok && res.data) {
        setEmployees((prev) => [res.data as EmployeeRecord, ...prev]);
        setEmpStats((prev) => ({
          ...prev,
          totalEmployees: prev.totalEmployees + 1,
          activeEmployees: formState.status === "active" ? prev.activeEmployees + 1 : prev.activeEmployees,
        }));
        showToast(`Employee "${res.data.full_name}" registered successfully.`);
        setIsAddEmployeeOpen(false);
        // Reset form
        setFormState({
          employee_code: "",
          full_name: "",
          phone: "",
          email: "",
          date_of_birth: "",
          gender: "",
          address: "",
          emergency_contact_name: "",
          emergency_contact_phone: "",
          department: "Kitchen",
          designation: "Chef",
          employment_type: "full_time",
          joining_date: new Date().toISOString().split("T")[0],
          status: "active",
          notes: "",
        });
      } else {
        showToast(res.error || "Failed to create employee record", "error");
      }
    });
  };

  // Edit Employee Submit
  const handleEditEmployeeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmployee) return;

    startTransition(async () => {
      const res = await updateEmployeeAdminAction(editingEmployee.id, {
        employee_code: editingEmployee.employee_code,
        full_name: editingEmployee.full_name,
        phone: editingEmployee.phone,
        email: editingEmployee.email,
        date_of_birth: editingEmployee.date_of_birth,
        gender: editingEmployee.gender,
        address: editingEmployee.address,
        emergency_contact_name: editingEmployee.emergency_contact_name,
        emergency_contact_phone: editingEmployee.emergency_contact_phone,
        department: editingEmployee.department,
        designation: editingEmployee.designation,
        employment_type: editingEmployee.employment_type,
        joining_date: editingEmployee.joining_date,
        status: editingEmployee.status,
        notes: editingEmployee.notes,
      });

      if (res.ok) {
        setEmployees((prev) =>
          prev.map((e) => (e.id === editingEmployee.id ? { ...e, ...editingEmployee } : e))
        );
        if (selectedEmployee?.id === editingEmployee.id) {
          setSelectedEmployee((prev) => (prev ? { ...prev, ...editingEmployee } : null));
        }
        showToast("Employee profile updated successfully.");
        setEditingEmployee(null);
      } else {
        showToast(res.error || "Failed to update employee", "error");
      }
    });
  };

  // Employee Record Status Toggle
  const handleToggleEmployeeStatus = (emp: EmployeeRecord) => {
    const nextStatus = emp.status === "active" ? "inactive" : "active";
    startTransition(async () => {
      const res = await setEmployeeStatusAdminAction(emp.id, nextStatus);
      if (res.ok) {
        setEmployees((prev) =>
          prev.map((e) => (e.id === emp.id ? { ...e, status: nextStatus } : e))
        );
        setEmpStats((prev) => ({
          ...prev,
          activeEmployees: nextStatus === "active" ? prev.activeEmployees + 1 : prev.activeEmployees - 1,
        }));
        if (selectedEmployee?.id === emp.id) {
          setSelectedEmployee((prev) => (prev ? { ...prev, status: nextStatus } : null));
        }
        showToast(`Employee "${emp.full_name}" marked as ${nextStatus}.`);
      } else {
        showToast(res.error || "Failed to update employee status", "error");
      }
    });
  };

  // Link User Action
  const handleLinkUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkingEmployee || !linkTargetUserId) return;

    startTransition(async () => {
      const res = await linkEmployeeUserAdminAction(linkingEmployee.id, linkTargetUserId);
      if (res.ok) {
        const targetStaff = staff.find((s) => s.userId === linkTargetUserId);
        const updated = {
          ...linkingEmployee,
          user_id: linkTargetUserId,
          linkedUserEmail: targetStaff?.email || null,
          linkedUserRole: targetStaff?.role || null,
          linkedUserMembershipStatus: targetStaff?.status || null,
        };
        setEmployees((prev) => prev.map((e) => (e.id === linkingEmployee.id ? updated : e)));
        if (selectedEmployee?.id === linkingEmployee.id) {
          setSelectedEmployee(updated);
        }
        setEmpStats((prev) => ({ ...prev, withLumiereAccess: prev.withLumiereAccess + 1 }));
        showToast(`Linked ${linkingEmployee.full_name} to Lumière User account.`);
        setLinkingEmployee(null);
        setLinkTargetUserId("");
      } else {
        showToast(res.error || "Failed to link user", "error");
      }
    });
  };

  // Unlink User Action
  const handleUnlinkUser = (emp: EmployeeRecord) => {
    startTransition(async () => {
      const res = await unlinkEmployeeUserAdminAction(emp.id);
      if (res.ok) {
        const updated = {
          ...emp,
          user_id: null,
          linkedUserEmail: null,
          linkedUserRole: null,
          linkedUserMembershipStatus: null,
        };
        setEmployees((prev) => prev.map((e) => (e.id === emp.id ? updated : e)));
        if (selectedEmployee?.id === emp.id) {
          setSelectedEmployee(updated);
        }
        setEmpStats((prev) => ({ ...prev, withLumiereAccess: Math.max(0, prev.withLumiereAccess - 1) }));
        showToast(`Unlinked system account from ${emp.full_name}.`);
      } else {
        showToast(res.error || "Failed to unlink user", "error");
      }
    });
  };

  // System Role Change
  const handleRoleChange = (targetUserId: string, newRole: Role) => {
    startTransition(async () => {
      const res = await updateStaffRoleAdminAction(targetUserId, newRole);
      if (res.ok) {
        setStaff((prev) =>
          prev.map((s) => (s.userId === targetUserId ? { ...s, role: newRole } : s))
        );
        showToast("Staff member role updated successfully.");
      } else {
        showToast(res.error || "Failed to update role", "error");
      }
    });
  };

  // System Staff Membership Status Toggle
  const handleSystemStatusToggle = (targetUserId: string, currentStatus: "active" | "inactive") => {
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
        showToast(`System staff status changed to ${newStatus}.`);
      } else {
        showToast(res.error || "Failed to update status", "error");
      }
    });
  };

  // Invite System Staff Submit
  const handleCreateInvite = (e: React.FormEvent) => {
    e.preventDefault();
    setInviteResult(null);
    startTransition(async () => {
      const res = await createStaffInvitationAdminAction(inviteEmail, inviteRole);
      if (res.ok && res.token) {
        setInviteResult({ token: res.token });
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
        showToast("System invitation generated successfully.");
        setInviteEmail("");
      } else {
        setInviteResult({ error: res.error || "Failed to create invitation" });
      }
    });
  };

  // Revoke System Invitation
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-cream2 pb-5">
        <div>
          <h1 className="font-serif text-2xl text-ink">Staff & Employees</h1>
          <p className="text-sm text-neutral-500 mt-1">
            Manage employee records, workforce status, and Lumière access.
          </p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          {canManage && (
            <button
              onClick={() => setIsAddEmployeeOpen(true)}
              className="px-4 py-2 bg-wine hover:bg-[#5e2329] text-white rounded-md text-sm font-medium transition-colors shadow-xs flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Add Employee</span>
            </button>
          )}
          <button
            onClick={handleExportExcel}
            className="px-3.5 py-2 bg-white border border-cream2 hover:bg-cream/50 text-neutral-700 rounded-md text-sm font-medium transition-colors shadow-2xs flex items-center gap-1.5"
          >
            <Download className="w-4 h-4 text-wine" />
            <span>Export Excel</span>
          </button>
          {canManage && (
            <button
              onClick={() => {
                setIsInviteOpen(true);
                setInviteResult(null);
              }}
              className="px-3.5 py-2 bg-cream text-neutral-800 hover:bg-cream2 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5"
            >
              <UserPlus className="w-4 h-4 text-wine" />
              <span>Invite to Lumière</span>
            </button>
          )}
        </div>
      </div>

      {/* Top KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-cream2 p-4 rounded-xl shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-wine/10 grid place-items-center text-wine shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-neutral-500 font-medium">Total Employees</p>
            <p className="text-2xl font-serif text-ink mt-0.5">{empStats.totalEmployees}</p>
          </div>
        </div>

        <div className="bg-white border border-cream2 p-4 rounded-xl shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-100 grid place-items-center text-emerald-700 shrink-0">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-neutral-500 font-medium">Active Employees</p>
            <p className="text-2xl font-serif text-emerald-700 mt-0.5">{empStats.activeEmployees}</p>
          </div>
        </div>

        <div className="bg-white border border-cream2 p-4 rounded-xl shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-100 grid place-items-center text-amber-700 shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-neutral-500 font-medium">Pending Status</p>
            <p className="text-2xl font-serif text-amber-700 mt-0.5">{empStats.pendingEmployees}</p>
          </div>
        </div>

        <div className="bg-white border border-cream2 p-4 rounded-xl shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-indigo-100 grid place-items-center text-indigo-700 shrink-0">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-neutral-500 font-medium">Lumière Access</p>
            <p className="text-2xl font-serif text-indigo-900 mt-0.5">{empStats.withLumiereAccess}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-cream2 gap-6 text-sm font-medium">
        <button
          onClick={() => setActiveTab("employees")}
          className={`pb-3 border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "employees"
              ? "border-wine text-wine font-semibold"
              : "border-transparent text-neutral-500 hover:text-neutral-800"
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Employee Directory</span>
          <span className="ml-1 text-xs bg-wine/10 text-wine px-2 py-0.5 rounded-full font-bold">
            {employees.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("system_access")}
          className={`pb-3 border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "system_access"
              ? "border-wine text-wine font-semibold"
              : "border-transparent text-neutral-500 hover:text-neutral-800"
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>System Users & Roles</span>
          <span className="ml-1 text-xs bg-cream2 text-neutral-700 px-2 py-0.5 rounded-full font-bold">
            {staff.length}
          </span>
        </button>
      </div>

      {/* TAB 1: EMPLOYEE DIRECTORY */}
      {activeTab === "employees" && (
        <div className="bg-white border border-cream2 rounded-xl shadow-2xs p-4 space-y-4">
          {/* Controls & Search */}
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-neutral-400" />
              <input
                type="text"
                placeholder="Search by code, name, phone, email, department, designation..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-cream2 rounded-md text-sm focus:outline-none focus:border-wine"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-cream2 rounded-md text-sm focus:outline-none focus:border-wine bg-white"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="pending">Pending</option>
              </select>

              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="px-3 py-2 border border-cream2 rounded-md text-sm focus:outline-none focus:border-wine bg-white"
              >
                <option value="all">All Departments</option>
                {DEFAULT_DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>

              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-3 py-2 border border-cream2 rounded-md text-sm focus:outline-none focus:border-wine bg-white"
              >
                <option value="all">All Types</option>
                <option value="full_time">Full Time</option>
                <option value="part_time">Part Time</option>
                <option value="contract">Contract</option>
                <option value="temporary">Temporary</option>
                <option value="intern">Intern</option>
              </select>
            </div>
          </div>

          {/* Employee Directory Table */}
          <div className="overflow-x-auto border-t border-cream2 pt-2">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-cream2 text-neutral-500 text-xs font-medium uppercase tracking-wider">
                  <th className="pb-3 px-3">Employee</th>
                  <th className="pb-3 px-3">Employee ID</th>
                  <th className="pb-3 px-3">Department</th>
                  <th className="pb-3 px-3">Designation</th>
                  <th className="pb-3 px-3">Contact</th>
                  <th className="pb-3 px-3">Joining Date</th>
                  <th className="pb-3 px-3">Status</th>
                  <th className="pb-3 px-3">Lumière Access</th>
                  <th className="pb-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cream2">
                {filteredEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-neutral-400">
                      No employee records found matching your filters.
                    </td>
                  </tr>
                ) : (
                  filteredEmployees.map((emp) => {
                    const hasAccess = Boolean(emp.user_id);
                    return (
                      <tr key={emp.id} className="hover:bg-cream/40 transition-colors">
                        <td className="py-3 px-3 font-medium text-ink flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-wine/10 text-wine grid place-items-center font-bold text-xs shrink-0">
                            {emp.full_name.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-semibold">{emp.full_name}</span>
                        </td>
                        <td className="py-3 px-3 font-mono text-xs font-semibold text-neutral-700">
                          {emp.employee_code}
                        </td>
                        <td className="py-3 px-3 text-neutral-700">{emp.department}</td>
                        <td className="py-3 px-3 text-neutral-600 text-xs">{emp.designation}</td>
                        <td className="py-3 px-3 text-neutral-600 text-xs">
                          <div>{emp.phone}</div>
                          {emp.email && <div className="text-neutral-400 text-[11px]">{emp.email}</div>}
                        </td>
                        <td className="py-3 px-3 text-neutral-500 text-xs">{emp.joining_date}</td>
                        <td className="py-3 px-3">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full font-medium capitalize ${
                              emp.status === "active"
                                ? "bg-emerald-100 text-emerald-800"
                                : emp.status === "pending"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-neutral-100 text-neutral-500"
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                emp.status === "active"
                                  ? "bg-emerald-600"
                                  : emp.status === "pending"
                                  ? "bg-amber-600"
                                  : "bg-neutral-400"
                              }`}
                            />
                            {emp.status}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          {hasAccess ? (
                            <div className="flex items-center gap-1.5">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded bg-indigo-50 text-indigo-800 border border-indigo-200 font-medium">
                                <KeyRound className="w-3 h-3 text-indigo-600" />
                                <span>{emp.linkedUserRole ? emp.linkedUserRole.toUpperCase() : "Access Granted"}</span>
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-neutral-400 font-medium italic">No Login</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right space-x-2 whitespace-nowrap">
                          <button
                            onClick={() => setSelectedEmployee(emp)}
                            className="text-xs text-wine hover:underline font-medium inline-flex items-center gap-1"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View</span>
                          </button>
                          {canManage && (
                            <>
                              <button
                                onClick={() => setEditingEmployee({ ...emp })}
                                className="text-xs text-neutral-600 hover:text-ink font-medium"
                              >
                                Edit
                              </button>
                              <button
                                disabled={isPending}
                                onClick={() => handleToggleEmployeeStatus(emp)}
                                className={`text-xs font-medium ${
                                  emp.status === "active"
                                    ? "text-neutral-400 hover:text-wine"
                                    : "text-emerald-700 hover:text-emerald-900"
                                }`}
                              >
                                {emp.status === "active" ? "Deactivate" : "Activate"}
                              </button>
                            </>
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
      )}

      {/* TAB 2: SYSTEM ACCESS & ROLES */}
      {activeTab === "system_access" && (
        <div className="space-y-6">
          <div className="bg-white border border-cream2 p-4 rounded-xl shadow-2xs space-y-4">
            <h2 className="font-serif text-lg text-ink">Active System Memberships</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-cream2 text-neutral-500 text-xs font-medium uppercase tracking-wider">
                    <th className="pb-3 px-2">Member</th>
                    <th className="pb-3 px-2">Email</th>
                    <th className="pb-3 px-2">Role</th>
                    <th className="pb-3 px-2">Membership Status</th>
                    <th className="pb-3 px-2">Joined</th>
                    <th className="pb-3 px-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cream2">
                  {staff.map((member) => {
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
                          {canManage && !isSelf && (currentRole === "owner" || !isOwner) && (
                            <button
                              disabled={isPending}
                              onClick={() => handleSystemStatusToggle(member.userId, member.status)}
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
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Invitations Ledger */}
          {invitations.length > 0 && (
            <div className="bg-white border border-cream2 p-4 rounded-xl shadow-2xs space-y-3">
              <h2 className="font-serif text-lg text-ink">Pending Invitations</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-cream2 text-neutral-500 text-xs font-medium uppercase tracking-wider">
                      <th className="pb-2 px-2">Invited Email</th>
                      <th className="pb-2 px-2">Role</th>
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
                                  showToast("Invitation token copied!");
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
        </div>
      )}

      {/* EMPLOYEE DETAIL MODAL / DRAWER */}
      {selectedEmployee && (
        <div className="fixed inset-0 bg-ink/40 backdrop-blur-xs grid place-items-center z-50 p-4 overflow-y-auto">
          <div className="bg-white max-w-xl w-full rounded-2xl p-6 shadow-xl border border-cream2 space-y-6 my-8">
            <div className="flex justify-between items-start border-b border-cream2 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-serif text-xl text-ink font-bold">{selectedEmployee.full_name}</h3>
                  <span className="font-mono text-xs font-semibold px-2 py-0.5 bg-cream text-neutral-700 rounded">
                    {selectedEmployee.employee_code}
                  </span>
                </div>
                <p className="text-xs text-neutral-500 mt-0.5">
                  {selectedEmployee.designation} • {selectedEmployee.department}
                </p>
              </div>
              <button
                onClick={() => setSelectedEmployee(null)}
                className="text-neutral-400 hover:text-ink text-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Grid */}
            <div className="space-y-4 text-xs">
              {/* Personal Section */}
              <div className="bg-cream/40 p-3.5 rounded-xl space-y-2 border border-cream2">
                <h4 className="font-serif font-bold text-wine text-xs uppercase tracking-wider">
                  Personal Information
                </h4>
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <span className="text-neutral-500 block">Phone</span>
                    <span className="font-medium text-neutral-800">{selectedEmployee.phone}</span>
                  </div>
                  <div>
                    <span className="text-neutral-500 block">Email</span>
                    <span className="font-medium text-neutral-800">{selectedEmployee.email || "Not provided"}</span>
                  </div>
                  <div>
                    <span className="text-neutral-500 block">Date of Birth</span>
                    <span className="font-medium text-neutral-800">{selectedEmployee.date_of_birth || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-neutral-500 block">Gender</span>
                    <span className="font-medium text-neutral-800 capitalize">{selectedEmployee.gender || "N/A"}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-neutral-500 block">Address</span>
                    <span className="font-medium text-neutral-800">{selectedEmployee.address || "N/A"}</span>
                  </div>
                </div>
              </div>

              {/* Employment Section */}
              <div className="bg-cream/40 p-3.5 rounded-xl space-y-2 border border-cream2">
                <h4 className="font-serif font-bold text-wine text-xs uppercase tracking-wider">
                  Employment Details
                </h4>
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <span className="text-neutral-500 block">Department</span>
                    <span className="font-medium text-neutral-800">{selectedEmployee.department}</span>
                  </div>
                  <div>
                    <span className="text-neutral-500 block">Designation</span>
                    <span className="font-medium text-neutral-800">{selectedEmployee.designation}</span>
                  </div>
                  <div>
                    <span className="text-neutral-500 block">Employment Type</span>
                    <span className="font-medium text-neutral-800 uppercase">
                      {selectedEmployee.employment_type.replace("_", " ")}
                    </span>
                  </div>
                  <div>
                    <span className="text-neutral-500 block">Joining Date</span>
                    <span className="font-medium text-neutral-800">{selectedEmployee.joining_date}</span>
                  </div>
                  <div>
                    <span className="text-neutral-500 block">Employee Record Status</span>
                    <span className="font-medium capitalize text-emerald-800">{selectedEmployee.status}</span>
                  </div>
                </div>
              </div>

              {/* Emergency Contact */}
              <div className="bg-cream/40 p-3.5 rounded-xl space-y-2 border border-cream2">
                <h4 className="font-serif font-bold text-wine text-xs uppercase tracking-wider">
                  Emergency Contact
                </h4>
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <span className="text-neutral-500 block">Contact Name</span>
                    <span className="font-medium text-neutral-800">
                      {selectedEmployee.emergency_contact_name || "N/A"}
                    </span>
                  </div>
                  <div>
                    <span className="text-neutral-500 block">Contact Phone</span>
                    <span className="font-medium text-neutral-800">
                      {selectedEmployee.emergency_contact_phone || "N/A"}
                    </span>
                  </div>
                </div>
              </div>

              {/* System Access Section */}
              <div className="bg-indigo-50/70 p-3.5 rounded-xl space-y-2 border border-indigo-200">
                <div className="flex justify-between items-center">
                  <h4 className="font-serif font-bold text-indigo-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-indigo-700" />
                    <span>Lumière System Access</span>
                  </h4>
                  {selectedEmployee.user_id ? (
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-semibold text-[10px]">
                      Linked to User Account
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 bg-neutral-200 text-neutral-700 rounded font-semibold text-[10px]">
                      No System Login
                    </span>
                  )}
                </div>

                <div className="pt-1 space-y-1.5">
                  {selectedEmployee.user_id ? (
                    <>
                      <div className="flex justify-between">
                        <span className="text-neutral-600">Assigned Role:</span>
                        <span className="font-bold text-indigo-950 capitalize">
                          {selectedEmployee.linkedUserRole || "Staff"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-600">User Email:</span>
                        <span className="font-mono text-neutral-800">{selectedEmployee.linkedUserEmail || selectedEmployee.email}</span>
                      </div>
                      {canManage && (
                        <div className="pt-2 flex justify-end">
                          <button
                            onClick={() => handleUnlinkUser(selectedEmployee)}
                            className="text-xs text-wine hover:underline font-medium flex items-center gap-1"
                          >
                            <Unlink className="w-3.5 h-3.5" />
                            <span>Unlink User Account</span>
                          </button>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="space-y-2 pt-1">
                      <p className="text-neutral-600">
                        This employee record is maintained in the employee directory but has not yet been granted Lumière system login access.
                      </p>
                      {canManage && (
                        <div className="flex gap-2 pt-1">
                          <button
                            onClick={() => {
                              setLinkingEmployee(selectedEmployee);
                              setSelectedEmployee(null);
                            }}
                            className="px-3 py-1.5 bg-indigo-700 hover:bg-indigo-800 text-white rounded text-xs font-medium transition"
                          >
                            Link Existing Member Account
                          </button>
                          <button
                            onClick={() => {
                              setSelectedEmployee(null);
                              setIsInviteOpen(true);
                              if (selectedEmployee.email) setInviteEmail(selectedEmployee.email);
                            }}
                            className="px-3 py-1.5 bg-wine hover:bg-[#5e2329] text-white rounded text-xs font-medium transition"
                          >
                            Send System Invitation
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {selectedEmployee.notes && (
                <div>
                  <span className="text-neutral-500 block font-medium">Notes:</span>
                  <p className="text-neutral-700 bg-cream/30 p-2.5 rounded border border-cream2 mt-1">
                    {selectedEmployee.notes}
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-cream2">
              {canManage && (
                <button
                  onClick={() => {
                    setEditingEmployee({ ...selectedEmployee });
                    setSelectedEmployee(null);
                  }}
                  className="px-4 py-2 bg-cream hover:bg-cream2 text-neutral-800 rounded-md text-xs font-medium transition flex items-center gap-1.5"
                >
                  <Edit className="w-3.5 h-3.5 text-wine" />
                  <span>Edit Record</span>
                </button>
              )}
              <button
                onClick={() => setSelectedEmployee(null)}
                className="px-4 py-2 bg-wine text-white rounded-md text-xs font-medium hover:bg-[#5e2329]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE EMPLOYEE MODAL */}
      {isAddEmployeeOpen && (
        <div className="fixed inset-0 bg-ink/40 backdrop-blur-xs grid place-items-center z-50 p-4 overflow-y-auto">
          <div className="bg-white max-w-2xl w-full rounded-2xl p-6 shadow-xl border border-cream2 space-y-4 my-8">
            <div className="flex justify-between items-center border-b border-cream2 pb-3">
              <h3 className="font-serif text-xl text-ink font-bold">Register New Employee</h3>
              <button
                onClick={() => setIsAddEmployeeOpen(false)}
                className="text-neutral-400 hover:text-ink text-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateEmployeeSubmit} className="space-y-4 text-xs">
              {/* Personal Info */}
              <div className="space-y-3">
                <h4 className="font-serif font-bold text-wine text-xs uppercase tracking-wider border-b border-cream2 pb-1">
                  1. Personal Information
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-medium text-neutral-700 mb-1">Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Rahul Kumar"
                      value={formState.full_name}
                      onChange={(e) => setFormState({ ...formState, full_name: e.target.value })}
                      className="w-full px-3 py-2 border border-cream2 rounded-md text-xs focus:outline-none focus:border-wine"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-neutral-700 mb-1">Phone Number *</label>
                    <input
                      type="text"
                      required
                      placeholder="+91 9876543210"
                      value={formState.phone}
                      onChange={(e) => setFormState({ ...formState, phone: e.target.value })}
                      className="w-full px-3 py-2 border border-cream2 rounded-md text-xs focus:outline-none focus:border-wine"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-neutral-700 mb-1">Email Address</label>
                    <input
                      type="email"
                      placeholder="employee@restaurant.com"
                      value={formState.email || ""}
                      onChange={(e) => setFormState({ ...formState, email: e.target.value })}
                      className="w-full px-3 py-2 border border-cream2 rounded-md text-xs focus:outline-none focus:border-wine"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-neutral-700 mb-1">Date of Birth</label>
                    <input
                      type="date"
                      value={formState.date_of_birth || ""}
                      onChange={(e) => setFormState({ ...formState, date_of_birth: e.target.value })}
                      className="w-full px-3 py-2 border border-cream2 rounded-md text-xs focus:outline-none focus:border-wine"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-neutral-700 mb-1">Gender</label>
                    <select
                      value={formState.gender || ""}
                      onChange={(e) => setFormState({ ...formState, gender: e.target.value })}
                      className="w-full px-3 py-2 border border-cream2 rounded-md text-xs focus:outline-none focus:border-wine bg-white"
                    >
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-medium text-neutral-700 mb-1">Address</label>
                    <input
                      type="text"
                      placeholder="Street, City, Pin"
                      value={formState.address || ""}
                      onChange={(e) => setFormState({ ...formState, address: e.target.value })}
                      className="w-full px-3 py-2 border border-cream2 rounded-md text-xs focus:outline-none focus:border-wine"
                    />
                  </div>
                </div>
              </div>

              {/* Employment Info */}
              <div className="space-y-3 pt-2">
                <h4 className="font-serif font-bold text-wine text-xs uppercase tracking-wider border-b border-cream2 pb-1">
                  2. Employment Details
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-medium text-neutral-700 mb-1">Employee Code / ID</label>
                    <input
                      type="text"
                      placeholder="Auto-generated if empty (e.g. EMP-1024)"
                      value={formState.employee_code || ""}
                      onChange={(e) => setFormState({ ...formState, employee_code: e.target.value })}
                      className="w-full px-3 py-2 border border-cream2 rounded-md text-xs focus:outline-none focus:border-wine font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-neutral-700 mb-1">Department *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Kitchen, Service, Bar"
                      value={formState.department}
                      onChange={(e) => setFormState({ ...formState, department: e.target.value })}
                      className="w-full px-3 py-2 border border-cream2 rounded-md text-xs focus:outline-none focus:border-wine"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-neutral-700 mb-1">Designation *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Executive Chef, Waiter, Cashier"
                      value={formState.designation}
                      onChange={(e) => setFormState({ ...formState, designation: e.target.value })}
                      className="w-full px-3 py-2 border border-cream2 rounded-md text-xs focus:outline-none focus:border-wine"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-neutral-700 mb-1">Employment Type *</label>
                    <select
                      value={formState.employment_type}
                      onChange={(e) =>
                        setFormState({
                          ...formState,
                          employment_type: e.target.value as EmployeeRecordInput["employment_type"],
                        })
                      }
                      className="w-full px-3 py-2 border border-cream2 rounded-md text-xs focus:outline-none focus:border-wine bg-white"
                    >
                      <option value="full_time">Full Time</option>
                      <option value="part_time">Part Time</option>
                      <option value="contract">Contract</option>
                      <option value="temporary">Temporary</option>
                      <option value="intern">Intern</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-medium text-neutral-700 mb-1">Joining Date *</label>
                    <input
                      type="date"
                      required
                      value={formState.joining_date}
                      onChange={(e) => setFormState({ ...formState, joining_date: e.target.value })}
                      className="w-full px-3 py-2 border border-cream2 rounded-md text-xs focus:outline-none focus:border-wine"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-neutral-700 mb-1">Initial Status</label>
                    <select
                      value={formState.status || "active"}
                      onChange={(e) =>
                        setFormState({
                          ...formState,
                          status: e.target.value as EmployeeRecordInput["status"],
                        })
                      }
                      className="w-full px-3 py-2 border border-cream2 rounded-md text-xs focus:outline-none focus:border-wine bg-white"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="pending">Pending</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Emergency Contact */}
              <div className="space-y-3 pt-2">
                <h4 className="font-serif font-bold text-wine text-xs uppercase tracking-wider border-b border-cream2 pb-1">
                  3. Emergency Contact
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-medium text-neutral-700 mb-1">Contact Person Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Spouse / Parent Name"
                      value={formState.emergency_contact_name || ""}
                      onChange={(e) => setFormState({ ...formState, emergency_contact_name: e.target.value })}
                      className="w-full px-3 py-2 border border-cream2 rounded-md text-xs focus:outline-none focus:border-wine"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-neutral-700 mb-1">Contact Person Phone</label>
                    <input
                      type="text"
                      placeholder="+91 9876500000"
                      value={formState.emergency_contact_phone || ""}
                      onChange={(e) => setFormState({ ...formState, emergency_contact_phone: e.target.value })}
                      className="w-full px-3 py-2 border border-cream2 rounded-md text-xs focus:outline-none focus:border-wine"
                    />
                  </div>
                </div>
              </div>

              {/* Additional Notes */}
              <div>
                <label className="block font-medium text-neutral-700 mb-1">Additional Notes</label>
                <textarea
                  rows={2}
                  placeholder="Special instructions or background notes..."
                  value={formState.notes || ""}
                  onChange={(e) => setFormState({ ...formState, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-cream2 rounded-md text-xs focus:outline-none focus:border-wine"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-cream2">
                <button
                  type="button"
                  onClick={() => setIsAddEmployeeOpen(false)}
                  className="px-4 py-2 bg-cream text-neutral-700 rounded-md text-xs font-medium hover:bg-cream2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 bg-wine hover:bg-[#5e2329] text-white rounded-md text-xs font-medium transition"
                >
                  {isPending ? "Saving..." : "Save Employee Record"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT EMPLOYEE MODAL */}
      {editingEmployee && (
        <div className="fixed inset-0 bg-ink/40 backdrop-blur-xs grid place-items-center z-50 p-4 overflow-y-auto">
          <div className="bg-white max-w-xl w-full rounded-2xl p-6 shadow-xl border border-cream2 space-y-4 my-8">
            <div className="flex justify-between items-center border-b border-cream2 pb-3">
              <h3 className="font-serif text-xl text-ink font-bold">Edit Employee Profile</h3>
              <button
                onClick={() => setEditingEmployee(null)}
                className="text-neutral-400 hover:text-ink text-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditEmployeeSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-neutral-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={editingEmployee.full_name}
                    onChange={(e) => setEditingEmployee({ ...editingEmployee, full_name: e.target.value })}
                    className="w-full px-3 py-2 border border-cream2 rounded-md text-xs focus:outline-none focus:border-wine"
                  />
                </div>
                <div>
                  <label className="block font-medium text-neutral-700 mb-1">Phone Number *</label>
                  <input
                    type="text"
                    required
                    value={editingEmployee.phone}
                    onChange={(e) => setEditingEmployee({ ...editingEmployee, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-cream2 rounded-md text-xs focus:outline-none focus:border-wine"
                  />
                </div>
                <div>
                  <label className="block font-medium text-neutral-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={editingEmployee.email || ""}
                    onChange={(e) => setEditingEmployee({ ...editingEmployee, email: e.target.value })}
                    className="w-full px-3 py-2 border border-cream2 rounded-md text-xs focus:outline-none focus:border-wine"
                  />
                </div>
                <div>
                  <label className="block font-medium text-neutral-700 mb-1">Department *</label>
                  <input
                    type="text"
                    required
                    value={editingEmployee.department}
                    onChange={(e) => setEditingEmployee({ ...editingEmployee, department: e.target.value })}
                    className="w-full px-3 py-2 border border-cream2 rounded-md text-xs focus:outline-none focus:border-wine"
                  />
                </div>
                <div>
                  <label className="block font-medium text-neutral-700 mb-1">Designation *</label>
                  <input
                    type="text"
                    required
                    value={editingEmployee.designation}
                    onChange={(e) => setEditingEmployee({ ...editingEmployee, designation: e.target.value })}
                    className="w-full px-3 py-2 border border-cream2 rounded-md text-xs focus:outline-none focus:border-wine"
                  />
                </div>
                <div>
                  <label className="block font-medium text-neutral-700 mb-1">Employment Type *</label>
                  <select
                    value={editingEmployee.employment_type}
                    onChange={(e) =>
                      setEditingEmployee({
                        ...editingEmployee,
                        employment_type: e.target.value as EmployeeRecord["employment_type"],
                      })
                    }
                    className="w-full px-3 py-2 border border-cream2 rounded-md text-xs focus:outline-none focus:border-wine bg-white"
                  >
                    <option value="full_time">Full Time</option>
                    <option value="part_time">Part Time</option>
                    <option value="contract">Contract</option>
                    <option value="temporary">Temporary</option>
                    <option value="intern">Intern</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-neutral-700 mb-1">Joining Date *</label>
                  <input
                    type="date"
                    required
                    value={editingEmployee.joining_date}
                    onChange={(e) => setEditingEmployee({ ...editingEmployee, joining_date: e.target.value })}
                    className="w-full px-3 py-2 border border-cream2 rounded-md text-xs focus:outline-none focus:border-wine"
                  />
                </div>
                <div>
                  <label className="block font-medium text-neutral-700 mb-1">Record Status</label>
                  <select
                    value={editingEmployee.status}
                    onChange={(e) =>
                      setEditingEmployee({
                        ...editingEmployee,
                        status: e.target.value as EmployeeRecord["status"],
                      })
                    }
                    className="w-full px-3 py-2 border border-cream2 rounded-md text-xs focus:outline-none focus:border-wine bg-white"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="pending">Pending</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-cream2">
                <button
                  type="button"
                  onClick={() => setEditingEmployee(null)}
                  className="px-4 py-2 bg-cream text-neutral-700 rounded-md text-xs font-medium hover:bg-cream2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 bg-wine hover:bg-[#5e2329] text-white rounded-md text-xs font-medium transition"
                >
                  {isPending ? "Updating..." : "Update Employee"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LINK USER MODAL */}
      {linkingEmployee && (
        <div className="fixed inset-0 bg-ink/40 backdrop-blur-xs grid place-items-center z-50 p-4">
          <div className="bg-white max-w-md w-full rounded-2xl p-6 shadow-xl border border-cream2 space-y-4">
            <div className="flex justify-between items-center border-b border-cream2 pb-3">
              <h3 className="font-serif text-lg text-ink font-bold">Link to Lumière User</h3>
              <button
                onClick={() => setLinkingEmployee(null)}
                className="text-neutral-400 hover:text-ink text-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-neutral-600">
              Select an existing system user member in your restaurant to link to employee record{" "}
              <strong className="text-ink font-mono">{linkingEmployee.employee_code}</strong> ({linkingEmployee.full_name}).
            </p>

            <form onSubmit={handleLinkUserSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-medium text-neutral-700 mb-1">Select System Member *</label>
                <select
                  required
                  value={linkTargetUserId}
                  onChange={(e) => setLinkTargetUserId(e.target.value)}
                  className="w-full px-3 py-2 border border-cream2 rounded-md text-xs focus:outline-none focus:border-wine bg-white"
                >
                  <option value="">-- Choose Member --</option>
                  {staff.map((s) => (
                    <option key={s.userId} value={s.userId}>
                      {s.fullName} ({s.email}) — Role: {s.role.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-cream2">
                <button
                  type="button"
                  onClick={() => setLinkingEmployee(null)}
                  className="px-4 py-2 bg-cream text-neutral-700 rounded-md text-xs font-medium hover:bg-cream2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending || !linkTargetUserId}
                  className="px-4 py-2 bg-indigo-700 hover:bg-indigo-800 text-white rounded-md text-xs font-medium transition"
                >
                  {isPending ? "Linking..." : "Confirm Link"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* INVITE STAFF MODAL */}
      {isInviteOpen && (
        <div className="fixed inset-0 bg-ink/40 backdrop-blur-xs grid place-items-center z-50 p-4">
          <div className="bg-white max-w-lg w-full rounded-2xl p-6 shadow-xl border border-cream2 space-y-4">
            <div className="flex justify-between items-center border-b border-cream2 pb-3">
              <h3 className="font-serif text-xl text-ink font-bold">Invite to Lumière Access</h3>
              <button
                onClick={() => setIsInviteOpen(false)}
                className="text-neutral-400 hover:text-ink text-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-amber-50 border border-amber-200 text-amber-900 text-xs p-3 rounded-lg">
              <p className="font-medium">System Delivery Mode:</p>
              <p className="mt-0.5">
                Generates a secure single-use invitation token linked to your restaurant role permissions.
              </p>
            </div>

            <form onSubmit={handleCreateInvite} className="space-y-4 text-xs">
              <div>
                <label className="block font-medium text-neutral-700 mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="staff@restaurant.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-cream2 rounded-md text-xs focus:outline-none focus:border-wine"
                />
              </div>

              <div>
                <label className="block font-medium text-neutral-700 mb-1">Assigned System Role *</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as Role)}
                  className="w-full px-3 py-2 border border-cream2 rounded-md text-xs focus:outline-none focus:border-wine bg-white"
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
                  className="px-4 py-2 bg-cream text-neutral-700 rounded-md text-xs font-medium hover:bg-cream2"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 bg-wine hover:bg-[#5e2329] text-white rounded-md text-xs font-medium transition"
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
