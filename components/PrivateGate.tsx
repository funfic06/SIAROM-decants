// PrivateGate: enquanto SIAROM estiver em pré-lançamento, protege o site inteiro
// com o mesmo login administrativo já usado em /admin. Quando quiser abrir ao
// público, basta trocar PRIVATE_MODE para false (uma linha) — nada mais muda.
import { FormEvent, useEffect, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import type { User } from "firebase/auth";
import { getAdminProfile, signInAdmin, subscribeAuth } from "@/lib/firebase";
import { logoMark } from "@/lib/catalog";

export const PRIVATE_MODE = true;

function authErrorMessage(error: unknown) {
  const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
  const messages: Record<string, string> = {
    "auth/invalid-credential": "E-mail ou senha incorretos.",
    "auth/user-not-found": "Este e-mail ainda não foi criado em Authentication → Users no projeto Firebase.",
    "auth/wrong-password": "A senha não confere com a senha cadastrada para este usuário.",
    "auth/too-many-requests": "Muitas tentativas foram feitas. Aguarde alguns minutos e tente novamente.",
    "auth/network-request-failed": "A conexão com o Firebase falhou. Verifique a internet e tente novamente.",
  };
  return messages[code] || `Não foi possível entrar${code ? ` (${code})` : ""}.`;
}

export default function PrivateGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [checkingProfile, setCheckingProfile] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => subscribeAuth((next) => {
    setUser(next);
    setReady(true);
    if (!next) { setAuthorized(false); return; }
    setCheckingProfile(true);
    void getAdminProfile(next).then((allowed) => { setAuthorized(allowed); setCheckingProfile(false); });
  }), []);

  if (!PRIVATE_MODE) return <>{children}</>;
  if (!ready || checkingProfile) return <div className="admin-boot"><span className="loading-orbit" /> Verificando acesso…</div>;
  if (user && authorized) return <>{children}</>;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try { await signInAdmin(email.trim(), password); }
    catch (nextError) { console.error("Erro no login de pré-lançamento:", nextError); setError(authErrorMessage(nextError)); }
    finally { setBusy(false); }
  };

  return (
    <div className="admin-login">
      <div className="admin-login-card">
        <div className="admin-seal"><img src={logoMark} alt="" /></div>
        <div className="admin-eyebrow"><span /> pré-lançamento</div>
        <h1>Em breve<br /><em>ao público.</em></h1>
        <p>{user ? "Este login existe, mas ainda não está autorizado a visualizar o site." : "O site está em preparação. Entre com o login autorizado para visualizar."}</p>
        {!user && <form onSubmit={submit}>
          <label><span>E-mail</span><input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="seu@email.com" /></label>
          <label><span>Senha</span><input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Sua senha" /></label>
          {error && <div className="admin-error">{error}</div>}
          <button className="admin-primary-button" disabled={busy}>{busy ? "Verificando…" : "Entrar"}<ArrowUpRight size={16} /></button>
        </form>}
      </div>
    </div>
  );
}
