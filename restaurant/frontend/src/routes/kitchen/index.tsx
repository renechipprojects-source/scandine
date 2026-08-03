import { createFileRoute, redirect } from "@tanstack/react-router";
export const Route = createFileRoute("/kitchen/")({
  beforeLoad: () => { throw redirect({ to: "/kitchen/orders/live" }); },
});
