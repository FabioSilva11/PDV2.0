# Análise do Site Murupi (PDV / Backoffice)

> Data: 12/09/2026 · Escopo: **somente o site** (aplicação web React + TypeScript em `src/`).
> Os apps Android (`prejeto apk`) **não** fazem parte desta análise.
> Documento gerado com base na leitura do código-fonte (auditoria de implementação).

---

## 1. Visão geral da arquitetura

| Camada | Tecnologia | Papel |
|---|---|---|
| Frontend | React 19 + TypeScript + Vite 6 + Tailwind 4 | Toda a interface do PDV |
| Estado global | Contexto único `RestaurantContext.tsx` (~1.800 linhas) | Todo estado + lógica de negócio + persistência |
| Persistência | Firebase Realtime DB (`restaurants/murupi/database`) + `localStorage` (cache) | Fonte remota de verdade + cache local |
| IA (opcional) | `@google/genai` nos deps | Restos de integração, não usada nos fluxos principais |

**Fluxo de dados:** o app hidrata do Firebase ao montar, e **salva o snapshot inteiro no Firebase a cada mudança de estado** (`RestaurantContext.tsx:503-541`). Ou seja, qualquer ação no site vai direto para a nuvem — não há banco local isolado.

**Observação importante:** como o snapshot remoto não contém a flag `operationalDemoResetApplied`, o app **zera** pedidos, comandas, alertas e desocupa todas as mesas no carregamento (`RestaurantContext.tsx:463-489`). Isso acontece justamente porque o banco foi recém-zerado. É o comportamento esperado do "reset".

---

## 2. Mapa de status por módulo

| Módulo | View | Status | Resumo |
|---|---|---|---|
| Dashboard | `DashboardView.tsx` | ✅ OK | Indicadores e gráficos. Atenção: valores fake quando tudo é 0 (ver §4.8) |
| PDV | `pdv/POSView.tsx` | ⚠️ **QUEBRADO** | Venda por balcão não registra pagamento nem caixa (ver §3.1) |
| Pedidos | `orders/OrdersView.tsx` | ✅ OK | Filtros, detalhes, cupom, cancelamento, pagamento manual |
| Mesas | `tables/TablesView.tsx` | ❌ **CRASH** | Quebra ao interagir (ver §3.2) |
| Comandas | `comandas/ComandasView.tsx` | ✅ OK | Criar/complementar/fechar comanda |
| Caixa | `cashier/CashierView.tsx` | ⚠️ Parcial | Totais de venda sempre **R$ 0** (ver §3.3) |
| KDS / Cozinha | `kitchen/KDSView.tsx` | ✅ OK | Fila de produção em tempo real |
| Delivery | `delivery/DeliveryView.tsx` | ✅ OK | Atribuição e conclusão de entrega |
| Cardápio | `menu/MenuManagementView.tsx` | ⚠️ Parcial | Edição ok; **criar produto** incompleto (ver §3.5) |
| Estoque | `inventory/InventoryView.tsx` | ⚠️ Parcial | Diversos campos errados (ver §3.6) |
| Compras | `purchases/PurchasesView.tsx` | ⚠️ Parcial | Botão "Novo Pedido" morto; abas incompletas (ver §3.7) |
| Fornecedores | `suppliers/SuppliersView.tsx` | ⚠️ Parcial | Sem cadastro/edição — listagem só (ver §3.4) |
| Clientes | `customers/CustomersView.tsx` | ✅ OK | CRUD real completo |
| Funcionários | `staff/StaffView.tsx` | ⚠️ Parcial | Edição não salva dados do usuário (ver §3.8) |
| Financeiro | `finance/FinancialView.tsx` | ⚠️ Parcial | DRE com números falsos quando zerado (ver §4.8) |
| Relatórios | `reports/ReportsView.tsx` | ⚠️ Parcial | Relatório por forma de pagamento sempre zerado (ver §3.9) |
| Impressoras | `printers/PrintersView.tsx` | ⚠️ Simulado | Nenhuma impressão real (ver §4.1) |
| Auditoria | `audit/AuditView.tsx` | ✅ OK | Log funcional |
| Configurações | `settings/SettingsView.tsx` | ⚠️ Parcial | Licença SaaS hardcoded (ver §4.7) |

Legend: ✅ funciona · ⚠️ parcial/simulado · ❌ quebrado (crash)

---

## 3. Problemas funcionais (por severidade)

### 3.1 ❌ CRÍTICO — PDV: "Confirmar Pagamento" não paga
**Onde:** `src/components/pdv/POSView.tsx:184-216` → `src/context/RestaurantContext.tsx:716-720`

