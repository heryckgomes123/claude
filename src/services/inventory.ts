import "server-only";
import { asc, desc, eq, sql } from "drizzle-orm";
import type { z } from "zod";
import { db } from "@/db";
import { inventoryMovements, products, users } from "@/db/schema";
import { audit } from "@/lib/audit";
import { assertCan, type SessionUser } from "@/lib/auth/session";
import { NotFoundError, ValidationError } from "@/lib/errors";
import type { movementInput, productInput } from "@/schemas/inventory";

const round3 = (n: number) => Math.round(n * 1000) / 1000;

export async function listProducts(actor: SessionUser) {
  assertCan(actor, "inventory.view");
  const rows = await db
    .select()
    .from(products)
    .orderBy(desc(products.isActive), sql`(${products.quantity} <= ${products.minQuantity}) desc`, asc(products.name));
  return rows.map((p) => ({ ...p, isLow: p.quantity <= p.minQuantity }));
}

export async function listRecentMovements(actor: SessionUser, limit = 20) {
  assertCan(actor, "inventory.view");
  return db
    .select({
      id: inventoryMovements.id,
      type: inventoryMovements.type,
      quantityDelta: inventoryMovements.quantityDelta,
      balanceAfter: inventoryMovements.balanceAfter,
      reason: inventoryMovements.reason,
      createdAt: inventoryMovements.createdAt,
      productName: products.name,
      unit: products.unit,
      userName: users.name,
    })
    .from(inventoryMovements)
    .innerJoin(products, eq(products.id, inventoryMovements.productId))
    .leftJoin(users, eq(users.id, inventoryMovements.createdById))
    .orderBy(desc(inventoryMovements.createdAt))
    .limit(limit);
}

export async function saveProduct(actor: SessionUser, productId: string | null, input: z.output<typeof productInput>) {
  assertCan(actor, "inventory.manage");
  return db.transaction(async (tx) => {
    const data = {
      name: input.name,
      category: input.category,
      unit: input.unit,
      minQuantity: round3(input.minQuantity),
      costCents: input.costCents,
    };
    if (productId) {
      const [updated] = await tx.update(products).set(data).where(eq(products.id, productId)).returning({ id: products.id });
      if (!updated) throw new NotFoundError("Produto não encontrado.");
      await audit({ userId: actor.id, action: "update", entity: "product", entityId: productId }, tx);
      return updated;
    }
    const initial = round3(input.initialQuantity ?? 0);
    const [created] = await tx
      .insert(products)
      .values({ ...data, quantity: initial })
      .returning({ id: products.id });
    if (initial > 0) {
      await tx.insert(inventoryMovements).values({
        productId: created.id,
        type: "IN",
        quantityDelta: initial,
        balanceAfter: initial,
        reason: "Estoque inicial",
        createdById: actor.id,
      });
    }
    await audit({ userId: actor.id, action: "create", entity: "product", entityId: created.id }, tx);
    return created;
  });
}

export async function setProductActive(actor: SessionUser, productId: string, isActive: boolean) {
  assertCan(actor, "inventory.manage");
  const [updated] = await db.update(products).set({ isActive }).where(eq(products.id, productId)).returning({ id: products.id });
  if (!updated) throw new NotFoundError("Produto não encontrado.");
  await audit({ userId: actor.id, action: isActive ? "activate" : "deactivate", entity: "product", entityId: productId });
}

/** Entrada soma, saída subtrai, ajuste define o saldo contado. Nunca deixa saldo negativo. */
export async function registerMovement(actor: SessionUser, input: z.output<typeof movementInput>) {
  assertCan(actor, "inventory.manage");
  return db.transaction(async (tx) => {
    const [product] = await tx.select().from(products).where(eq(products.id, input.productId)).for("update").limit(1);
    if (!product) throw new NotFoundError("Produto não encontrado.");
    const qty = round3(input.quantity);
    let balance = product.quantity;
    if (input.type === "IN") balance = round3(balance + qty);
    if (input.type === "OUT") balance = round3(balance - qty);
    if (input.type === "ADJUSTMENT") balance = qty;
    if (balance < 0) throw new ValidationError(`Saldo insuficiente. Disponível: ${product.quantity} ${product.unit}.`);
    const delta = round3(balance - product.quantity);
    if (input.type === "ADJUSTMENT" && delta === 0) throw new ValidationError("O saldo informado é igual ao atual.");

    await tx.update(products).set({ quantity: balance }).where(eq(products.id, product.id));
    await tx.insert(inventoryMovements).values({
      productId: product.id,
      type: input.type,
      quantityDelta: delta,
      balanceAfter: balance,
      reason: input.reason,
      createdById: actor.id,
    });
    await audit(
      { userId: actor.id, action: "inventory_movement", entity: "product", entityId: product.id, metadata: { type: input.type, delta } },
      tx,
    );
    return { balance, isLow: balance <= product.minQuantity };
  });
}
