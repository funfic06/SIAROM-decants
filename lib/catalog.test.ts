import { describe, expect, it } from "vitest";
import { adaptPerfume, buildWhatsappMessage } from "./catalog";

describe("regras de APC e mensagem do catálogo", () => {
  const raw = {
    id: "perfume-teste",
    name: "Perfume Teste",
    brand: "Marca Teste",
    type: "Compartilhável",
    pricePerMl: "92",
    recavePrice: "5,80",
    totalMl: "2300",
    hasApc: true,
    apcMl: 25,
    apcFrasco: "0",
    customVolumes: [25],
  };

  it("não acrescenta R$ 10 quando o frasco APC custa zero", () => {
    const perfume = adaptPerfume(raw);
    expect(perfume.apc?.price).toBe(2300);
    const message = buildWhatsappMessage(raw).replace(/\u00a0/g, " ");
    expect(message).toContain("APC + 25 ml = R$ 2.300,00");
    expect(message).not.toContain("R$ 2.310,00");
  });

  it("escreve recrave e atualiza pedidos e saldo restante", () => {
    const message = buildWhatsappMessage(raw, [
      {
        id: "pedido-1",
        perfumeId: "perfume-teste",
        customerName: "Ana",
        volumeMl: 25,
        quantity: 1,
        status: "novo",
      },
      {
        id: "pedido-2",
        perfumeId: "perfume-teste",
        customerName: "Bruno",
        volumeMl: 50,
        quantity: 1,
        status: "confirmado",
      },
      {
        id: "pedido-cancelado",
        perfumeId: "perfume-teste",
        customerName: "Cancelado",
        volumeMl: 100,
        quantity: 1,
        status: "cancelado",
      },
    ]);

    expect(message).toContain("R$ 5,80 (recrave)");
    expect(message).not.toContain("(recave)");
    expect(message).toContain("Pedidos registrados:");
    expect(message).toContain("Ana: 25 ml");
    expect(message).toContain("Bruno: 50 ml");
    expect(message).not.toContain("Cancelado: 100 ml");
    expect(message).toContain("2225 ml restantes disponíveis para venda");
  });
});
