import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { tableStore } from "@/lib/table-store";
import { useCustomer } from "@/lib/customer-store";
import { CustomerRegistration } from "@/components/customer-registration";

export const Route = createFileRoute("/menu/$table")({
  component: MenuTableRoute,
});

function MenuTableRoute() {
  const { table } = Route.useParams();
  const navigate = useNavigate();

  useEffect(() => {
    if (table) {
      const rawDigits = table.replace(/\D/g, "");
      const formatted = rawDigits ? `Table ${rawDigits}` : table;
      tableStore.setTableNumber(formatted);
    }
  }, [table]);

  const rawDigits = (table || "").replace(/\D/g, "");
  const formattedTable = rawDigits ? `Table ${rawDigits}` : (table || tableStore.getTableNumber());
  const customer = useCustomer(formattedTable);

  if (!customer) {
    return (
      <CustomerRegistration
        tableNumber={formattedTable}
        onSuccess={() => {
          navigate({ to: "/", replace: true });
        }}
      />
    );
  }

  return null;
}
