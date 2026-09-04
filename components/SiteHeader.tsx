import { useState } from "react";
import { ArrowUpRight, Heart, Menu, Search, ShoppingBag, X, Copy, Check, Loader2, ExternalLink } from "lucide-react";
import { Link, useLocation } from "wouter";
import { formatPrice, logoMark } from "@/lib/catalog";
import { useStorefront } from "@/contexts/StorefrontContext";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useCajupay } from "@/hooks/useCajupay";

type SiteHeaderProps = {
  variant?: "home" | "detail";
};

type Panel = "favorites" | "bag" | null;

export default function SiteHeader({ variant = "home" }: SiteHeaderProps) {
  const [, setLocation] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [panel, setPanel] = useState<Panel>(null);
  const [copied, setCopied] = useState(false);

  const { searchQuery, setSearchQuery, favoritePerfumes, toggleFavorite, bagItems, bagCount, bagTotal, removeFromBag } = useStorefront();
  const { generateLink, reset, loading, paymentUrl, error } = useCajupay();

  const isDetail = variant === "detail";

  const submitSearch = () => {
    if (!isDetail) {
      document.getElementById("catalogo")?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    setLocation("/#catalogo");
    window.setTimeout(() => document.getElementById("catalogo")?.scrollIntoView({ behavior: "smooth" }), 0);
  };

  // Converte o total (que está em reais como float) para centavos
  const totalCents = Math.round(bagTotal * 100);

  const handleGenerateLink = () => {
    generateLink(bagItems, totalCents);
  };

  const handleCopy = async () => {
    if (!paymentUrl) return;
    await navigator.clipboard.writeText(paymentUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Quando fechar a sacola, reseta o estado do link gerado
  const handleSheetClose = (open: boolean) => {
    if (!open) {
      setPanel(null);
      reset();
      setCopied(false);
    }
  };

  return <>
    {!isDetail && <div className="announcement-bar"><span>Curadoria de perfumaria fina</span><span className="announcement-dot" /><span>Decants a partir de 2 ml</span></div>}
    <header className={isDetail ? "detail-header" : "site-header"}>
      <Link href="/" className="brand-lockup" aria-label="SIAROM — início"><img src={logoMark} alt="" className="brand-mark" /><span className="brand-wordmark">SIAROM</span><span className="brand-subtitle">Raffinement parfum</span></Link>
      <nav className={isDetail ? "detail-nav" : `main-nav ${mobileOpen ? "is-open" : ""}`} aria-label="Navegação principal">
        <a href="/#catalogo" onClick={() => setMobileOpen(false)}>Catálogo</a><a href="/#generos" onClick={() => setMobileOpen(false)}>Gêneros</a><a href="/#sobre" onClick={() => setMobileOpen(false)}>A SIAROM</a>
      </nav>
      <div className={isDetail ? "detail-actions" : "header-actions"}>
        <label className="header-search"><Search size={16} strokeWidth={1.6} /><input aria-label="Buscar perfume" placeholder="Buscar" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") submitSearch(); }} /></label>
        <button className="icon-button" aria-label={`Favoritos${favoritePerfumes.length ? ` com ${favoritePerfumes.length} itens` : ""}`} onClick={() => setPanel("favorites")}><Heart size={18} strokeWidth={1.6} fill={favoritePerfumes.length ? "currentColor" : "none"} /></button>
        <button className="icon-button bag-button" aria-label={`Sacola com ${bagCount} itens`} onClick={() => setPanel("bag")}><ShoppingBag size={18} strokeWidth={1.6} />{bagCount > 0 && <span>{bagCount}</span>}</button>
        {!isDetail && <button className="mobile-menu" aria-label={mobileOpen ? "Fechar menu" : "Abrir menu"} onClick={() => setMobileOpen((value) => !value)}>{mobileOpen ? <X size={21} /> : <Menu size={21} />}</button>}
      </div>
    </header>

    <Sheet open={panel !== null} onOpenChange={handleSheetClose}>
      <SheetContent className="storefront-sheet" side="right">
        <SheetHeader className="storefront-sheet-header">
          <SheetTitle>{panel === "favorites" ? "Seus favoritos" : "Sua sacola"}</SheetTitle>
          <SheetDescription>{panel === "favorites" ? "Fragrâncias guardadas para conhecer com calma." : "Suas frações selecionadas para revisar."}</SheetDescription>
        </SheetHeader>

        {panel === "favorites" ? (
          <div className="storefront-sheet-list">
            {favoritePerfumes.length === 0
              ? <div className="storefront-sheet-empty"><Heart size={22} strokeWidth={1.4} /><strong>Nenhum favorito ainda.</strong><span>Toque no coração de uma fragrância para guardá-la aqui.</span><button className="sheet-text-link" onClick={() => { setPanel(null); setLocation("/#catalogo"); }}>Explorar o catálogo <ArrowUpRight size={15} /></button></div>
              : favoritePerfumes.map((perfume) => (
                <div className="storefront-sheet-item" key={perfume.slug}>
                  <Link href={`/perfumes/${perfume.slug}`} onClick={() => setPanel(null)}>
                    <div className={`storefront-sheet-thumb accent-${perfume.accent}`}>{perfume.image ? <img src={perfume.image} alt="" /> : <span>SIAROM</span>}</div>
                    <div><strong>{perfume.name}</strong><span>{perfume.brand}</span><small>{formatPrice(perfume.volumeOptions[0]?.price || 0)}</small></div>
                  </Link>
                  <button className="sheet-remove" aria-label={`Remover ${perfume.name} dos favoritos`} onClick={() => toggleFavorite(perfume.slug)}><X size={15} /></button>
                </div>
              ))
            }
          </div>
        ) : (
          <div className="storefront-sheet-list">
            {bagItems.length === 0
              ? <div className="storefront-sheet-empty"><ShoppingBag size={22} strokeWidth={1.4} /><strong>Sua sacola está vazia.</strong><span>Adicione uma fração na ficha de qualquer perfume para revisar sua seleção aqui.</span><button className="sheet-text-link" onClick={() => { setPanel(null); setLocation("/#catalogo"); }}>Ver fragrâncias <ArrowUpRight size={15} /></button></div>
              : bagItems.map((item) => (
                <div className="storefront-sheet-item" key={`${item.slug}-${item.volumeMl}-${item.isApc ? "apc" : "volume"}`}>
                  <Link href={`/perfumes/${item.slug}`} onClick={() => setPanel(null)}>
                    <div className="storefront-sheet-thumb bag-thumb"><span>{item.volumeMl}<small>ml</small></span></div>
                    <div><strong>{item.name}</strong><span>{item.isApc ? `APC + ${item.volumeMl} ml` : `${item.volumeMl} ml`} · {item.quantity} un.</span><small>{formatPrice(item.unitPrice * item.quantity)}</small></div>
                  </Link>
                  <button className="sheet-remove" aria-label={`Remover ${item.name} da sacola`} onClick={() => removeFromBag(item.slug, item.volumeMl, item.isApc)}><X size={15} /></button>
                </div>
              ))
            }
          </div>
        )}

        {/* ── Footer da sacola com integração Cajupay ── */}
        {panel === "bag" && bagItems.length > 0 && (
          <SheetFooter className="storefront-sheet-footer">
            <div className="sheet-total">
              <span>Total estimado</span>
              <strong>{formatPrice(bagTotal)}</strong>
            </div>

            {/* Erro da API */}
            {error && (
              <p style={{ fontSize: "0.75rem", color: "#b91c1c", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", padding: "8px 12px", margin: "0" }}>
                {error}
              </p>
            )}

            {/* Link gerado — caixa de cópia */}
            {paymentUrl && !error && (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <p style={{ fontSize: "0.75rem", color: "#374151", margin: 0 }}>
                  Link gerado! Copie e envie ao cliente:
                </p>
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <input
                    readOnly
                    value={paymentUrl}
                    style={{ flex: 1, fontSize: "0.7rem", padding: "6px 10px", borderRadius: "8px", border: "1px solid #e5e7eb", background: "#f9fafb", color: "#374151", outline: "none" }}
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                  />
                  <button
                    onClick={handleCopy}
                    aria-label="Copiar link"
                    style={{ padding: "6px 10px", borderRadius: "8px", border: "1px solid #e5e7eb", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px", fontSize: "0.75rem", color: copied ? "#16a34a" : "#374151" }}
                  >
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                    {copied ? "Copiado" : "Copiar"}
                  </button>
                </div>
                <a
                  href={paymentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: "0.7rem", color: "#6b7280", display: "flex", alignItems: "center", gap: "4px" }}
                >
                  <ExternalLink size={12} /> Abrir link para visualizar
                </a>
                {/* Botão para gerar novo link */}
                <button
                  onClick={() => { reset(); }}
                  style={{ fontSize: "0.7rem", color: "#9ca3af", background: "none", border: "none", cursor: "pointer", textAlign: "left", padding: 0 }}
                >
                  Gerar novo link para este pedido
                </button>
              </div>
            )}

            {/* Botão principal — gerar link */}
            {!paymentUrl && (
              <button
                className="primary-button"
                onClick={handleGenerateLink}
                disabled={loading}
                style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", opacity: loading ? 0.7 : 1, cursor: loading ? "not-allowed" : "pointer" }}
              >
                {loading
                  ? <><Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Gerando link…</>
                  : <>Gerar link de pagamento <ArrowUpRight size={16} /></>
                }
              </button>
            )}
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  </>;
}
