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

const CAJUPAY_API = "https://api.cajupay.com.br";
const API_KEY = import.meta.env.VITE_CAJUPAY_API_KEY as string;
const API_SECRET = import.meta.env.VITE_CAJUPAY_API_SECRET as string;

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
  if (!API_KEY || !API_SECRET) {
    throw new Error(
      "Chaves da Cajupay não configuradas. Adicione VITE_CAJUPAY_API_KEY e VITE_CAJUPAY_API_SECRET no .env"
    );
  }

  // Monta a descrição do pedido com os itens
  const description = items
    .map((item) => `${item.name} ${item.isApc ? `APC+${item.volumeMl}ml` : `${item.volumeMl}ml`} x${item.quantity}`)
    .join(", ");

  const response = await fetch(`${CAJUPAY_API}/api/sdk/v1/checkout/sessions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": API_KEY,
      "X-API-Secret": API_SECRET,
      // Idempotency-Key garante que cliques duplos não criem duas sessões
      "Idempotency-Key": `siarom-${orderRef}-${Date.now()}`,
    },
    body: JSON.stringify({
      amount_cents: totalCents,        // Total em centavos — obrigatório mínimo 200
      currency: "BRL",
      description: `Pedido SIAROM: ${description}`,
      allow_card: true,
      allow_apple_pay: true,
      allow_google_pay: true,
      allow_pix: false,               // PIX requer backend — deixar false por ora
      locale: "pt-BR",
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Erro Cajupay (${response.status}): ${errorBody}`);
  }

  const data = await response.json();

  return {
    checkoutUrl: data.hosted_checkout_url,
    sessionId: data.checkout_session_id,
  };
}
