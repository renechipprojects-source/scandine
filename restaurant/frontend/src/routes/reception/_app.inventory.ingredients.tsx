import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/reception/_app/inventory/ingredients")({
  beforeLoad: () => {
    throw redirect({ to: "/reception/inventory/purchase-orders", replace: true });
  },
  component: () => null,
});