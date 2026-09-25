// Atelier Noir — sala de controle SIAROM: fichas sóbrias, filetes finos e gestão direta da curadoria.
import { FormEvent, useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowUpRight, Check, Copy, Edit3, Eye, EyeOff, LogOut, MessageCircle, Package, Plus, RefreshCw, Search, ShieldCheck, Trash2, X, Archive, AlertCircle, Users, UserPlus } from "lucide-react";
import { Link } from "wouter";
import { useCatalog } from "@/contexts/CatalogContext";
import { useClientes } from "@/contexts/ClientesContext";
import { cancelCustomerOrder, createCliente, createCustomerOrder, createRemessa, deleteCliente, deleteCustomerOrders, deleteRemessa, getAdminProfile, signInAdmin, signOutAdmin, subscribeAuth, subscribeOrders, subscribeRemessas, syncApcStatus, syncStockStatus, updateCliente, updateRemessaStatus, type Cliente, type CustomerOrder, type Remessa, type RemessaStatus } from "@/lib/firebase";
import { buildWhatsappMessage, logoMark, normalizeGender } from "@/lib/catalog";
import type { User } from "firebase/auth";

type PerfumeForm = Record<string, unknown> & {
  id: string; name: string; brand: string; type: string; pricePerMl: string; recavePrice: string; totalMl: string;
  imageUrl: string; obs: string; shortDescription: string; description: string; accords: string[]; deliveryText: string;
  referenceUrl: string;
  available: boolean; hasApc: boolean; apcMl: number; apcFrasco: string; apcLimit: string;
  prices: Record<string, string | null>; customVolumes: string; orders: unknown[];
};

const volumes = [3, 7, 10, 15, 20, 30];
const genders = ["Compartilhável", "Masculino", "Feminino"];
const defaultDeliveryText = "Os frascos são enviados com identificação da fragrância e do volume. Embalados em caixas com proteção para manter os frascos intactos, visando preservar a experiência completa da fragrância.";
const remessaStatuses: RemessaStatus[] = ["confirmado", "separado", "enviado", "cancelado"];

const emptyForm = (): PerfumeForm => ({
  id: "", name: "", brand: "", type: "", pricePerMl: "", recavePrice: "8,00", totalMl: "", imageUrl: "", obs: "",
  shortDescription: "", description: "", accords: ["", "", "", "", ""], deliveryText: defaultDeliveryText,
  referenceUrl: "",
  available: true, hasApc: false, apcMl: 40, apcFrasco: "10,00", apcLimit: "1",
  prices: Object.fromEntries(volumes.map((ml) => [ml, null])), customVolumes: "", orders: [],
});

function text(value: unknown) { return typeof value === "string" ? value : value == null ? "" : String(value); }
function money(value: number) { return value > 0 ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value) : "Sob consulta"; }
function parseVolumeList(value: string) {
  return Array.from(new Set(value.split(",").map((item) => Number.parseFloat(item.trim().replace(",", "."))).filter((item) => Number.isFinite(item) && item > 0))).sort((left, right) => left - right);
}
function remessaStatusLabel(value: string) {
  return ({ confirmado: "Confirmado", separado: "Separado", enviado: "Enviado", cancelado: "Cancelado" } as Record<string, string>)[value] || value;
}
function paymentLabel(value: string) { return ({ pix: "Pix", cartao_credito: "Cartão de crédito" } as Record<string, string>)[value] || (value ? value : "Pagamento a definir"); }
function formatDate(iso: string) {
  if (!iso) return "—";
  try { return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(iso)); }
  catch { return iso; }
}
function formFromRaw(raw: Record<string, unknown>): PerfumeForm {
  return {
    ...emptyForm(), ...raw,
    id: text(raw.id), name: text(raw.name), brand: text(raw.brand), type: normalizeGender(raw.gender || raw.type || raw.family),
    pricePerMl: text(raw.pricePerMl), recavePrice: text(raw.recavePrice || "8,00"), totalMl: text(raw.totalMl), imageUrl: text(raw.imageUrl), obs: text(raw.obs),
    shortDescription: text(raw.shortDescription), description: text(raw.description),
    accords: Array.isArray(raw.accords) ? raw.accords.map(text).slice(0, 5).concat(["", "", "", "", ""]).slice(0, 5) : emptyForm().accords,
    deliveryText: text(raw.deliveryText || defaultDeliveryText), referenceUrl: text(raw.referenceUrl),
    available: raw.available !== false, hasApc: raw.hasApc === true,
    apcMl: Number(raw.apcMl) || 40, apcFrasco: text(raw.apcFrasco === undefined || raw.apcFrasco === null || raw.apcFrasco === "" ? "10,00" : raw.apcFrasco), apcLimit: text(raw.apcLimit || "1"),
    prices: { ...emptyForm().prices, ...((raw.prices || {}) as Record<string, string | null>) },
    customVolumes: Array.isArray(raw.customVolumes) ? raw.customVolumes.map(text).join(", ") : "",
    orders: Array.isArray(raw.orders) ? raw.orders : [],
  };
}
function authErrorMessage(error: unknown) {
  const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
  const messages: Record<string, string> = {
    "auth/invalid-credential": "E-mail ou senha incorretos.",
    "auth/user-not-found": "Este e-mail ainda não foi criado em Authentication → Users.",
    "auth/wrong-password": "A senha não confere.",
    "auth/operation-not-allowed": "O provedor Email/Password está desativado.",
    "auth/too-many-requests": "Muitas tentativas. Aguarde e tente novamente.",
    "auth/network-request-failed": "Falha de conexão com o Firebase.",
    "auth/invalid-api-key": "Chave do Firebase não aceita.",
  };
  return messages[code] || `Não foi possível entrar${code ? ` (${code})` : ""}.`;
}

// ─── Login ────────────────────────────────────────────────────────────────────
function AdminLogin({ onSignedIn }: { onSignedIn: (user: User) => void }) {
  const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const submit = async (event: FormEvent) => { event.preventDefault(); setBusy(true); setError(""); try { const credential = await signInAdmin(email.trim(), password); onSignedIn(credential.user); } catch (nextError) { setError(authErrorMessage(nextError)); } finally { setBusy(false); } };
  return <div className="admin-login"><div className="admin-login-card"><div className="admin-seal"><img src={logoMark} alt="" /></div><div className="admin-eyebrow"><span /> área reservada</div><h1>Arquivo<br /><em>SIAROM.</em></h1><p>Entre para administrar fragrâncias, disponibilidade e pedidos da curadoria.</p><form onSubmit={submit}><label><span>E-mail administrativo</span><input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" /></label><label><span>Senha criada no Firebase</span><input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Sua senha" /></label>{error && <div className="admin-error">{error}</div>}<button className="admin-primary-button" disabled={busy}>{busy ? "Verificando…" : "Entrar no arquivo"}<ArrowUpRight size={16} /></button></form><Link href="/" className="admin-back-link"><ArrowLeft size={14} /> Voltar ao catálogo</Link></div></div>;
}

// ─── Header ───────────────────────────────────────────────────────────────────
function AdminHeader({ user, onLogout }: { user: User; onLogout: () => void }) {
  return <header className="admin-header"><Link href="/" className="admin-brand"><img src={logoMark} alt="" /><span><strong>SIAROM</strong><small>Admin atelier</small></span></Link><div className="admin-user"><span><ShieldCheck size={14} /> {user.email}</span><button onClick={onLogout}><LogOut size={15} /> Sair</button></div></header>;
}

