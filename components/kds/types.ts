export type KdsStage = "to_cook" | "preparing" | "completed";

export type KdsTicketItem = {
  id: string;
  nameSnapshot: string;
  quantity: number;
  itemCompleted: boolean;
};

export type KdsTicket = {
  id: string;
  orderNumber: string;
  stage: KdsStage;
  status: "draft" | "paid" | "cancelled";
  tableLabel: string;
  sentToKitchenAt: string;
  items: KdsTicketItem[];
};
