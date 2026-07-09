import { redirect } from "next/navigation";

export default function ShipmentsTodayRedirectPage() {
  redirect("/orders?ship=actual");
}
