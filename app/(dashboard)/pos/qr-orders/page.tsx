import { redirect } from "next/navigation";

export default function PosQrOrdersRedirect() {
  redirect("/pos/orders?filter=unapproved");
}
