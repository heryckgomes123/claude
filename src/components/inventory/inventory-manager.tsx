"use client";

import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpFromLine,
  Boxes,
  MoreHorizontal,
  Pencil,
  Plus,
  Power,
  SlidersHorizontal,
} from "lucide-react";
import { useState } from "react";
import { inventoryMovementAction, saveProductAction, setProductActiveAction } from "@/actions/inventory";
import { useCan } from "@/components/layout/app-context";
import { EmptyState } from "@/components/shared/empty-state";
import { FormField } from "@/components/shared/form-field";
import { MoneyInput } from "@/components/shared/money-input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input, NativeSelect } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { INVENTORY_MOVEMENT_LABELS, PRODUCT_UNITS, type InventoryMovementType } from "@/config/domain";
import { useServerAction } from "@/hooks/use-server-action";
import { cn } from "@/utils/cn";
import { formatMoney } from "@/utils/money";

export type ProductRow = {
  id: string;
  name: string;
  category: string;
  unit: string;
  quantity: number;
  minQuantity: number;
  costCents: number;
  isActive: boolean;
  isLow: boolean;
};

const qty = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 3 });

export function InventoryManager({ products }: { products: ProductRow[] }) {
  const can = useCan();
  const manage = can("inventory.manage");
  const [editing, setEditing] = useState<ProductRow | null | undefined>(undefined);
  const [moving, setMoving] = useState<{ product: ProductRow; type: InventoryMovementType } | null>(null);
  const { run } = useServerAction();

  return (
    <>
      {manage && (
        <div className="mb-4 flex justify-end">
          <Button onClick={() => setEditing(null)}>
            <Plus /> Novo produto
          </Button>
        </div>
      )}
      {products.length === 0 ? (
        <EmptyState icon={Boxes} title="Nenhum produto cadastrado" description="Cadastre os insumos usados nos atendimentos." />
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Produto</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead className="text-right">Quantidade</TableHead>
                <TableHead className="text-right">Mínimo</TableHead>
                <TableHead className="text-right">Custo</TableHead>
                <TableHead>Situação</TableHead>
                {manage && <TableHead className="w-12" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((p) => (
                <TableRow key={p.id} className={cn(!p.isActive && "opacity-50")}>
                  <TableCell className="font-semibold">{p.name}</TableCell>
                  <TableCell className="text-muted-foreground">{p.category}</TableCell>
                  <TableCell className={cn("tabular text-right font-bold", p.isLow && "text-destructive")}>
                    {qty(p.quantity)} {p.unit}
                  </TableCell>
                  <TableCell className="tabular text-right text-muted-foreground">
                    {qty(p.minQuantity)} {p.unit}
                  </TableCell>
                  <TableCell className="tabular text-right text-muted-foreground">{formatMoney(p.costCents)}</TableCell>
                  <TableCell>
                    {!p.isActive ? (
                      <Badge tone="muted">Inativo</Badge>
                    ) : p.isLow ? (
                      <Badge tone="danger">
                        <AlertTriangle /> Estoque baixo
                      </Badge>
                    ) : (
                      <Badge tone="sage">OK</Badge>
                    )}
                  </TableCell>
                  {manage && (
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon-sm" aria-label={`Ações de ${p.name}`}>
                            <MoreHorizontal />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => setMoving({ product: p, type: "IN" })}>
                            <ArrowDownToLine /> Entrada
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => setMoving({ product: p, type: "OUT" })}>
                            <ArrowUpFromLine /> Saída
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => setMoving({ product: p, type: "ADJUSTMENT" })}>
                            <SlidersHorizontal /> Ajuste (contagem)
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onSelect={() => setEditing(p)}>
                            <Pencil /> Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            tone={p.isActive ? "danger" : undefined}
                            onSelect={() =>
                              run(() => setProductActiveAction({ productId: p.id, isActive: !p.isActive }), {
                                success: p.isActive ? "Produto desativado." : "Produto reativado.",
                              })
                            }
                          >
                            <Power /> {p.isActive ? "Desativar" : "Reativar"}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
      <ProductDialog open={editing !== undefined} onOpenChange={(o) => !o && setEditing(undefined)} product={editing} />
      <MovementDialog state={moving} onClose={() => setMoving(null)} />
    </>
  );
}

function ProductDialog({
  open,
  onOpenChange,
  product,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  product?: ProductRow | null;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <ProductForm product={product} onClose={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

function ProductForm({ product, onClose }: { product?: ProductRow | null; onClose: () => void }) {
  const [form, setForm] = useState({
    name: product?.name ?? "",
    category: product?.category ?? "",
    unit: product?.unit ?? "un",
    min: String(product?.minQuantity ?? 0),
    initial: "0",
  });
  const [cost, setCost] = useState<number | null>(product?.costCents ?? 0);
  const { pending, run, fieldError } = useServerAction();

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));
  const num = (v: string) => Number(v.replace(",", "."));

  return (
    <form
      className="flex min-h-0 flex-1 flex-col"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        run(
          () =>
            saveProductAction({
              productId: product?.id ?? null,
              name: form.name,
              category: form.category,
              unit: form.unit,
              minQuantity: num(form.min),
              costCents: cost ?? -1,
              initialQuantity: product ? undefined : num(form.initial),
            }),
          { success: product ? "Produto atualizado." : "Produto cadastrado.", onSuccess: onClose },
        );
      }}
    >
      <DialogHeader>
        <DialogTitle>{product ? "Editar produto" : "Novo produto"}</DialogTitle>
        <DialogDescription>
          {product ? "A quantidade muda apenas por movimentações." : "Informe o estoque inicial, se houver."}
        </DialogDescription>
      </DialogHeader>
      <DialogBody className="grid gap-4 pb-5 sm:grid-cols-2">
        <FormField id="prd-name" label="Produto" required error={fieldError("name")} className="sm:col-span-2">
          <Input id="prd-name" value={form.name} onChange={set("name")} maxLength={120} />
        </FormField>
        <FormField id="prd-cat" label="Categoria" required error={fieldError("category")}>
          <Input id="prd-cat" value={form.category} onChange={set("category")} placeholder="Ex.: Coloração" maxLength={60} />
        </FormField>
        <FormField id="prd-unit" label="Unidade" required>
          <NativeSelect id="prd-unit" value={form.unit} onChange={set("unit")}>
            {PRODUCT_UNITS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </NativeSelect>
        </FormField>
        <FormField id="prd-min" label="Estoque mínimo" required error={fieldError("minQuantity")}>
          <Input id="prd-min" inputMode="decimal" value={form.min} onChange={set("min")} />
        </FormField>
        <FormField id="prd-cost" label="Custo unitário" error={fieldError("costCents")}>
          <MoneyInput id="prd-cost" value={cost} onChange={setCost} />
        </FormField>
        {!product && (
          <FormField id="prd-initial" label="Quantidade inicial" error={fieldError("initialQuantity")}>
            <Input id="prd-initial" inputMode="decimal" value={form.initial} onChange={set("initial")} />
          </FormField>
        )}
      </DialogBody>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" loading={pending}>
          Salvar
        </Button>
      </DialogFooter>
    </form>
  );
}

function MovementDialog({ state, onClose }: { state: { product: ProductRow; type: InventoryMovementType } | null; onClose: () => void }) {
  return (
    <Dialog open={state !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent size="sm">{state && <MovementForm product={state.product} type={state.type} onClose={onClose} />}</DialogContent>
    </Dialog>
  );
}

function MovementForm({ product, type, onClose }: { product: ProductRow; type: InventoryMovementType; onClose: () => void }) {
  const [quantity, setQuantity] = useState(type === "ADJUSTMENT" ? String(product.quantity) : "");
  const [reason, setReason] = useState("");
  const { pending, run, fieldError } = useServerAction();

  return (
    <form
      className="flex min-h-0 flex-1 flex-col"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        run(() => inventoryMovementAction({ productId: product.id, type, quantity: Number(quantity.replace(",", ".")), reason }), {
          success: (r) =>
            `${INVENTORY_MOVEMENT_LABELS[type]} registrada. Saldo: ${qty(r.balance)} ${product.unit}${r.isLow ? " (estoque baixo)" : ""}.`,
          onSuccess: onClose,
        });
      }}
    >
      <DialogHeader>
        <DialogTitle>
          {INVENTORY_MOVEMENT_LABELS[type]} · {product.name}
        </DialogTitle>
        <DialogDescription>
          Saldo atual: {qty(product.quantity)} {product.unit}
        </DialogDescription>
      </DialogHeader>
      <DialogBody className="space-y-4 pb-5">
        <FormField
          id="mv-qty"
          label={type === "ADJUSTMENT" ? "Novo saldo (contado)" : "Quantidade"}
          required
          error={fieldError("quantity")}
        >
          <Input id="mv-qty" inputMode="decimal" value={quantity} onChange={(e) => setQuantity(e.target.value)} autoFocus />
        </FormField>
        <FormField id="mv-reason" label="Motivo">
          <Input
            id="mv-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={200}
            placeholder={type === "IN" ? "Ex.: compra fornecedor" : "Ex.: uso em atendimento"}
          />
        </FormField>
      </DialogBody>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" loading={pending}>
          Registrar
        </Button>
      </DialogFooter>
    </form>
  );
}
