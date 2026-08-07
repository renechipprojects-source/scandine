import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { tableStore, formatTableNumber } from "@/lib/table-store";

export const Route = createFileRoute("/menu_/$table")({
  component: MenuTableRoute,
});

function MenuTableRoute() {
  const { table } = Route.useParams();
  const formatted = formatTableNumber(table || "");

  useEffect(() => {
    if (formatted) {
      tableStore.setTableNumber(formatted);
    }
  }, [formatted]);

  if (formatted) {
    tableStore.setTableNumber(formatted);
  }

  return <Navigate to="/" replace />;
}
