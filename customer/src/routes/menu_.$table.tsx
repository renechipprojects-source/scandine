import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { tableStore, formatTableNumber } from "@/lib/table-store";
import { InvalidQrScreen } from "@/components/invalid-qr";

export const Route = createFileRoute("/menu_/$table")({
  component: MenuTableRoute,
});

function MenuTableRoute() {
  const { table } = Route.useParams();
  const formatted = formatTableNumber(table || "") || "Table 1";

  useEffect(() => {
    if (formatted) {
      tableStore.setTableNumber(formatted);
    }
  }, [formatted]);

  if (!table) {
    return <InvalidQrScreen message="The scanned table QR code is invalid. Please scan a valid table QR code." />;
  }

  return <Navigate to="/menu" replace />;
}
