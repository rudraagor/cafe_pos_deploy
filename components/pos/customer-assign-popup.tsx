"use client";

import { Loader2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { createCustomer } from "@/app/(pos)/pos/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCartStore } from "@/lib/pos/cart-store";

type CustomerOption = { id: string; name: string; email: string | null };

type CustomerAssignPopupProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tableId: string;
  customers: CustomerOption[];
};

export function CustomerAssignPopup({
  open,
  onOpenChange,
  tableId,
  customers,
}: CustomerAssignPopupProps) {
  const router = useRouter();
  const setCustomer = useCartStore((s) => s.setCustomer);
  const [query, setQuery] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [isPending, startTransition] = useTransition();

  const filtered = customers.filter((c) =>
    c.name.toLowerCase().includes(query.trim().toLowerCase()),
  );

  function handleSelect(customer: CustomerOption) {
    setCustomer(tableId, { id: customer.id, name: customer.name });
    toast.success(`${customer.name} assigned to order.`);
    onOpenChange(false);
  }

  function handleCreate() {
    if (!newName.trim()) return;
    const formData = new FormData();
    formData.set("name", newName.trim());

    startTransition(async () => {
      const result = await createCustomer(formData);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Customer created. Refresh to see in list.");
      router.refresh();
      setShowCreate(false);
      setNewName("");
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Assign customer</DialogTitle>
          <DialogDescription>
            Search existing customers or create a new one.
          </DialogDescription>
        </DialogHeader>

        {showCreate ? (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="new-customer-name">Name</Label>
              <Input
                id="new-customer-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreate(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleCreate}
                disabled={isPending || !newName.trim()}
              >
                {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                Create
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <>
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name..."
            />
            <div className="max-h-48 space-y-1 overflow-y-auto">
              {filtered.map((customer) => (
                <button
                  key={customer.id}
                  type="button"
                  onClick={() => handleSelect(customer)}
                  className="hover:bg-muted flex w-full flex-col rounded-md px-3 py-2 text-left text-sm"
                >
                  <span className="font-medium">{customer.name}</span>
                  {customer.email ? (
                    <span className="text-muted-foreground text-xs">
                      {customer.email}
                    </span>
                  ) : null}
                </button>
              ))}
              {filtered.length === 0 ? (
                <p className="text-muted-foreground py-4 text-center text-sm">
                  No customers found.
                </p>
              ) : null}
            </div>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => setShowCreate(true)}
            >
              <Plus className="size-4" />
              New customer
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
