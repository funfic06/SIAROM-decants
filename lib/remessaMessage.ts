export const DEFAULT_RECRAVE_PRICE = 6.86;

export type RemessaMessageItem = { perfumeName: string; volumeMl: number; quantity: number; unitPrice: number; isApc?: boolean };

export function parseMoney(value: string | number | null | undefined): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const cleaned = String(value ?? "").replace(/R\$/gi, "").replace(/\s/g, "");
  if (!cleaned) return 0;
  const normalized = cleaned.includes(",") ? cleaned.replace(/\./g, "").replace(",", ".") : cleaned;
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function brl(value: number): string {
  return `R$ ${new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.round(value * 100) / 100)}`;
}

export function buildRemessaMessage(input: { customerName: string; customerNumber?: string; items: RemessaMessageItem[]; recraves: number; recravePrice: number; pixTotal?: string }): string {
  const itemsTotal = input.items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
  const recraveCost = Math.max(0, input.recraves) * input.recravePrice;
  const total = itemsTotal + recraveCost;
  const header = input.customerNumber ? `${input.customerName} - ${input.customerNumber}` : input.customerName;
  const lines = input.items.map((i) => `* ${i.perfumeName} ${i.isApc ? `APC + ${i.volumeMl}ml` : `${i.volumeMl}ml`}${i.quantity > 1 ? ` x${i.quantity}` : ""} ${brl(i.unitPrice * i.quantity)}`);
  const pix = parseMoney(input.pixTotal);
  const totalLine = `Valor total: ${brl(total)}${pix > 0 ? ` (Com desconto pix = ${brl(pix)})` : ""}`;
  const parts = [header, "", ...lines, ""];
  if (input.recraves > 0) parts.push(`${input.recraves} recrave${input.recraves > 1 ? "s" : ""} = ${brl(recraveCost)}`, "");
  parts.push(totalLine);
  return parts.join("\n");
}
