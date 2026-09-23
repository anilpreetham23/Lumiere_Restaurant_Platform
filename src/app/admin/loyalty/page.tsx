import { getLoyaltyOverviewAdminAction, getLoyaltyCustomersAdminAction } from "@/actions/admin";
import LoyaltyClient from "@/components/admin/LoyaltyClient";

export default async function AdminLoyaltyPage() {
  const [overviewRes, customersRes] = await Promise.all([
    getLoyaltyOverviewAdminAction(),
    getLoyaltyCustomersAdminAction(),
  ]);

  if (!overviewRes.ok || !customersRes.ok) {
    return (
      <div className="p-8 text-center">
        <h1 className="font-serif text-2xl text-ink">Loyalty Module</h1>
        <p className="text-sm text-red-600 mt-2">
          {overviewRes.error || customersRes.error || "Failed to load loyalty data."}
        </p>
      </div>
    );
  }

  return (
    <LoyaltyClient
      initialOverview={
        overviewRes.data || {
          totalLoyaltyCustomers: 0,
          totalIssued: 0,
          totalRedeemed: 0,
          currentOutstandingPoints: 0,
        }
      }
      initialCustomers={customersRes.data || []}
    />
  );
}
