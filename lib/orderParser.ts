// Regras gratuitas (sem IA) para ler pedidos feitos por resposta no WhatsApp.
// Funcionam bem para respostas simples ("3", "7 ml", "apc", "2x5ml"); o que for duvidoso
// vira "ambiguous" e o painel pede revisão manual ou ajuda da IA.

export type ParsedOrderItem = { volumeMl: number; isApc: boolean; quantity: number };

export type ParseResult = {
  status: "ok" | "ambiguous" | "empty";
  items: ParsedOrderItem[];
  notes: string[];
};

export type PerfumeMatch = { perfume: Record<string, unknown> | null; confidence: "exact" | "partial" | "none" };

export function normalize(value: string) {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
}

function compact(value: string) {
  return normalize(value).replace(/[^a-z0-9]+/g, "");
}

function text(value: unknown) {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

// A primeira linha da ficha é o título: "Nome · Marca" ou só "Nome". Mensagens copiadas podem trazer
// marcas do WhatsApp na frente (ex.: "[10:32] Rafic:"), então o título é limpo antes da comparação.
export function extractPerfumeTitle(quoted: string) {
  const firstLine = quoted.split(/\r?\n/).map((line) => line.trim()).find(Boolean) || "";
  return firstLine.replace(/^\[[^\]]*\]\s*[^:]{0,40}:\s*/, "").trim();
}

export function matchPerfume(perfumes: Record<string, unknown>[], quoted: string): PerfumeMatch {
  const title = extractPerfumeTitle(quoted);
  const titleKey = compact(title);
  if (!titleKey) return { perfume: null, confidence: "none" };

  const candidates = perfumes.filter((perfume) => perfume.available !== false);
  const withKeys = candidates.map((perfume) => ({
    perfume,
    nameKey: compact(text(perfume.name)),
    fullKey: compact(`${text(perfume.name)} ${text(perfume.brand)}`),
  })).filter((entry) => entry.nameKey);

  const exact = withKeys.filter((entry) => titleKey === entry.fullKey || titleKey === entry.nameKey || titleKey === compact(`${text(entry.perfume.name)}·${text(entry.perfume.brand)}`));
  if (exact.length === 1) return { perfume: exact[0].perfume, confidence: "exact" };
  if (exact.length > 1) return { perfume: null, confidence: "none" };

  const partial = withKeys.filter((entry) => titleKey.includes(entry.nameKey) || entry.nameKey.includes(titleKey));
  if (partial.length === 1) return { perfume: partial[0].perfume, confidence: "partial" };
  return { perfume: null, confidence: "none" };
}

export function digitsOnly(value: string) {
  return value.replace(/\D+/g, "");
}

// Descobre o cliente pelo remetente (número ou nome copiado do WhatsApp). Só devolve quando há um único candidato.
export function matchCliente<T extends { nome: string; telefone: string }>(clientes: T[], sender: string): T | null {
  const query = sender.trim();
  if (!query) return null;

  const digits = digitsOnly(query);
  if (digits.length >= 8) {
    const tail = digits.slice(-8);
    const byPhone = clientes.filter((cliente) => digitsOnly(cliente.telefone).endsWith(tail));
    if (byPhone.length === 1) return byPhone[0];
    if (byPhone.length > 1) return null;
  }

  const nameKey = normalize(query.replace(/^~\s*/, ""));
  if (!nameKey || digits.length >= 8) return null;
  const exact = clientes.filter((cliente) => normalize(cliente.nome) === nameKey);
  if (exact.length === 1) return exact[0];
  const partial = clientes.filter((cliente) => normalize(cliente.nome).includes(nameKey) || nameKey.includes(normalize(cliente.nome)));
  return partial.length === 1 ? partial[0] : null;
}

const CHANGE_WORDS = /\b(cancel\w*|troc\w*|mud\w*|tir\w*|remov\w*|desist\w*|ao inves|em vez)\b/;
const CONDITIONAL_WORDS = /\b(ou|se|caso|talvez|depois|mesmo de|igual|o de ontem|quanto|qual|valor|preco)\b/;

function toNumber(value: string) {
  return Number.parseFloat(value.replace(",", "."));
}

function addItem(items: ParsedOrderItem[], volumeMl: number, quantity: number, isApc = false) {
  const existing = items.find((item) => item.volumeMl === volumeMl && item.isApc === isApc);
  if (existing && !isApc) existing.quantity += quantity;
  else if (!existing) items.push({ volumeMl, isApc, quantity: isApc ? 1 : quantity });
}

export function parseReply(reply: string, options: { volumes: number[]; apcMl?: number; hasApc?: boolean }): ParseResult {
  const notes: string[] = [];
  let working = normalize(reply);
  if (!working) return { status: "empty", items: [], notes: ["Resposta vazia."] };

  if (CHANGE_WORDS.test(working)) {
    return { status: "ambiguous", items: [], notes: ["A resposta parece pedir troca ou cancelamento. Confira e registre manualmente."] };
  }
  if (CONDITIONAL_WORDS.test(working)) {
    return { status: "ambiguous", items: [], notes: ["A resposta parece condicional ou é uma dúvida. Confira antes de registrar."] };
  }

  const items: ParsedOrderItem[] = [];
  let ambiguous = false;

  // APC: "apc", "apc + 40ml", "quero o apc"
  if (/\bapc\b/.test(working)) {
    if (options.hasApc && options.apcMl) {
      addItem(items, options.apcMl, 1, true);
      working = working.replace(/\bapc\b\s*(\+\s*)?(\d+(?:[.,]\d+)?\s*ml)?/g, " ");
    } else {
      notes.push("O cliente pediu APC, mas este perfume não tem APC.");
      ambiguous = true;
      working = working.replace(/\bapc\b/g, " ");
    }
  }

  // Quantidade + volume: "2x5", "2 x 5ml", "2 de 5ml", "2 frascos de 5ml", "5ml x2"
  const quantityPattern = /(\d+(?:[.,]\d+)?)\s*(?:x|vezes|de|frascos?\s+de|unidades?\s+de)\s*(\d+(?:[.,]\d+)?)\s*(?:ml)?|(\d+(?:[.,]\d+)?)\s*ml\s*(?:x|vezes)\s*(\d+)/g;
  working = working.replace(quantityPattern, (_match, a, b, c, d) => {
    const first = toNumber(a ?? c);
    const second = toNumber(b ?? d);
    const firstIsVolume = options.volumes.includes(first);
    const secondIsVolume = options.volumes.includes(second);
    if (c !== undefined) {
      if (secondIsVolume && !firstIsVolume) addItem(items, second, first);
      else addItem(items, first, second);
    } else if (secondIsVolume && !firstIsVolume) addItem(items, second, first);
    else if (firstIsVolume && !secondIsVolume) addItem(items, first, second);
    else {
      notes.push(`Não deu para saber se "${first} e ${second}" é quantidade ou volume.`);
      ambiguous = true;
    }
    return " ";
  });

  // Volumes soltos: "3", "7 ml", "3 e 5"
  const rest = [...working.matchAll(/(\d+(?:[.,]\d+)?)\s*(?:ml)?/g)].map((match) => toNumber(match[1]));
  for (const value of rest) {
    if (options.volumes.includes(value)) addItem(items, value, 1);
    else {
      notes.push(`${value} ml não existe nas volumetrias deste perfume.`);
      ambiguous = true;
    }
  }

  if (!items.length && !ambiguous) return { status: "empty", items: [], notes: ["Não encontrei um volume na resposta."] };
  return { status: ambiguous || !items.length ? "ambiguous" : "ok", items, notes };
}
