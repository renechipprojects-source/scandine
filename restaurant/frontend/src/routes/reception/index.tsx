import { createFileRoute, redirect } from "@tanstack/react-router";
export const Route = createFileRoute("/reception/")({
  beforeLoad: () => { throw redirect({ to: "/reception/dashboard" }); },
});
