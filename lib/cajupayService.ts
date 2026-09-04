/**
 * cajupayService.ts
 *
 * Responsável por criar uma sessão de pagamento na API da Cajupay
 * e retornar o hosted_checkout_url — o link que você envia ao cliente.
 *
 * ATENÇÃO: As chaves da API (VITE_CAJUPAY_API_KEY e VITE_CAJUPAY_API_SECRET)
 * devem ficar em um arquivo .env na raiz do projeto e NUNCA ser commitadas no Git.
 *
 * Em produção o ideal é que essas chamadas fiquem num backend (servidor).
 * Como o SIAROM ainda não tem backend, usamos direto do frontend por ora.
 * Quando tiver backend, mova esta lógica para lá.
 */

export type BagItem = {
  name: string;
  volumeMl: number;
  quantity: number;
  unitPrice: number;
  isApc?: boolean;
};

export type PaymentLinkResult = {
  checkoutUrl: string;       // URL que você manda pro cliente
  sessionId: string;         // ID da sessão (para referência interna)
};

/**
 * Gera um link de pagamento Cajupay para os itens da sacola.
 *
 * @param items - Lista de itens da sacola
 * @param totalCents - Total em centavos (ex: R$ 59,90 = 5990)
 * @param orderRef - Identificador do pedido (ex: "SIAROM-1234")
 */
export async function createPaymentLink(
  items: BagItem[],
  totalCents: number,
  orderRef: string
): Promise<PaymentLinkResult> {
  const response = await fetch("/api/cajupay/checkout", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ items, totalCents, orderRef }),
  });

  const data = await response.json().catch(() => ({} as { error?: string }));
  if (!response.ok) throw new Error(data.error || `Erro Cajupay (${response.status}).`);

  return {
    checkoutUrl: data.checkoutUrl,
    sessionId: data.sessionId,
  };
}
