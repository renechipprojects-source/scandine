import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/kitchen/_app/kds")({
  beforeLoad: () => {
    throw redirect({ to: "/kitchen/orders/live" });
  },
  component: () => null,
});
