import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { tableStore } from "@/lib/table-store";

export const Route = createFileRoute("/menu/$table")({
  component: MenuTableRoute,
});

function MenuTableRoute() {
  const { table } = Route.useParams();
  const navigate = useNavigate();

  useEffect(() => {
    if (table) {
      tableStore.setTableNumber(table);
    }
    navigate({ to: "/menu", replace: true });
  }, [table, navigate]);

  return null;
}
