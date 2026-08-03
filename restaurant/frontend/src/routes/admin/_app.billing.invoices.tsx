import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/_app/billing/invoices")({
  beforeLoad: () => {
    throw redirect({ to: "/reception/billing/invoices", replace: true });
  },
  component: () => null,
});
