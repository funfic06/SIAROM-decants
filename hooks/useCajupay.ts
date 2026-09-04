/**
 * useCajupay.ts
 *
 * Hook que gerencia o fluxo de gerar um link de pagamento:
 * - loading: está chamando a API
 * - paymentUrl: link pronto para copiar/abrir
 * - error: algo deu errado
 *
 * Uso no componente:
 *   const { generateLink, paymentUrl, loading, error, reset } = useCajupay();
 */

import { useState, useCallback } from "react";
import { createPaymentLink, type BagItem } from "@/lib/cajupayService";

type State = {
  loading: boolean;
  paymentUrl: string | null;
  error: string | null;
};

export function useCajupay() {
  const [state, setState] = useState<State>({
    loading: false,
    paymentUrl: null,
    error: null,
  });

  /**
   * Chama a Cajupay e gera o link de pagamento.
   * Deve ser chamado ao clicar no botão "Gerar link de pagamento".
   */
  const generateLink = useCallback(
    async (items: BagItem[], totalCents: number) => {
      setState({ loading: true, paymentUrl: null, error: null });

      // Gera um ID simples de referência (timestamp + 4 dígitos aleatórios)
      const orderRef = `${Date.now()}-${Math.floor(Math.random() * 9000) + 1000}`;

      try {
        const result = await createPaymentLink(items, totalCents, orderRef);
        setState({ loading: false, paymentUrl: result.checkoutUrl, error: null });
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Erro ao gerar link. Tente novamente.";
        setState({ loading: false, paymentUrl: null, error: message });
      }
    },
    []
  );

  /** Limpa o estado (para gerar um novo link) */
  const reset = useCallback(() => {
    setState({ loading: false, paymentUrl: null, error: null });
  }, []);

  return {
    generateLink,
    reset,
    loading: state.loading,
    paymentUrl: state.paymentUrl,
    error: state.error,
  };
}
