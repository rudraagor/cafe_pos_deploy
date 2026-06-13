"use client";

import { Loader2, Pencil, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ActionResult, FieldErrors } from "@/lib/action-result";
import type { CustomerInput } from "@/lib/validations/customers";

export type CustomerFormValue = {
  name: string;
  email: string;
  phone: string;
};

type CustomerFormDialogProps = {
  mode: "create" | "edit";
  customer?: CustomerFormValue;
  action: (formData: FormData) => Promise<ActionResult<keyof CustomerInput>>;
};

function fieldMessage(
  fieldErrors: FieldErrors<keyof CustomerInput> | undefined,
  field: keyof CustomerInput,
) {
  return fieldErrors?.[field]?.[0];
}

export function CustomerFormDialog({
  mode,
  customer,
  action,
}: CustomerFormDialogProps) {
  const router = useRouter();
  const isCreate = mode === "create";
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<CustomerFormValue>(
    customer ?? { name: "", email: "", phone: "" },
  );
  const [fieldErrors, setFieldErrors] =
    useState<FieldErrors<keyof CustomerInput>>();
  const [isPending, startTransition] = useTransition();

  function handleOpenChange(next: boolean) {
    if (next) {
      setValues(customer ?? { name: "", email: "", phone: "" });
      setFieldErrors(undefined);
    }
    setOpen(next);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const formData = new FormData();
    formData.set("name", values.name);
    formData.set("email", values.email);
    formData.set("phone", values.phone);

    startTransition(async () => {
      const result = await action(formData);
      if (result.ok) {
        toast.success(result.message ?? "Saved.");
        setOpen(false);
        router.refresh();
      } else {
        setFieldErrors(result.fieldErrors);
        toast.error(result.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button
            type="button"
            variant={isCreate ? "default" : "ghost"}
            size={isCreate ? "default" : "icon-sm"}
          />
        }
      >
        {isCreate ? (
          <>
            <Plus className="size-4" />
            Add customer
          </>
        ) : (
          <Pencil className="size-4" />
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isCreate ? "New customer" : "Edit customer"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input
              value={values.name}
              onChange={(e) =>
                setValues((v) => ({ ...v, name: e.target.value }))
              }
            />
            {fieldMessage(fieldErrors, "name") ? (
              <p className="text-destructive text-sm">
                {fieldMessage(fieldErrors, "name")}
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              type="email"
              value={values.email}
              onChange={(e) =>
                setValues((v) => ({ ...v, email: e.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Phone</Label>
            <Input
              value={values.phone}
              onChange={(e) =>
                setValues((v) => ({ ...v, phone: e.target.value }))
              }
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
