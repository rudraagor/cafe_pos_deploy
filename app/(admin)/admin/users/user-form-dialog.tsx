"use client";

import { Loader2, Pencil, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ActionResult, FieldErrors } from "@/lib/action-result";
import type { UserCreateInput, UserUpdateInput } from "@/lib/validations/users";

export type UserFormValue = {
  name: string;
  email: string;
  role: "admin" | "employee";
  password: string;
};

type UserField = keyof UserCreateInput | keyof UserUpdateInput;

type UserFormDialogProps = {
  mode: "create" | "edit";
  user?: Omit<UserFormValue, "password">;
  action: (formData: FormData) => Promise<ActionResult<UserField>>;
};

function defaultUser(user?: Omit<UserFormValue, "password">): UserFormValue {
  return {
    name: user?.name ?? "",
    email: user?.email ?? "",
    role: user?.role ?? "employee",
    password: "",
  };
}

export function UserFormDialog({ mode, user, action }: UserFormDialogProps) {
  const router = useRouter();
  const isCreate = mode === "create";
  const title = isCreate ? "New user" : "Edit user";
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<UserFormValue>(defaultUser(user));
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<UserField>>();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      setValues(defaultUser(user));
      setFieldErrors(undefined);
      setServerError(null);
    }
    setOpen(nextOpen);
  }

  function updateValue<TKey extends keyof UserFormValue>(
    key: TKey,
    value: UserFormValue[TKey],
  ) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData();
    formData.set("name", values.name);
    formData.set("email", values.email);
    formData.set("role", values.role);
    if (isCreate) formData.set("password", values.password);
    setFieldErrors(undefined);
    setServerError(null);

    startTransition(async () => {
      const result = await action(formData);
      if (result.ok) {
        toast.success(
          result.message ?? (isCreate ? "User created." : "User updated."),
        );
        setOpen(false);
        router.refresh();
        return;
      }

      setFieldErrors(result.fieldErrors);
      setServerError(result.error);
      toast.error(result.error);
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
            aria-label={title}
          />
        }
      >
        {isCreate ? (
          <>
            <Plus className="size-4" />
            Add user
          </>
        ) : (
          <Pencil className="size-4" />
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Admins configure the backend; employees operate the POS terminal.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={`${mode}-user-name`}>Name</Label>
            <Input
              id={`${mode}-user-name`}
              value={values.name}
              onChange={(event) => updateValue("name", event.target.value)}
              aria-invalid={!!fieldErrors?.name?.[0]}
            />
            {fieldErrors?.name?.[0] ? (
              <p className="text-destructive text-sm">{fieldErrors.name[0]}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${mode}-user-email`}>Email</Label>
            <Input
              id={`${mode}-user-email`}
              type="email"
              value={values.email}
              onChange={(event) => updateValue("email", event.target.value)}
              aria-invalid={!!fieldErrors?.email?.[0]}
            />
            {fieldErrors?.email?.[0] ? (
              <p className="text-destructive text-sm">{fieldErrors.email[0]}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${mode}-user-role`}>Role</Label>
            <select
              id={`${mode}-user-role`}
              value={values.role}
              onChange={(event) =>
                updateValue("role", event.target.value as UserFormValue["role"])
              }
              className="border-input focus-visible:border-ring focus-visible:ring-ring/50 h-8 w-full rounded-lg border bg-transparent px-2.5 text-sm outline-none focus-visible:ring-3"
            >
              <option value="admin">Admin</option>
              <option value="employee">Employee</option>
            </select>
          </div>
          {isCreate ? (
            <div className="space-y-2">
              <Label htmlFor={`${mode}-user-password`}>Initial password</Label>
              <Input
                id={`${mode}-user-password`}
                type="password"
                value={values.password}
                onChange={(event) =>
                  updateValue("password", event.target.value)
                }
                aria-invalid={!!fieldErrors?.password?.[0]}
              />
              {fieldErrors?.password?.[0] ? (
                <p className="text-destructive text-sm">
                  {fieldErrors.password[0]}
                </p>
              ) : null}
            </div>
          ) : null}
          {serverError ? (
            <p className="border-destructive/30 bg-destructive/10 text-destructive rounded-lg border px-3 py-2 text-sm">
              {serverError}
            </p>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              {isCreate ? "Create" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