// ─── Editor de perfume ────────────────────────────────────────────────────────
function PerfumeEditor({ initial, onCancel, onSave, saving }: { initial: PerfumeForm; onCancel: () => void; onSave: (data: PerfumeForm) => Promise<void>; saving: boolean }) {
  const [form, setForm] = useState(initial);
  const set = (key: keyof PerfumeForm, value: unknown) => setForm((c) => ({ ...c, [key]: value }));
  const setPrice = (ml: number, value: string) => setForm((c) => ({ ...c, prices: { ...c.prices, [ml]: value || null } }));
  const setAccord = (i: number, value: string) => setForm((c) => ({ ...c, accords: c.accords.map((a, ai) => ai === i ? value : a) }));
  return <section className="admin-editor"><div className="admin-editor-heading"><div><div className="admin-eyebrow"><span /> {form.id ? "editar ficha" : "nova ficha"}</div><h2>{form.id ? form.name || "Editar perfume" : "Adicionar perfume"}</h2></div><button className="admin-icon-button" onClick={onCancel} aria-label="Fechar editor"><X size={18} /></button></div><div className="admin-form-grid"><label><span>Nome do perfume *</span><input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Ex.: Oud Satin Mood" /></label><label><span>Marca *</span><input value={form.brand} onChange={(e) => set("brand", e.target.value)} placeholder="Ex.: Maison Francis Kurkdjian" /></label><label><span>Gênero *</span><select value={form.type} required onChange={(e) => set("type", e.target.value)}><option value="" disabled>Selecione o gênero</option>{genders.map((g) => <option key={g} value={g}>{g}</option>)}</select></label><label><span>Preço por ml (R$)</span><input value={form.pricePerMl} onChange={(e) => set("pricePerMl", e.target.value)} placeholder="Ex.: 5,50" /></label><label><span>Taxa de recave (R$)</span><input value={form.recavePrice} onChange={(e) => set("recavePrice", e.target.value)} placeholder="8,00" /></label><label><span>Total disponível (ml)</span><input type="number" min="0" value={form.totalMl} onChange={(e) => set("totalMl", e.target.value)} placeholder="Ex.: 100" /></label><label className="admin-form-wide"><span>Volumes disponíveis (ml)</span><input value={form.customVolumes} onChange={(e) => set("customVolumes", e.target.value)} placeholder="Ex.: 3, 7, 10, 25" /><small>Opcional. Separe por vírgula. Se vazio, usa 3, 7, 10, 15, 20 e 30 ml.</small></label><label className="admin-form-wide"><span>URL da imagem</span><input type="url" value={form.imageUrl} onChange={(e) => set("imageUrl", e.target.value)} placeholder="https://…" /></label><label className="admin-form-wide"><span>Observação</span><textarea value={form.obs} onChange={(e) => set("obs", e.target.value)} placeholder="Lote, conservação ou observação para a equipe." /></label></div><div className="admin-form-section admin-copy-section"><div><span className="admin-form-kicker">Texto da ficha</span><p>Personalize o resumo e a descrição que aparecerão na página do perfume.</p></div><label className="admin-form-wide"><span>Resumo curto</span><input value={form.shortDescription} onChange={(e) => set("shortDescription", e.target.value)} placeholder="Ex.: Um floral luminoso e confortável." /></label><label className="admin-form-wide"><span>Descrição principal</span><textarea value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Texto completo da fragrância para a página individual." /></label><label className="admin-form-wide"><span>Entrega e conservação</span><textarea value={form.deliveryText} onChange={(e) => set("deliveryText", e.target.value)} /></label><label className="admin-form-wide"><span>Link de referência (opcional)</span><input type="url" value={form.referenceUrl} onChange={(e) => set("referenceUrl", e.target.value)} placeholder="Ex.: https://www.fragrantica.com.br/perfume/…" /></label></div><div className="admin-form-section admin-accord-section"><div><span className="admin-form-kicker">Cinco principais acordes</span><p>Preencha até cinco acordes para exibir na página pública.</p></div><div className="admin-accord-grid">{form.accords.map((accord, i) => <label key={i}><span>Acorde {i + 1}</span><input value={accord} onChange={(e) => setAccord(i, e.target.value)} placeholder={`Ex.: ${["Amadeirado", "Âmbar", "Floral", "Cítrico", "Almiscarado"][i]}`} /></label>)}</div></div><div className="admin-form-section"><div><span className="admin-form-kicker">Valores por volume</span><p>Deixe vazio para calcular pelo preço por ml.</p></div><div className="admin-price-grid">{(parseVolumeList(form.customVolumes).length ? parseVolumeList(form.customVolumes) : volumes).map((ml) => <label key={ml}><span>{ml} ml</span><input value={form.prices[ml] || ""} onChange={(e) => setPrice(ml, e.target.value)} placeholder={form.pricePerMl ? money(Number.parseFloat(form.pricePerMl.replace(",", ".")) * ml) : "—"} /></label>)}</div></div><div className="admin-form-section apc-editor-section"><div><span className="admin-form-kicker">Opção APC</span><p>Inclui o frasco e o volume configurado.</p></div><label className="admin-switch apc-toggle"><input type="checkbox" checked={form.hasApc} onChange={(e) => set("hasApc", e.target.checked)} /><span><strong>Oferecer APC + {form.apcMl || 40} ml</strong><small>O cliente verá esta opção junto aos volumes do perfume.</small></span></label>{form.hasApc && <div className="admin-apc-fields"><label><span>Volume APC (ml)</span><input type="number" min="1" value={form.apcMl} onChange={(e) => set("apcMl", Number(e.target.value) || 40)} /></label><label><span>Valor do frasco (R$)</span><input value={form.apcFrasco} onChange={(e) => set("apcFrasco", e.target.value)} placeholder="10,00" /></label><label><span>Limite por frasco</span><input type="number" min="1" value={form.apcLimit} onChange={(e) => set("apcLimit", e.target.value || "1")} /></label></div>}</div><label className="admin-switch"><input type="checkbox" checked={form.available} onChange={(e) => set("available", e.target.checked)} /><span><strong>Publicar no catálogo</strong><small>Quando desativado, o perfume fica invisível para clientes.</small></span></label><div className="admin-editor-actions"><button className="admin-secondary-button" onClick={onCancel}>Cancelar</button><button className="admin-primary-button" disabled={saving || !form.name.trim() || !form.brand.trim() || !form.type} onClick={() => onSave(form)}>{saving ? "Salvando…" : "Salvar ficha"}<Check size={16} /></button></div></section>;
}

