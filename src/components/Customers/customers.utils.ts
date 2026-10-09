import type { HaravanCustomer } from "@/services/api/customers";

/** Du lieu form khach hang. */
export interface CustomerFormState {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  tags: string;
  note: string;
}

export function customerName(customer: HaravanCustomer): string {
  const name = [customer.last_name, customer.first_name]
    .filter(Boolean)
    .join(" ")
    .trim();
  return (
    name ||
    customer.default_address?.name ||
    customer.email ||
    customer.phone ||
    `Khách #${customer.id}`
  );
}

export function emptyForm(customer?: HaravanCustomer): CustomerFormState {
  return {
    first_name: customer?.first_name ?? "",
    last_name: customer?.last_name ?? "",
    email: customer?.email ?? "",
    phone: customer?.phone ?? "",
    tags: customer?.tags ?? "",
    note: customer?.note ?? "",
  };
}


