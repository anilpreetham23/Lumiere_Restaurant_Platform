"use client";

import { useState } from "react";
import { PERMISSION_DEFINITIONS, ModuleCategory, PermissionDefinition } from "@/lib/permissions";
import { Role } from "@/lib/tenant";

type Props = {
  currentRole: Role;
};

export default function RolesClient({ currentRole }: Props) {
  const [selectedRole, setSelectedRole] = useState<Role>("staff");
  const [search, setSearch] = useState("");

  const categories: ModuleCategory[] = Array.from(
    new Set(PERMISSION_DEFINITIONS.map((p) => p.category))
  );

  const filteredDefinitions = PERMISSION_DEFINITIONS.filter((p) =>
    p.label.toLowerCase().includes(search.toLowerCase()) ||
    p.category.toLowerCase().includes(search.toLowerCase())
  );

  const roleSummaries = {
    owner: {
      title: "Owner",
      badge: "bg-amber-100 text-amber-900 border border-amber-300",
      description: "Full authority over the restaurant instance, branding, financial operations, refunds, role assignments, and tenant settings.",
      permissionsCount: PERMISSION_DEFINITIONS.filter((p) => p.roles.owner).length,
    },
    manager: {
      title: "Manager",
      badge: "bg-wine/10 text-wine border border-wine/20",
      description: "Operational management authority including menu updates, purchasing, inventory adjustments, reviews moderation, and staff invitations.",
      permissionsCount: PERMISSION_DEFINITIONS.filter((p) => p.roles.manager).length,
    },
    staff: {
      title: "Staff",
      badge: "bg-neutral-100 text-neutral-700 border border-neutral-200",
      description: "Front-of-house & back-of-house operational access. POS order creation, kitchen display updates, table service resolution, and view access to live operations.",
      permissionsCount: PERMISSION_DEFINITIONS.filter((p) => p.roles.staff).length,
    },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-serif text-2xl text-ink">Roles & Permission Matrix</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Review system role permissions across all 15 operational modules of Lumières B2B platform.
        </p>
      </div>

      {/* Role Cards Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(["owner", "manager", "staff"] as Role[]).map((roleKey) => {
          const info = roleSummaries[roleKey];
          const isCurrent = currentRole === roleKey;
          const isSelected = selectedRole === roleKey;

          return (
            <div
              key={roleKey}
              onClick={() => setSelectedRole(roleKey)}
              className={`cursor-pointer bg-white border p-5 rounded-xl shadow-xs transition-all ${
                isSelected ? "border-wine ring-1 ring-wine" : "border-cream2 hover:border-neutral-300"
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full capitalize ${info.badge}`}>
                  {info.title}
                </span>
                {isCurrent && (
                  <span className="text-[10px] bg-wine text-white px-2 py-0.5 rounded font-medium">
                    Your Role
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-600 mb-3 min-h-[36px]">{info.description}</p>
              <div className="text-xs font-medium text-neutral-500 flex justify-between border-t border-cream2 pt-3">
                <span>Access Scope</span>
                <span className="text-ink font-semibold">{info.permissionsCount} / {PERMISSION_DEFINITIONS.length} Permissions</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Permission Matrix Section */}
      <div className="bg-white border border-cream2 p-5 rounded-xl shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-cream2 pb-4">
          <div>
            <h2 className="font-serif text-lg text-ink">Comprehensive Permission Matrix</h2>
            <p className="text-xs text-neutral-500">Centralized server-enforced authorization rules.</p>
          </div>
          <div className="w-full sm:w-64">
            <input
              type="text"
              placeholder="Filter permissions or modules..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3 py-1.5 border border-cream2 rounded-md text-xs focus:outline-none focus:border-wine"
            />
          </div>
        </div>

        {/* Matrix Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-cream2 text-neutral-500 text-xs font-medium uppercase tracking-wider">
                <th className="pb-3 px-3">Module</th>
                <th className="pb-3 px-3">Permission Capability</th>
                <th className="pb-3 px-3 text-center w-24">Owner</th>
                <th className="pb-3 px-3 text-center w-24">Manager</th>
                <th className="pb-3 px-3 text-center w-24">Staff</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream2 text-xs">
              {categories.map((cat) => {
                const catDefs = filteredDefinitions.filter((d) => d.category === cat);
                if (catDefs.length === 0) return null;

                return catDefs.map((def, idx) => (
                  <tr key={def.key} className="hover:bg-cream/40 transition-colors">
                    {idx === 0 && (
                      <td
                        rowSpan={catDefs.length}
                        className="py-3 px-3 font-semibold text-ink bg-cream/20 border-r border-cream2 align-top"
                      >
                        {cat}
                      </td>
                    )}
                    <td className="py-2.5 px-3 font-medium text-neutral-700">{def.label}</td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="inline-block w-4 h-4 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold leading-4">
                        ✓
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {def.roles.manager ? (
                        <span className="inline-block w-4 h-4 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold leading-4">
                          ✓
                        </span>
                      ) : (
                        <span className="inline-block w-4 h-4 rounded-full bg-neutral-100 text-neutral-400 text-[10px] leading-4">
                          ✕
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {def.roles.staff ? (
                        <span className="inline-block w-4 h-4 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold leading-4">
                          ✓
                        </span>
                      ) : (
                        <span className="inline-block w-4 h-4 rounded-full bg-neutral-100 text-neutral-400 text-[10px] leading-4">
                          ✕
                        </span>
                      )}
                    </td>
                  </tr>
                ));
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
