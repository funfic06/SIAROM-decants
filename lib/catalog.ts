// Atelier Noir: dados editoriais do catálogo SIAROM, organizados para descoberta rápida e pedido por volume.
import heroAsset from "@/assets/siarom-hero-editorial.svg";
import sealAsset from "@/assets/siarom-seal.svg";

export type VolumeOption = { ml: number; price: number; available?: boolean };
export type ApcOption = { ml: number; price: number; limit: number; available: boolean };

export type LegacyOrder = { id: string; name: string; ml: number; isApc?: boolean; pagamento?: string; entregue?: boolean };

export type Perfume = {
  id?: string;
  slug: string;
  name: string;
  brand: string;
  family: string;
  gender: string;
  image?: string;
  accent: string;
  shortDescription: string;
  description: string;
  notes: string[];
  accords?: string[];
  intensity: string;
  longevity: string;
  volumeOptions: VolumeOption[];
  apc?: ApcOption;
  stock: number;
  edition?: string;
  deliveryText?: string;
  available?: boolean;
  obs?: string;
  raw?: Record<string, unknown>;
};

export const heroImage = heroAsset;
export const logoMark = sealAsset;

export const seedPerfumes: Perfume[] = [
  {
    slug: "oud-satin-mood", name: "Oud Satin Mood", brand: "Maison Francis Kurkdjian", family: "Âmbar", gender: "Unissex",
    image: "https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&w=900&q=85", accent: "wine",
    shortDescription: "Violeta, rosa e oud em uma textura aveludada e envolvente.",
    description: "Uma composição opulenta que envolve a pele com rosa búlgara, violeta e um oud macio. Um rastro cremoso, profundo e deliberadamente noturno.",
    notes: ["Oud", "Rosa búlgara", "Violeta", "Âmbar"], intensity: "Intenso", longevity: "10–12h",
    volumeOptions: [{ ml: 2, price: 29 }, { ml: 5, price: 59 }, { ml: 10, price: 105 }, { ml: 15, price: 149 }, { ml: 30, price: 269 }], stock: 18, edition: "Seleção noturna",
  },
  {
    slug: "santal-33", name: "Santal 33", brand: "Le Labo", family: "Amadeirado", gender: "Unissex",
    image: "https://images.unsplash.com/photo-1547887538-e3a2f32cb1cc?auto=format&fit=crop&w=900&q=85", accent: "green",
    shortDescription: "Sândalo, cedro e couro em uma assinatura seca e magnética.",
    description: "Um amadeirado de presença limpa, construído sobre sândalo australiano, cedro, cardamomo e um acorde de couro que permanece próximo à pele.",
    notes: ["Sândalo", "Cedro", "Cardamomo", "Couro"], intensity: "Marcante", longevity: "8–10h",
    volumeOptions: [{ ml: 2, price: 26 }, { ml: 5, price: 52 }, { ml: 10, price: 94 }, { ml: 15, price: 132 }, { ml: 30, price: 239 }], stock: 25,
  },
  {
    slug: "fleur-de-peau", name: "Fleur de Peau", brand: "Diptyque", family: "Floral", gender: "Unissex",
    image: "https://images.unsplash.com/photo-1563170351-be82bc888aa4?auto=format&fit=crop&w=900&q=85", accent: "pearl",
    shortDescription: "Almíscar macio, íris e ambrette como uma segunda pele.",
    description: "Delicado sem ser frágil, Fleur de Peau combina a textura do almíscar com a poeira elegante da íris e a luminosidade de sementes de ambrette.",
    notes: ["Almíscar", "Íris", "Ambrette", "Pimenta rosa"], intensity: "Moderado", longevity: "6–8h",
    volumeOptions: [{ ml: 2, price: 24 }, { ml: 5, price: 48 }, { ml: 10, price: 86 }, { ml: 15, price: 121 }, { ml: 30, price: 219 }], stock: 31, edition: "Assinatura de pele",
  },
  {
    slug: "neroli-portofino", name: "Neroli Portofino", brand: "Tom Ford", family: "Cítrico", gender: "Unissex",
    image: "https://images.unsplash.com/photo-1588405748880-12d1d2a59f75?auto=format&fit=crop&w=900&q=85", accent: "citrus",
    shortDescription: "Néroli, bergamota e flor de laranjeira com frescor solar.",
    description: "Uma saída luminosa de cítricos italianos que evolui para um coração floral arejado. Fresco, polido e perfeito para abrir o dia.",
    notes: ["Néroli", "Bergamota", "Limão", "Flor de laranjeira"], intensity: "Radiante", longevity: "5–7h",
    volumeOptions: [{ ml: 2, price: 22 }, { ml: 5, price: 44 }, { ml: 10, price: 79 }, { ml: 15, price: 112 }, { ml: 30, price: 199 }], stock: 42,
  },
  {
    slug: "bitter-peach", name: "Bitter Peach", brand: "Tom Ford", family: "Frutado", gender: "Unissex",
    image: "https://images.unsplash.com/photo-1523293182086-7651a899d37f?auto=format&fit=crop&w=900&q=85", accent: "peach",
    shortDescription: "Pêssego maduro, rum e patchouli em um acorde provocante.",
    description: "Frutado e licoroso, Bitter Peach alterna a suculência do pêssego com rum, conhaque e madeiras densas para um efeito quente e inesperado.",
    notes: ["Pêssego", "Rum", "Conhaque", "Patchouli"], intensity: "Intenso", longevity: "9–11h",
    volumeOptions: [{ ml: 2, price: 27 }, { ml: 5, price: 55 }, { ml: 10, price: 98 }, { ml: 15, price: 139 }, { ml: 30, price: 249 }], stock: 14, edition: "Edição de impacto",
  },
  {
    slug: "musc-ravageur", name: "Musc Ravageur", brand: "Frédéric Malle", family: "Especiado", gender: "Unissex",
    image: "https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=900&q=85", accent: "rose",
    shortDescription: "Canela, baunilha e almíscar em um abraço quente e especiado.",
    description: "Uma construção sensual de almíscar, baunilha e canela, equilibrada por lavanda e madeiras. O resultado é confortável, mas com uma tensão sofisticada.",
    notes: ["Canela", "Baunilha", "Almíscar", "Lavanda"], intensity: "Marcante", longevity: "8–10h",
    volumeOptions: [{ ml: 2, price: 25 }, { ml: 5, price: 51 }, { ml: 10, price: 92 }, { ml: 15, price: 129 }, { ml: 30, price: 229 }], stock: 21,
  },
];

