# Matriz de testes do PDV

Execução: 2026-09-13T05:17:41.199Z. 70 casos automatizados, 70 passaram, 0 falharam. Falhas permanecem abertas; não foram convertidas em testes de falha esperada.

Os passos exatos e as expectativas estão no teste de mesmo nome. Cada caso inicia um restaurante sintético com caixa de R$200, produto de R$20 e estoque de 1.000 unidades. Firebase e áudio são substituídos no setup.

| ID | Cenário | Passos | Resultado esperado | Resultado obtido | Severidade | Status | Bug encontrado |
|---|---|---|---|---|---|---|---|---|
| QA-001 | MAT preço 0.01 | Executar o caso de mesmo nome em src/tests/pdv.test.tsx, com fixture isolada | Asserções do caso; rejeitar operações inválidas sem alterar estado | Asserções satisfeitas | — | PASSOU | Não observado neste caso |
| QA-002 | MAT preço 0.1 | Executar o caso de mesmo nome em src/tests/pdv.test.tsx, com fixture isolada | Asserções do caso; rejeitar operações inválidas sem alterar estado | Asserções satisfeitas | — | PASSOU | Não observado neste caso |
| QA-003 | MAT preço 0.99 | Executar o caso de mesmo nome em src/tests/pdv.test.tsx, com fixture isolada | Asserções do caso; rejeitar operações inválidas sem alterar estado | Asserções satisfeitas | — | PASSOU | Não observado neste caso |
| QA-004 | MAT preço 1.99 | Executar o caso de mesmo nome em src/tests/pdv.test.tsx, com fixture isolada | Asserções do caso; rejeitar operações inválidas sem alterar estado | Asserções satisfeitas | — | PASSOU | Não observado neste caso |
| QA-005 | MAT preço 10.5 | Executar o caso de mesmo nome em src/tests/pdv.test.tsx, com fixture isolada | Asserções do caso; rejeitar operações inválidas sem alterar estado | Asserções satisfeitas | — | PASSOU | Não observado neste caso |
| QA-006 | MAT preço 99.99 | Executar o caso de mesmo nome em src/tests/pdv.test.tsx, com fixture isolada | Asserções do caso; rejeitar operações inválidas sem alterar estado | Asserções satisfeitas | — | PASSOU | Não observado neste caso |
| QA-007 | MAT preço 999.99 | Executar o caso de mesmo nome em src/tests/pdv.test.tsx, com fixture isolada | Asserções do caso; rejeitar operações inválidas sem alterar estado | Asserções satisfeitas | — | PASSOU | Não observado neste caso |
| QA-008 | MAT 3 x 3,33 = 9,99 | Executar o caso de mesmo nome em src/tests/pdv.test.tsx, com fixture isolada | Asserções do caso; rejeitar operações inválidas sem alterar estado | Asserções satisfeitas | — | PASSOU | Não observado neste caso |
| QA-009 | MAT 0,10 + 0,20 = 0,30 sem saldo residual | Executar o caso de mesmo nome em src/tests/pdv.test.tsx, com fixture isolada | Asserções do caso; rejeitar operações inválidas sem alterar estado | Asserções satisfeitas | — | PASSOU | Não observado neste caso |
| QA-010 | MAT desconto 0.2 | Executar o caso de mesmo nome em src/tests/pdv.test.tsx, com fixture isolada | Asserções do caso; rejeitar operações inválidas sem alterar estado | Asserções satisfeitas | — | PASSOU | Não observado neste caso |
| QA-011 | MAT desconto 10 | Executar o caso de mesmo nome em src/tests/pdv.test.tsx, com fixture isolada | Asserções do caso; rejeitar operações inválidas sem alterar estado | Asserções satisfeitas | — | PASSOU | Não observado neste caso |
| QA-012 | MAT desconto 20 | Executar o caso de mesmo nome em src/tests/pdv.test.tsx, com fixture isolada | Asserções do caso; rejeitar operações inválidas sem alterar estado | Asserções satisfeitas | — | PASSOU | Não observado neste caso |
| QA-013 | MAT acrescimo serviço e entrega | Executar o caso de mesmo nome em src/tests/pdv.test.tsx, com fixture isolada | Asserções do caso; rejeitar operações inválidas sem alterar estado | Asserções satisfeitas | — | PASSOU | Não observado neste caso |
| QA-014 | VEN pedido vazio deve ser rejeitado | Executar o caso de mesmo nome em src/tests/pdv.test.tsx, com fixture isolada | Asserções do caso; rejeitar operações inválidas sem alterar estado | Asserções satisfeitas | — | PASSOU | Não observado neste caso |
| QA-015 | VEN quantidade inválida -1 | Executar o caso de mesmo nome em src/tests/pdv.test.tsx, com fixture isolada | Asserções do caso; rejeitar operações inválidas sem alterar estado | Asserções satisfeitas | — | PASSOU | Não observado neste caso |
| QA-016 | VEN quantidade inválida 0 | Executar o caso de mesmo nome em src/tests/pdv.test.tsx, com fixture isolada | Asserções do caso; rejeitar operações inválidas sem alterar estado | Asserções satisfeitas | — | PASSOU | Não observado neste caso |
| QA-017 | VEN quantidade inválida NaN | Executar o caso de mesmo nome em src/tests/pdv.test.tsx, com fixture isolada | Asserções do caso; rejeitar operações inválidas sem alterar estado | Asserções satisfeitas | — | PASSOU | Não observado neste caso |
| QA-018 | VEN quantidade inválida Infinity | Executar o caso de mesmo nome em src/tests/pdv.test.tsx, com fixture isolada | Asserções do caso; rejeitar operações inválidas sem alterar estado | Asserções satisfeitas | — | PASSOU | Não observado neste caso |
| QA-019 | VEN desconto acima do subtotal deve ser rejeitado | Executar o caso de mesmo nome em src/tests/pdv.test.tsx, com fixture isolada | Asserções do caso; rejeitar operações inválidas sem alterar estado | Asserções satisfeitas | — | PASSOU | Não observado neste caso |
| QA-020 | PRO preço do carrinho preservado após alteração | Executar o caso de mesmo nome em src/tests/pdv.test.tsx, com fixture isolada | Asserções do caso; rejeitar operações inválidas sem alterar estado | Asserções satisfeitas | — | PASSOU | Não observado neste caso |
| QA-021 | PRO excluir produto preserva histórico | Executar o caso de mesmo nome em src/tests/pdv.test.tsx, com fixture isolada | Asserções do caso; rejeitar operações inválidas sem alterar estado | Asserções satisfeitas | — | PASSOU | Não observado neste caso |
| QA-022 | PRO preço inválido -1 rejeitado | Executar o caso de mesmo nome em src/tests/pdv.test.tsx, com fixture isolada | Asserções do caso; rejeitar operações inválidas sem alterar estado | Asserções satisfeitas | — | PASSOU | Não observado neste caso |
| QA-023 | PRO preço inválido NaN rejeitado | Executar o caso de mesmo nome em src/tests/pdv.test.tsx, com fixture isolada | Asserções do caso; rejeitar operações inválidas sem alterar estado | Asserções satisfeitas | — | PASSOU | Não observado neste caso |
| QA-024 | PRO preço inválido Infinity rejeitado | Executar o caso de mesmo nome em src/tests/pdv.test.tsx, com fixture isolada | Asserções do caso; rejeitar operações inválidas sem alterar estado | Asserções satisfeitas | — | PASSOU | Não observado neste caso |
| QA-025 | PER usuário sem permissão não exclui produto | Executar o caso de mesmo nome em src/tests/pdv.test.tsx, com fixture isolada | Asserções do caso; rejeitar operações inválidas sem alterar estado | Asserções satisfeitas | — | PASSOU | Não observado neste caso |
| QA-026 | LAN adicionais pagos e gratuitos | Executar o caso de mesmo nome em src/tests/pdv.test.tsx, com fixture isolada | Asserções do caso; rejeitar operações inválidas sem alterar estado | Asserções satisfeitas | — | PASSOU | Não observado neste caso |
| QA-027 | LAN remover item preserva valor de adicionais restantes | Executar o caso de mesmo nome em src/tests/pdv.test.tsx, com fixture isolada | Asserções do caso; rejeitar operações inválidas sem alterar estado | Asserções satisfeitas | — | PASSOU | Não observado neste caso |
| QA-028 | SEG observação longa com emojis preservada | Executar o caso de mesmo nome em src/tests/pdv.test.tsx, com fixture isolada | Asserções do caso; rejeitar operações inválidas sem alterar estado | Asserções satisfeitas | — | PASSOU | Não observado neste caso |
| QA-029 | PAG método dinheiro | Executar o caso de mesmo nome em src/tests/pdv.test.tsx, com fixture isolada | Asserções do caso; rejeitar operações inválidas sem alterar estado | Asserções satisfeitas | — | PASSOU | Não observado neste caso |
| QA-030 | PAG método pix | Executar o caso de mesmo nome em src/tests/pdv.test.tsx, com fixture isolada | Asserções do caso; rejeitar operações inválidas sem alterar estado | Asserções satisfeitas | — | PASSOU | Não observado neste caso |
| QA-031 | PAG método debito | Executar o caso de mesmo nome em src/tests/pdv.test.tsx, com fixture isolada | Asserções do caso; rejeitar operações inválidas sem alterar estado | Asserções satisfeitas | — | PASSOU | Não observado neste caso |
| QA-032 | PAG método credito | Executar o caso de mesmo nome em src/tests/pdv.test.tsx, com fixture isolada | Asserções do caso; rejeitar operações inválidas sem alterar estado | Asserções satisfeitas | — | PASSOU | Não observado neste caso |
| QA-033 | PAG dividido e parcial | Executar o caso de mesmo nome em src/tests/pdv.test.tsx, com fixture isolada | Asserções do caso; rejeitar operações inválidas sem alterar estado | Asserções satisfeitas | — | PASSOU | Não observado neste caso |
| QA-034 | PAG troco 150 para 100 registra receita 100 | Executar o caso de mesmo nome em src/tests/pdv.test.tsx, com fixture isolada | Asserções do caso; rejeitar operações inválidas sem alterar estado | Asserções satisfeitas | — | PASSOU | Não observado neste caso |
| QA-035 | PAG valor inválido ou superior ao saldo -1 | Executar o caso de mesmo nome em src/tests/pdv.test.tsx, com fixture isolada | Asserções do caso; rejeitar operações inválidas sem alterar estado | Asserções satisfeitas | — | PASSOU | Não observado neste caso |
| QA-036 | PAG valor inválido ou superior ao saldo 0 | Executar o caso de mesmo nome em src/tests/pdv.test.tsx, com fixture isolada | Asserções do caso; rejeitar operações inválidas sem alterar estado | Asserções satisfeitas | — | PASSOU | Não observado neste caso |
| QA-037 | PAG valor inválido ou superior ao saldo NaN | Executar o caso de mesmo nome em src/tests/pdv.test.tsx, com fixture isolada | Asserções do caso; rejeitar operações inválidas sem alterar estado | Asserções satisfeitas | — | PASSOU | Não observado neste caso |
| QA-038 | PAG valor inválido ou superior ao saldo Infinity | Executar o caso de mesmo nome em src/tests/pdv.test.tsx, com fixture isolada | Asserções do caso; rejeitar operações inválidas sem alterar estado | Asserções satisfeitas | — | PASSOU | Não observado neste caso |
| QA-039 | PAG valor inválido ou superior ao saldo 21 | Executar o caso de mesmo nome em src/tests/pdv.test.tsx, com fixture isolada | Asserções do caso; rejeitar operações inválidas sem alterar estado | Asserções satisfeitas | — | PASSOU | Não observado neste caso |
| QA-040 | PAG dinheiro recebido insuficiente | Executar o caso de mesmo nome em src/tests/pdv.test.tsx, com fixture isolada | Asserções do caso; rejeitar operações inválidas sem alterar estado | Asserções satisfeitas | — | PASSOU | Não observado neste caso |
| QA-041 | PAG pedido inexistente não movimenta caixa | Executar o caso de mesmo nome em src/tests/pdv.test.tsx, com fixture isolada | Asserções do caso; rejeitar operações inválidas sem alterar estado | Asserções satisfeitas | — | PASSOU | Não observado neste caso |
| QA-042 | PAG pedido cancelado não recebe pagamento | Executar o caso de mesmo nome em src/tests/pdv.test.tsx, com fixture isolada | Asserções do caso; rejeitar operações inválidas sem alterar estado | Asserções satisfeitas | — | PASSOU | Não observado neste caso |
| QA-043 | CHAOS pagamento repetido 10 vezes | Executar o caso de mesmo nome em src/tests/pdv.test.tsx, com fixture isolada | Asserções do caso; rejeitar operações inválidas sem alterar estado | Asserções satisfeitas | — | PASSOU | Não observado neste caso |
| QA-044 | PAG estorno único devolve caixa | Executar o caso de mesmo nome em src/tests/pdv.test.tsx, com fixture isolada | Asserções do caso; rejeitar operações inválidas sem alterar estado | Asserções satisfeitas | — | PASSOU | Não observado neste caso |
| QA-045 | CHAOS estorno repetido não retira dinheiro duas vezes | Executar o caso de mesmo nome em src/tests/pdv.test.tsx, com fixture isolada | Asserções do caso; rejeitar operações inválidas sem alterar estado | Asserções satisfeitas | — | PASSOU | Não observado neste caso |
| QA-046 | CAI caixa fechado rejeita recebimento | Executar o caso de mesmo nome em src/tests/pdv.test.tsx, com fixture isolada | Asserções do caso; rejeitar operações inválidas sem alterar estado | Asserções satisfeitas | — | PASSOU | Não observado neste caso |
| QA-047 | CAI suprimento e sangria | Executar o caso de mesmo nome em src/tests/pdv.test.tsx, com fixture isolada | Asserções do caso; rejeitar operações inválidas sem alterar estado | Asserções satisfeitas | — | PASSOU | Não observado neste caso |
| QA-048 | CAI sangria negativa rejeitada | Executar o caso de mesmo nome em src/tests/pdv.test.tsx, com fixture isolada | Asserções do caso; rejeitar operações inválidas sem alterar estado | Asserções satisfeitas | — | PASSOU | Não observado neste caso |
| QA-049 | CAI reabrir caixa aberto não apaga movimentações | Executar o caso de mesmo nome em src/tests/pdv.test.tsx, com fixture isolada | Asserções do caso; rejeitar operações inválidas sem alterar estado | Asserções satisfeitas | — | PASSOU | Não observado neste caso |
| QA-050 | EST venda baixa ficha técnica | Executar o caso de mesmo nome em src/tests/pdv.test.tsx, com fixture isolada | Asserções do caso; rejeitar operações inválidas sem alterar estado | Asserções satisfeitas | — | PASSOU | Não observado neste caso |
| QA-051 | EST cancelamento antes de preparo devolve estoque | Executar o caso de mesmo nome em src/tests/pdv.test.tsx, com fixture isolada | Asserções do caso; rejeitar operações inválidas sem alterar estado | Asserções satisfeitas | — | PASSOU | Não observado neste caso |
| QA-052 | EST mesa primeira inclusão baixa apenas uma vez | Executar o caso de mesmo nome em src/tests/pdv.test.tsx, com fixture isolada | Asserções do caso; rejeitar operações inválidas sem alterar estado | Asserções satisfeitas | — | PASSOU | Não observado neste caso |
| QA-053 | ATAQUE concorrencia última unidade aceita uma venda | Executar o caso de mesmo nome em src/tests/pdv.test.tsx, com fixture isolada | Asserções do caso; rejeitar operações inválidas sem alterar estado | Asserções satisfeitas | — | PASSOU | Não observado neste caso |
| QA-054 | ATAQUE estoque entradas simultâneas não perdem atualização | Executar o caso de mesmo nome em src/tests/pdv.test.tsx, com fixture isolada | Asserções do caso; rejeitar operações inválidas sem alterar estado | Asserções satisfeitas | — | PASSOU | Não observado neste caso |
| QA-055 | MES reabrir mesa ocupada preserva valor | Executar o caso de mesmo nome em src/tests/pdv.test.tsx, com fixture isolada | Asserções do caso; rejeitar operações inválidas sem alterar estado | Asserções satisfeitas | — | PASSOU | Não observado neste caso |
| QA-056 | MES transferência para mesa livre preserva pedido | Executar o caso de mesmo nome em src/tests/pdv.test.tsx, com fixture isolada | Asserções do caso; rejeitar operações inválidas sem alterar estado | Asserções satisfeitas | — | PASSOU | Não observado neste caso |
| QA-057 | COZ pedido cria fila de impressão | Executar o caso de mesmo nome em src/tests/pdv.test.tsx, com fixture isolada | Asserções do caso; rejeitar operações inválidas sem alterar estado | Asserções satisfeitas | — | PASSOU | Não observado neste caso |
| QA-058 | REC remontagem offline preserva venda caixa e estoque | Executar o caso de mesmo nome em src/tests/pdv.test.tsx, com fixture isolada | Asserções do caso; rejeitar operações inválidas sem alterar estado | Asserções satisfeitas | — | PASSOU | Não observado neste caso |
| QA-059 | CHAOS estresse 500 pedidos no mesmo lote têm IDs e números únicos | Executar o caso de mesmo nome em src/tests/pdv.test.tsx, com fixture isolada | Asserções do caso; rejeitar operações inválidas sem alterar estado | Asserções satisfeitas | — | PASSOU | Não observado neste caso |
| QA-060 | DIA jornada sintética reconcilia caixa após estorno e sangria | Executar o caso de mesmo nome em src/tests/pdv.test.tsx, com fixture isolada | Asserções do caso; rejeitar operações inválidas sem alterar estado | Asserções satisfeitas | — | PASSOU | Não observado neste caso |
| QA-061 | UI venda completa pelo PDV registra pagamento e caixa | Executar o caso de mesmo nome em src/tests/pdv.test.tsx, com fixture isolada | Asserções do caso; rejeitar operações inválidas sem alterar estado | Asserções satisfeitas | — | PASSOU | Não observado neste caso |
| QA-062 | UI busca produto por HAMBÚRGUER | Executar o caso de mesmo nome em src/tests/pdv.test.tsx, com fixture isolada | Asserções do caso; rejeitar operações inválidas sem alterar estado | Asserções satisfeitas | — | PASSOU | Não observado neste caso |
| QA-063 | UI busca produto por hambúrguer | Executar o caso de mesmo nome em src/tests/pdv.test.tsx, com fixture isolada | Asserções do caso; rejeitar operações inválidas sem alterar estado | Asserções satisfeitas | — | PASSOU | Não observado neste caso |
| QA-064 | UI busca produto por hamburguer | Executar o caso de mesmo nome em src/tests/pdv.test.tsx, com fixture isolada | Asserções do caso; rejeitar operações inválidas sem alterar estado | Asserções satisfeitas | — | PASSOU | Não observado neste caso |
| QA-065 | UI dinheiro insuficiente desabilita confirmação | Executar o caso de mesmo nome em src/tests/pdv.test.tsx, com fixture isolada | Asserções do caso; rejeitar operações inválidas sem alterar estado | Asserções satisfeitas | — | PASSOU | Não observado neste caso |
| QA-066 | CHAOS UI duplo clique 10 confirmações dispara uma operação | Executar o caso de mesmo nome em src/tests/pdv.test.tsx, com fixture isolada | Asserções do caso; rejeitar operações inválidas sem alterar estado | Asserções satisfeitas | — | PASSOU | Não observado neste caso |
| QA-067 | REL só soma recebimentos não estornados e ignora pedidos cancelados | Executar o caso de mesmo nome em src/tests/pdv.test.tsx, com fixture isolada | Asserções do caso; rejeitar operações inválidas sem alterar estado | Asserções satisfeitas | — | PASSOU | Não observado neste caso |
| QA-068 | CAI conciliação desconta estorno de dinheiro | Executar o caso de mesmo nome em src/tests/pdv.test.tsx, com fixture isolada | Asserções do caso; rejeitar operações inválidas sem alterar estado | Asserções satisfeitas | — | PASSOU | Não observado neste caso |
| QA-069 | SYNC junta pedidos independentes de dois terminais | Executar o caso de mesmo nome em src/tests/pdv.test.tsx, com fixture isolada | Asserções do caso; rejeitar operações inválidas sem alterar estado | Asserções satisfeitas | — | PASSOU | Não observado neste caso |
| QA-070 | SYNC recusa alteração concorrente do mesmo valor | Executar o caso de mesmo nome em src/tests/pdv.test.tsx, com fixture isolada | Asserções do caso; rejeitar operações inválidas sem alterar estado | Asserções satisfeitas | — | PASSOU | Não observado neste caso |

