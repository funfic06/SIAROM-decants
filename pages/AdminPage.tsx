// Atelier Noir — sala de controle SIAROM: fichas sóbrias, filetes finos e gestão direta da curadoria.
import { FormEvent, useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowUpRight, Check, Copy, Edit3, Eye, EyeOff, LogOut, MessageCircle, Package, Plus, RefreshCw, Search, ShieldCheck, Trash2, X } from "lucide-react";
import { Link } from "wouter";
import { useCatalog } from "@/contexts/CatalogContext";
import { createCustomerOrder, deleteCustomerOrders, getAdminProfile, signInAdmin, signOutAdmin, subscribeAuth, subscribeOrders, syncApcStatus, syncStockStatus, updateCustomerOrderStatus, type CustomerOrder } from "@/lib/firebase";
import { buildWhatsappMessage, logoMark, normalizeGender } from "@/lib/catalog";
import type { User } from "firebase/auth";

type PerfumeForm = Record<string, unknown> & {
  id: string; name: string; brand: string; type: string; pricePerMl: string; recavePrice: string; totalMl: string;
  imageUrl: string; obs: string; shortDescription: string; description: string; accords: string[]; deliveryText: string;
  referenceUrl: string;
  available: boolean; hasApc: boolean; apcMl: number; apcFrasco: string; apcLimit: string;
  prices: Record<string, string | null>; orders: unknown[];
};

const volumes = [3, 7, 10, 15, 20, 30];
const statuses: CustomerOrder["status"][] = ["novo", "confirmado", "separado", "entregue", "cancelado"];
const genders = ["Compartilhável", "Masculino", "Feminino"];
const defaultDeliveryText = "Os frascos são enviados com identificação da fragrância e do volume. Embalados em caixas com proteção para manter os frascos intactos, visando preservar a experiência completa da fragrância.";

const emptyForm = (): PerfumeForm => ({
  id: "", name: "", brand: "", type: "", pricePerMl: "", recavePrice: "8,00", totalMl: "", imageUrl: "", obs: "",
  shortDescription: "", description: "", accords: ["", "", "", "", ""], deliveryText: defaultDeliveryText,
  referenceUrl: "",
  available: true, hasApc: false, apcMl: 40, apcFrasco: "10,00", apcLimit: "1",
  prices: Object.fromEntries(volumes.map((ml) => [ml, null])), orders: [],
});

function text(value: unknown) { return typeof value === "string" ? value : value == null ? "" : String(value); }
function money(value: number) { return value > 0 ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value) : "Sob consulta"; }
function statusLabel(value: string) { return ({ novo: "Novo", confirmado: "Confirmado", separado: "Separado", entregue: "Entregue", cancelado: "Cancelado" } as Record<string, string>)[value] || value; }
function paymentLabel(value: string) { return ({ pix: "Pix", cartao_credito: "Cartão de crédito" } as Record<string, string>)[value] || (value ? value : "Pagamento a definir"); }

function formFromRaw(raw: Record<string, unknown>): PerfumeForm {
  return {
    ...emptyForm(), ...raw,
    id: text(raw.id), name: text(raw.name), brand: text(raw.brand), type: normalizeGender(raw.gender || raw.type || raw.family),
    pricePerMl: text(raw.pricePerMl), recavePrice: text(raw.recavePrice || "8,00"), totalMl: text(raw.totalMl), imageUrl: text(raw.imageUrl), obs: text(raw.obs),
    shortDescription: text(raw.shortDescription), description: text(raw.description),
    accords: Array.isArray(raw.accords) ? raw.accords.map(text).slice(0, 5).concat(["", "", "", "", ""]).slice(0, 5) : emptyForm().accords,
    deliveryText: text(raw.deliveryText || defaultDeliveryText), referenceUrl: text(raw.referenceUrl),
    available: raw.available !== false, hasApc: raw.hasApc === true,
    apcMl: Number(raw.apcMl) || 40, apcFrasco: text(raw.apcFrasco || "10,00"), apcLimit: text(raw.apcLimit || "1"),
    prices: { ...emptyForm().prices, ...((raw.prices || {}) as Record<string, string | null>) }, orders: Array.isArray(raw.orders) ? raw.orders : [],
  };
}

