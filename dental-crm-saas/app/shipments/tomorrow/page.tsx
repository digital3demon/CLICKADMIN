import { redirect } from "next/navigation";

export default function ShipmentsTomorrowRedirectPage() {
  redirect("/shipments?tab=tomorrow");
}
