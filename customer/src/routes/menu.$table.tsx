import { createFileRoute, redirect } from "@tanstack/react-router";
import { tableStore } from "@/lib/table-store";

export const Route = createFileRoute("/menu/$table")({
  beforeLoad: ({ params }) => {
    if (params.table) {
      const rawDigits = params.table.replace(/\D/g, "");
      const formatted = rawDigits ? `Table ${rawDigits}` : params.table;
      tableStore.setTableNumber(formatted);
    }
    throw redirect({ to: "/", replace: true });
  },
  component: () => null,
});
