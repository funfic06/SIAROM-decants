# Configuração do Firebase para o SIAROM

O catálogo público lê o documento `dados/principal` em tempo real. O painel administrativo está disponível em `/admin` e também em `/admin.html`, usando Firebase Authentication com e-mail e senha. Pedidos novos são gravados na coleção `pedidos`; pedidos antigos que ainda estiverem dentro de `perfumes[].orders` aparecem como **legados** no painel e podem ser migrados uma única vez. O arquivo `admin.html` original anexado é legado e não deve ser aberto diretamente: ele lê apenas `dados/principal.perfumes[].orders` e não enxerga a nova coleção privada.

## Ativação inicial

No Firebase Console do projeto `siarom-decantshop`, ative o provedor **Email/Password** em Authentication. Em seguida, crie o usuário administrativo e confirme o e-mail conforme a política escolhida para o projeto.

Depois, crie manualmente no Firestore um documento em `admins/{UID_DO_USUARIO}` com o campo `role` definido como `admin`. O painel só libera o conteúdo depois de verificar esse documento; possuir apenas um login válido não é suficiente.

## Campos personalizados da ficha

Ao editar um perfume no painel, os campos **Resumo curto**, **Descrição principal**, **Entrega e conservação** e os cinco **Acordes principais** são salvos no próprio item dentro de `dados/principal.perfumes[]`. A página pública usa esses valores por perfume; registros antigos continuam funcionando com textos de fallback até serem editados.

## Limpeza de pedidos

Na aba **Pedidos**, o botão **Limpar entregues** remove somente pedidos com status `entregue`. Ele também remove pedidos antigos que ainda estejam no campo legado `perfumes[].orders`, sem alterar pedidos novos, confirmados, separados ou cancelados.

## Limite APC por frasco

O catálogo reserva APC usando um documento exclusivo na coleção `pedidos`: `apc-{idDoPerfume}`. Na mesma transação, ele cria um marcador mínimo em `apcStatus/{idDoPerfume}`, sem nome, contato ou forma de pagamento. O registro público consulta somente esse marcador, para que dados pessoais do pedido permaneçam privados. A ficha pública escuta o marcador e desabilita APC assim que o frasco é reservado; qualquer segunda reserva também é bloqueada. Se o pedido APC for cancelado ou removido, o marcador é removido e seus ml deixam de ser descontados. Depois desta atualização, publique novamente o conteúdo de `firestore.rules` no Console Firebase.

O estoque exibido usa o resumo público `stockStatus/{idDoPerfume}`, contendo somente os ml reservados e a data de atualização. Todo pedido novo, comum ou APC, atualiza esse resumo junto com o pedido; pedidos cancelados ou removidos devolvem o volume. Para pedidos que já existiam antes desse resumo, abra o `/admin.html` após publicar as regras: o painel recalcula o valor a partir da fila de pedidos atual e zera qualquer saldo residual de testes removidos.

## Regras

O arquivo `firestore.rules` deste projeto deve ser aplicado ao Firestore. Ele deixa o catálogo público legível, permite a criação validada de um pedido novo e restringe leitura, alteração e exclusão de pedidos aos usuários com documento admin. Também restringe gravações no documento principal do catálogo aos administradores.

## Teste recomendado

Abra `/admin`, entre com o usuário criado e confirme que os perfumes existentes aparecem. Crie um perfume de teste, verifique a publicação no catálogo, registre um pedido em uma página de produto e acompanhe o novo pedido na aba **Pedidos**. Depois, remova o item de teste pelo admin e confira que os pedidos já registrados continuam na coleção privada.