// ─── Modal de cadastro / edição de cliente ────────────────────────────────────
function ClienteEditor({
  initial,
  onClose,
  onSaved,
}: {
  initial?: Cliente;
  onClose: () => void;
  onSaved: (notice: string) => void;
}) {
  const [nome, setNome] = useState(initial?.nome ?? "");
  const [telefone, setTelefone] = useState(initial?.telefone ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const confirm = async () => {
    if (!nome.trim()) { setError("O nome é obrigatório."); return; }
    setSaving(true); setError("");
    try {
      if (initial?.id) {
        await updateCliente(initial.id, { nome: nome.trim(), telefone: telefone.trim() });
        onSaved(`Cliente ${nome.trim()} atualizado.`);
      } else {
        await createCliente({ nome: nome.trim(), telefone: telefone.trim(), criadoEm: new Date().toISOString() });
        onSaved(`Cliente ${nome.trim()} cadastrado.`);
      }
    } catch {
      setError("Não foi possível salvar. Tente novamente.");
    } finally { setSaving(false); }
  };

  return (
    <div className="admin-confirm-backdrop" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="admin-confirm-dialog" style={{ maxWidth: 440, width: "100%" }} role="dialog" aria-modal="true" aria-labelledby="cliente-editor-title">
        <div className="admin-editor-heading">
          <div>
            <div className="admin-eyebrow"><span /> {initial ? "editar cliente" : "novo cliente"}</div>
            <h2 id="cliente-editor-title">{initial ? "Editar cadastro" : "Cadastrar cliente"}</h2>
          </div>
          <button className="admin-icon-button" onClick={onClose} aria-label="Fechar"><X size={18} /></button>
        </div>

        <div className="admin-form-grid" style={{ gap: "0.75rem" }}>
          <label style={{ gridColumn: "1 / -1" }}>
            <span>Nome *</span>
            <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Maria Silva" autoFocus />
          </label>
          <label style={{ gridColumn: "1 / -1" }}>
            <span>Telefone / WhatsApp</span>
            <input value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="Ex.: 71999990000" type="tel" />
          </label>
        </div>

        {error && (
          <div className="admin-error" style={{ marginTop: "0.75rem", display: "flex", gap: "0.5rem", alignItems: "flex-start" }}>
            <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} /> {error}
          </div>
        )}

        <div className="admin-confirm-actions" style={{ marginTop: "1.25rem" }}>
          <button className="admin-secondary-button" onClick={onClose}>Cancelar</button>
          <button className="admin-primary-button" disabled={saving || !nome.trim()} onClick={() => void confirm()}>
            <Check size={15} /> {saving ? "Salvando…" : initial ? "Salvar alterações" : "Cadastrar cliente"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Aba de clientes ──────────────────────────────────────────────────────────
function ClientesTab({
  clientes,
  onAdd,
  onEdit,
  onDelete,
  query,
  onQuery,
}: {
  clientes: Cliente[];
  onAdd: () => void;
  onEdit: (cliente: Cliente) => void;
  onDelete: (cliente: Cliente) => void;
  query: string;
  onQuery: (q: string) => void;
}) {
  const visible = useMemo(() => {
    const q = query.toLowerCase();
    return !q ? clientes : clientes.filter((c) => `${c.nome} ${c.telefone}`.toLowerCase().includes(q));
  }, [clientes, query]);

  return (
    <section className="admin-section">
      <div className="admin-section-heading">
        <div><span className="admin-form-kicker">Agenda da curadoria</span><h2>Clientes cadastrados</h2></div>
        <button className="admin-primary-button" onClick={onAdd}><UserPlus size={15} /> Novo cliente</button>
      </div>

      <label className="admin-search" style={{ marginBottom: "1rem" }}>
        <Search size={16} />
        <input value={query} onChange={(e) => onQuery(e.target.value)} placeholder="Buscar por nome ou telefone" />
      </label>

      {visible.length === 0 ? (
        <div className="admin-empty">
          {clientes.length === 0
            ? "Nenhum cliente cadastrado. Use "Novo cliente" para começar."
            : "Nenhum cliente encontrado para esta busca."}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {visible.map((c) => (
            <div
              key={c.id}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem",
                border: "1px solid var(--border, #e0e0e0)", borderRadius: 8,
                padding: "0.75rem 1rem", background: "var(--surface, #fff)",
              }}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: "0.92rem" }}>{c.nome}</div>
                <div style={{ fontSize: "0.8rem", color: "var(--muted)", marginTop: 2 }}>
                  {c.telefone || "Sem telefone"} · desde {formatDate(c.criadoEm).split(",")[0]}
                </div>
              </div>
              <div style={{ display: "flex", gap: "0.5rem", flexShrink: 0 }}>
                <button
                  onClick={() => onEdit(c)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: "3px 4px", borderRadius: 4, display: "flex", alignItems: "center" }}
                  title="Editar cliente"
                >
                  <Edit3 size={15} />
                </button>
                <button
                  onClick={() => onDelete(c)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: "3px 4px", borderRadius: 4, display: "flex", alignItems: "center", transition: "color 0.15s" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#dc2626")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "var(--muted)")}
                  title="Excluir cliente"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

// ─── Modal de novo pedido (usa select de cliente salvo) ───────────────────────
function OrderCreator({
  perfumes,
  clientes,
  onClose,
  onCreated,
}: {
  perfumes: Record<string, unknown>[];
  clientes: Cliente[];
  onClose: () => void;
  onCreated: (notice: string) => void;
}) {
  const [clienteId, setClienteId] = useState("");
  const [perfumeId, setPerfumeId] = useState("");
  const [volumeMl, setVolumeMl] = useState("");
  const [payment, setPayment] = useState("pix");
  const [quantity, setQuantity] = useState("1");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const selectedPerfume = perfumes.find((p) => text(p.id) === perfumeId);
  const availableVolumes = useMemo(() => {
    if (!selectedPerfume) return volumes;
    const custom = Array.isArray(selectedPerfume.customVolumes)
      ? (selectedPerfume.customVolumes as unknown[]).map(Number).filter(Boolean)
      : [];
    return custom.length ? custom : volumes;
  }, [selectedPerfume]);

  const selectedCliente = clientes.find((c) => c.id === clienteId);

  const confirm = async () => {
    if (!clienteId || !perfumeId || !volumeMl) {
      setError("Selecione o cliente, o perfume e o volume."); return;
    }
    setSaving(true); setError("");
    try {
      const perfume = perfumes.find((p) => text(p.id) === perfumeId);
      if (!perfume) throw new Error("Perfume não encontrado");
      const volNum = Number(volumeMl);
      const pricePerMl = Number(String(perfume.pricePerMl || "0").replace(",", "."));
      await createCustomerOrder({
        perfumeId,
        perfumeName: text(perfume.name),
        brand: text(perfume.brand),
        volumeMl: volNum,
        quantity: Number(quantity) || 1,
        unitPrice: pricePerMl * volNum,
        customerName: selectedCliente!.nome,
        contact: selectedCliente!.telefone,
        payment,
        status: "novo",
        createdAt: new Date().toISOString(),
        source: "catalogo",
        isApc: false,
      });
      onCreated(`Pedido de ${selectedCliente!.nome} registrado.`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      setError(msg === "apc-limit-reached" ? "Limite APC atingido para este perfume." : "Não foi possível registrar. Tente novamente.");
    } finally { setSaving(false); }
  };

  return (
    <div className="admin-confirm-backdrop" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="admin-confirm-dialog" style={{ maxWidth: 520, width: "100%" }} role="dialog" aria-modal="true" aria-labelledby="order-creator-title">
        <div className="admin-editor-heading">
          <div>
            <div className="admin-eyebrow"><span /> novo pedido</div>
            <h2 id="order-creator-title">Registrar pedido</h2>
          </div>
          <button className="admin-icon-button" onClick={onClose} aria-label="Fechar"><X size={18} /></button>
        </div>

        <div className="admin-form-grid" style={{ gap: "0.75rem" }}>
          {/* Cliente */}
          <label style={{ gridColumn: "1 / -1" }}>
            <span>Cliente *</span>
            <select value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
              <option value="" disabled>Selecione o cliente</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>{c.nome}{c.telefone ? ` — ${c.telefone}` : ""}</option>
              ))}
            </select>
          </label>

          {/* Perfume */}
          <label style={{ gridColumn: "1 / -1" }}>
            <span>Perfume *</span>
            <select value={perfumeId} onChange={(e) => { setPerfumeId(e.target.value); setVolumeMl(""); }}>
              <option value="" disabled>Selecione o perfume</option>
              {perfumes.filter((p) => p.available !== false).map((p) => (
                <option key={text(p.id)} value={text(p.id)}>{text(p.name)} — {text(p.brand)}</option>
              ))}
            </select>
          </label>

          {/* Volume */}
          <label>
            <span>Volume (ml) *</span>
            <select value={volumeMl} onChange={(e) => setVolumeMl(e.target.value)} disabled={!perfumeId}>
              <option value="" disabled>Selecione</option>
              {availableVolumes.map((v) => (
                <option key={v} value={v}>{v} ml</option>
              ))}
            </select>
          </label>

          {/* Quantidade */}
          <label>
            <span>Quantidade</span>
            <input type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          </label>

          {/* Pagamento */}
          <label style={{ gridColumn: "1 / -1" }}>
            <span>Forma de pagamento</span>
            <select value={payment} onChange={(e) => setPayment(e.target.value)}>
              <option value="pix">Pix</option>
              <option value="cartao_credito">Cartão de crédito</option>
            </select>
          </label>
        </div>

        {error && (
          <div className="admin-error" style={{ marginTop: "0.75rem", display: "flex", gap: "0.5rem", alignItems: "flex-start" }}>
            <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} /> {error}
          </div>
        )}

        <div className="admin-confirm-actions" style={{ marginTop: "1.25rem" }}>
          <button className="admin-secondary-button" onClick={onClose}>Cancelar</button>
          <button
            className="admin-primary-button"
            disabled={saving || !clienteId || !perfumeId || !volumeMl}
            onClick={() => void confirm()}
          >
            <Check size={15} /> {saving ? "Registrando…" : "Registrar pedido"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Criador de remessa ────────────────────────────────────────────────────────
function RemessaCreator({ orders, remessas, onClose, onCreated }: { orders: (CustomerOrder & { legacy?: boolean })[]; remessas: Remessa[]; onClose: () => void; onCreated: (notice: string) => void }) {
  const remessaOrderIds = useMemo(() => new Set(remessas.flatMap((r) => r.orderIds)), [remessas]);
  const activeOrders = orders.filter((o) => !o.legacy && o.id && o.status !== "cancelado" && !remessaOrderIds.has(o.id));
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const toggle = (id: string) => {
    const order = activeOrders.find((o) => o.id === id); if (!order) return;
    setSelected((prev) => { const next = new Set(prev); if (next.has(id)) { next.delete(id); return next; } const sel = activeOrders.filter((o) => next.has(o.id!)); const existing = sel[0]?.customerName; if (existing && existing !== order.customerName) { setError(`Remessas são para um único cliente. Remova os pedidos de "${existing}" antes.`); return prev; } setError(""); next.add(id); return next; });
  };
  const selectedOrders = activeOrders.filter((o) => selected.has(o.id!));
  const customerName = selectedOrders[0]?.customerName || "";
  const ordersByCustomer = useMemo(() => { const map = new Map<string, typeof activeOrders>(); activeOrders.forEach((o) => { const name = o.customerName || "Sem nome"; if (!map.has(name)) map.set(name, []); map.get(name)!.push(o); }); return map; }, [activeOrders]);
  const confirm = async () => {
    if (!selected.size) return; setSaving(true); setError("");
    try { const orderIds = Array.from(selected); const summaries = selectedOrders.map((o) => ({ orderId: o.id!, perfumeName: o.perfumeName, volumeMl: o.volumeMl, isApc: o.isApc })); await createRemessa(orderIds, customerName || "Cliente", summaries); onCreated(`Remessa de ${customerName || "cliente"} criada com ${orderIds.length} pedido(s).`); }
    catch { setError("Não foi possível criar a remessa. Tente novamente."); }
    finally { setSaving(false); }
  };
  return (
    <div className="admin-confirm-backdrop" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="admin-confirm-dialog" style={{ maxWidth: 560, width: "100%" }} role="dialog" aria-modal="true" aria-labelledby="remessa-title">
        <div className="admin-editor-heading"><div><div className="admin-eyebrow"><span /> nova remessa</div><h2 id="remessa-title">Selecionar pedidos da caixa</h2></div><button className="admin-icon-button" onClick={onClose} aria-label="Fechar"><X size={18} /></button></div>
        {activeOrders.length === 0 ? <p style={{ color: "var(--muted)", padding: "1rem 0" }}>Nenhum pedido disponível para agrupar.</p> : (
          <>
            <p style={{ fontSize: "0.85rem", color: "var(--muted)", marginBottom: "0.75rem" }}>Marque os pedidos desta caixa. Só é possível agrupar pedidos do <strong>mesmo cliente</strong>.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem", maxHeight: 360, overflowY: "auto" }}>
              {Array.from(ordersByCustomer.entries()).map(([clienteName, clienteOrders]) => (
                <div key={clienteName}>
                  <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.4rem", padding: "0 0.25rem" }}>{clienteName}</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                    {clienteOrders.map((order) => (
                      <label key={order.id} style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.6rem 0.75rem", borderRadius: 6, cursor: "pointer", background: selected.has(order.id!) ? "var(--surface-raised, #f5f5f0)" : "transparent", border: "1px solid", borderColor: selected.has(order.id!) ? "var(--accent, #222)" : "var(--border, #e0e0e0)", transition: "all 0.15s" }}>
                        <input type="checkbox" checked={selected.has(order.id!)} onChange={() => toggle(order.id!)} style={{ accentColor: "var(--accent, #222)", width: 16, height: 16, flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: "0.88rem" }}>{order.perfumeName}</div>
                          <div style={{ fontSize: "0.8rem", color: "var(--muted)" }}>{order.isApc ? `APC + ${order.volumeMl} ml` : `${order.volumeMl} ml`}{order.quantity > 1 ? ` · x${order.quantity}` : ""}{order.payment ? ` · ${paymentLabel(order.payment)}` : ""}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            {selected.size > 0 && <div style={{ marginTop: "0.75rem", fontSize: "0.82rem", color: "var(--muted)" }}><strong>{selected.size}</strong> pedido(s) selecionado(s){customerName && <> · <strong>{customerName}</strong></>}</div>}
          </>
        )}
        {error && <div className="admin-error" style={{ marginTop: "0.75rem", display: "flex", gap: "0.5rem", alignItems: "flex-start" }}><AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} /> {error}</div>}
        <div className="admin-confirm-actions" style={{ marginTop: "1.25rem" }}>
          <button className="admin-secondary-button" onClick={onClose}>Cancelar</button>
          <button className="admin-primary-button" disabled={selected.size === 0 || saving} onClick={() => void confirm()}><Archive size={15} /> {saving ? "Criando remessa…" : `Criar remessa (${selected.size})`}</button>
        </div>
      </div>
    </div>
  );
}

// ─── Lista de remessas ────────────────────────────────────────────────────────
function RemessasList({ remessas, onStatusChange, onDelete }: { remessas: Remessa[]; onStatusChange: (id: string, status: RemessaStatus) => Promise<void>; onDelete: (id: string, customerName: string) => void }) {
  const statusColors: Record<RemessaStatus, string> = { confirmado: "#2563eb", separado: "#d97706", enviado: "#7c3aed", cancelado: "#dc2626" };
  if (remessas.length === 0) return <div className="admin-empty">Nenhuma remessa criada ainda. Use "Nova remessa" para agrupar pedidos de uma caixa.</div>;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      {remessas.map((remessa) => {
        const status = (remessa.status || "confirmado") as RemessaStatus;
        return (
          <article key={remessa.id} style={{ border: "1px solid var(--border, #e0e0e0)", borderRadius: 8, padding: "0.85rem 1rem", background: "var(--surface, #fff)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.75rem", marginBottom: "0.5rem" }}>
              <div>
                <strong style={{ fontSize: "0.92rem" }}>{remessa.customerName}</strong>
                <div style={{ fontSize: "0.78rem", color: "var(--muted)", marginTop: 2 }}>{formatDate(remessa.createdAt)} · {remessa.orderIds.length} pedido(s)</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexShrink: 0 }}>
                <select value={status} onChange={(e) => void onStatusChange(remessa.id!, e.target.value as RemessaStatus)} style={{ fontSize: "0.78rem", padding: "3px 8px", borderRadius: 99, border: "1px solid", borderColor: statusColors[status], color: statusColors[status], background: "var(--surface, #fff)", fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>
                  {remessaStatuses.map((s) => <option key={s} value={s}>{remessaStatusLabel(s)}</option>)}
                </select>
                <button onClick={() => onDelete(remessa.id!, remessa.customerName)} title="Excluir remessa" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: "3px 4px", borderRadius: 4, display: "flex", alignItems: "center", transition: "color 0.15s" }} onMouseEnter={(e) => (e.currentTarget.style.color = "#dc2626")} onMouseLeave={(e) => (e.currentTarget.style.color = "var(--muted)")} aria-label={`Excluir remessa de ${remessa.customerName}`}><Trash2 size={15} /></button>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
              {remessa.orderSummaries.map((s) => <div key={s.orderId} style={{ fontSize: "0.82rem", color: "var(--muted)" }}>· {s.perfumeName} — {s.isApc ? `APC + ${s.volumeMl} ml` : `${s.volumeMl} ml`}</div>)}
            </div>
          </article>
        );
      })}
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function AdminPage() {
  const { rawPerfumes, saveRawPerfumes, isLive, syncError } = useCatalog();
  const { clientes } = useClientes();
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [authMessage, setAuthMessage] = useState("");
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [ordersReady, setOrdersReady] = useState(false);
  const [ordersError, setOrdersError] = useState("");
  const [remessas, setRemessas] = useState<Remessa[]>([]);
  const [tab, setTab] = useState<"perfumes" | "pedidos" | "clientes" | "remessas">("perfumes");
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<PerfumeForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [recalibrating, setRecalibrating] = useState(false);
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [remessaCreatorOpen, setRemessaCreatorOpen] = useState(false);
  const [orderCreatorOpen, setOrderCreatorOpen] = useState(false);
  const [clienteEditorTarget, setClienteEditorTarget] = useState<Cliente | null | "new">(null);
  const [deleteClienteTarget, setDeleteClienteTarget] = useState<Cliente | null>(null);
  const [deleteRemessaTarget, setDeleteRemessaTarget] = useState<{ id: string; customerName: string } | null>(null);
  const [notice, setNotice] = useState("");
  const [messagePerfume, setMessagePerfume] = useState<Record<string, unknown> | null>(null);

  const copyWhatsappMessage = async () => { try { await navigator.clipboard.writeText(whatsappMessage); setNotice("Mensagem copiada."); } catch { setNotice("Não foi possível copiar. Selecione e copie manualmente."); } };

  useEffect(() => subscribeAuth((next) => {
    setUser(next); setAuthReady(true);
    if (!next) { setAuthorized(false); setAuthMessage(""); setOrdersReady(false); return; }
    void getAdminProfile(next).then((allowed) => { setAuthorized(allowed); setAuthMessage(allowed ? "" : "Usuário não autorizado como administrador."); });
  }), []);

  useEffect(() => {
    if (!authorized) { setOrdersReady(false); setOrdersError(""); return; }
    setOrdersError("");
    return subscribeOrders((next) => { setOrders(next); setOrdersReady(true); }, (error) => {
      const code = "code" in error && typeof error.code === "string" ? ` (${error.code})` : "";
      setOrdersReady(false); setOrdersError(`Não foi possível ler pedidos${code}.`);
    });
  }, [authorized]);

  useEffect(() => { if (!authorized) return; return subscribeRemessas((next) => setRemessas(next), (error) => console.error("Erro ao carregar remessas:", error)); }, [authorized]);

  const legacyOrders = useMemo(() => rawPerfumes.flatMap((raw) => { const perfumeName = text(raw.name); const brand = text(raw.brand); const perfumeId = text(raw.id) || perfumeName; return (Array.isArray(raw.orders) ? raw.orders : []).map((order) => { const item = order as Record<string, unknown>; return { id: `legacy-${perfumeId}-${text(item.id)}`, perfumeId, perfumeName, brand, volumeMl: Number(item.ml) || 0, quantity: 1, unitPrice: 0, customerName: text(item.name), contact: "", payment: text(item.pagamento), status: "novo" as const, createdAt: "", source: "catalogo" as const, isApc: Boolean(item.isApc), legacy: true }; }); }), [rawPerfumes]);
  const messageOrders = useMemo(() => { if (!messagePerfume) return []; const perfumeId = text(messagePerfume.id) || text(messagePerfume.name); const perfumeName = text(messagePerfume.name); return [...orders.filter((o) => o.perfumeId === perfumeId || o.perfumeName === perfumeName), ...legacyOrders.filter((o) => o.perfumeId === perfumeId || o.perfumeName === perfumeName)]; }, [messagePerfume, orders, legacyOrders]);
  const whatsappMessage = useMemo(() => (messagePerfume ? buildWhatsappMessage(messagePerfume, messageOrders) : ""), [messagePerfume, messageOrders]);

  useEffect(() => { if (!authorized || !ordersReady) return; const reservations = new Map<string, { perfumeId: string; reserved: boolean; orderId: string; volumeMl: number }>(); [...orders, ...legacyOrders].filter((o) => o.isApc && o.status !== "cancelado").forEach((o) => reservations.set(o.perfumeId, { perfumeId: o.perfumeId, reserved: true, orderId: o.id || `apc-${o.perfumeId}`, volumeMl: o.volumeMl })); void syncApcStatus(Array.from(reservations.values())).catch(() => setOrdersError("Não foi possível atualizar APC.")); }, [authorized, ordersReady, orders, legacyOrders]);
  useEffect(() => { if (!authorized || !ordersReady) return; const reserved = new Map<string, number>(); [...orders, ...legacyOrders].filter((o) => o.status !== "cancelado").forEach((o) => { reserved.set(o.perfumeId, (reserved.get(o.perfumeId) || 0) + (Number(o.volumeMl) || 0) * (Number(o.quantity) || 1)); }); void syncStockStatus(Array.from(reserved.entries()).map(([perfumeId, reservedMl]) => ({ perfumeId, reservedMl }))).catch(() => setOrdersError("Não foi possível atualizar estoque.")); }, [authorized, ordersReady, orders, legacyOrders]);

  const orderTotals = useMemo(() => { const totals = new Map<string, number>(); [...orders, ...legacyOrders].forEach((o) => totals.set(o.perfumeId, (totals.get(o.perfumeId) || 0) + 1)); return totals; }, [orders, legacyOrders]);
  const remessaById = useMemo(() => new Map(remessas.map((r) => [r.id!, r])), [remessas]);
  const remessaOrderIds = useMemo(() => new Set(remessas.flatMap((r) => r.orderIds)), [remessas]);
  const visiblePerfumes = useMemo(() => rawPerfumes.filter((raw) => { const q = query.toLowerCase(); return !q || `${text(raw.name)} ${text(raw.brand)} ${normalizeGender(raw.gender || raw.type || raw.family)}`.toLowerCase().includes(q); }), [rawPerfumes, query]);
  const visibleOrders = useMemo(() => [...orders.map((o) => ({ ...o, legacy: false })), ...legacyOrders].filter((o) => !query || `${o.customerName} ${o.perfumeName} ${o.contact}`.toLowerCase().includes(query.toLowerCase())), [orders, legacyOrders, query]);

  const savePerfume = async (data: PerfumeForm) => {
    setSaving(true);
    try {
      const customVolumes = parseVolumeList(data.customVolumes);
      const normalized: Record<string, unknown> = { ...data, type: normalizeGender(data.type), gender: normalizeGender(data.type) };
      if (customVolumes.length) normalized.customVolumes = customVolumes; else delete normalized.customVolumes;
      delete normalized.orders;
      const next = data.id ? rawPerfumes.map((item) => text(item.id) === data.id ? { ...item, ...normalized } : item) : [{ ...normalized, id: `${data.name.toLowerCase().replace(/[^a-z0-9]+/gi, "-")}-${Date.now()}`, orders: [] }, ...rawPerfumes];
      await saveRawPerfumes(next); setEditing(null); setNotice("Ficha sincronizada com o catálogo.");
    } catch { setNotice("Não foi possível salvar."); } finally { setSaving(false); }
  };

  const removePerfume = async (id: string) => { if (!window.confirm("Remover este perfume?")) return; try { await saveRawPerfumes(rawPerfumes.filter((item) => text(item.id) !== id)); setNotice("Perfume removido."); } catch { setNotice("Não foi possível remover."); } };
  const toggleAvailability = async (raw: Record<string, unknown>) => { try { await saveRawPerfumes(rawPerfumes.map((item) => text(item.id) === text(raw.id) ? { ...item, available: item.available === false } : item)); } catch { setNotice("Não foi possível atualizar."); } };
  const handleCancelOrder = async (order: CustomerOrder & { legacy?: boolean }) => { if (order.legacy || !order.id) return; if (!window.confirm(`Cancelar o pedido de ${order.customerName}?`)) return; try { await cancelCustomerOrder(order.id); setNotice("Pedido cancelado."); } catch { setOrdersError("Não foi possível cancelar."); } };
  const handleRemessaStatus = async (remessaId: string, status: RemessaStatus) => { try { await updateRemessaStatus(remessaId, status); } catch { setOrdersError("Não foi possível atualizar o status."); } };
  const handleDeleteRemessa = (id: string, customerName: string) => setDeleteRemessaTarget({ id, customerName });
  const confirmDeleteRemessa = async () => { if (!deleteRemessaTarget) return; try { await deleteRemessa(deleteRemessaTarget.id); setNotice(`Remessa de ${deleteRemessaTarget.customerName} excluída.`); } catch { setOrdersError("Não foi possível excluir a remessa."); } finally { setDeleteRemessaTarget(null); } };
  const handleDeleteCliente = async () => { if (!deleteClienteTarget?.id) return; try { await deleteCliente(deleteClienteTarget.id); setNotice(`Cliente ${deleteClienteTarget.nome} removido.`); } catch { setNotice("Não foi possível remover o cliente."); } finally { setDeleteClienteTarget(null); } };

  const recalibrateAvailability = async () => {
    setRecalibrating(true); setOrdersError("");
    try {
      const all = [...orders, ...legacyOrders];
      const reservations = new Map<string, { perfumeId: string; reserved: boolean; orderId: string; volumeMl: number }>();
      const reserved = new Map<string, number>();
      all.filter((o) => o.status !== "cancelado").forEach((o) => { reserved.set(o.perfumeId, (reserved.get(o.perfumeId) || 0) + (Number(o.volumeMl) || 0) * (Number(o.quantity) || 1)); if (o.isApc) reservations.set(o.perfumeId, { perfumeId: o.perfumeId, reserved: true, orderId: o.id || `apc-${o.perfumeId}`, volumeMl: o.volumeMl }); });
      await Promise.all([syncApcStatus(Array.from(reservations.values())), syncStockStatus(Array.from(reserved.entries()).map(([perfumeId, reservedMl]) => ({ perfumeId, reservedMl })))]);
      setNotice(`Disponibilidade recalibrada com ${all.filter((o) => o.status !== "cancelado").length} pedido(s) ativo(s).`);
    } catch { setOrdersError("A recalibração não foi salva."); } finally { setRecalibrating(false); }
  };

  const migrateLegacyOrders = async () => {
    if (!legacyOrders.length) return; setMigrating(true);
    try {
      const existingRefs = new Set(orders.map((o) => o.legacyRef).filter(Boolean));
      const pending = legacyOrders.filter((o) => !existingRefs.has(o.id));
      await Promise.all(pending.map((o) => createCustomerOrder({ perfumeId: o.perfumeId, perfumeName: o.perfumeName, brand: o.brand, volumeMl: o.volumeMl, quantity: 1, unitPrice: 0, customerName: o.customerName, contact: "", payment: o.payment || "pix", status: "novo", createdAt: new Date().toISOString(), source: "catalogo", legacyRef: o.id, isApc: o.isApc })));
      const cleaned = rawPerfumes.map((raw) => { const next = { ...raw }; delete next.orders; return next; });
      await saveRawPerfumes(cleaned); setNotice(`${pending.length} pedido(s) migrado(s).`);
    } catch { setNotice("A migração não foi concluída."); } finally { setMigrating(false); }
  };

  const removableOrderCount = orders.filter((o) => o.status === "cancelado").length;
  const requestClearRemovable = () => { if (removableOrderCount > 0) setClearDialogOpen(true); };
  const clearRemovableOrders = async () => { if (!removableOrderCount) return; try { const ids = orders.filter((o) => o.status === "cancelado" && o.id).map((o) => o.id as string); await deleteCustomerOrders(ids); setClearDialogOpen(false); setNotice(`${ids.length} pedido(s) cancelado(s) removido(s).`); } catch { setClearDialogOpen(false); setOrdersError("Não foi possível limpar cancelados."); } };
  const allOrdersForRemessa = useMemo(() => [...orders.map((o) => ({ ...o, legacy: false })), ...legacyOrders], [orders, legacyOrders]);
  const activeOrdersCount = orders.filter((o) => o.status !== "cancelado").length;

  if (!authReady) return <div className="admin-boot"><span className="loading-orbit" /> Verificando acesso…</div>;
  if (!user) return <AdminLogin onSignedIn={setUser} />;
  if (!authorized) return <div className="admin-login"><div className="admin-login-card"><div className="admin-seal"><img src={logoMark} alt="" /></div><div className="admin-eyebrow"><span /> acesso pendente</div><h1>Quase lá.</h1><p>{authMessage || "Usuário não autorizado."}</p><div className="admin-security-note"><ShieldCheck size={18} /><span>Crie um documento em <strong>admins/{user.uid}</strong> com <strong>role: "admin"</strong>.</span></div><button className="admin-secondary-button full" onClick={() => void signOutAdmin()}>Sair</button><Link href="/" className="admin-back-link"><ArrowLeft size={14} /> Voltar ao catálogo</Link></div></div>;

  return (
    <div className="admin-shell">
      <AdminHeader user={user} onLogout={() => void signOutAdmin()} />
      <main className="admin-main">
        <div className="admin-page-heading">
          <div><div className="admin-eyebrow"><span /> sala de controle</div><h1>O arquivo <em>SIAROM.</em></h1><p>Gerencie a curadoria e acompanhe o que está pronto para seguir até a pele.</p></div>
          <div className="admin-header-actions">
            <button className="admin-secondary-button" onClick={() => void recalibrateAvailability()} disabled={recalibrating || !ordersReady}><RefreshCw size={15} /> {recalibrating ? "Recalibrando…" : "Recalibrar disponibilidade"}</button>
            <div className="admin-live-status"><span className={isLive ? "live-dot" : "warning-dot"} />{isLive ? "sincronizado" : "verificando dados"}</div>
          </div>
        </div>

        {notice && <div className="admin-notice"><Check size={15} /> {notice}<button onClick={() => setNotice("")}><X size={14} /></button></div>}
        {syncError && <div className="admin-error">Catálogo: não foi possível ler o documento principal.</div>}
        {ordersError && <div className="admin-error">Pedidos: {ordersError}</div>}

        <div className="admin-stats">
          <div><Package size={17} /><span>Perfumes</span><strong>{rawPerfumes.length}</strong></div>
          <div><Eye size={17} /><span>Publicados</span><strong>{rawPerfumes.filter((r) => r.available !== false).length}</strong></div>
          <div><ArrowUpRight size={17} /><span>Pedidos ativos</span><strong>{activeOrdersCount + legacyOrders.length}</strong></div>
          <div><Users size={17} /><span>Clientes</span><strong>{clientes.length}</strong></div>
          <div><Archive size={17} /><span>Remessas</span><strong>{remessas.length}</strong></div>
        </div>

        <div className="admin-tabs">
          <button className={tab === "perfumes" ? "active" : ""} onClick={() => { setTab("perfumes"); setQuery(""); }}><Package size={15} /> Perfumes</button>
          <button className={tab === "pedidos" ? "active" : ""} onClick={() => { setTab("pedidos"); setQuery(""); }}><ArrowUpRight size={15} /> Pedidos <span>{orders.length + legacyOrders.length}</span></button>
          <button className={tab === "clientes" ? "active" : ""} onClick={() => { setTab("clientes"); setQuery(""); }}><Users size={15} /> Clientes <span>{clientes.length}</span></button>
          <button className={tab === "remessas" ? "active" : ""} onClick={() => { setTab("remessas"); setQuery(""); }}><Archive size={15} /> Remessas <span>{remessas.length}</span></button>
        </div>

        {editing && <PerfumeEditor initial={editing} onCancel={() => setEditing(null)} onSave={savePerfume} saving={saving} />}

        {!editing && tab === "perfumes" && (
          <section className="admin-section">
            <div className="admin-section-heading"><div><span className="admin-form-kicker">Catálogo compartilhado</span><h2>Perfumes cadastrados</h2></div><button className="admin-primary-button" onClick={() => setEditing(emptyForm())}><Plus size={16} /> Novo perfume</button></div>
            <label className="admin-search"><Search size={16} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por nome, marca ou gênero" /></label>
            <div className="admin-perfume-list">
              {visiblePerfumes.length === 0 ? <div className="admin-empty">Nenhum perfume encontrado.</div> : visiblePerfumes.map((raw) => {
                const perfumeId = text(raw.id) || text(raw.name); const totalOrders = orderTotals.get(perfumeId) || 0;
                return (
                  <article className="admin-perfume-row" key={perfumeId}>
                    <div className="admin-perfume-image">{text(raw.imageUrl) ? <img src={text(raw.imageUrl)} alt="" /> : <img src={logoMark} alt="" />}</div>
                    <div className="admin-perfume-info">
                      <div className="admin-row-top"><div><h3>{text(raw.name) || "Sem nome"}</h3><p>{text(raw.brand)}{text(raw.type) ? ` · ${normalizeGender(raw.gender || raw.type || raw.family)}` : ""}</p></div><span className={`admin-availability ${raw.available === false ? "offline" : "online"}`}>{raw.available === false ? "Oculto" : "Publicado"}</span></div>
                      <div className="admin-row-meta"><span>R$ {text(raw.pricePerMl) || "—"}/ml</span><span>{totalOrders} pedido(s)</span><span>{raw.available === false ? "Não aparece" : "Visível no catálogo"}</span></div>
                      <div className="admin-row-actions">
                        <button onClick={() => setEditing(formFromRaw(raw))}><Edit3 size={14} /> Editar</button>
                        <button onClick={() => setMessagePerfume(raw)}><MessageCircle size={14} /> Mensagem</button>
                        <button onClick={() => void toggleAvailability(raw)}>{raw.available === false ? <><Eye size={14} /> Publicar</> : <><EyeOff size={14} /> Ocultar</>}</button>
                        <button className="danger" onClick={() => void removePerfume(perfumeId)}><Trash2 size={14} /> Remover</button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {!editing && tab === "pedidos" && (
          <section className="admin-section">
            <div className="admin-section-heading">
              <div><span className="admin-form-kicker">Fila de atendimento</span><h2>Pedidos registrados</h2></div>
              <div className="admin-header-actions">
                {legacyOrders.length > 0 && <button className="admin-secondary-button" onClick={() => void migrateLegacyOrders()} disabled={migrating}><RefreshCw size={15} /> {migrating ? "Migrando…" : "Migrar legados"}</button>}
                {removableOrderCount > 0 && <button className="admin-secondary-button admin-clear-button" onClick={requestClearRemovable}><Trash2 size={15} /> Limpar cancelados</button>}
                <button className="admin-secondary-button" onClick={() => window.location.reload()}><RefreshCw size={15} /> Atualizar</button>
                <button className="admin-primary-button" onClick={() => setOrderCreatorOpen(true)} disabled={clientes.length === 0} title={clientes.length === 0 ? "Cadastre um cliente antes de registrar pedidos" : undefined}><UserPlus size={15} /> Novo pedido</button>
              </div>
            </div>
            {clientes.length === 0 && <div className="admin-error" style={{ marginBottom: "1rem" }}><AlertCircle size={15} style={{ display: "inline", marginRight: 6 }} />Nenhum cliente cadastrado. Vá até a aba <strong>Clientes</strong> e cadastre um antes de registrar pedidos.</div>}
            <label className="admin-search" style={{ marginBottom: "1rem" }}><Search size={16} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar cliente ou perfume" /></label>
            <div className="admin-orders-table">
              <div className="admin-order-head"><span>Cliente</span><span>Fragrância</span><span>Volume</span><span>Remessa</span></div>
              {visibleOrders.length === 0 ? <div className="admin-empty">Nenhum pedido encontrado.</div> : visibleOrders.map((order) => {
                const emRemessa = order.id ? remessaOrderIds.has(order.id) : false;
                const remessa = order.remessaId ? remessaById.get(order.remessaId) : undefined;
                const isCanceled = order.status === "cancelado";
                return (
                  <div className="admin-order-row" key={order.id} style={{ opacity: isCanceled ? 0.55 : 1 }}>
                    <div><strong>{order.customerName}</strong><small>{order.contact || (order.legacy ? "Pedido legado" : "")}</small></div>
                    <div><strong>{order.perfumeName}</strong><small>{order.brand}{order.legacy ? " · legado" : ""}</small><small className="order-payment">Pagamento: {paymentLabel(order.payment)}</small></div>
                    <span>{order.isApc ? `APC + ${order.volumeMl} ml` : `${order.volumeMl} ml`}{order.quantity > 1 ? ` · x${order.quantity}` : ""}</span>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                      {isCanceled ? <span style={{ fontSize: "0.78rem", padding: "2px 8px", borderRadius: 99, background: "#fee2e2", color: "#dc2626", fontWeight: 600, width: "fit-content" }}>Cancelado</span>
                        : emRemessa && remessa ? <span style={{ fontSize: "0.78rem", padding: "2px 8px", borderRadius: 99, background: "var(--surface-raised, #f0f0eb)", color: "var(--muted)", fontWeight: 500, width: "fit-content" }}><Archive size={11} style={{ display: "inline", marginRight: 3, verticalAlign: "middle" }} />{remessa.customerName} · {remessaStatusLabel(remessa.status || "confirmado")}</span>
                          : <span style={{ fontSize: "0.78rem", padding: "2px 8px", borderRadius: 99, background: "#fef9c3", color: "#854d0e", fontWeight: 500, width: "fit-content", display: "flex", alignItems: "center", gap: 4 }}><AlertCircle size={11} /> Sem remessa</span>}
                      {!isCanceled && !order.legacy && <button onClick={() => void handleCancelOrder(order)} style={{ fontSize: "0.75rem", color: "#dc2626", background: "none", border: "none", cursor: "pointer", textAlign: "left", padding: 0, width: "fit-content" }}>Cancelar pedido</button>}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {!editing && tab === "clientes" && (
          <ClientesTab
            clientes={clientes}
            onAdd={() => setClienteEditorTarget("new")}
            onEdit={(c) => setClienteEditorTarget(c)}
            onDelete={(c) => setDeleteClienteTarget(c)}
            query={query}
            onQuery={setQuery}
          />
        )}

        {!editing && tab === "remessas" && (
          <section className="admin-section">
            <div className="admin-section-heading"><div><span className="admin-form-kicker">Histórico de envios</span><h2>Remessas criadas</h2></div><button className="admin-primary-button" onClick={() => setRemessaCreatorOpen(true)}><Archive size={16} /> Nova remessa</button></div>
            <RemessasList remessas={remessas} onStatusChange={handleRemessaStatus} onDelete={handleDeleteRemessa} />
          </section>
        )}

        {/* Dialogs */}
        {clearDialogOpen && (
          <div className="admin-confirm-backdrop" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && setClearDialogOpen(false)}>
            <div className="admin-confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="clear-title">
              <div className="admin-eyebrow"><span /> confirmação</div><h2 id="clear-title">Limpar pedidos cancelados?</h2>
              <p>Você está prestes a remover <strong>{removableOrderCount} pedido(s)</strong> cancelados.</p>
              <div className="admin-confirm-actions"><button className="admin-secondary-button" onClick={() => setClearDialogOpen(false)}>Cancelar</button><button className="admin-primary-button admin-danger-button" onClick={() => void clearRemovableOrders()}><Trash2 size={15} /> Confirmar</button></div>
            </div>
          </div>
        )}

        {deleteRemessaTarget && (
          <div className="admin-confirm-backdrop" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && setDeleteRemessaTarget(null)}>
            <div className="admin-confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="del-remessa-title">
              <div className="admin-eyebrow"><span /> confirmação</div><h2 id="del-remessa-title">Excluir esta remessa?</h2>
              <p>A remessa de <strong>{deleteRemessaTarget.customerName}</strong> será excluída e os pedidos voltarão para a fila.</p>
              <div className="admin-confirm-actions"><button className="admin-secondary-button" onClick={() => setDeleteRemessaTarget(null)}>Cancelar</button><button className="admin-primary-button admin-danger-button" onClick={() => void confirmDeleteRemessa()}><Trash2 size={15} /> Excluir</button></div>
            </div>
          </div>
        )}

        {deleteClienteTarget && (
          <div className="admin-confirm-backdrop" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && setDeleteClienteTarget(null)}>
            <div className="admin-confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="del-cliente-title">
              <div className="admin-eyebrow"><span /> confirmação</div><h2 id="del-cliente-title">Remover cliente?</h2>
              <p>O cadastro de <strong>{deleteClienteTarget.nome}</strong> será removido permanentemente. Os pedidos dele continuarão existindo.</p>
              <div className="admin-confirm-actions"><button className="admin-secondary-button" onClick={() => setDeleteClienteTarget(null)}>Cancelar</button><button className="admin-primary-button admin-danger-button" onClick={() => void handleDeleteCliente()}><Trash2 size={15} /> Remover</button></div>
            </div>
          </div>
        )}

        {clienteEditorTarget && (
          <ClienteEditor
            initial={clienteEditorTarget === "new" ? undefined : clienteEditorTarget}
            onClose={() => setClienteEditorTarget(null)}
            onSaved={(msg) => { setClienteEditorTarget(null); setNotice(msg); }}
          />
        )}

        {messagePerfume && (
          <div className="admin-confirm-backdrop" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && setMessagePerfume(null)}>
            <div className="admin-confirm-dialog admin-message-dialog" role="dialog" aria-modal="true" aria-labelledby="whatsapp-title">
              <div className="admin-editor-heading"><div><div className="admin-eyebrow"><span /> mensagem pronta</div><h2 id="whatsapp-title">{text(messagePerfume.name) || "Perfume"}</h2></div><button className="admin-icon-button" onClick={() => setMessagePerfume(null)} aria-label="Fechar"><X size={18} /></button></div>
              <textarea className="admin-message-textarea" readOnly value={whatsappMessage} onFocus={(e) => e.target.select()} />
              <div className="admin-confirm-actions">
                <button className="admin-secondary-button" onClick={() => setMessagePerfume(null)}>Fechar</button>
                <a className="admin-secondary-button" href={`https://wa.me/?text=${encodeURIComponent(whatsappMessage)}`} target="_blank" rel="noreferrer"><MessageCircle size={15} /> Abrir no WhatsApp</a>
                <button className="admin-primary-button" onClick={() => void copyWhatsappMessage()}><Copy size={15} /> Copiar mensagem</button>
              </div>
            </div>
          </div>
        )}

        {remessaCreatorOpen && (
          <RemessaCreator orders={allOrdersForRemessa} remessas={remessas} onClose={() => setRemessaCreatorOpen(false)} onCreated={(msg) => { setRemessaCreatorOpen(false); setNotice(msg); setTab("remessas"); }} />
        )}

        {orderCreatorOpen && (
          <OrderCreator
            perfumes={rawPerfumes}
            clientes={clientes}
            onClose={() => setOrderCreatorOpen(false)}
            onCreated={(msg) => { setOrderCreatorOpen(false); setNotice(msg); }}
          />
        )}
      </main>
    </div>
  );
}