## Inventário completo do checklist recebido

Esta lista preserva os 201 itens marcados no texto original. Um caso automatizado que passou não homologa todos os passos manuais da mesma área. Ataques narrativos, jornada e modo destruição permanecem disponíveis no plano original.

| ID | Área | Cenário original | Cobertura |
|---|---|---|---|
| PL-001 | 🔴 1. Testes de venda — fluxo básico | Abrir uma venda com 1 produto. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-002 | 🔴 1. Testes de venda — fluxo básico | Abrir venda com vários produtos. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-003 | 🔴 1. Testes de venda — fluxo básico | Alterar quantidade de um produto. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-004 | 🔴 1. Testes de venda — fluxo básico | Adicionar o mesmo produto várias vezes. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-005 | 🔴 1. Testes de venda — fluxo básico | Remover produto da venda. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-006 | 🔴 1. Testes de venda — fluxo básico | Cancelar a venda inteira. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-007 | 🔴 1. Testes de venda — fluxo básico | Finalizar venda em dinheiro. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-008 | 🔴 1. Testes de venda — fluxo básico | Finalizar venda no cartão. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-009 | 🔴 1. Testes de venda — fluxo básico | Finalizar venda via PIX. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-010 | 🔴 1. Testes de venda — fluxo básico | Finalizar venda com pagamento dividido. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-011 | 🔴 1. Testes de venda — fluxo básico | Venda com desconto. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-012 | 🔴 1. Testes de venda — fluxo básico | Venda com acréscimo. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-013 | 🔴 1. Testes de venda — fluxo básico | Venda com valor exato. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-014 | 🔴 1. Testes de venda — fluxo básico | Venda com troco. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-015 | 🔴 1. Testes de venda — fluxo básico | Tentar finalizar venda sem produtos. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-016 | 🔴 1. Testes de venda — fluxo básico | Tentar finalizar venda sem selecionar pagamento. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-017 | 🔴 1. Testes de venda — fluxo básico | Tentar finalizar duas vezes rapidamente. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-018 | 🟠 2. Produtos | Produto sem preço. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-019 | 🟠 2. Produtos | Produto com preço `0`. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-020 | 🟠 2. Produtos | Produto com preço negativo. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-021 | 🟠 2. Produtos | Produto com nome muito grande. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-022 | 🟠 2. Produtos | Produto com caracteres especiais. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-023 | 🟠 2. Produtos | Produto duplicado. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-024 | 🟠 2. Produtos | Produto desativado enquanto existe em uma venda. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-025 | 🟠 2. Produtos | Alterar preço de produto depois de adicionar ao carrinho. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-026 | 🟠 2. Produtos | Excluir produto que possui vendas antigas. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-027 | 🟠 2. Produtos | Alterar categoria do produto. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-028 | 🟠 2. Produtos | Produto sem imagem. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-029 | 🟠 2. Produtos | Produto com imagem muito grande. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-030 | 🟠 2. Produtos | Muitos produtos cadastrados. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-031 | 🟠 2. Produtos | Buscar produto inexistente. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-032 | 🟠 2. Produtos | Buscar usando letras maiúsculas/minúsculas. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-033 | 🟠 2. Produtos | Buscar com acentos. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-034 | 🟠 2. Produtos | Buscar digitando muito rápido. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-035 | 🟡 3. Estoque | Venda reduz estoque corretamente. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-036 | 🟡 3. Estoque | Cancelamento devolve estoque. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-037 | 🟡 3. Estoque | Produto sem estoque. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-038 | 🟡 3. Estoque | Venda de quantidade maior que o estoque. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-039 | 🟡 3. Estoque | Estoque `0`. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-040 | 🟡 3. Estoque | Estoque negativo. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-041 | 🟡 3. Estoque | Entrada de estoque. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-042 | 🟡 3. Estoque | Saída manual. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-043 | 🟡 3. Estoque | Ajuste de estoque. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-044 | 🟡 3. Estoque | Excluir produto com estoque. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-045 | 🟡 3. Estoque | Fazer várias vendas simultâneas do mesmo produto. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-046 | 🟡 3. Estoque | Venda offline e posterior sincronização. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-047 | 🔴 4. Caixa | Abrir caixa. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-048 | 🔴 4. Caixa | Abrir caixa sem informar valor inicial. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-049 | 🔴 4. Caixa | Abrir dois caixas ao mesmo tempo. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-050 | 🔴 4. Caixa | Registrar venda. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-051 | 🔴 4. Caixa | Sangria. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-052 | 🔴 4. Caixa | Suprimento. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-053 | 🔴 4. Caixa | Cancelar venda. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-054 | 🔴 4. Caixa | Estornar venda. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-055 | 🔴 4. Caixa | Fechar caixa. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-056 | 🔴 4. Caixa | Fechar caixa com vendas pendentes. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-057 | 🔴 4. Caixa | Fechar caixa com diferença. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-058 | 🔴 4. Caixa | Fechar caixa sem movimentação. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-059 | 🔴 4. Caixa | Reabrir caixa fechado. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-060 | 🔴 4. Caixa | Tentar vender com caixa fechado. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-061 | 🔴 4. Caixa | Trocar usuário durante o caixa aberto. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-062 | 🔴 4. Caixa | Queda de energia durante uma venda. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-063 | 🔴 4. Caixa | Aplicação fechada durante o fechamento do caixa. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-064 | 🟣 5. Mesas / atendimento no restaurante | Abrir mesa. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-065 | 🟣 5. Mesas / atendimento no restaurante | Adicionar produtos. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-066 | 🟣 5. Mesas / atendimento no restaurante | Adicionar produto à mesa já ocupada. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-067 | 🟣 5. Mesas / atendimento no restaurante | Remover produto. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-068 | 🟣 5. Mesas / atendimento no restaurante | Transferir mesa. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-069 | 🟣 5. Mesas / atendimento no restaurante | Juntar mesas. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-070 | 🟣 5. Mesas / atendimento no restaurante | Dividir conta. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-071 | 🟣 5. Mesas / atendimento no restaurante | Fechar mesa. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-072 | 🟣 5. Mesas / atendimento no restaurante | Cancelar mesa. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-073 | 🟣 5. Mesas / atendimento no restaurante | Reabrir mesa. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-074 | 🟣 5. Mesas / atendimento no restaurante | Mesa ocupada por outro funcionário. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-075 | 🟣 5. Mesas / atendimento no restaurante | Duas pessoas alterando a mesma mesa. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-076 | 🟣 5. Mesas / atendimento no restaurante | Fechar mesa sem produtos. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-077 | 🟣 5. Mesas / atendimento no restaurante | Cliente mudar pedido depois de enviado para cozinha. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-078 | 🟣 5. Mesas / atendimento no restaurante | Alterar quantidade depois de enviar pedido. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-079 | 🍔 6. Lanches personalizados | Hambúrguer + adicional. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-080 | 🍔 6. Lanches personalizados | Hambúrguer sem adicional. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-081 | 🍔 6. Lanches personalizados | Remover adicional. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-082 | 🍔 6. Lanches personalizados | Adicionar vários adicionais. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-083 | 🍔 6. Lanches personalizados | Mesmo adicional várias vezes. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-084 | 🍔 6. Lanches personalizados | Adicional gratuito. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-085 | 🍔 6. Lanches personalizados | Adicional pago. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-086 | 🍔 6. Lanches personalizados | Observação muito grande. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-087 | 🍔 6. Lanches personalizados | Observação com caracteres especiais. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-088 | 🍔 6. Lanches personalizados | Produto sem ingredientes. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-089 | 🍔 6. Lanches personalizados | Remover ingrediente. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-090 | 🍔 6. Lanches personalizados | Adicionar ingrediente. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-091 | 🍔 6. Lanches personalizados | Combos. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-092 | 🍔 6. Lanches personalizados | Combo com item faltando. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-093 | 🍔 6. Lanches personalizados | Alterar item do combo. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-094 | 🍔 6. Lanches personalizados | Produto personalizado e desconto. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-095 | 🍔 6. Lanches personalizados | Cancelar personalização. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-096 | 🟢 7. Pedidos para cozinha | Venda envia pedido para cozinha. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-097 | 🟢 7. Pedidos para cozinha | Pedido aparece uma única vez. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-098 | 🟢 7. Pedidos para cozinha | Alteração aparece corretamente. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-099 | 🟢 7. Pedidos para cozinha | Cancelamento chega à cozinha. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-100 | 🟢 7. Pedidos para cozinha | Pedido duplicado não aparece. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-101 | 🟢 7. Pedidos para cozinha | Pedido muito grande. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-102 | 🟢 7. Pedidos para cozinha | Vários pedidos simultâneos. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-103 | 🟢 7. Pedidos para cozinha | Impressora indisponível. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-104 | 🟢 7. Pedidos para cozinha | Impressora desconectada. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-105 | 🟢 7. Pedidos para cozinha | Impressão falha. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-106 | 🟢 7. Pedidos para cozinha | Reimpressão. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-107 | 🟢 7. Pedidos para cozinha | Pedido enviado duas vezes. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-108 | 🟢 7. Pedidos para cozinha | Aplicativo fechado durante envio. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-109 | 🌐 8. Internet | Desligar Wi-Fi. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-110 | 🌐 8. Internet | Desligar dados móveis. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-111 | 🌐 8. Internet | Iniciar venda offline. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-112 | 🌐 8. Internet | Finalizar venda offline. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-113 | 🌐 8. Internet | Fechar aplicativo offline. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-114 | 🌐 8. Internet | Abrir novamente offline. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-115 | 🌐 8. Internet | Restaurar internet. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-116 | 🌐 8. Internet | Sincronizar. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-117 | 🌐 8. Internet | Derrubar internet durante sincronização. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-118 | 🌐 8. Internet | Internet ficar instável. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-119 | 🌐 8. Internet | Internet voltar várias vezes. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-120 | 🌐 8. Internet | Duas sincronizações simultâneas. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-121 | 💳 9. Pagamentos | Dinheiro. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-122 | 💳 9. Pagamentos | PIX. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-123 | 💳 9. Pagamentos | Débito. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-124 | 💳 9. Pagamentos | Crédito. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-125 | 💳 9. Pagamentos | Pagamento dividido. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-126 | 💳 9. Pagamentos | Pagamento parcial. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-127 | 💳 9. Pagamentos | Pagamento maior que o total. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-128 | 💳 9. Pagamentos | Pagamento menor que o total. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-129 | 💳 9. Pagamentos | Cancelamento. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-130 | 💳 9. Pagamentos | Estorno. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-131 | 💳 9. Pagamentos | Troca de método de pagamento. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-132 | 💳 9. Pagamentos | Cliente desiste. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-133 | 💳 9. Pagamentos | Operador volta para tela anterior. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-134 | 💳 9. Pagamentos | Aplicativo fechado durante pagamento. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-135 | 🧮 10. Matemática / valores | R$0,01 | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-136 | 🧮 10. Matemática / valores | R$0,10 | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-137 | 🧮 10. Matemática / valores | R$0,99 | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-138 | 🧮 10. Matemática / valores | R$1,99 | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-139 | 🧮 10. Matemática / valores | R$10,50 | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-140 | 🧮 10. Matemática / valores | R$99,99 | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-141 | 🧮 10. Matemática / valores | R$999,99 | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-142 | 🧮 10. Matemática / valores | Desconto de 1% | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-143 | 🧮 10. Matemática / valores | Desconto de 50% | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-144 | 🧮 10. Matemática / valores | Desconto de 100% | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-145 | 🧮 10. Matemática / valores | Desconto maior que 100% | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-146 | 🧮 10. Matemática / valores | Acréscimo. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-147 | 🧮 10. Matemática / valores | Troco. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-148 | 🧮 10. Matemática / valores | Divisão de conta. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-149 | 👤 11. Usuários e permissões | Caixa tentando excluir produto. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-150 | 👤 11. Usuários e permissões | Garçom tentando fechar caixa. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-151 | 👤 11. Usuários e permissões | Caixa tentando alterar preço. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-152 | 👤 11. Usuários e permissões | Funcionário tentando dar desconto. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-153 | 👤 11. Usuários e permissões | Funcionário tentando cancelar venda. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-154 | 👤 11. Usuários e permissões | Funcionário tentando visualizar informações administrativas. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-155 | 👤 11. Usuários e permissões | Login incorreto. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-156 | 👤 11. Usuários e permissões | Senha incorreta. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-157 | 👤 11. Usuários e permissões | Logout. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-158 | 👤 11. Usuários e permissões | Troca de usuário. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-159 | 👤 11. Usuários e permissões | Sessão expirada. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-160 | 👤 11. Usuários e permissões | Dois usuários usando o mesmo caixa. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-161 | 🛡️ 12. Segurança | Campos vazios. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-162 | 🛡️ 12. Segurança | Números negativos. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-163 | 🛡️ 12. Segurança | Valores gigantes. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-164 | 🛡️ 12. Segurança | Texto gigantesco. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-165 | 🛡️ 12. Segurança | Caracteres especiais. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-166 | 🛡️ 12. Segurança | Emojis. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-167 | 🛡️ 12. Segurança | Colar texto enorme. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-168 | 🛡️ 12. Segurança | Clicar rapidamente. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-169 | 🛡️ 12. Segurança | Voltar várias vezes. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-170 | 🛡️ 12. Segurança | Abrir várias telas. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-171 | 🛡️ 12. Segurança | Fechar aplicativo inesperadamente. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-172 | 🛡️ 12. Segurança | Girar tela durante operação. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-173 | 🛡️ 12. Segurança | Minimizar aplicativo. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-174 | 🛡️ 12. Segurança | Bloquear telefone. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-175 | 🛡️ 12. Segurança | Abrir novamente. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-176 | ⚡ 13. Teste de estresse | Pesquisas rápidas. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-177 | ⚡ 13. Teste de estresse | Abrir várias mesas. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-178 | ⚡ 13. Teste de estresse | Criar vários pedidos. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-179 | ⚡ 13. Teste de estresse | Finalizar vendas rapidamente. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-180 | ⚡ 13. Teste de estresse | Abrir relatórios. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-181 | ⚡ 13. Teste de estresse | Filtrar relatórios. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-182 | ⚡ 13. Teste de estresse | Fechar caixa. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-183 | ⚡ 13. Teste de estresse | Sincronizar dados. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-184 | 📊 15. Relatórios | Total vendido está correto. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-185 | 📊 15. Relatórios | Total em dinheiro está correto. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-186 | 📊 15. Relatórios | Total PIX está correto. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-187 | 📊 15. Relatórios | Total cartão está correto. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-188 | 📊 15. Relatórios | Descontos estão corretos. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-189 | 📊 15. Relatórios | Cancelamentos não contam como vendas. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-190 | 📊 15. Relatórios | Estornos aparecem corretamente. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-191 | 📊 15. Relatórios | Trocos não são contabilizados como faturamento. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-192 | 📊 15. Relatórios | Produtos mais vendidos estão corretos. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-193 | 📊 15. Relatórios | Estoque bate com vendas. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-194 | 📊 15. Relatórios | Fechamento do caixa bate com relatório. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-195 | 🧨 17. Testes de concorrência | Estoque. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-196 | 🧨 17. Testes de concorrência | Mesas. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-197 | 🧨 17. Testes de concorrência | Pedidos. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-198 | 🧨 17. Testes de concorrência | Produtos. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-199 | 🧨 17. Testes de concorrência | Caixa. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-200 | 🧨 17. Testes de concorrência | Sincronização. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
| PL-201 | 🧨 17. Testes de concorrência | Cancelamentos. | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |
