"use client";

import { useState } from "react";
import { PERMISSION_DEFINITIONS, ModuleCategory, Permission } from "@/lib/permissions";
import { Role } from "@/lib/tenant";
import { Check, X, RotateCcw, Save, ShieldCheck, Edit3, Sparkles } from "lucide-react";

type Props = {
  currentRole: Role;
};

type RoleMatrixState = Record<Permission, { owner: boolean; manager: boolean; staff: boolean }>;

function buildInitialMatrixState(): RoleMatrixState {
  const state: Partial<RoleMatrixState> = {};
  for (const def of PERMISSION_DEFINITIONS) {
    state[def.key] = { ...def.roles };
  }
  return state as RoleMatrixState;
}

export default function RolesClient({ currentRole }: Props) {
  const [selectedRole, setSelectedRole] = useState<Role>("staff");
  const [search, setSearch] = useState("");
  const [matrixState, setMatrixState] = useState<RoleMatrixState>(buildInitialMatrixState);
  const [isEditing, setIsEditing] = useState(false);
  const [isModified, setIsModified] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const canEdit = currentRole === "owner" || currentRole === "manager";

  const categories: ModuleCategory[] = Array.from(
    new Set(PERMISSION_DEFINITIONS.map((p) => p.category))
  );

  const filteredDefinitions = PERMISSION_DEFINITIONS.filter(
    (p) =>
      p.label.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase())
  );

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleToggle = (permissionKey: Permission, roleKey: Role) => {
    if (!canEdit || !isEditing) return;
    if (roleKey === "owner" && permissionKey === "assign_roles") {
      showToast("Owner must maintain role assignment authority for security.");
      return;
    }

    setMatrixState((prev) => {
      const currentVal = prev[permissionKey][roleKey];
      return {
        ...prev,
        [permissionKey]: {
          ...prev[permissionKey],
          [roleKey]: !currentVal,
        },
      };
    });
    setIsModified(true);
  };

  const handleReset = () => {
    setMatrixState(buildInitialMatrixState());
    setIsModified(false);
    showToast("Reset permissions matrix to system defaults.");
  };

  const handleSave = () => {
    setIsModified(false);
    setIsEditing(false);
    showToast("Roles & permissions matrix overrides saved successfully.");
  };

  const countForRole = (roleKey: Role) => {
    return PERMISSION_DEFINITIONS.filter((p) => matrixState[p.key]?.[roleKey]).length;
  };

  const roleSummaries = {
    owner: {
      title: "Owner",
      badge: "bg-amber-100 text-amber-900 border border-amber-300",
      description:
        "Full authority over restaurant instance, branding, financial operations, payment refunds, role assignments, and tenant settings.",
      permissionsCount: countForRole("owner"),
    },
    manager: {
      title: "Manager",
      badge: "bg-wine/10 text-wine border border-wine/20",
      description:
        "Operational management authority including menu updates, purchasing, inventory adjustments, reviews moderation, and staff management.",
      permissionsCount: countForRole("manager"),
    },
    staff: {
      title: "Staff",
      badge: "bg-neutral-100 text-neutral-700 border border-neutral-200",
      description:
        "Front-of-house & back-of-house operational access: POS order creation, kitchen display updates, table service resolution, and live operations.",
      permissionsCount: countForRole("staff"),
    },
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Toast Banner */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 bg-slate-900 text-white text-xs px-4 py-2.5 rounded-xl shadow-xl border border-amber-400/40 font-medium flex items-center gap-2 animate-in fade-in">
          <Sparkles className="w-4 h-4 text-gold" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header & Action Controls */}
      <div className="bg-white p-6 rounded-2xl border border-cream2 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2.5 rounded-xl bg-wine text-gold shadow-xs">
              <ShieldCheck size={24} />
            </span>
            <div>
              <h1 className="font-serif text-2xl md:text-3xl font-bold text-ink">
                Roles & Permissions Matrix
              </h1>
              <p className="text-xs text-neutral-500 mt-0.5">
                Configure and customize granular module capabilities across system roles ({PERMISSION_DEFINITIONS.length} total permissions)
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {canEdit && (
            <>
              {isEditing ? (
                <>
                  <button
                    onClick={handleReset}
                    className="px-3.5 py-2 bg-cream text-neutral-700 hover:bg-cream2 rounded-xl text-xs font-semibold transition border border-cream2 flex items-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-wine" />
                    <span>Reset Defaults</span>
                  </button>
                  <button
                    onClick={handleSave}
                    className="px-4 py-2 bg-wine hover:bg-[#5e2329] text-white rounded-xl text-xs font-semibold transition shadow-sm flex items-center gap-1.5 cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5 text-gold" />
                    <span>Save Matrix</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 bg-wine text-white hover:bg-[#5e2329] rounded-xl text-xs font-semibold transition shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5 text-gold" />
                  <span>Edit Permission Matrix</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Modification Alert Bar */}
      {isModified && (
        <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-xl flex items-center justify-between text-xs text-amber-900 animate-in fade-in">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
            <span className="font-semibold">
              Matrix modified! Click &quot;Save Matrix&quot; above to commit permission changes.
            </span>
          </div>
          <button
            onClick={handleSave}
            className="px-3 py-1 bg-amber-700 text-white font-bold rounded-lg hover:bg-amber-800 transition"
          >
            Commit Changes
          </button>
        </div>
      )}

      {/* Role Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(["owner", "manager", "staff"] as Role[]).map((roleKey) => {
          const info = roleSummaries[roleKey];
          const isCurrent = currentRole === roleKey;
          const isSelected = selectedRole === roleKey;

          return (
            <div
              key={roleKey}
              onClick={() => setSelectedRole(roleKey)}
              className={`cursor-pointer bg-white border p-5 rounded-2xl shadow-xs transition-all ${
                isSelected
                  ? "border-wine ring-2 ring-wine/20 shadow-md"
                  : "border-cream2 hover:border-neutral-300"
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full capitalize ${info.badge}`}>
                  {info.title}
                </span>
                {isCurrent && (
                  <span className="text-[10px] bg-wine text-gold px-2.5 py-0.5 rounded-full font-bold shadow-xs">
                    Your Role
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-600 mb-3 min-h-[36px]">{info.description}</p>
              <div className="text-xs font-medium text-neutral-500 flex justify-between border-t border-cream2 pt-3">
                <span>Access Scope</span>
                <span className="text-wine font-bold font-mono">
                  {info.permissionsCount} / {PERMISSION_DEFINITIONS.length} Active
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Interactive Permission Matrix Table */}
      <div className="bg-white border border-cream2 p-6 rounded-2xl shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-cream2 pb-4">
          <div>
            <h2 className="font-serif text-lg font-bold text-ink flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-wine" />
              Granular Capability Matrix
            </h2>
            <p className="text-xs text-neutral-500">
              {isEditing
                ? "Interactive Mode: Click any checkbox to grant or revoke specific module permissions."
                : "Read-Only Mode: Click 'Edit Permission Matrix' to modify role access rights."}
            </p>
          </div>
          <div className="w-full sm:w-64">
            <input
              type="text"
              placeholder="Filter by module or capability..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3 py-1.5 border border-cream2 rounded-xl text-xs focus:outline-none focus:border-wine bg-cream/30"
            />
          </div>
        </div>

        {/* Matrix Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-cream2 text-neutral-500 text-xs font-semibold uppercase tracking-wider bg-cream/40">
                <th className="py-3 px-4">Module Category</th>
                <th className="py-3 px-4">Permission Capability</th>
                <th className="py-3 px-4 text-center w-28">
                  <div className="flex flex-col items-center">
                    <span>Owner</span>
                    <span className="text-[9px] font-normal text-amber-700 lowercase">(Full Control)</span>
                  </div>
                </th>
                <th className="py-3 px-4 text-center w-28">
                  <div className="flex flex-col items-center">
                    <span>Manager</span>
                    <span className="text-[9px] font-normal text-wine lowercase">(Ops Lead)</span>
                  </div>
                </th>
                <th className="py-3 px-4 text-center w-28">
                  <div className="flex flex-col items-center">
                    <span>Staff</span>
                    <span className="text-[9px] font-normal text-neutral-500 lowercase">(Operations)</span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream2 text-xs">
              {categories.map((cat) => {
                const catDefs = filteredDefinitions.filter((d) => d.category === cat);
                if (catDefs.length === 0) return null;

                return catDefs.map((def, idx) => {
                  const permState = matrixState[def.key] || def.roles;

                  return (
                    <tr key={def.key} className="hover:bg-cream/30 transition-colors">
                      {idx === 0 && (
                        <td
                          rowSpan={catDefs.length}
                          className="py-3 px-4 font-bold text-ink bg-cream/20 border-r border-cream2 align-top text-xs"
                        >
                          {cat}
                        </td>
                      )}
                      <td className="py-3 px-4 font-medium text-neutral-800">
                        <div>{def.label}</div>
                        <div className="text-[10px] font-mono text-neutral-400">{def.key}</div>
                      </td>

                      {/* Owner Column */}
                      <td className="py-3 px-4 text-center">
                        {isEditing ? (
                          <input
                            type="checkbox"
                            checked={permState.owner}
                            onChange={() => handleToggle(def.key, "owner")}
                            className="w-4 h-4 rounded text-wine focus:ring-wine cursor-pointer accent-wine"
                          />
                        ) : (
                          <span
                            className={`inline-flex items-center justify-center w-5 h-5 rounded-full ${
                              permState.owner ? "bg-emerald-100 text-emerald-800" : "bg-neutral-100 text-neutral-400"
                            }`}
                          >
                            {permState.owner ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                          </span>
                        )}
                      </td>

                      {/* Manager Column */}
                      <td className="py-3 px-4 text-center">
                        {isEditing ? (
                          <input
                            type="checkbox"
                            checked={permState.manager}
                            onChange={() => handleToggle(def.key, "manager")}
                            className="w-4 h-4 rounded text-wine focus:ring-wine cursor-pointer accent-wine"
                          />
                        ) : (
                          <span
                            className={`inline-flex items-center justify-center w-5 h-5 rounded-full ${
                              permState.manager ? "bg-emerald-100 text-emerald-800" : "bg-neutral-100 text-neutral-400"
                            }`}
                          >
                            {permState.manager ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                          </span>
                        )}
                      </td>

                      {/* Staff Column */}
                      <td className="py-3 px-4 text-center">
                        {isEditing ? (
                          <input
                            type="checkbox"
                            checked={permState.staff}
                            onChange={() => handleToggle(def.key, "staff")}
                            className="w-4 h-4 rounded text-wine focus:ring-wine cursor-pointer accent-wine"
                          />
                        ) : (
                          <span
                            className={`inline-flex items-center justify-center w-5 h-5 rounded-full ${
                              permState.staff ? "bg-emerald-100 text-emerald-800" : "bg-neutral-100 text-neutral-400"
                            }`}
                          >
                            {permState.staff ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                });
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
