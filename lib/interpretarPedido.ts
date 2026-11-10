import { firebaseAuth } from "@/lib/firebase";
import type { ParsedOrderItem } from "@/lib/orderParser";

export type AiInterpretation = { items: ParsedOrderItem[]; needsReview: boolean; note: string };

export class AiUnavailableError extends Error {
  code: string;
  constructor(message: string, code: string) {
    super(message);
    this.code = code;
  }
}

// Chama a função serverless /api/interpretar-pedido (a chave da Anthropic fica só no servidor).
export async function interpretWithAi(input: {
  perfumeName: string;
  quotedMessage: string;
  replyText: string;
  availableVolumes: number[];
  hasApc: boolean;
  apcMl: number;
}): Promise<AiInterpretation> {
  const user = firebaseAuth.currentUser;
  if (!user) throw new AiUnavailableError("Entre no painel para usar a IA.", "unauthorized");
  const token = await user.getIdToken();

  let response: Response;
  try {
    response = await fetch("/api/interpretar-pedido", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(input),
    });
  } catch {
    throw new AiUnavailableError("Não foi possível falar com o servidor. Verifique a conexão.", "network");
  }

  let data: Record<string, unknown> = {};
  try { data = (await response.json()) as Record<string, unknown>; } catch { /* resposta sem JSON (ex.: 404 do servidor local) */ }

  if (!response.ok) {
    if (response.status === 404) {
      throw new AiUnavailableError("A IA só funciona no site publicado na Vercel (o servidor local do Vite não tem as funções /api).", "not-found");
    }
    throw new AiUnavailableError(typeof data.error === "string" ? data.error : "A IA não respondeu.", typeof data.code === "string" ? data.code : "ai-error");
  }

  const items = Array.isArray(data.items) ? (data.items as ParsedOrderItem[]) : [];
  return { items, needsReview: data.needsReview !== false, note: typeof data.note === "string" ? data.note : "" };
}
