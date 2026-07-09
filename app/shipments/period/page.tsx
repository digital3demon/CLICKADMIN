import { redirect } from "next/navigation";

export default async function ShipmentsPeriodRedirectPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const sp = await searchParams;
  const q = new URLSearchParams();
  q.set("ship", "period");
  if (sp.from) q.set("shipFrom", sp.from);
  if (sp.to) q.set("shipTo", sp.to);
  redirect(`/orders?${q.toString()}`);
}
