# Direção visual do catálogo SIAROM

## Abordagens consideradas

### Abordagem 1 — Atelier Noir
**Very Brief Intro:** Um catálogo editorial de perfumaria de nicho, com carvão profundo, marfim quente e detalhes em dourado antigo. A experiência transmite ritual, curadoria e exclusividade sem perder a clareza de compra.

**Probability:** 0.07

### Abordagem 2 — Botanical Archive
**Very Brief Intro:** Uma leitura mais leve e sensorial, baseada em papel cru, verdes botânicos, fotografia de ingredientes e uma navegação de arquivo. O foco é tornar a descoberta de fragrâncias calma, artesanal e tátil.

**Probability:** 0.03

### Abordagem 3 — Modern Sillage
**Very Brief Intro:** Uma estética cosmopolita de alto contraste, com branco óptico, preto gráfico e grandes blocos tipográficos. O catálogo se comporta como uma galeria digital de lançamentos e objetos de desejo.

**Probability:** 0.09

## Abordagem escolhida — Atelier Noir

### Design Movement
Neo-art déco editorial: a geometria disciplinada dos catálogos de luxo encontra a sensualidade de um atelier de perfumista, com referências a frascos facetados, cartões de amostra e vitrines de hotel-boutique.

### Core Principles
1. **Luxo legível:** a sofisticação aparece na hierarquia, nos materiais e no ritmo; nunca deve prejudicar a compreensão de preço, volume ou pedido.
2. **Contraste de matéria:** superfícies marfim e carvão são equilibradas por linhas finas, brilhos metálicos e fundos quase táteis.
3. **Curadoria em primeiro plano:** filtros, famílias olfativas e disponibilidade ajudam a escolher sem criar uma interface de marketplace genérica.
4. **Ritual de descoberta:** cada produto deve parecer uma ficha de arquivo que conduz naturalmente à seleção de volume e ao registro do pedido.

### Color Philosophy
O fundo principal será um marfim quente, mais próximo de papel de algodão do que de branco digital. O carvão serve de âncora e reforça a assinatura noturna da marca. O dourado antigo será usado em pequenas doses para indicar curadoria, foco e ação, enquanto um vinho profundo funciona como nota olfativa visual para estados de destaque. A cor proprietária da SIAROM será **Âmbar de Sillage — #B78A45**, um dourado terroso, discreto e reconhecível.

### Layout Paradigm
O catálogo adota uma composição assimétrica de arquivo: navegação compacta no topo, hero dividido entre manifesto e uma peça visual, faixa horizontal de famílias olfativas e uma área de produtos com filtro lateral no desktop e gaveta no mobile. A página de produto usa uma ficha editorial em duas colunas, com a imagem ocupando mais presença visual do que o formulário.

### Signature Elements
- Um monograma abstrato em forma de S e frasco, usado como selo de marca e favicon.
- Filetes dourados e pequenos marcadores numéricos que lembram fichas de perfumista.
- Cards de produto com moldura marfim, fotografia recortada e microtexto em caixa alta para volumes e famílias.

### Interaction Philosophy
As interações devem parecer manuseio de uma ficha de arquivo: filtros respondem imediatamente, cards elevam-se sutilmente, volumes selecionados recebem um contorno âmbar e os pedidos confirmados mostram uma ficha de sucesso clara. O hover é reservado a ações úteis; nenhum efeito deve parecer decorativo demais.

### Animation
Entradas do catálogo usam fade e deslocamento vertical curto, em cascata de 40ms por card. O header pode aplicar blur discreto ao rolar. Imagens ampliam no máximo 2% ao passar o cursor. A gaveta de filtros entra pela lateral em até 240ms com easing de saída forte. O fluxo de pedido usa transição curta de estado, sem confete ou excesso de movimento. Todas as animações respeitam `prefers-reduced-motion`.

### Typography System
**Cormorant Garamond** para títulos, nomes de fragrâncias e números editoriais; **DM Sans** para navegação, filtros, preços, labels e formulários. Títulos devem alternar peso regular e semibold; microtextos usam tracking generoso e caixa alta. O wordmark usa Cormorant Garamond em caixa alta com espaçamento amplo, acompanhado pelo monograma, sem depender de uma fonte padrão do navegador.

### Brand Essence
**SIAROM é uma curadoria de perfumes de luxo em frações acessíveis para quem quer experimentar com intenção, antes de escolher a assinatura completa.**

Personalidade: **reservada, sensorial, precisa**.

### Brand Voice
Headlines devem soar como uma observação de perfumista, não como publicidade agressiva. CTAs são diretos, calmos e específicos; microcopy reduz incerteza sobre volume, preço e registro do pedido.

Exemplos:
- “Encontre a nota que permanece.”
- “Escolher uma fração é começar pelo essencial.”

### Wordmark & Logo
O logotipo combina o monograma S-fragrance da marca enviada pelo usuário com um wordmark serifado de alto contraste, em caixa alta e espaçamento amplo. O monograma será tratado como selo independente em navegação, favicon e estados de carregamento, sem repetir a marca inteira em todas as superfícies.

### Signature Brand Color
**Âmbar de Sillage — #B78A45**.

## Style Decisions

- A experiência deve parecer um catálogo de atelier, não uma loja genérica de e-commerce.
- A referência de navegação limpa e cards claros será mantida, mas com mais presença editorial, contraste e refinamento de marca.
- A identidade deve funcionar em fundo claro e em blocos carvão; texto sempre será validado contra o fundo efetivamente renderizado.
- O monograma SIAROM atua como selo de atelier recorrente na navegação, nas fichas de produto, na área editorial e no rodapé.
- Cards e seletores foram tratados como fichas numeradas de arquivo, com moldura, família olfativa e microtexto de volume antes do apelo de marketplace.
- A fotografia hero e os ativos de produto seguem uma direção tátil de vidro, sombra quente, papel, pedra e líquidos âmbar.