export const families = ["Todos", "Compartilhável", "Masculino", "Feminino"];
export const genders = ["Compartilhável", "Masculino", "Feminino"] as const;
export function findPerfume(slug?: string) { return perfumes.find((perfume) => perfume.slug === slug); }
export const perfumes = seedPerfumes;

const catalogVolumes = [3, 7, 10, 15, 20, 30];
function numberValue(value: unknown) {
  const parsed = Number.parseFloat(String(value ?? "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}
function slugify(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
function rawText(value: unknown) { return typeof value === "string" ? value : ""; }
export function normalizeGender(value: unknown) {
  const normalized = rawText(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  if (normalized === "masculino") return "Masculino";
  if (normalized === "feminino") return "Feminino";
  return "Compartilhável";
}

export function adaptPerfume(raw: Record<string, unknown>, index = 0, apcStatus?: { reserved: boolean; volumeMl?: number }, stockStatus?: { reservedMl: number }): Perfume {
  const name = rawText(raw.name) || "Perfume sem nome";
  const brand = rawText(raw.brand) || "Marca não informada";
  const rawPrices = (raw.prices && typeof raw.prices === "object" ? raw.prices : {}) as Record<string, unknown>;
  const pricePerMl = numberValue(raw.pricePerMl);
  const recave = numberValue(raw.recavePrice) || 8;
  const priceFor = (ml: number) => {
    const manual = numberValue(rawPrices[String(ml)]);
    return manual > 0 ? manual : pricePerMl > 0 ? ml * pricePerMl : 0;
  };
  const gender = normalizeGender(raw.gender || raw.type || raw.family);
  const id = rawText(raw.id) || slugify(name) || `perfume-${index}`;
  const orders = Array.isArray(raw.orders) ? raw.orders as LegacyOrder[] : [];
  const totalMl = numberValue(raw.totalMl);
  const apcMl = numberValue(raw.apcMl) || 40;
  const legacyUsedMl = orders.reduce((sum, order) => sum + numberValue(order.ml), 0);
  const currentReservedMl = stockStatus ? numberValue(stockStatus.reservedMl) : apcStatus?.reserved ? numberValue(apcStatus.volumeMl) || apcMl : 0;
  const usedMl = stockStatus ? currentReservedMl : legacyUsedMl + currentReservedMl;
  const apcFee = numberValue(raw.apcFrasco) || 10;
  const apcLimit = numberValue(raw.apcLimit) || 1;
  const apcUsed = apcStatus?.reserved ? apcLimit : orders.filter((order) => order.isApc).length;
  const apcPrice = pricePerMl > 0 ? apcMl * pricePerMl + apcFee : 0;
  const rawNotes = Array.isArray(raw.notes) ? raw.notes.filter((note): note is string => typeof note === "string") : [];
  const rawAccords = Array.isArray(raw.accords) ? raw.accords.filter((accord): accord is string => typeof accord === "string").slice(0, 5) : rawNotes.slice(0, 5);
  const readableSlug = /^\d+$/.test(id) ? slugify(name) : slugify(id) || slugify(name);
  return {
    id, slug: readableSlug, name, brand, family: gender, gender,
    image: rawText(raw.imageUrl) || rawText(raw.image) || undefined, accent: rawText(raw.accent) || "gold",
    shortDescription: rawText(raw.shortDescription) || rawText(raw.obs) || "Uma fragrância selecionada para o arquivo SIAROM.",
    description: rawText(raw.description) || rawText(raw.obs) || "Conheça esta fragrância em uma fração pensada para experimentar a matéria antes do frasco inteiro.",
    notes: rawNotes, accords: rawAccords, intensity: rawText(raw.intensity) || "A definir", longevity: rawText(raw.longevity) || "A definir",
    volumeOptions: catalogVolumes.map((ml) => ({ ml, price: priceFor(ml) })), apc: raw.hasApc === true ? { ml: apcMl, price: apcPrice, limit: apcLimit, available: apcUsed < apcLimit } : undefined,
    stock: totalMl > 0 ? Math.max(0, totalMl - usedMl) : 0,
    edition: rawText(raw.edition) || "Arquivo SIAROM", deliveryText: rawText(raw.deliveryText) || "Os frascos são enviados com identificação da fragrância e do volume. Embalados em caixas com proteção para manter os frascos intactos, visando preservar a experiência completa da fragrância.", available: raw.available !== false, obs: rawText(raw.obs), raw: { ...raw, recavePrice: recave },
  };
}

export function formatPrice(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "Sob consulta";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

// Gera a mensagem pronta de WhatsApp para um perfume, a partir dos mesmos dados usados na ficha do admin.
export function buildWhatsappMessage(raw: Record<string, unknown>) {
  const name = rawText(raw.name) || "Perfume sem nome";
  const brand = rawText(raw.brand);
  const obs = rawText(raw.obs);
  const referenceUrl = rawText(raw.referenceUrl);
  const deliveryText = rawText(raw.deliveryText) || "Os frascos são enviados com identificação da fragrância e do volume. Embalados em caixas com proteção para manter os frascos intactos, visando preservar a experiência completa da fragrância.";
  const totalMl = numberValue(raw.totalMl);
  const pricePerMl = numberValue(raw.pricePerMl);
  const recave = numberValue(raw.recavePrice) || 8;
  const hasApc = raw.hasApc === true;
  const apcMl = numberValue(raw.apcMl) || 40;
  const apcFrasco = numberValue(raw.apcFrasco) || 10;
  const apcPrice = pricePerMl > 0 ? apcMl * pricePerMl + apcFrasco : 0;
  const rawPrices = (raw.prices && typeof raw.prices === "object" ? raw.prices : {}) as Record<string, unknown>;
  const priceFor = (ml: number) => {
    const manual = numberValue(rawPrices[String(ml)]);
    return manual > 0 ? manual : pricePerMl > 0 ? ml * pricePerMl : 0;
  };

  const lines: string[] = [];
  lines.push(brand ? `${name} · ${brand}` : name);
  lines.push("");
  if (obs) { lines.push(`Observação: ${obs}`); lines.push(""); }

  const priceParts: string[] = [];
  if (pricePerMl > 0) priceParts.push(`R$ ${pricePerMl.toFixed(2).replace(".", ",")}/ml`);
  if (recave > 0 && pricePerMl > 0) priceParts.push(`R$ ${recave.toFixed(2).replace(".", ",")} (recave)`);
  if (priceParts.length) lines.push(priceParts.join(" + "));
  if (hasApc && apcPrice > 0) lines.push(`APC + ${apcMl} ml = ${formatPrice(apcPrice)}`);
  lines.push("");

  if (referenceUrl) { lines.push(referenceUrl); lines.push(""); }

  lines.push("Volumetrias disponíveis:");
  catalogVolumes.forEach((ml) => {
    const price = priceFor(ml);
    if (price > 0) lines.push(`  · ${ml} ml: ${formatPrice(price)}`);
  });
  if (hasApc && apcPrice > 0) lines.push(`  · APC + ${apcMl} ml: ${formatPrice(apcPrice)}`);
  lines.push("________________");
  if (totalMl > 0) lines.push(`${totalMl} ml disponíveis`);
  lines.push("");
  lines.push(deliveryText);

  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}
