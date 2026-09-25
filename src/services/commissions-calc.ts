import { allocateProportionally, applyRate } from "@/utils/money";

export type CommissionItem = { id: string; totalCents: number; commissionRate: number };

/**
 * Regra de comissão:
 *   1. o desconto do atendimento é distribuído proporcionalmente entre os itens;
 *   2. base = valor do item − parte do desconto;
 *   3. comissão = base × percentual (snapshot gravado quando o item foi lançado).
 * Ex.: serviço R$100, comissão 40% → R$40.
 */
export function calculateCommissions(items: CommissionItem[], discountCents: number) {
  const shares = allocateProportionally(
    discountCents,
    items.map((i) => i.totalCents),
  );
  return items.map((item, index) => {
    const discountShareCents = shares[index];
    const baseCents = item.totalCents - discountShareCents;
    return {
      itemId: item.id,
      discountShareCents,
      baseCents,
      rate: item.commissionRate,
      amountCents: applyRate(baseCents, item.commissionRate),
    };
  });
}