function authErrorMessage(error: unknown) {
  const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
  const messages: Record<string, string> = {
    "auth/invalid-credential": "E-mail ou senha incorretos. Use a senha criada para este usuário no Firebase Authentication.",
    "auth/user-not-found": "Este e-mail ainda não foi criado em Authentication → Users no projeto siarom-decantshop.",
    "auth/wrong-password": "A senha não confere com a senha cadastrada para este usuário.",
    "auth/operation-not-allowed": "O provedor Email/Password está desativado. Ative-o em Authentication → Sign-in method.",
    "auth/too-many-requests": "Muitas tentativas foram feitas. Aguarde alguns minutos e tente novamente.",
    "auth/network-request-failed": "A conexão com o Firebase falhou. Verifique a internet e tente novamente.",
    "auth/invalid-api-key": "A chave do Firebase não foi aceita. Confirme se o site está usando o projeto siarom-decantshop.",
  };
  return messages[code] || `Não foi possível entrar${code ? ` (${code})` : ""}. Confira o cadastro no Firebase Authentication.`;
}

function AdminLogin({ onSignedIn }: { onSignedIn: (user: User) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError("");
    try { const credential = await signInAdmin(email.trim(), password); onSignedIn(credential.user); }
    catch (nextError) { console.error("Erro no login administrativo:", nextError); setError(authErrorMessage(nextError)); }
    finally { setBusy(false); }
  };
  return <div className="admin-login"><div className="admin-login-card"><div className="admin-seal"><img src={logoMark} alt="" /></div><div className="admin-eyebrow"><span /> área reservada</div><h1>Arquivo<br /><em>SIAROM.</em></h1><p>Entre para administrar fragrâncias, disponibilidade e pedidos da curadoria.</p><form onSubmit={submit}><label><span>E-mail administrativo</span><input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="seu@email.com" /></label><label><span>Senha criada no Firebase</span><input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Sua senha" /></label>{error && <div className="admin-error">{error}</div>}<button className="admin-primary-button" disabled={busy}>{busy ? "Verificando…" : "Entrar no arquivo"}<ArrowUpRight size={16} /></button></form><Link href="/" className="admin-back-link"><ArrowLeft size={14} /> Voltar ao catálogo</Link></div></div>;
}

function AdminHeader({ user, onLogout }: { user: User; onLogout: () => void }) {
  return <header className="admin-header"><Link href="/" className="admin-brand"><img src={logoMark} alt="" /><span><strong>SIAROM</strong><small>Admin atelier</small></span></Link><div className="admin-user"><span><ShieldCheck size={14} /> {user.email}</span><button onClick={onLogout}><LogOut size={15} /> Sair</button></div></header>;
}

