import { createFileRoute } from "@tanstack/react-router";
import { CashCollectionPage } from "@/routes/reception/_app.billing.cash-collection";

export const Route = createFileRoute("/kitchen/_app/billing/cash-collection")({
  head: () => ({
    meta: [
      { title: "Cash Collection — ScanDine Kitchen" },
      { name: "description", content: "Collect cash payments from customers and mark specific orders as paid." },
    ],
  }),
  component: CashCollectionPage,
});
