import React from "react";
import { OnlineOrdersClient } from "@/components/admin/OnlineOrdersClient";

export const metadata = {
  title: "Online Orders | Lumière B2B Admin",
  description: "Swiggy and Zomato marketplace order review and kitchen fulfillment hub",
};

export default function OnlineOrdersPage() {
  return <OnlineOrdersClient />;
}
