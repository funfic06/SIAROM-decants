// Atelier Noir: ficha editorial do perfume, com seleção de volume e registro de pedido sem fricção.
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useRoute } from "wouter";
import { ArrowLeft, ArrowUpRight, Check, Heart, Plus, ShoppingBag } from "lucide-react";
import { formatPrice, type Perfume } from "@/lib/catalog";
import SiteHeader from "@/components/SiteHeader";
import { useStorefront } from "@/contexts/StorefrontContext";
import { createCustomerOrder } from "@/lib/firebase";
import { useCatalog } from "@/contexts/CatalogContext";

function OrderModal({ perfume, selectedMl, selectedIsApc, onClose }: { perfume: Perfume; selectedMl: number; selectedIsApc: boolean; onClose: () => void }) {
  const volume = perfume.volumeOptions.find((option) => option.ml === selectedMl) || perfume.volumeOptions[0];
  const apc = selectedIsApc ? perfume.apc : undefined;
  const selected = apc || volume;
  const selectedLabel = apc ? `APC + ${apc.ml} ml` : `${volume.ml} ml`;
  const [submitted, setSubmitted] = useState(false);
  const [paymentLabel, setPaymentLabel] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const submitOrder = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSubmitting(true); setSubmitError("");
    try {
      const payment = String(form.get("payment") || "");
      if (!payment) { setSubmitError("Selecione Pix ou cartão de crédito para registrar o pedido."); setSubmitting(false); return; }
      await createCustomerOrder({ perfumeId: perfume.id || perfume.slug, perfumeName: perfume.name, brand: perfume.brand, volumeMl: selected.ml, quantity: 1, unitPrice: selected.price, customerName: String(form.get("name") || ""), contact: String(form.get("contact") || ""), payment, status: "novo", createdAt: new Date().toISOString(), source: "catalogo", isApc: selectedIsApc });
      setPaymentLabel(payment === "pix" ? "Pix" : "Cartão de crédito");
      setSubmitted(true);
    } catch (error) {
      console.error("Erro ao registrar pedido no Firebase:", error);
      const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
      const message = error instanceof Error ? error.message : "";
      setSubmitError(message.includes("apc-limit-reached") ? "O APC deste perfume já foi reservado. Escolha outro volume disponível." : message.includes("apc-not-configured") ? "O APC está sendo preparado pela equipe. Tente novamente em instantes." : code.includes("permission-denied") ? "O Firebase bloqueou este pedido. Atualize o catálogo para a versão mais recente; se o aviso continuar, confirme as regras do Firestore." : code ? `Não foi possível registrar o pedido (${code}). Tente novamente.` : "Não foi possível registrar o pedido. Tente novamente.");
    } finally { setSubmitting(false); }
  };
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><div className="order-modal" role="dialog" aria-modal="true" aria-labelledby="order-title">
    {submitted ? <div className="order-success"><div className="success-seal"><Check size={23} strokeWidth={1.5} /></div><div className="eyebrow"><span className="eyebrow-rule" /> pedido registrado</div><h2>Seu rastro<br /><em>começa aqui.</em></h2><p>Recebemos seu interesse em <strong>{perfume.name}</strong>, {selectedLabel}. Preferência de pagamento: <strong>{paymentLabel}</strong>. Em breve entraremos em contato para confirmar os próximos passos.</p><button className="primary-button" onClick={onClose}>Voltar à fragrância <ArrowUpRight size={16} /></button></div> : <><div className="modal-header"><div><div className="eyebrow"><span className="eyebrow-rule" /> registre seu pedido</div><h2 id="order-title">{perfume.name}</h2><p>{selectedLabel} · {formatPrice(selected.price)}</p></div><button className="modal-close" onClick={onClose} aria-label="Fechar"><Plus size={22} /></button></div><form onSubmit={submitOrder}><div className="order-summary"><div><span>Pedido selecionado</span><strong>{selectedLabel}</strong></div><strong className="summary-total">{formatPrice(selected.price)}</strong></div><label className="form-field"><span>Seu nome</span><input required name="name" placeholder="Como podemos chamar você?" /></label><label className="form-field"><span>WhatsApp ou e-mail</span><input required name="contact" placeholder="Para confirmarmos seu pedido" /></label><fieldset className="payment-field"><legend>Forma de pagamento</legend><div className="payment-options"><label><input type="radio" name="payment" value="pix" required /><span>Pix</span></label><label><input type="radio" name="payment" value="cartao_credito" /><span>Cartão de crédito</span></label></div></fieldset>{submitError && <p className="form-error">{submitError}</p>}<button className="primary-button full-button" type="submit" disabled={submitting}>{submitting ? "Registrando…" : "Registrar interesse"} {!submitting && <ArrowUpRight size={16} />}</button><p className="form-footnote">Sem cobrança agora. O pedido é confirmado após nosso contato.</p></form></>}
  </div></div>;
}

