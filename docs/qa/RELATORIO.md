# Auditoria funcional do PDV — 13/09/2026

As falhas reproduzidas na primeira auditoria foram corrigidas e a suíte atual executou **70 testes: 70 passaram e 0 falharam**. A homologação de infraestrutura física continua pendente.

## Entrega e reprodução

- `npm test`: executa toda a suíte e grava `test-results.json`. O código de saída 1 é esperado enquanto houver defeitos abertos.
- `node scripts/qa-report.mjs`: atualiza a matriz a partir da última execução.
- `npm run test:ataque`: recorte de concorrência e cliques repetidos.
- `src/tests/pdv.test.tsx`: passos executáveis e expectativas de cada cenário.
- `docs/qa/MATRIZ_TESTES.md`: resultados individuais, evidências e inventário do checklist.
- `docs/qa/PLANO_ORIGINAL.md`: texto integral recebido, incluindo ataques, jornada e modo destruição.

O PDV agora usa operações atômicas no estado local: uma venda somente é persistida depois de validar pedido, caixa, estoque e pagamento; se algo falhar, nada da operação é confirmado. O Firebase passou a usar transações e merge de alterações independentes, preservando o estado local quando houver conflito no mesmo campo.

## Correções verificadas

| Prioridade | Correção | Evidência | Local principal |
|---|---|---|---|
| Alta | Pagamento e estorno idempotentes | Dez confirmações ou dois estornos não duplicam pagamentos, caixa ou venda. | RestaurantContext.tsx / PaymentModal.tsx |
| Alta | Validações financeiras e caixa | Rejeita valores inválidos, pagamento fora do saldo, caixa fechado, sangria negativa e abertura duplicada. | RestaurantContext.tsx |
| Alta | Estoque e mesas | Rejeita venda sem saldo, devolve estoque em cancelamento e impede baixa dupla da mesa. | RestaurantContext.tsx |
| Alta | Concorrência e IDs | 500 pedidos recebem IDs e números únicos; transações Firebase unem alterações independentes e recusam conflito no mesmo campo. | business.ts / mergeSnapshots.ts |
| Média | Relatórios | Faturamento usa somente pagamentos ativos e não soma troco, estornos ou pedidos cancelados. | reports.ts |
| Média | Permissões e busca | Ações administrativas validam permissão; busca ignora maiúsculas e acentos. | RestaurantContext.tsx / POSView.tsx |

## O que funcionou no ambiente isolado

Preços de R$0,01 a R$999,99, 3 × R$3,33, descontos de 1%, 50% e 100% representados em reais, taxas, preservação do preço do carrinho, manutenção do histórico após excluir produto, adicionais pagos/gratuitos, métodos manuais dinheiro/PIX/débito/crédito, pagamento dividido, troco, estorno único, suprimento/sangria positivos, baixa simples de estoque, transferência de mesa livre e criação de fila de impressão.

A remontagem do provider preservou pedido pago, caixa e estoque após persistência local normal. A jornada sintética reconciliou caixa em R$210 e pedidos pagos em R$40 após vendas, estorno, cancelamento e sangria. Isso não equivale a um dia inteiro sob carga ou a recuperação após queda no instante da gravação.

`npm run lint` e `npm run build` terminaram com código 0. O build avisou de bundle JavaScript maior que 500 kB. Compilar não elimina as falhas funcionais encontradas.

## Cobertura e limitações

Os testes usam React real, componentes/contexto reais e localStorage do jsdom. Firebase e áudio são mocks. Nenhuma venda, pagamento, usuário ou estoque de teste foi enviado ao banco real. Não foram usados os arquivos de credenciais.

Concorrência foi simulada com chamadas no mesmo lote React, não com dois aparelhos nem com transações de servidor. Estresse executou 500 pedidos; não mediu memória, latência de interface real, 1.000 produtos, 50 categorias, 20 usuários ou 100 mesas. O modelo atual de categoria é uma lista fixa, portanto 50 categorias exige avaliar a funcionalidade antes da carga.

Pendentes: impressora física/desconexão/reimpressão real; Wi-Fi e reconexão; dois terminais; encerramento forçado durante gravação; restauração de backup antigo; atualização com pendências; celular/rotação/bloqueio; login/sessão; combinações completas de combos e personalizações; conferência visual e integral dos relatórios; jornada completa com troca de operador. Os itens do plano não cobertos pela suíte permanecem pendentes, sem aprovação implícita.

Observações de código ainda sem teste integrado: o Firebase grava o snapshot completo com `set`, sem transação entre terminais, e a hidratação substitui estado local por remoto. Há risco de perda de mudanças offline/concorrentes. ReportsView inclui pedidos não cancelados no faturamento, mesmo pendentes, e agrupa pelo campo legado formaPagamento, embora os recebimentos usem pagamentos[]. Essas observações precisam de testes específicos antes de fechar o diagnóstico.

## Ordem recomendada de correção

1. Unificar confirmação de venda e recebimento, impedir repetição de pagamentos/estornos e validar saldos/caixa.
2. Tornar baixa de estoque e gravação de pedido atômicas, com IDs únicos e tratamento de concorrência entre terminais.
3. Corrigir mesas, adicionais, permissões e arredondamento monetário; centralizar validações.
4. Testar sincronização/recuperação em ambiente de homologação isolado e concluir os testes físicos e os relatórios.
5. Reexecutar a matriz inteira após correções. A suíte deve permanecer vermelha enquanto os defeitos estiverem presentes.
