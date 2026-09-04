import type { VercelRequest, VercelResponse } from "@vercel/node";

const CAJUPAY_API = "https://api.cajupay.com.br";

type CheckoutItem = {
  name: string;
  volumeMl: number;
  quantity: number;
  unitPrice: number;
  isApc?: boolean;
};

type CajupayResponse = {
  hosted_checkout_url?: string;
  checkout_session_id?: string;
  error?: unknown;
  message?: unknown;
  detail?: unknown;
};

function sendError(res: VercelResponse, status: number, message: string) {
  return res.status(status).json({ error: message });
}

function normalizeReason(value: unknown): string {
  if (typeof value === "string") {
    return value.replace(/\s+/g, " ").trim();
  }

  if (value === undefined || value === null) {
    return "";
  }

  try {
    return JSON.stringify(value).replace(/\s+/g, " ").trim();
  } catch {
    return String(value).replace(/\s+/g, " ").trim();
  }
}

function getCajupayReason(data: CajupayResponse, responseText: string): string {
  const candidates = [data.error, data.message, data.detail];

  for (const candidate of candidates) {
    const reason = normalizeReason(candidate);
    if (reason) return reason;
  }

  return normalizeReason(responseText);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendError(res, 405, "Método não permitido.");
  }

  const apiKey = process.env.CAJUPAY_API_KEY || process.env.VITE_CAJUPAY_API_KEY;
  const apiSecret = process.env.CAJUPAY_API_SECRET || process.env.VITE_CAJUPAY_API_SECRET;
  if (!apiKey || !apiSecret) return sendError(res, 500, "A integração Cajupay não está configurada no servidor.");

  const body = req.body as { items?: CheckoutItem[]; totalCents?: number; orderRef?: string };
  const items = Array.isArray(body?.items) ? body.items : [];
  const totalCents = Number(body?.totalCents);
  const orderRef = String(body?.orderRef || "").trim();

  if (!items.length || !Number.isInteger(totalCents) || totalCents < 200 || !orderRef) {
    return sendError(res, 400, "Dados do checkout inválidos. O valor mínimo é de R$ 2,00.");
  }

  const description = items.map((item) => {
    const name = String(item.name || "Perfume");
    const volume = Number(item.volumeMl) || 0;
    const quantity = Number(item.quantity) || 1;
    return `${name} ${item.isApc ? `APC+${volume}ml` : `${volume}ml`} x${quantity}`;
  }).join(", ");

  const payload = {
    amount_cents: totalCents,
    currency: "BRL",
    description: `Pedido SIAROM: ${description}`,
    allow_card: true,
    allow_apple_pay: true,
    allow_google_pay: true,
    allow_pix: false,
    locale: "pt-BR",
  };

  try {
    // O payload não contém API Key nem API Secret e pode ser registrado com segurança.
    console.log("=== PAYLOAD ENVIADO PARA CAJUPAY ===");
    console.log(JSON.stringify(payload, null, 2));

    const response = await fetch(`${CAJUPAY_API}/api/sdk/v1/checkout/sessions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey,
        "X-API-Secret": apiSecret,
        "Idempotency-Key": `siarom-${orderRef}-${Date.now()}`,
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    let data: CajupayResponse = {};

    try {
      const parsed: unknown = JSON.parse(responseText);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        data = parsed as CajupayResponse;
      }
    } catch {
      // A resposta pode não ser JSON; nesse caso, o corpo bruto será usado como motivo.
    }

    if (!response.ok) {
      // Não registre os headers: eles contêm X-API-Key e X-API-Secret.
      console.error("Erro retornado pela Cajupay:", {
        status: response.status,
        body: responseText,
        payload,
      });

      const apiReason = getCajupayReason(data, responseText).slice(0, 500);
      return sendError(
        res,
        response.status === 400 ? 400 : 502,
        `A Cajupay recusou a solicitação (${response.status})${apiReason ? `: ${apiReason}` : "."}`,
      );
    }

    if (!data.hosted_checkout_url) {
      return sendError(res, 502, "A Cajupay não retornou o link do checkout.");
    }

    return res.status(200).json({
      checkoutUrl: data.hosted_checkout_url,
      sessionId: data.checkout_session_id || "",
    });
  } catch (error: unknown) {
    console.error("Falha de comunicação com Cajupay:", {
      error: error instanceof Error ? error.message : String(error),
      payload,
    });

    return sendError(res, 502, "Não foi possível conectar à Cajupay. Tente novamente.");
  }
}
