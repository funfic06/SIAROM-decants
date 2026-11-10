import { describe, expect, it } from "vitest";
import { extractPerfumeTitle, matchCliente, matchPerfume, parseReply } from "./orderParser";

const options = { volumes: [3, 5, 7, 10, 15, 20, 30], hasApc: true, apcMl: 40 };

describe("parseReply", () => {
  it("lê um número solto como volume", () => {
    expect(parseReply("3", options)).toEqual({ status: "ok", items: [{ volumeMl: 3, isApc: false, quantity: 1 }], notes: [] });
  });

  it("aceita unidade e texto em volta", () => {
    expect(parseReply("Quero 7 ml, por favor", options).items).toEqual([{ volumeMl: 7, isApc: false, quantity: 1 }]);
    expect(parseReply("10ML", options).items).toEqual([{ volumeMl: 10, isApc: false, quantity: 1 }]);
  });

  it("lê vários volumes e soma repetidos", () => {
    expect(parseReply("3 e 5", options).items).toEqual([
      { volumeMl: 3, isApc: false, quantity: 1 },
      { volumeMl: 5, isApc: false, quantity: 1 },
    ]);
    expect(parseReply("5 e 5", options).items).toEqual([{ volumeMl: 5, isApc: false, quantity: 2 }]);
  });

  it("entende quantidade com x ou 'de'", () => {
    expect(parseReply("2x5ml", options).items).toEqual([{ volumeMl: 5, isApc: false, quantity: 2 }]);
    expect(parseReply("2 de 10ml", options).items).toEqual([{ volumeMl: 10, isApc: false, quantity: 2 }]);
    expect(parseReply("5ml x2", options).items).toEqual([{ volumeMl: 5, isApc: false, quantity: 2 }]);
  });

  it("não adivinha quando 'N x M' pode ser quantidade ou volume", () => {
    const result = parseReply("5x3", options);
    expect(result.status).toBe("ambiguous");
    expect(result.items).toEqual([]);
  });

  it("reconhece APC", () => {
    expect(parseReply("apc", options).items).toEqual([{ volumeMl: 40, isApc: true, quantity: 1 }]);
    expect(parseReply("APC + 40ml", options).items).toEqual([{ volumeMl: 40, isApc: true, quantity: 1 }]);
  });

  it("recusa APC quando o perfume não tem", () => {
    const result = parseReply("apc", { volumes: options.volumes, hasApc: false });
    expect(result.status).toBe("ambiguous");
    expect(result.items).toEqual([]);
  });

  it("não registra volume que o perfume não tem", () => {
    const result = parseReply("4", options);
    expect(result.status).toBe("ambiguous");
    expect(result.items).toEqual([]);
    expect(result.notes[0]).toContain("4 ml");
  });

  it("não registra cancelamento, troca ou mensagem condicional", () => {
    expect(parseReply("cancela o de 5", options).status).toBe("ambiguous");
    expect(parseReply("troca pra 10", options).items).toEqual([]);
    expect(parseReply("5 ou 10", options).status).toBe("ambiguous");
    expect(parseReply("se acabar manda o de 10", options).items).toEqual([]);
  });

  it("devolve vazio quando não há volume", () => {
    expect(parseReply("bom dia", options).status).toBe("empty");
    expect(parseReply("   ", options).status).toBe("empty");
  });
});

describe("matchPerfume", () => {
  const perfumes = [
    { id: "a", name: "PARADIS - NVRNAGN", brand: "" },
    { id: "b", name: "Santal 33", brand: "Le Labo" },
    { id: "c", name: "Santal 33 Intense", brand: "Le Labo" },
    { id: "d", name: "Oculto", brand: "X", available: false },
  ];

  it("acha pelo título da primeira linha", () => {
    expect(matchPerfume(perfumes, "PARADIS - NVRNAGN\n\nObservação: Frete...").perfume?.id).toBe("a");
    expect(matchPerfume(perfumes, "Santal 33 · Le Labo\n\nR$ 10/ml").perfume?.id).toBe("b");
  });

  it("ignora acentos, caixa e prefixo de copia do WhatsApp", () => {
    expect(matchPerfume(perfumes, "[10:32, 09/10/2026] Rafic: paradis - nvrnagn\nOutra linha").perfume?.id).toBe("a");
  });

  it("não escolhe quando há mais de um candidato parecido", () => {
    expect(matchPerfume(perfumes, "Santal").perfume).toBeNull();
  });

  it("não encontra perfume oculto nem título vazio", () => {
    expect(matchPerfume(perfumes, "Oculto").perfume).toBeNull();
    expect(matchPerfume(perfumes, "").confidence).toBe("none");
  });

  it("extrai o título", () => {
    expect(extractPerfumeTitle("\n\n  Título  \nresto")).toBe("Título");
  });
});

describe("matchCliente", () => {
  const clientes = [
    { nome: "Luriana Bayião", telefone: "(84) 98121-2447" },
    { nome: "Lidia Baiarini", telefone: "71 99626-2442" },
    { nome: "Pedro", telefone: "" },
  ];

  it("acha pelo telefone, ignorando formatação e DDI", () => {
    expect(matchCliente(clientes, "+55 84 98121-2447")?.nome).toBe("Luriana Bayião");
  });

  it("acha pelo nome, com ou sem o til do WhatsApp", () => {
    expect(matchCliente(clientes, "~ Lidia Baiarini")?.nome).toBe("Lidia Baiarini");
    expect(matchCliente(clientes, "luriana")?.nome).toBe("Luriana Bayião");
  });

  it("devolve null quando não há candidato único", () => {
    expect(matchCliente(clientes, "Ba")).toBeNull();
    expect(matchCliente(clientes, "+55 11 90000-0000")).toBeNull();
    expect(matchCliente(clientes, "")).toBeNull();
  });
});
