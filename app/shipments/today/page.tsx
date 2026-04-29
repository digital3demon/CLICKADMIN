import { redirect } from "next/navigation";

export default function ShipmentsTodayRedirectPage() {
  redirect("/shipments?tab=today");
}