function PerfumeEditor({ initial, onCancel, onSave, saving }: { initial: PerfumeForm; onCancel: () => void; onSave: (data: PerfumeForm) => Promise<void>; saving: boolean }) {
  const [form, setForm] = useState(initial);
  const set = (key: keyof PerfumeForm, value: unknown) => setForm((current) => ({ ...current, [key]: value }));
  const setPrice = (ml: number, value: string) => setForm((current) => ({ ...current, prices: { ...current.prices, [ml]: value || null } }));
  const setAccord = (index: number, value: string) => setForm((current) => ({ ...current, accords: current.accords.map((accord, accordIndex) => accordIndex === index ? value : accord) }));
  return <section className="admin-editor"><div className="admin-editor-heading"><div><div className="admin-eyebrow"><span /> {form.id ? "editar ficha" : "nova ficha"}</div><h2>{form.id ? form.name || "Editar perfume" : "Adicionar perfume"}</h2></div><button className="admin-icon-button" onClick={onCancel} aria-label="Fechar editor"><X size={18} /></button></div><div className="admin-form-grid"><label><span>Nome do perfume *</span><input value={form.name} onChange={(event) => set("name", event.target.value)} placeholder="Ex.: Oud Satin Mood" /></label><label><span>Marca *</span><input value={form.brand} onChange={(event) => set("brand", event.target.value)} placeholder="Ex.: Maison Francis Kurkdjian" /></label><label><span>Gênero *</span><select value={form.type} required onChange={(event) => set("type", event.target.value)}><option value="" disabled>Selecione o gênero</option>{genders.map((gender) => <option key={gender} value={gender}>{gender}</option>)}</select></label><label><span>Preço por ml (R$)</span><input value={form.pricePerMl} onChange={(event) => set("pricePerMl", event.target.value)} placeholder="Ex.: 5,50" /></label><label><span>Taxa de recave (R$)</span><input value={form.recavePrice} onChange={(event) => set("recavePrice", event.target.value)} placeholder="8,00" /></label><label><span>Total disponível (ml)</span><input type="number" min="0" value={form.totalMl} onChange={(event) => set("totalMl", event.target.value)} placeholder="Ex.: 100" /></label><label className="admin-form-wide"><span>URL da imagem</span><input type="url" value={form.imageUrl} onChange={(event) => set("imageUrl", event.target.value)} placeholder="https://…" /></label><label className="admin-form-wide"><span>Observação</span><textarea value={form.obs} onChange={(event) => set("obs", event.target.value)} placeholder="Lote, conservação ou observação para a equipe." /></label></div><div className="admin-form-section admin-copy-section"><div><span className="admin-form-kicker">Texto da ficha</span><p>Personalize o resumo e a descrição que aparecerão na página do perfume.</p></div><label className="admin-form-wide"><span>Resumo curto</span><input value={form.shortDescription} onChange={(event) => set("shortDescription", event.target.value)} placeholder="Ex.: Um floral luminoso e confortável." /></label><label className="admin-form-wide"><span>Descrição principal</span><textarea value={form.description} onChange={(event) => set("description", event.target.value)} placeholder="Texto completo da fragrância para a página individual." /></label><label className="admin-form-wide"><span>Entrega e conservação</span><textarea value={form.deliveryText} onChange={(event) => set("deliveryText", event.target.value)} /></label><label className="admin-form-wide"><span>Link de referência (opcional)</span><input type="url" value={form.referenceUrl} onChange={(event) => set("referenceUrl", event.target.value)} placeholder="Ex.: https://www.fragrantica.com.br/perfume/…" /></label></div><div className="admin-form-section admin-accord-section"><div><span className="admin-form-kicker">Cinco principais acordes</span><p>Preencha até cinco acordes para exibir na página pública.</p></div><div className="admin-accord-grid">{form.accords.map((accord, index) => <label key={index}><span>Acorde {index + 1}</span><input value={accord} onChange={(event) => setAccord(index, event.target.value)} placeholder={`Ex.: ${["Amadeirado", "Âmbar", "Floral", "Cítrico", "Almiscarado"][index]}`} /></label>)}</div></div><div className="admin-form-section"><div><span className="admin-form-kicker">Valores por volume</span><p>Deixe vazio para calcular pelo preço por ml.</p></div><div className="admin-price-grid">{volumes.map((ml) => <label key={ml}><span>{ml} ml</span><input value={form.prices[ml] || ""} onChange={(event) => setPrice(ml, event.target.value)} placeholder={form.pricePerMl ? money(Number.parseFloat(form.pricePerMl.replace(",", ".")) * ml) : "—"} /></label>)}</div></div><div className="admin-form-section apc-editor-section"><div><span className="admin-form-kicker">Opção APC</span><p>Inclui o frasco e o volume configurado. O limite padrão é de uma unidade por frasco.</p></div><label className="admin-switch apc-toggle"><input type="checkbox" checked={form.hasApc} onChange={(event) => set("hasApc", event.target.checked)} /><span><strong>Oferecer APC + {form.apcMl || 40} ml</strong><small>O cliente verá esta opção junto aos volumes do perfume.</small></span></label>{form.hasApc && <div className="admin-apc-fields"><label><span>Volume APC (ml)</span><input type="number" min="1" value={form.apcMl} onChange={(event) => set("apcMl", Number(event.target.value) || 40)} /></label><label><span>Valor do frasco (R$)</span><input value={form.apcFrasco} onChange={(event) => set("apcFrasco", event.target.value)} placeholder="10,00" /></label><label><span>Limite por frasco</span><input type="number" min="1" value={form.apcLimit} onChange={(event) => set("apcLimit", event.target.value || "1")} /></label></div>}</div><label className="admin-switch"><input type="checkbox" checked={form.available} onChange={(event) => set("available", event.target.checked)} /><span><strong>Publicar no catálogo</strong><small>Quando desativado, o perfume fica invisível para clientes, mas permanece salvo.</small></span></label><div className="admin-editor-actions"><button className="admin-secondary-button" onClick={onCancel}>Cancelar</button><button className="admin-primary-button" disabled={saving || !form.name.trim() || !form.brand.trim() || !form.type} onClick={() => onSave(form)}>{saving ? "Salvando…" : "Salvar ficha"}<Check size={16} /></button></div></section>;
}

