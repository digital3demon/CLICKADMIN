import { redirect } from "next/navigation";

export default async function ShipmentsPeriodRedirectPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const sp = await searchParams;
  const q = new URLSearchParams();
  q.set("tab", "period");
  if (sp.from) q.set("from", sp.from);
  if (sp.to) q.set("to", sp.to);
  redirect(`/shipments?${q.toString()}`);
}
