// Contexto de clientes cadastrados — espelho do CatalogContext para a coleção "clientes".
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { subscribeClientes, type Cliente } from "@/lib/firebase";

type ClientesContextValue = {
  clientes: Cliente[];
  isLoading: boolean;
};

const ClientesContext = createContext<ClientesContextValue | null>(null);

export function ClientesProvider({ children }: { children: ReactNode }) {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Só faz a assinatura se o usuário estiver autenticado;
    // subscribeClientes falha silenciosamente se não houver permissão.
    const unsub = subscribeClientes(
      (next) => { setClientes(next); setIsLoading(false); },
      () => { setIsLoading(false); }
    );
    return unsub;
  }, []);

  return (
    <ClientesContext.Provider value={{ clientes, isLoading }}>
      {children}
    </ClientesContext.Provider>
  );
}

export function useClientes() {
  const value = useContext(ClientesContext);
  if (!value) throw new Error("useClientes deve ser usado dentro de ClientesProvider");
  return value;
}