O PDV monta o pedido com `statusPagamento: 'pago'`, `valorTotalPago`, `saldoRestante: 0` e até um array `pagamentos` (com forma, valor recebido e troco). **Porém** a função `createOrder()` **ignora tudo isso**: força `status: 'novo'`, `statusPagamento: 'pendente'`, `pagamentos: []`, `valorTotalPago: 0` e `saldoRestante: total`.

**Consequências:**
- O pedido "pago" aparece como **pendente** com saldo total em aberto;
- **Nenhuma venda chega ao caixa** (o fluxo de recebimento não passa por `addManualPaymentToOrder`);
- Troco/forma de pagamento informados são descartados;
- Mesa/balcão nunca "quitam" de fato pelo PDV.

**Correção sugerida:** fazer `createOrder` respeitar `orderData.pagamentos`/`statusPagamento`/`valorTotalPago` ou, no `handlePaymentConfirm`, chamar `addManualPaymentToOrder` após criar o pedido.

### 3.2 ❌ CRÍTICO — Tela de Mesas quebra ao interagir (crash)
**Onde:** `src/components/tables/TablesView.tsx:28,64,68,69,74`

O componente desestrutura do contexto as funções **`setActiveTab`, `setSelectedTableNumber`, `setOrderType` e `setCustomerInfo`**, que **não existem** no provider (o contexto expõe `setActiveModule`, e não possui as demais — verificado em `RestaurantContext.tsx:1680-1804`).

Ao clicar em "Abrir mesa", "Adicionar itens", "Cobrar mesa", etc., o React lança `TypeError: setActiveTab is not a function`, **derrubando a tela Mesas**.
(Também afeta `components/Header.tsx` e `components/Navigation.tsx`, que são arquivos órfãos sem import em lugar nenhum.)

**Correção sugerida:** trocar `setActiveTab` → `setActiveModule` e reimplementar a transferência de mesa/carrinho com o mecanismo real do contexto (ou remover a navegação automática para o PDV).

### 3.3 ⚠️ Caixa: totais de venda sempre R$ 0
**Onde:** `src/components/cashier/CashierView.tsx:44-58` vs `src/context/RestaurantContext.tsx:942`

Os cards do caixa filtram transações com `t.tipo === 'venda'`, mas o sistema registra recebimentos como **`tipo: 'venda_manual'`** (`addManualPaymentToOrder`). Resultado: recebimentos em PIX/cartão/dinheiro aparecem zerados no caixa.

Ainda, `markOrderAsPaidManually` (`RestaurantContext.tsx:1032-1046`) marca o pedido como pago **sem registrar nada** no caixa (transação, gaveta, etc.).

**Correção sugerida:** padronizar `'venda'` (ou ajustar os filtros), e fazer `markOrderAsPaidManually` registrar a transação no caixa.

### 3.4 ⚠️ Fornecedores: sem cadastro/edição
**Onde:** `src/components/suppliers/SuppliersView.tsx:30-36` e `:94-99`

Botões **"Cadastrar Fornecedor"** e **"Cotar Insumos"** existem na interface **sem `onClick`** — não fazem nada. Não há CRUD de fornecedores na tela (apesar de o contexto ter `addSupplier`).

### 3.5 ⚠️ Cardápio: produto novo nunca baixa estoque
**Onde:** `src/components/menu/MenuManagementView.tsx:107-117`

Criar um produto só grava campos básicos (nome, preço, categoria, descrição). **Não grava** `fichaTecnica`, `estaçaoProducao`, `estoqueControlado`, `gruposAdicionais` nem imagem. Itens criados pela tela **nunca deduzem estoque** (a baixa depende de `fichaTecnica && estoqueControlado` em `RestaurantContext.tsx:659`).

### 3.6 ⚠️ Estoque: campos incompatíveis com o modelo
**Onde:** `src/components/inventory/InventoryView.tsx:222,248` e tabs de lotes

- Lê `ing.custoUnitario` que **não existe** no tipo `Ingredient` (é `custoMedio`) → exibe **"R$ NaN"**;
- Aba Lotes lê `numeroLote`/`quantidadeAtual`, mas o tipo é `loteNumero`/`quantidade` (`types.ts:319-332`) → células vazias;
- `addStockMovement(item, tipo, qtd, motivo, custo)` ignora o 5º argumento `custo` (`RestaurantContext.tsx:1413`);
- Tipo `'ajuste_inventario'` não existe no union e é classificado como **saída**;
- **Sem UI para cadastrar lote** (embora `addBatch` exista).

### 3.7 ⚠️ Compras: botões mortos e dados mal tipados
**Onde:** `src/components/purchases/PurchasesView.tsx:30,52-58`

