import { getCustomersAdminAction } from "@/actions/admin";
import CustomersClient from "@/components/admin/CustomersClient";

export default async function AdminCustomersPage() {
  const res = await getCustomersAdminAction();

  if (!res.ok) {
    return (
      <div className="p-8 text-center">
        <h1 className="font-serif text-2xl text-ink">Customers Module</h1>
        <p className="text-sm text-red-600 mt-2">{res.error || "Failed to load customers."}</p>
      </div>
    );
  }

  return (
    <CustomersClient
      initialCustomers={res.data || []}
      initialStats={res.stats || { totalCustomers: 0, totalVisits: 0 }}
      pagination={res.pagination || { page: 1, pageSize: 20, totalCount: 0, totalPages: 1 }}
    />
  );
}
