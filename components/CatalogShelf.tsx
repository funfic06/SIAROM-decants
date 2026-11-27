// Prateleira da página principal: adapta o catálogo SIAROM (Perfume) ao componente ProductShelf
// e liga o "Adicionar à sacola" à sacola real do site (StorefrontContext).
import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { ArrowUpRight, Heart } from "lucide-react";
import { ProductShelf, type Product } from "@/components/ui/skincare-product-shelf";
import { formatPrice, type Perfume } from "@/lib/catalog";
import { useStorefront } from "@/contexts/StorefrontContext";

// Cor do líquido dentro do frasco, conforme o "accent" do perfume.
const LIQUID: Record<string, string> = {
  wine: "#a24a52", green: "#9aa57b", pearl: "#efe6d6", citrus: "#f0c35a", peach: "#e9a07a", rose: "#e6a9b4", gold: "#d9b26a",
};

type Option = { ml: number; price: number; isApc: boolean };

function toProduct(perfume: Perfume): { product: Product; options: Option[] } {
  const options: Option[] = perfume.volumeOptions.map((option) => ({ ml: option.ml, price: option.price, isApc: false }));
  if (perfume.apc?.available) options.push({ ml: perfume.apc.ml, price: perfume.apc.price, isApc: true });
  const liquid = LIQUID[perfume.accent] ?? LIQUID.gold;
  const intensity = [perfume.intensity !== "A definir" && `Intensidade: ${perfume.intensity}`, perfume.longevity !== "A definir" && `Fixação: ${perfume.longevity}`].filter(Boolean).join(" · ");
  return {
    options,
    product: {
      id: perfume.slug,
      kind: "perfume",
      name: perfume.name,
      short: perfume.name,
      sub: perfume.family,
      brand: perfume.brand,
      category: `${perfume.brand} · ${perfume.family}`,
      color: "#eeece8", cap: "#151515", label: "#eeece8", ink: "#1a1a1a", glass: true, liquid,
      price: options[0]?.price ?? 0,
      sizes: options.map((option) => (option.isApc ? `APC + ${option.ml} ml` : `${option.ml} ml`)),
      sizePrices: options.map((option) => option.price),
      tagline: perfume.shortDescription,
      description: perfume.description,
      benefits: (perfume.accords?.length ? perfume.accords : perfume.notes).filter(Boolean),
      ingredients: intensity || "Informação em breve.",
      howTo: perfume.deliveryText || "Os frascos são enviados com identificação da fragrância e do volume.",
    },
  };
}

// Borda inferior do cabeçalho do site, para a página do produto abrir logo abaixo dele
// (acompanha o scroll porque a barra de aviso acima do cabeçalho some ao rolar).
function useHeaderBottom() {
  const [bottom, setBottom] = useState(82);
  useEffect(() => {
    const measure = () => {
      const header = document.querySelector<HTMLElement>(".site-header");
      if (header) setBottom(Math.max(0, Math.round(header.getBoundingClientRect().bottom)));
    };
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, { passive: true });
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure);
    };
  }, []);
  return bottom;
}

export default function CatalogShelf({ perfumes }: { perfumes: Perfume[] }) {
  const { addToBag, favorites, toggleFavorite } = useStorefront();
  const overlayTop = useHeaderBottom();
  const { products, optionsById } = useMemo(() => {
    const converted = perfumes.map(toProduct);
    return {
      products: converted.map((item) => item.product),
      optionsById: new Map(perfumes.map((perfume, index) => [perfume.slug, { perfume, options: converted[index].options }])),
    };
  }, [perfumes]);

  return (
    <div className="catalog-shelf">
      <ProductShelf
        products={products}
        brand="SIAROM"
        formatPrice={formatPrice}
        showChrome={false}
        wide
        overlayTop={overlayTop}
        className="min-h-0 bg-transparent"
        labels={{
          shelf: "Prateleira", dragToTurn: "Arraste para girar o frasco", size: "Fração", addToBag: "Adicionar à sacola",
          addedToBag: "Adicionado à sacola", decrease: "Diminuir quantidade", increase: "Aumentar quantidade",
          details: "Notas", ingredients: "Intensidade e fixação", howTo: "Entrega e conservação",
          ratings: "avaliações", bag: "Sacola", item: "item", items: "itens", shelfAria: "Prateleira",
        }}
        onAddToBag={(product, sizeIndex, unitPrice, qty) => {
          const entry = optionsById.get(product.id);
          const option = entry?.options[sizeIndex];
          if (!entry || !option) return;
          addToBag({ slug: entry.perfume.slug, name: entry.perfume.name, brand: entry.perfume.brand, volumeMl: option.ml, unitPrice, isApc: option.isApc, quantity: qty });
        }}
        info={[{ label: "Recrave", value: "Incluso em todos os decants, a partir de 2 ml" }]}
        renderExtra={(product) => {
          const favorite = favorites.includes(product.id);
          return (
            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
              <Link href={`/perfumes/${product.id}`} className="inline-flex items-center gap-1.5 text-[14px] font-medium text-[#111111] underline-offset-4 hover:underline">
                Ver ficha completa e registrar pedido <ArrowUpRight size={15} strokeWidth={1.6} />
              </Link>
              <button type="button" onClick={() => toggleFavorite(product.id)} aria-pressed={favorite} className="inline-flex items-center gap-1.5 text-[14px] font-medium text-[#111111] underline-offset-4 hover:underline">
                <Heart size={15} strokeWidth={1.6} fill={favorite ? "currentColor" : "none"} /> {favorite ? "Nos favoritos" : "Salvar nos favoritos"}
              </button>
            </div>
          );
        }}
      />
    </div>
  );
}