export default function ProductDetail() {
  const [, params] = useRoute<{ slug: string }>("/perfumes/:slug");
  const [, setLocation] = useLocation();
  const { perfumes: livePerfumes, isLoading, syncError } = useCatalog();
  const perfume = livePerfumes.find((item) => item.slug === params?.slug);
  const [selectionKey, setSelectionKey] = useState("volume-2");
  const [orderOpen, setOrderOpen] = useState(false);
  const { favorites, toggleFavorite, addToBag } = useStorefront();
  const selectedIsApc = selectionKey === "apc";
  const selectedMl = selectedIsApc ? perfume?.apc?.ml || 40 : Number(selectionKey.replace("volume-", "")) || 2;
  const selectedOption = useMemo(() => selectedIsApc ? perfume?.apc : perfume?.volumeOptions.find((option) => option.ml === selectedMl) || perfume?.volumeOptions[0], [perfume, selectedIsApc, selectedMl]);
  const favorite = Boolean(perfume && favorites.includes(perfume.slug));
  const addSelectedToBag = () => {
    if (!perfume || !selectedOption) return;
    addToBag({ slug: perfume.slug, name: perfume.name, brand: perfume.brand, volumeMl: selectedMl, unitPrice: selectedOption.price, isApc: selectedIsApc });
  };
  useEffect(() => {
    if (!perfume) return;
    const fallback = perfume.volumeOptions[0] ? `volume-${perfume.volumeOptions[0].ml}` : perfume.apc ? "apc" : "volume-2";
    if (selectedIsApc && !perfume.apc?.available) setSelectionKey(fallback);
    else if (!selectedIsApc && !perfume.volumeOptions.some((option) => option.ml === selectedMl)) setSelectionKey(fallback);
  }, [perfume, selectedIsApc, selectedMl]);
  const accords = (perfume?.accords?.filter(Boolean).slice(0, 5) || perfume?.notes.slice(0, 5) || []);
  if (isLoading) return <div className="not-found-page"><span className="loading-orbit" /><p>Carregando a ficha SIAROM…</p></div>;
  if (!perfume || !selectedOption) return <div className="not-found-page"><Link href="/">Voltar para o catálogo</Link><h1>Fragrância não encontrada.</h1><p>{syncError ? "Não foi possível sincronizar o catálogo." : "Esta fragrância pode estar indisponível."}</p></div>;
    return <div className="site-shell detail-page"><SiteHeader variant="detail" /><main className="detail-main">
<div className="detail-breadcrumb"><button onClick={() => setLocation("/")}><ArrowLeft size={15} /> Voltar ao catálogo</button><span>/</span><span>{perfume.family}</span><span>/</span><span>{perfume.name}</span></div><section className="detail-grid"><div className={`detail-visual accent-${perfume.accent}`}>{perfume.image ? <img src={perfume.image} alt={`${perfume.name} — ${perfume.brand}`} /> : <span className="product-image-fallback">SIAROM</span>}<div className="detail-image-stamp"><span>SIAROM</span><span>FRACTION Nº 0{perfume.volumeOptions[0].ml}</span></div></div><div className="detail-content"><div className="eyebrow"><span className="eyebrow-rule" /> fragrância SIAROM</div><p className="detail-brand">{perfume.brand}</p><h1>{perfume.name}</h1><p className="detail-lead">{perfume.description}</p><div className="note-list">{accords.map((accord) => <span key={accord}>{accord}</span>)}</div><div className="detail-facts"><div><span>Disponibilidade</span><strong>{perfume.stock} ml</strong></div></div><div className="volume-section"><div className="volume-heading"><span>Escolha sua fração</span><small>selecione uma opção</small></div><div className="volume-options">{perfume.volumeOptions.map((option) => <button className={!selectedIsApc && selectedMl === option.ml ? "is-selected" : ""} key={option.ml} onClick={() => setSelectionKey(`volume-${option.ml}`)}><strong>{option.ml} ml</strong><span>{formatPrice(option.price)}</span></button>)}{perfume.apc && <button className={`apc-option ${selectedIsApc ? "is-selected" : ""}`} disabled={!perfume.apc.available} onClick={() => setSelectionKey("apc")}><strong>APC + {perfume.apc.ml} ml</strong><span>{perfume.apc.available ? formatPrice(perfume.apc.price) : "Limite atingido"}</span><small>limite {perfume.apc.limit} por frasco</small></button>}</div></div><div className="buy-row"><button className="secondary-button" onClick={addSelectedToBag}>Adicionar à sacola <ShoppingBag size={16} /></button><button className="primary-button" onClick={() => setOrderOpen(true)} disabled={selectedIsApc && !perfume.apc?.available}>Registrar pedido <ArrowUpRight size={17} /></button><button className={`save-button ${favorite ? "is-favorite" : ""}`} onClick={() => toggleFavorite(perfume.slug)} aria-label={favorite ? "Remover dos favoritos" : "Salvar nos favoritos"}><Heart size={18} fill={favorite ? "currentColor" : "none"} /></button></div>
<p className="selected-hint"><span /> {selectedIsApc ? `APC + ${selectedMl} ml · ${formatPrice(selectedOption.price)} · limite ${perfume.apc?.limit || 1} por frasco` : `${selectedMl} ml selecionados · ${formatPrice(selectedOption.price)} · recave incluso`}</p></div></section><section className="detail-notes"><details open><summary>Sobre esta fragrância <Plus size={17} /></summary><p>{perfume.shortDescription} {perfume.description}</p></details><details><summary>Como funciona o pedido <Plus size={17} /></summary><p>Você escolhe a fração, registra seu interesse e recebe uma confirmação pelo contato informado. Não há cobrança nesta etapa.</p></details><details><summary>Entrega e conservação <Plus size={17} /></summary><p>{perfume.deliveryText || "Os frascos são enviados com identificação da fragrância e do volume. Embalados em caixas com proteção para manter os frascos intactos, visando preservar a experiência completa da fragrância."}</p></details></section></main>{orderOpen && <OrderModal perfume={perfume} selectedMl={selectedMl} selectedIsApc={selectedIsApc} onClose={() => setOrderOpen(false)} />}</div>;
}