- **"Novo Pedido de Compra" sem `onClick`**;
- Aba "cotações" no estado mas **sem botão nem tela**;
- A busca usa `o.numero`, mas `PurchaseOrder` usa `codigo` (`types.ts`) → **crash ao digitar número**;
- Cards exibem `#undefined` e "R$ NaN" (interpretação de campos divergentes);
- Histórico de preços é **fictício** (ver §4.5).

### 3.8 ⚠️ Funcionários: edição não salva dados
**Onde:** `src/components/staff/StaffView.tsx:57-58`

Ao editar, chama apenas `updateStaffPermissions`. Nome, cargo, usuário, senha, PIN e status **não persistem**. O modal expõe 6 permissões, mas o tipo `UserPermissions` tem mais (ex.: `reabrirCaixa`, `modificarEstoque`) — permissões existentes ficam fora da tela.

### 3.9 ⚠️ Relatórios: "por forma de pagamento" sempre vazio
**Onde:** `src/components/reports/ReportsView.tsx:34` e ~306

O relatório usa `o.formaPagamento` que **nunca é gravado** nos pedidos (pagamento fica no array `pagamentos[]`). Todo valor cai em "pendente"/R$ 0.

---

## 4. Simulações / dados falsos

### 4.1 Impressão 100% simulada
- `triggerTestPrint` cria um `PrintJob` de mentira na fila e não comunica com impressora (`RestaurantContext.tsx:1588-1604`); `reprintJob` só troca status (`:1606-1614`);
- `createOrder` também cria "jobs" simulados (`:748-767`) — nenhum byte vai para uma impressora física;
- Na tela de impressoras, o "sucesso" é apenas um toast local.

### 4.2 Imprimir cupom global = página em branco
**Onde:** `src/components/orders/ThermalReceiptModal.tsx:13-15` e `src/index.css:4-21`

Ambos os modais usam `window.print()`. A regra `@media print` oculta tudo exceto o elemento com **`id="thermal-receipt"`**.
- O `ReceiptModal` do PDV **tem** esse id (`ReceiptModal.tsx:45`) ✅;
- O `ThermalReceiptModal` global **não tem** → imprimir ali gera **página em branco**.

### 4.3 PIX / QR Code / maquininha simulados
**Onde:** `src/components/pdv/PaymentModal.tsx:54-59,259-278,316`

- O código PIX copiável é uma string manual **inválida** (termina em `***`), sem verificação CRC real;
- O QR Code é **decorativo** (imagem estática, sem payload de verdade);
- "Maquininha integrada" é só mensagem — sem integração com POS físico; cartão = mensagem informativa.

### 4.4 Saúde da operação "fake"
**Onde:** `src/context/RestaurantContext.tsx:562+` e `src/components/layout/OperationHealthModal.tsx:34-76`

`refreshHealth` sempre retorna tudo "online"; a modal exibe métricas **hardcoded**: "Latência 16ms", "Google Cloud Run", "0.00%" e "3 telas KDS". Não há monitoramento real de rede/servidor.

### 4.5 Compras: histórico fissais
**Onde:** `src/components/purchases/PurchasesView.tsx:19-24`

`DEFAULT_PRICE_HISTORIES` fixos e alerta "+22%" hardcoded — não refletem dados reais.

### 4.6 DRE e Dashboard com números de mentira
**Onde:** `src/components/finance/FinancialView.tsx:70-86`

Quando não há dados reais, o DRE usa fallbacks fixos: receita **14.200**, CMV **4.402**, despesas fixas **5.920**, lucro **3.250**. Se o banco está zerado (como agora), o site exibe números falsos como se fossem reais.

Dashboard também mostra "Salão = maior faturamento", hidden "Operação Aberta" com caixa fechado e `NaN%` em gráficos sem dados.

### 4.7 Licença SaaS / unidade falsa
**Onde:** `src/components/settings/SettingsView.tsx` e `Sidebar.tsx:123`

Licença hardcoded `'MRP-ENTERPRISE-PRO-9988-X7'`, "Ecossistema SaaS v3.2" e "Matriz Centro" fixa — tudo fachada, sem validação real de licença.

### 4.8 Inconsistência de dados da loja
**Onde:** `ReceiptModal.tsx:56-60` vs `ThermalReceiptModal.tsx:50-54`

Dois "Murupi" diferentes hardcoded (CNPJ 14.882.901/0001-44 / Porto Velho-RO vs CNPJ 45.892.110/0001-44 / Av. das Nações, SP), **ignorando `settings`**. O cupom ignora os dados configurados em Configurações.

---

## 5. Outras inconsistências de lógica

