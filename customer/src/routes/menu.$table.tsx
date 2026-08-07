import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { tableStore } from "@/lib/table-store";

export const Route = createFileRoute("/menu/$table")({
  component: MenuTableRoute,
});

function MenuTableRoute() {
  const { table } = Route.useParams();

  const rawDigits = (table || "").replace(/\D/g, "");
  const formatted = rawDigits ? `Table ${rawDigits}` : (table || "Table 1");

  useEffect(() => {
    tableStore.setTableNumber(formatted);
  }, [formatted]);

  // Synchronously update store before rendering redirect
  tableStore.setTableNumber(formatted);

  return <Navigate to="/" replace />;
}
