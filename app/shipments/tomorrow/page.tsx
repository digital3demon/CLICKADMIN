import { redirect } from "next/navigation";

export default function ShipmentsTomorrowRedirectPage() {
  redirect("/orders?ship=actual");
}
