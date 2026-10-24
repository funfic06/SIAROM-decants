import { describe, expect, it } from "vitest";
import { buildRemessaMessage } from "./remessaMessage";

describe("buildRemessaMessage", () => {
  it("monta a mensagem no formato do exemplo", () => {
    const items = [["Sogno Reale", 78], ["Lys Sølaberg", 108], ["Danaë", 57], ["Albatros", 78], ["Anemos: Cappadocia Wild", 87], ["Aurora: Halfeti Dark", 87]].map(([perfumeName, unitPrice]) => ({ perfumeName: perfumeName as string, volumeMl: 3, quantity: 1, unitPrice: unitPrice as number }));
    const msg = buildRemessaMessage({ customerName: "Ana", customerNumber: "11999999999", items, recraves: 6, recravePrice: 6.86, pixTotal: "437,16" });
    expect(msg).toContain("* Sogno Reale 3ml R$ 78,00");
    expect(msg).toContain("6 recraves = R$ 41,16");
    expect(msg).toContain("Valor total: R$ 536,16 (Com desconto pix = R$ 437,16)");
  });
  it("omite o desconto pix quando vazio", () => {
    const msg = buildRemessaMessage({ customerName: "Ana", items: [{ perfumeName: "X", volumeMl: 5, quantity: 1, unitPrice: 10 }], recraves: 0, recravePrice: 6.86 });
    expect(msg).toContain("Valor total: R$ 10,00");
    expect(msg).not.toContain("pix");
  });
});