| Item | Onde | Problema |
|---|---|---|
| Fechar/liberar mesa | `settleTableAccount` (`RestaurantContext.tsx:1129`) | Só troca status da mesa; ignora valor/método/troco; não atualiza o pedido nem o caixa |
| Estorno de pagamento | `reverseOrderPayment` (`RestaurantContext.tsx:1025`) | Reabre pedido com `status:'confirmado'` fixo; registra reversão como `saida_manual` que não reconcilia a gaveta |
| Duplicidade/tipos no PDV | `POSView.tsx:203-212` | Grava `horario`/`operadorNome` num `pagamentos[]` cujo tipo exige `dataHora`/`registradoPor` — erro de tipo que o Vite dev não expõe |
| Baixa de estoque nunca ocorre | `RestaurantContext.tsx:659` | Só deduz se item tem `fichaTecnica`; os itens de `INITIAL_MENU` **não** têm `fichaTecnica` → na operação real não há baixa |
| Canais de venda subutilizados | `types.ts:102-109` | `retirada`, `telefone`, `whatsapp`, `manual` existem no tipo, mas o PDV só oferece Balcão/Mesa/Entrega |
| Carrinho do Sidebar sempre 0 | `POSView.tsx:33-44` | Carrinho do PDV é estado local; não alimenta o `cart` do contexto usado no badge |
| Categoria faltante | `RestaurantContext.tsx:596-606` | Categoria `'Lanches & Burgers'` do `CategoryType` não está na lista do contexto |
| Formatação | `src/utils/formatters.ts` | `formatCurrency(NaN)` → **"R$ NaN"** (aparece em várias telas) |
| Logs de auditoria | `AuditView.tsx:38-60` | Badges não cobrem ações reais (ex.: "Criação de pedido") → caem no `default` |

---

## 6. Riscos de segurança e infraestrutura

1. **Segredos reais versionados** — `.env` (e `firebase_options.dart` nos apps) contém API key do projeto **visionare** real; a chave privada Admin SDK (`visionare-firebase-adminsdk-*.json`) está na raiz do projeto. Deve sair do versionamento e ficar fora de builds.
2. **Firebase com escrita em produção** — todo estado é salvo no RTDB real a cada mudança; qualquer erro de UI vira dado corrompido na nuvem. Sem regras de segurança visíveis → qualquer um com a URL escreve/remove dados (autenticação anônima apenas).
3. **Sem type-check no dev** — `npm run dev` (vite) **não roda o `tsc`**; erros de tipo latentes (ex.: `setActiveTab`, campos trocados) só quebram em runtime ou no `npm run build`. Recomenda-se `npx tsc --noEmit` em CI.
4. **Dados do cliente sensíveis** — senhas de staff em texto puro dentro do RTDB; qualquer pessoa com acesso lê.

---

## 7. Resumo priorizado de correções

| Prioridade | O quê | Impacto |
|---|---|---|
| 🔴 P0 | Fazer `createOrder` honrar pagamento no PDV (ou chamar `addManualPaymentToOrder`) | Vendas não entram no sistema |
| 🔴 P0 | Corrigir `TablesView` (remover funções inexistentes do contexto) | Tela de mesas quebra o app |
| 🟠 P1 | Padronizar `venda`/`venda_manual` no caixa e registrar pagamentos no caixa | Caixa fica sem valores |
| 🟠 P1 | Corrigir impressão do `ThermalReceiptModal` (`id="thermal-receipt"`) | Cupom imprime em branco |
| 🟡 P2 | Remover números falsos do DRE/Dashboard (exibir "—" quando zerado) | Relatórios enganam o usuário |
| 🟡 P2 | Completar CRUD de Fornecedores e "Novo Pedido de Compra" | Ambos os botões sem ação |
| 🟡 P2 | Corrigir campos divergentes do Estoque (`custoMedio`, `loteNumero`) | "R$ NaN" e lotes vazios |
| 🟡 P2 | Salvar dados completos do produto (incl. `fichaTecnica`) | Baixa de estoque real |
| 🟢 P3 | Trocar PIX/QR simulados por geração real (ex.: lib `pix-payload`); integrar saúde da operação; padronizar dados da loja via `settings`; rodar `tsc --noEmit`; remover segredos do repositório | Hardening |

---

## 8. Conclusão

O site é uma **base funcional ampla** (19 módulos, quase todos renderizam), mas vários fluxos de venda são **parciais ou quebrados**. Os defeitos de maior impacto estão exatamente no coração do sistema:

1. O **PDV não registra pagamento/caixa**;
2. A tela de **Mesas crasha** logo na interação;
3. O **Caixa mostra vendas zeradas**.

Enquanto isso, uma boa parte das áreas "de apoio" (Compras, Fornecedores, Impressoras, Saúde, Financeiro, SaaS) é **simulação de interface** com dados falsos ou botões inertes. Antes de colocar em uso real, o ideal é atacar a lista P0/P1 e substituir as simulações por integrações reais (impressão, PIX, validação de licença).