// Aba "Pedido por mensagem": o admin cola a ficha citada e a resposta do cliente, o sistema interpreta
// (regras gratuitas primeiro, IA opcional), o admin confere e confirma, e a mensagem atualizada fica pronta para copiar.
import { useMemo, useRef, useState } from "react";
import { AlertCircle, Check, Copy, MessageCircle, Plus, Sparkles, Trash2, Wand2 } from "lucide-react";
import { apcInfoFor, buildWhatsappMessage, remainingMlFor, unitPriceFor, volumesFor, type WhatsappMessageOrder } from "@/lib/catalog";
import { createCliente, createCustomerOrder, type Cliente } from "@/lib/firebase";
import { AiUnavailableError, interpretWithAi } from "@/lib/interpretarPedido";
import { matchCliente, matchPerfume, parseReply, type ParsedOrderItem } from "@/lib/orderParser";

type Props = {
  rawPerfumes: Record<string, unknown>[];
  clientes: Cliente[];
  ordersFor: (raw: Record<string, unknown>) => WhatsappMessageOrder[];
  onNotice: (message: string) => void;
};

type DraftItem = { key: number; value: string; quantity: number };
type Analysis = { status: "ok" | "ambiguous" | "empty"; notes: string[]; source: "regras" | "ia" };

function text(value: unknown) { return typeof value === "string" ? value : value == null ? "" : String(value); }
function perfumeKey(raw: Record<string, unknown>) { return text(raw.id) || text(raw.name); }

const field = { padding: "8px 12px", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", background: "var(--surface-raised)", color: "var(--text-primary)", fontSize: "0.84rem", fontFamily: "inherit", outline: "none", width: "100%" } as const;
const labelStyle = { display: "flex", flexDirection: "column", gap: 5 } as const;
const spanStyle = { fontSize: "0.74rem", fontWeight: 600, color: "var(--text-secondary)" } as const;

export function PedidoPorMensagem({ rawPerfumes, clientes, ordersFor, onNotice }: Props) {
  const [quoted, setQuoted] = useState("");
  const [reply, setReply] = useState("");
  const [sender, setSender] = useState("");
  const [perfumeId, setPerfumeId] = useState("");
  const [clienteId, setClienteId] = useState("");
  const [novoNome, setNovoNome] = useState("");
  const [novoTelefone, setNovoTelefone] = useState("");
  const [payment, setPayment] = useState("pix");
  const [items, setItems] = useState<DraftItem[]>([]);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [hints, setHints] = useState<string[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [allowOver, setAllowOver] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [registered, setRegistered] = useState<{ perfumeId: string; summary: string } | null>(null);
  const keyRef = useRef(0);

  const activePerfumes = useMemo(() => rawPerfumes.filter((raw) => raw.available !== false), [rawPerfumes]);
  const perfume = activePerfumes.find((raw) => perfumeKey(raw) === perfumeId) || null;
  const volumes = perfume ? volumesFor(perfume) : [];
  const apc = perfume ? apcInfoFor(perfume) : { hasApc: false, apcMl: 0 };
  const cliente = clienteId && clienteId !== "novo" ? clientes.find((item) => item.id === clienteId) || null : null;

  const toDraft = (parsed: ParsedOrderItem[]): DraftItem[] => parsed.map((item) => ({ key: ++keyRef.current, value: item.isApc ? "apc" : String(item.volumeMl), quantity: item.quantity }));

  // Descobre perfume e cliente a partir do texto colado. Devolve o perfume escolhido para o passo seguinte.
  const resolveContext = () => {
    const nextHints: string[] = [];
    let chosen = perfume;
    if (quoted.trim()) {
      const match = matchPerfume(rawPerfumes, quoted);
      if (match.perfume) {
        chosen = match.perfume;
        setPerfumeId(perfumeKey(match.perfume));
        if (match.confidence === "partial") nextHints.push(`Perfume reconhecido de forma aproximada: ${text(match.perfume.name)}. Confira.`);
      } else if (!chosen) {
        nextHints.push("Não reconheci o perfume pela ficha. Escolha na lista.");
      }
    }
    if (sender.trim()) {
      const found = matchCliente(clientes, sender);
      if (found?.id) { setClienteId(found.id); }
      else {
        setClienteId("novo");
        const digits = sender.replace(/\D+/g, "");
        if (digits.length >= 8) { setNovoTelefone(sender.trim()); } else { setNovoNome(sender.replace(/^~\s*/, "").trim()); }
        nextHints.push("Cliente não encontrado na aba Clientes. Confira os dados abaixo para cadastrar.");
      }
    }
    setHints(nextHints);
    return chosen;
  };

  const interpret = () => {
    setError(""); setAiError(""); setRegistered(null); setAllowOver(false);
    if (!reply.trim()) { setError("Cole a resposta do cliente."); return; }
    const chosen = resolveContext();
    if (!chosen) { setAnalysis(null); setItems([]); setError("Escolha o perfume (ou cole a ficha citada para eu reconhecer)."); return; }
    const info = apcInfoFor(chosen);
    const result = parseReply(reply, { volumes: volumesFor(chosen), hasApc: info.hasApc, apcMl: info.apcMl });
    setItems(toDraft(result.items));
    setAnalysis({ status: result.status, notes: result.notes, source: "regras" });
  };

  const interpretWithClaude = async () => {
    setError(""); setAiError(""); setRegistered(null); setAllowOver(false);
    if (!reply.trim()) { setError("Cole a resposta do cliente."); return; }
    const chosen = resolveContext();
    if (!chosen) { setError("Escolha o perfume (ou cole a ficha citada para eu reconhecer)."); return; }
    const info = apcInfoFor(chosen);
    const allowed = volumesFor(chosen);
    setAiLoading(true);
    try {
      const result = await interpretWithAi({ perfumeName: text(chosen.name), quotedMessage: quoted, replyText: reply, availableVolumes: allowed, hasApc: info.hasApc, apcMl: info.apcMl });
      const safe = result.items.filter((item) => (item.isApc ? info.hasApc : allowed.includes(item.volumeMl)));
      setItems(toDraft(safe));
      setAnalysis({ status: result.needsReview || !safe.length ? "ambiguous" : "ok", notes: result.note ? [result.note] : [], source: "ia" });
    } catch (err) {
      setAiError(err instanceof AiUnavailableError || err instanceof Error ? err.message : "A IA não respondeu.");
    } finally { setAiLoading(false); }
  };

  const updateItem = (key: number, patch: Partial<DraftItem>) => setItems((current) => current.map((item) => item.key === key ? { ...item, ...patch } : item));
  const removeItem = (key: number) => setItems((current) => current.filter((item) => item.key !== key));
  const addItem = () => { if (perfume) setItems((current) => [...current, { key: ++keyRef.current, value: String(volumes[0] ?? ""), quantity: 1 }]); setAnalysis((current) => current || { status: "ok", notes: [], source: "regras" }); };

  const resolved = items.map((item) => {
    const isApc = item.value === "apc";
    const volumeMl = isApc ? apc.apcMl : Number(item.value);
    return { key: item.key, isApc, volumeMl, quantity: isApc ? 1 : Math.max(1, Math.floor(item.quantity) || 1) };
  });
  const currentOrders = perfume ? ordersFor(perfume) : [];
  const remaining = perfume ? remainingMlFor(perfume, currentOrders) : 0;
  const totalKnown = perfume ? Number(String(perfume.totalMl ?? "").replace(",", ".")) > 0 : false;
  const requestedMl = resolved.reduce((sum, item) => sum + item.volumeMl * item.quantity, 0);
  const overStock = totalKnown && requestedMl > remaining;
  const customerName = cliente?.nome || novoNome.trim();
  const customerPhone = cliente?.telefone || novoTelefone.trim();
  const duplicateNote = useMemo(() => {
    if (!perfume || !customerName) return "";
    const key = customerName.toLowerCase();
    const repeated = resolved.find((item) => currentOrders.some((order) => String(order.status || "novo") !== "cancelado" && text(order.customerName).toLowerCase() === key && Number(order.volumeMl) === item.volumeMl && Boolean(order.isApc) === item.isApc));
    return repeated ? `${customerName} já tem um pedido de ${repeated.isApc ? `APC + ${repeated.volumeMl}` : repeated.volumeMl} ml neste perfume. Confirme que não é a mesma mensagem.` : "";
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perfume, customerName, items, currentOrders.length]);

  const canConfirm = Boolean(perfume) && resolved.length > 0 && Boolean(customerName) && Boolean(customerPhone) && resolved.every((item) => item.volumeMl > 0) && (!overStock || allowOver) && !saving;

  const confirm = async () => {
    if (!perfume || !canConfirm) return;
    setSaving(true); setError("");
    let done = 0;
    try {
      const name = customerName;
      const phone = customerPhone;
      if (!cliente) {
        await createCliente({ nome: name, telefone: phone, criadoEm: new Date().toISOString() });
      }
      for (const item of resolved) {
        await createCustomerOrder({
          perfumeId: perfumeKey(perfume), perfumeName: text(perfume.name), brand: text(perfume.brand),
          volumeMl: item.volumeMl, quantity: item.quantity, unitPrice: unitPriceFor(perfume, item.volumeMl, item.isApc),
          customerName: name, contact: phone, payment, status: "novo", createdAt: new Date().toISOString(), source: "catalogo", isApc: item.isApc,
        });
        done += 1;
      }
      const summary = resolved.map((item) => `${item.isApc ? `APC + ${item.volumeMl} ml` : `${item.volumeMl} ml`}${item.quantity > 1 ? ` x${item.quantity}` : ""}`).join(", ");
      setRegistered({ perfumeId: perfumeKey(perfume), summary: `${name}: ${summary}` });
      onNotice(`Pedido de ${name} registrado (${summary}).`);
      setReply(""); setSender(""); setItems([]); setAnalysis(null); setHints([]); setClienteId(""); setNovoNome(""); setNovoTelefone(""); setAllowOver(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      const base = message === "apc-limit-reached" ? "O APC deste perfume já foi reservado." : "Não foi possível registrar. Tente novamente.";
      setError(done > 0 ? `${base} ${done} de ${resolved.length} item(ns) já foram registrados; confira a aba Pedidos antes de tentar de novo.` : base);
    } finally { setSaving(false); }
  };

  const registeredPerfume = registered ? rawPerfumes.find((raw) => perfumeKey(raw) === registered.perfumeId) || null : null;
  const updatedMessage = registeredPerfume ? buildWhatsappMessage(registeredPerfume, ordersFor(registeredPerfume)) : "";
  const copyMessage = async () => { try { await navigator.clipboard.writeText(updatedMessage); onNotice("Mensagem atualizada copiada."); } catch { onNotice("Não foi possível copiar. Selecione e copie manualmente."); } };

  const statusColor = analysis?.status === "ok" ? "var(--accent)" : "var(--warning)";

  return (
    <section className="admin-section">
      <div className="admin-section-heading">
        <div><span className="admin-form-kicker">WhatsApp</span><h2>Pedido por mensagem</h2></div>
      </div>
      <p style={{ margin: "0 0 1rem", fontSize: "0.84rem", color: "var(--text-secondary)" }}>
        Cole a ficha que o cliente citou e a resposta dele. Eu leio o perfume, o volume e o cliente, você confere e confirma, e a mensagem atualizada fica pronta para reenviar.
      </p>

      <div style={{ display: "grid", gap: 12 }}>
        <label style={labelStyle}><span style={spanStyle}>Ficha citada pelo cliente (opcional se escolher o perfume abaixo)</span>
          <textarea style={{ ...field, minHeight: 96, resize: "vertical" }} value={quoted} onChange={(e) => setQuoted(e.target.value)} placeholder={"PARADIS - NVRNAGN\n\nObservação: Frete não incluso…"} />
        </label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
          <label style={labelStyle}><span style={spanStyle}>Resposta do cliente *</span>
            <textarea style={{ ...field, minHeight: 72, resize: "vertical" }} value={reply} onChange={(e) => setReply(e.target.value)} placeholder="3" />
          </label>
          <label style={labelStyle}><span style={spanStyle}>Quem enviou (nome ou número)</span>
            <input style={field} value={sender} onChange={(e) => setSender(e.target.value)} placeholder="~ Luriana Bayião ou +55 84 8121-2447" />
          </label>
          <label style={labelStyle}><span style={spanStyle}>Perfume</span>
            <select style={field} value={perfumeId} onChange={(e) => { setPerfumeId(e.target.value); setItems([]); setAnalysis(null); }}>
              <option value="">Reconhecer pela ficha</option>
              {activePerfumes.map((raw) => <option key={perfumeKey(raw)} value={perfumeKey(raw)}>{text(raw.name)}{text(raw.brand) ? ` — ${text(raw.brand)}` : ""}</option>)}
            </select>
          </label>
        </div>
        <div className="admin-header-actions">
          <button className="admin-primary-button" onClick={interpret} disabled={!reply.trim()}><Wand2 size={15} /> Interpretar</button>
          <button className="admin-secondary-button" onClick={() => void interpretWithClaude()} disabled={!reply.trim() || aiLoading}><Sparkles size={15} /> {aiLoading ? "Consultando IA…" : "Interpretar com IA"}</button>
        </div>
      </div>

      {error && <div className="admin-error" style={{ marginTop: "0.75rem" }}><AlertCircle size={15} style={{ flexShrink: 0 }} /> {error}</div>}
      {aiError && <div className="admin-error" style={{ marginTop: "0.75rem" }}><AlertCircle size={15} style={{ flexShrink: 0 }} /> {aiError}</div>}

      {analysis && perfume && (
        <div style={{ marginTop: "1.25rem", display: "grid", gap: 12, padding: 16, border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", background: "var(--surface-raised)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", alignItems: "baseline" }}>
            <strong>{text(perfume.name)}{text(perfume.brand) ? ` · ${text(perfume.brand)}` : ""}</strong>
            <span style={{ fontSize: "0.74rem", color: statusColor, fontWeight: 600 }}>
              {analysis.status === "ok" ? `Lido com ${analysis.source === "ia" ? "IA" : "regras"}: confira e confirme` : "Precisa de revisão"}
            </span>
          </div>

          {[...hints, ...analysis.notes].map((note, index) => (
            <div key={index} style={{ fontSize: "0.8rem", color: "var(--warning)", display: "flex", gap: 6, alignItems: "flex-start" }}><AlertCircle size={14} style={{ flexShrink: 0, marginTop: 2 }} /> {note}</div>
          ))}
          {analysis.status !== "ok" && analysis.source === "regras" && (
            <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>Dica: use <strong>Interpretar com IA</strong> para mensagens mais bagunçadas, ou ajuste os itens abaixo à mão.</div>
          )}

          <div style={{ display: "grid", gap: 8 }}>
            <span style={spanStyle}>Itens do pedido</span>
            {resolved.length === 0 && <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Nenhum item. Adicione manualmente.</div>}
            {items.map((item) => (
              <div key={item.key} style={{ display: "grid", gridTemplateColumns: "1fr 90px auto", gap: 8, alignItems: "center" }}>
                <select style={field} value={item.value} onChange={(e) => updateItem(item.key, { value: e.target.value })}>
                  {volumes.map((ml) => <option key={ml} value={String(ml)}>{ml} ml</option>)}
                  {apc.hasApc && <option value="apc">APC + {apc.apcMl} ml</option>}
                </select>
                <input style={field} type="number" min="1" value={item.value === "apc" ? 1 : item.quantity} disabled={item.value === "apc"} onChange={(e) => updateItem(item.key, { quantity: Number(e.target.value) || 1 })} aria-label="Quantidade" />
                <button className="admin-icon-button" onClick={() => removeItem(item.key)} aria-label="Remover item"><Trash2 size={15} /></button>
              </div>
            ))}
            <button className="admin-secondary-button" style={{ width: "fit-content" }} onClick={addItem}><Plus size={14} /> Adicionar item</button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
            <label style={labelStyle}><span style={spanStyle}>Cliente *</span>
              <select style={field} value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
                <option value="" disabled>Selecione o cliente</option>
                {clientes.map((item) => <option key={item.id} value={item.id}>{item.nome}{item.telefone ? ` — ${item.telefone}` : ""}</option>)}
                <option value="novo">+ Cadastrar cliente novo</option>
              </select>
            </label>
            <label style={labelStyle}><span style={spanStyle}>Pagamento</span>
              <select style={field} value={payment} onChange={(e) => setPayment(e.target.value)}>
                <option value="pix">Pix</option><option value="cartao_credito">Cartão de crédito</option>
              </select>
            </label>
          </div>
          {clienteId === "novo" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
              <label style={labelStyle}><span style={spanStyle}>Nome do cliente novo *</span><input style={field} value={novoNome} onChange={(e) => setNovoNome(e.target.value)} /></label>
              <label style={labelStyle}><span style={spanStyle}>Telefone *</span><input style={field} value={novoTelefone} onChange={(e) => setNovoTelefone(e.target.value)} placeholder="(71) 99999-9999" /></label>
            </div>
          )}
          {cliente && !cliente.telefone && <div style={{ fontSize: "0.8rem", color: "var(--warning)" }}>Este cliente não tem telefone cadastrado, e o pedido exige um contato. Edite o cliente na aba Clientes.</div>}

          {totalKnown && resolved.length > 0 && (
            <div style={{ fontSize: "0.8rem", color: overStock ? "var(--danger)" : "var(--text-secondary)" }}>
              Estoque: {remaining} ml disponíveis, este pedido usa {requestedMl} ml, sobram {Math.max(0, remaining - requestedMl)} ml.
            </div>
          )}
          {overStock && (
            <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: "0.8rem", color: "var(--danger)" }}>
              <input type="checkbox" checked={allowOver} onChange={(e) => setAllowOver(e.target.checked)} /> O pedido passa do estoque restante. Registrar mesmo assim.
            </label>
          )}
          {duplicateNote && <div style={{ fontSize: "0.8rem", color: "var(--warning)", display: "flex", gap: 6 }}><AlertCircle size={14} style={{ flexShrink: 0, marginTop: 2 }} /> {duplicateNote}</div>}

          <div className="admin-confirm-actions">
            <button className="admin-primary-button" disabled={!canConfirm} onClick={() => void confirm()}><Check size={15} /> {saving ? "Registrando…" : "Confirmar e registrar"}</button>
          </div>
        </div>
      )}

      {registered && registeredPerfume && (
        <div style={{ marginTop: "1.25rem", display: "grid", gap: 10 }}>
          <div className="admin-notice" style={{ margin: 0 }}><Check size={15} /> Registrado: {registered.summary}. Abaixo está a mensagem atualizada de <strong>{text(registeredPerfume.name)}</strong>.</div>
          <textarea className="admin-message-textarea" readOnly value={updatedMessage} onFocus={(e) => e.target.select()} />
          <div className="admin-confirm-actions">
            <a className="admin-secondary-button" href={`https://wa.me/?text=${encodeURIComponent(updatedMessage)}`} target="_blank" rel="noreferrer"><MessageCircle size={15} /> Abrir no WhatsApp</a>
            <button className="admin-primary-button" onClick={() => void copyMessage()}><Copy size={15} /> Copiar mensagem</button>
          </div>
        </div>
      )}
    </section>
  );
}
