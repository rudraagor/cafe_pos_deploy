import { requireUser } from "@/lib/auth";
import { CustomersManagement } from "@/components/pos/customers-management";
import { getCustomers } from "@/lib/pos/queries";

export default async function PosCustomersPage() {
  await requireUser();
  const customers = await getCustomers();

  return (
    <CustomersManagement
      customers={customers.map((c) => ({
        id: c.id,
        name: c.name,
        email: c.email,
        phone: c.phone,
      }))}
    />
  );
}