export default function AdminPage() {
  const { rawPerfumes, saveRawPerfumes, isLive, syncError } = useCatalog();
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [authMessage, setAuthMessage] = useState("");
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [ordersReady, setOrdersReady] = useState(false);
  const [ordersError, setOrdersError] = useState("");
  const [tab, setTab] = useState<"perfumes" | "pedidos">("perfumes");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [editing, setEditing] = useState<PerfumeForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [recalibrating, setRecalibrating] = useState(false);
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [messagePerfume, setMessagePerfume] = useState<Record<string, unknown> | null>(null);

  const whatsappMessage = useMemo(() => (messagePerfume ? buildWhatsappMessage(messagePerfume) : ""), [messagePerfume]);

  const copyWhatsappMessage = async () => {
    try {
      await navigator.clipboard.writeText(whatsappMessage);
      setNotice("Mensagem copiada para a área de transferência.");
    } catch {
      setNotice("Não foi possível copiar automaticamente. Selecione o texto e copie manualmente.");
    }
  };

  useEffect(() => subscribeAuth((next) => {
    setUser(next); setAuthReady(true);
    if (!next) { setAuthorized(false); setAuthMessage(""); setOrdersReady(false); return; }
    void getAdminProfile(next).then((allowed) => { setAuthorized(allowed); setAuthMessage(allowed ? "" : "Seu login existe, mas este usuário ainda não está autorizado como administrador."); });
  }), []);

  useEffect(() => {
    if (!authorized) { setOrdersReady(false); setOrdersError(""); return; }
    setOrdersError("");
    return subscribeOrders((next) => { setOrders(next); setOrdersReady(true); }, (error) => {
      console.error("Erro ao carregar pedidos:", error);
      const code = "code" in error && typeof error.code === "string" ? ` (${error.code})` : "";
      setOrdersReady(false);
      setOrdersError(`Não foi possível ler a coleção de pedidos${code}. Verifique as regras do Firestore e o documento admins/{UID}.`);
    });
  }, [authorized]);

  const legacyOrders = useMemo(() => rawPerfumes.flatMap((raw) => {
    const perfumeName = text(raw.name); const brand = text(raw.brand); const perfumeId = text(raw.id) || perfumeName;
    return (Array.isArray(raw.orders) ? raw.orders : []).map((order) => {
      const item = order as Record<string, unknown>;
      return { id: `legacy-${perfumeId}-${text(item.id)}`, perfumeId, perfumeName, brand, volumeMl: Number(item.ml) || 0, quantity: 1, unitPrice: 0, customerName: text(item.name), contact: "", payment: text(item.pagamento), status: item.entregue ? "entregue" as const : "novo" as const, createdAt: "", source: "catalogo" as const, isApc: Boolean(item.isApc), legacy: true };
    });
  }), [rawPerfumes]);

  useEffect(() => {
    if (!authorized || !ordersReady) return;
    const reservations = new Map<string, { perfumeId: string; reserved: boolean; orderId: string; volumeMl: number }>();
    [...orders, ...legacyOrders].filter((order) => order.isApc && order.status !== "cancelado").forEach((order) => reservations.set(order.perfumeId, { perfumeId: order.perfumeId, reserved: true, orderId: order.id || `apc-${order.perfumeId}`, volumeMl: order.volumeMl }));
    void syncApcStatus(Array.from(reservations.values())).catch(() => setOrdersError("Não foi possível atualizar a disponibilidade APC."));
  }, [authorized, ordersReady, orders, legacyOrders]);

  useEffect(() => {
    if (!authorized || !ordersReady) return;
    const reservedByPerfume = new Map<string, number>();
    [...orders, ...legacyOrders].filter((order) => order.status !== "cancelado").forEach((order) => {
      reservedByPerfume.set(order.perfumeId, (reservedByPerfume.get(order.perfumeId) || 0) + (Number(order.volumeMl) || 0) * (Number(order.quantity) || 1));
    });
    const entries = Array.from(reservedByPerfume.entries()).map(([perfumeId, reservedMl]) => ({ perfumeId, reservedMl }));
    void syncStockStatus(entries).catch(() => setOrdersError("Não foi possível atualizar a disponibilidade em ml."));
  }, [authorized, ordersReady, orders, legacyOrders]);

  const orderTotals = useMemo(() => {
    const totals = new Map<string, number>();
    [...orders, ...legacyOrders].forEach((order) => totals.set(order.perfumeId, (totals.get(order.perfumeId) || 0) + 1));
    return totals;
  }, [orders, legacyOrders]);

  const visiblePerfumes = useMemo(() => rawPerfumes.filter((raw) => {
    const q = query.toLowerCase();
    return !q || `${text(raw.name)} ${text(raw.brand)} ${normalizeGender(raw.gender || raw.type || raw.family)}`.toLowerCase().includes(q);
  }), [rawPerfumes, query]);

  const visibleOrders = useMemo(() => [...orders.map((order) => ({ ...order, legacy: false })), ...legacyOrders].filter((order) => {
    const matchesSearch = !query || `${order.customerName} ${order.perfumeName} ${order.contact}`.toLowerCase().includes(query.toLowerCase());
    return matchesSearch && (statusFilter === "todos" || order.status === statusFilter);
  }), [orders, legacyOrders, query, statusFilter]);

  const savePerfume = async (data: PerfumeForm) => {
    setSaving(true);
    try {
      const normalizedData = { ...data, type: normalizeGender(data.type), gender: normalizeGender(data.type) };
      const next = data.id ? rawPerfumes.map((item) => text(item.id) === data.id ? { ...item, ...normalizedData } : item) : [{ ...normalizedData, id: `${data.name.toLowerCase().replace(/[^a-z0-9]+/gi, "-")}-${Date.now()}`, orders: [] }, ...rawPerfumes];
      await saveRawPerfumes(next); setEditing(null); setNotice("Ficha sincronizada com o catálogo.");
    } catch { setNotice("Não foi possível salvar. Verifique as regras do Firestore."); }
    finally { setSaving(false); }
  };

  const removePerfume = async (id: string) => {
    if (!window.confirm("Remover este perfume do catálogo? Os pedidos associados serão preservados.")) return;
    try { await saveRawPerfumes(rawPerfumes.filter((item) => text(item.id) !== id)); setNotice("Perfume removido do catálogo."); }
    catch { setNotice("Não foi possível remover o perfume."); }
  };

  const toggleAvailability = async (raw: Record<string, unknown>) => {
    try { await saveRawPerfumes(rawPerfumes.map((item) => text(item.id) === text(raw.id) ? { ...item, available: item.available === false } : item)); }
    catch { setNotice("Não foi possível atualizar a disponibilidade."); }
  };

  const updateStatus = async (order: CustomerOrder & { legacy?: boolean }, status: CustomerOrder["status"]) => {
    if (order.legacy || !order.id) return;
    try { await updateCustomerOrderStatus(order.id, status); }
    catch (error) { setOrdersError(error instanceof Error && error.message.includes("apc-limit-reached") ? "Não há saldo APC para reativar este pedido." : "Não foi possível atualizar o status do pedido."); }
  };

  const recalibrateAvailability = async () => {
    setRecalibrating(true); setOrdersError("");
    try {
      const allOrders = [...orders, ...legacyOrders];
      const reservations = new Map<string, { perfumeId: string; reserved: boolean; orderId: string; volumeMl: number }>();
      const reservedByPerfume = new Map<string, number>();
      allOrders.filter((order) => order.status !== "cancelado").forEach((order) => {
        reservedByPerfume.set(order.perfumeId, (reservedByPerfume.get(order.perfumeId) || 0) + (Number(order.volumeMl) || 0) * (Number(order.quantity) || 1));
        if (order.isApc) reservations.set(order.perfumeId, { perfumeId: order.perfumeId, reserved: true, orderId: order.id || `apc-${order.perfumeId}`, volumeMl: order.volumeMl });
      });
      await Promise.all([
        syncApcStatus(Array.from(reservations.values())),
        syncStockStatus(Array.from(reservedByPerfume.entries()).map(([perfumeId, reservedMl]) => ({ perfumeId, reservedMl }))),
      ]);
      setNotice(`Disponibilidade recalibrada com ${allOrders.filter((order) => order.status !== "cancelado").length} pedido(s) ativo(s).`);
    } catch (error) {
      console.error("Erro ao recalibrar disponibilidade:", error);
      setOrdersError("A recalibração não foi salva. Confirme que este usuário possui admins/{UID} com role admin e que você está na versão atual do painel.");
    } finally { setRecalibrating(false); }
  };

  const migrateLegacyOrders = async () => {
    if (!legacyOrders.length) return;
    setMigrating(true);
    try {
      const existingRefs = new Set(orders.map((order) => order.legacyRef).filter(Boolean));
      const pending = legacyOrders.filter((order) => !existingRefs.has(order.id));
      await Promise.all(pending.map((order) => createCustomerOrder({ perfumeId: order.perfumeId, perfumeName: order.perfumeName, brand: order.brand, volumeMl: order.volumeMl, quantity: 1, unitPrice: 0, customerName: order.customerName, contact: "", payment: order.payment || "pix", status: order.status, createdAt: new Date().toISOString(), source: "catalogo", legacyRef: order.id, isApc: order.isApc })));
      const cleaned = rawPerfumes.map((raw) => { const next = { ...raw }; delete next.orders; return next; });
      await saveRawPerfumes(cleaned); setNotice(`${pending.length} pedido(s) legado(s) migrado(s) para a coleção privada.`);
    } catch { setNotice("A migração não foi concluída. Nenhum pedido legado deve ser removido manualmente."); }
    finally { setMigrating(false); }
  };

  const deliveredOrderCount = orders.filter((order) => order.status === "entregue").length + legacyOrders.filter((order) => order.status === "entregue").length;
  const removableOrderCount = orders.filter((order) => order.status === "entregue" || order.status === "cancelado").length + legacyOrders.filter((order) => order.status === "entregue" || order.status === "cancelado").length;
  const requestClearRemovable = () => { if (removableOrderCount > 0) setClearDialogOpen(true); };
  const clearRemovableOrders = async () => {
    if (!removableOrderCount) return;
    try {
      const removableStatuses = new Set(["entregue", "cancelado"]);
      const remoteIds = orders.filter((order) => removableStatuses.has(order.status) && order.id).map((order) => order.id as string);
      const legacyIds = new Set(legacyOrders.filter((order) => removableStatuses.has(order.status)).map((order) => order.id));
      await deleteCustomerOrders(remoteIds);
      if (legacyIds.size) {
        const cleaned = rawPerfumes.map((raw) => {
          const perfumeId = text(raw.id) || text(raw.name); const next = { ...raw };
          if (Array.isArray(raw.orders)) next.orders = raw.orders.filter((order) => !legacyIds.has(`legacy-${perfumeId}-${text((order as Record<string, unknown>).id)}`));
          return next;
        });
        await saveRawPerfumes(cleaned);
      }
      setClearDialogOpen(false); setNotice(`${remoteIds.length + legacyIds.size} pedido(s) entregue(s) ou cancelado(s) removido(s).`);
    } catch { setClearDialogOpen(false); setOrdersError("Não foi possível limpar os pedidos entregues ou cancelados. Nenhum pedido ativo foi alterado."); }
  };

  if (!authReady) return <div className="admin-boot"><span className="loading-orbit" /> Verificando acesso…</div>;
  if (!user) return <AdminLogin onSignedIn={setUser} />;
  if (!authorized) return <div className="admin-login"><div className="admin-login-card"><div className="admin-seal"><img src={logoMark} alt="" /></div><div className="admin-eyebrow"><span /> acesso pendente</div><h1>Quase lá.</h1><p>{authMessage || "Este usuário precisa ser autorizado no Firebase para acessar o arquivo."}</p><div className="admin-security-note"><ShieldCheck size={18} /><span>Crie um documento em <strong>admins/{user.uid}</strong> com o campo <strong>role: "admin"</strong>.</span></div><button className="admin-secondary-button full" onClick={() => void signOutAdmin()}>Sair e tentar outra conta</button><Link href="/" className="admin-back-link"><ArrowLeft size={14} /> Voltar ao catálogo</Link></div></div>;

  return <div className="admin-shell"><AdminHeader user={user} onLogout={() => void signOutAdmin()} /><main className="admin-main"><div className="admin-page-heading"><div><div className="admin-eyebrow"><span /> sala de controle</div><h1>O arquivo <em>SIAROM.</em></h1><p>Gerencie a curadoria e acompanhe o que está pronto para seguir até a pele.</p></div><div className="admin-header-actions"><button className="admin-secondary-button" onClick={() => void recalibrateAvailability()} disabled={recalibrating || !ordersReady}><RefreshCw size={15} /> {recalibrating ? "Recalibrando…" : "Recalibrar disponibilidade"}</button><div className="admin-live-status"><span className={isLive ? "live-dot" : "warning-dot"} />{isLive ? "sincronizado" : "verificando dados"}</div></div></div>{notice && <div className="admin-notice"><Check size={15} /> {notice}<button onClick={() => setNotice("")}><X size={14} /></button></div>}{syncError && <div className="admin-error">Catálogo: não foi possível ler o documento principal.</div>}{ordersError && <div className="admin-error">Pedidos: {ordersError}</div>}<div className="admin-stats"><div><Package size={17} /><span>Perfumes</span><strong>{rawPerfumes.length}</strong></div><div><Eye size={17} /><span>Publicados</span><strong>{rawPerfumes.filter((raw) => raw.available !== false).length}</strong></div><div><ArrowUpRight size={17} /><span>Pedidos novos</span><strong>{orders.filter((order) => order.status === "novo").length + legacyOrders.length}</strong></div><div><Check size={17} /><span>Entregues</span><strong>{deliveredOrderCount}</strong></div></div><div className="admin-tabs"><button className={tab === "perfumes" ? "active" : ""} onClick={() => { setTab("perfumes"); setQuery(""); }}><Package size={15} /> Perfumes</button><button className={tab === "pedidos" ? "active" : ""} onClick={() => { setTab("pedidos"); setQuery(""); }}><ArrowUpRight size={15} /> Pedidos <span>{orders.length + legacyOrders.length}</span></button></div>{editing && <PerfumeEditor initial={editing} onCancel={() => setEditing(null)} onSave={savePerfume} saving={saving} />}{!editing && tab === "perfumes" && <section className="admin-section"><div className="admin-section-heading"><div><span className="admin-form-kicker">Catálogo compartilhado</span><h2>Perfumes cadastrados</h2></div><button className="admin-primary-button" onClick={() => setEditing(emptyForm())}><Plus size={16} /> Novo perfume</button></div><label className="admin-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nome, marca ou gênero" /></label><div className="admin-perfume-list">{visiblePerfumes.length === 0 ? <div className="admin-empty">Nenhum perfume encontrado. Use “Novo perfume” para criar a primeira ficha.</div> : visiblePerfumes.map((raw) => { const perfumeId = text(raw.id) || text(raw.name); const totalOrders = orderTotals.get(perfumeId) || 0; return <article className="admin-perfume-row" key={perfumeId}><div className="admin-perfume-image">{text(raw.imageUrl) ? <img src={text(raw.imageUrl)} alt="" /> : <img src={logoMark} alt="" />}</div><div className="admin-perfume-info"><div className="admin-row-top"><div><h3>{text(raw.name) || "Sem nome"}</h3><p>{text(raw.brand)}{text(raw.type) ? ` · ${normalizeGender(raw.gender || raw.type || raw.family)}` : ""}</p></div><span className={`admin-availability ${raw.available === false ? "offline" : "online"}`}>{raw.available === false ? "Oculto" : "Publicado"}</span></div><div className="admin-row-meta"><span>R$ {text(raw.pricePerMl) || "—"}/ml</span><span>{totalOrders} pedido(s) no total</span><span>{raw.available === false ? "Não aparece no catálogo" : "Visível no catálogo"}</span></div><div className="admin-row-actions"><button onClick={() => setEditing(formFromRaw(raw))}><Edit3 size={14} /> Editar</button><button onClick={() => setMessagePerfume(raw)}><MessageCircle size={14} /> Mensagem</button><button onClick={() => void toggleAvailability(raw)}>{raw.available === false ? <><Eye size={14} /> Publicar</> : <><EyeOff size={14} /> Ocultar</>}</button><button className="danger" onClick={() => void removePerfume(perfumeId)}><Trash2 size={14} /> Remover</button></div></div></article>; })}</div></section>}{!editing && tab === "pedidos" && <section className="admin-section"><div className="admin-section-heading"><div><span className="admin-form-kicker">Fila de atendimento</span><h2>Pedidos registrados</h2></div><div className="admin-header-actions">{legacyOrders.length > 0 && <button className="admin-secondary-button" onClick={() => void migrateLegacyOrders()} disabled={migrating}><RefreshCw size={15} /> {migrating ? "Migrando…" : "Migrar legados"}</button>}{removableOrderCount > 0 && <button className="admin-secondary-button admin-clear-button" onClick={requestClearRemovable}><Trash2 size={15} /> Limpar entregues e cancelados</button>}<button className="admin-secondary-button" onClick={() => window.location.reload()}><RefreshCw size={15} /> Atualizar</button></div></div><div className="admin-order-toolbar"><label className="admin-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar cliente ou perfume" /></label><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="todos">Todos os status</option>{statuses.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}</select></div><div className="admin-orders-table"><div className="admin-order-head"><span>Cliente</span><span>Fragrância</span><span>Volume</span><span>Status</span></div>{visibleOrders.length === 0 ? <div className="admin-empty">Nenhum pedido encontrado.</div> : visibleOrders.map((order) => <div className="admin-order-row" key={order.id}><div><strong>{order.customerName}</strong><small>{order.contact || "Pedido legado"}</small></div><div><strong>{order.perfumeName}</strong><small>{order.brand}{order.legacy ? " · legado" : ""}</small><small className="order-payment">Pagamento: {paymentLabel(order.payment)}</small></div><span>{order.isApc ? `APC + ${order.volumeMl} ml` : `${order.volumeMl} ml`}{order.quantity > 1 ? ` · x${order.quantity}` : ""}</span><select className={`status-select status-${order.status}`} value={order.status} disabled={Boolean(order.legacy)} onChange={(event) => void updateStatus(order, event.target.value as CustomerOrder["status"])}>{statuses.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}</select></div>)}</div></section>}{clearDialogOpen && <div className="admin-confirm-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setClearDialogOpen(false)}><div className="admin-confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="clear-delivered-title"><div className="admin-eyebrow"><span /> confirmação</div><h2 id="clear-delivered-title">Limpar pedidos concluídos?</h2><p>Você está prestes a remover <strong>{removableOrderCount} pedido(s)</strong> entregues ou cancelados. Pedidos novos, confirmados e separados serão preservados.</p><div className="admin-confirm-actions"><button className="admin-secondary-button" onClick={() => setClearDialogOpen(false)}>Cancelar</button><button className="admin-primary-button admin-danger-button" onClick={() => void clearRemovableOrders()}><Trash2 size={15} /> Confirmar limpeza</button></div></div></div>}{messagePerfume && <div className="admin-confirm-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setMessagePerfume(null)}><div className="admin-confirm-dialog admin-message-dialog" role="dialog" aria-modal="true" aria-labelledby="whatsapp-message-title"><div className="admin-editor-heading"><div><div className="admin-eyebrow"><span /> mensagem pronta</div><h2 id="whatsapp-message-title">{text(messagePerfume.name) || "Perfume"}</h2></div><button className="admin-icon-button" onClick={() => setMessagePerfume(null)} aria-label="Fechar"><X size={18} /></button></div><textarea className="admin-message-textarea" readOnly value={whatsappMessage} onFocus={(event) => event.target.select()} /><div className="admin-confirm-actions"><button className="admin-secondary-button" onClick={() => setMessagePerfume(null)}>Fechar</button><a className="admin-secondary-button" href={`https://wa.me/?text=${encodeURIComponent(whatsappMessage)}`} target="_blank" rel="noreferrer"><MessageCircle size={15} /> Abrir no WhatsApp</a><button className="admin-primary-button" onClick={() => void copyWhatsappMessage()}><Copy size={15} /> Copiar mensagem</button></div></div></div>}</main></div>;
}
