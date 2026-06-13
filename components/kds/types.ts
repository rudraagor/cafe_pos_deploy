export type KdsStage = "to_cook" | "preparing" | "completed";

export type KdsTicketItem = {
  id: string;
  productId: string | null;
  nameSnapshot: string;
  categoryName: string | null;
  quantity: number;
  itemCompleted: boolean;
  modifiers: string[];
  note: string | null;
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
