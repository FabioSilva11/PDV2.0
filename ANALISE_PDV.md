# Auditoria e Correções — PDV Murupi 2.0

**Data:** 15/09/2026

## Fluxo operacional homologado no código

```text
CAIXA ABERTO
  ↓
COMANDA / PEDIDO ATUAL
  ↓
BALCÃO | MESA | ENTREGA
  ↓
REVISAR PEDIDO
  ↓
CONFIRMAR PEDIDO
  ↓
IMPRIMIR VIA PEDIDO
  ↓
COZINHA PREPARA
  ↓
GERAR ESPELHO
  ↓
IMPRIMIR VIA ESPELHO
  ↓
PEDIDO PRONTO
  ↓
ENTREGAR / CONSUMIR NA MESA
  ↓
PAGAMENTO MANUAL
  ↓
REGISTRAR CAIXA
  ↓
COMPROVANTE
  ↓
FINALIZAR
```

**Regra:** Pedido + Espelho são duas vias do mesmo pedido. Cada lote possui o mesmo `pedidoId`, `pedidoNumero` e `grupoImpressaoId`. Lotes adicionais carregam apenas os itens adicionados, evitando duplicar itens já preparados.

## Correções aplicadas

1. Removida qualquer dependência do botão/ação "Enviar Cozinha". A confirmação gera a via PEDIDO; a operação do espelho representa a conclusão da preparação.
2. `PrintBatch` agora guarda `itemIds`, vinculando cada dupla de vias aos itens exatos do lote.
3. A via ESPELHO usa os itens do lote correspondente; pedidos adicionais não reimprimem itens antigos.
4. Impressoras não são escolhidas aleatoriamente. O sistema usa a finalidade configurada ou uma impressora `geral` explícita.
5. Espelho só pode ser gerado para pedido em `novo`, impedindo conclusão indevida de pedidos já encerrados.
6. Itens já espelhados não podem ser cancelados silenciosamente. Para correção administrativa, o pedido deve ser reaberto.
7. Pedidos `finalizado`/`entregue` não aceitam novas inclusões, cancelamento de item ou alteração de desconto silenciosa.
8. Reabertura administrativa de pedido finalizado retorna para `pronto` sem criar uma nova impressão automaticamente; se houver mesa, ela é restaurada como ocupada.
9. `OrderDetailsModal` passou a obter corretamente `updateOrderStatus` do contexto.
10. Status legado de produção digital (`preparando`, `saiu_entrega`) não é preservado na normalização.
11. A credencial local do Firebase Admin foi removida do pacote de distribuição. O `.gitignore` continua bloqueando esse padrão.
12. PIX continua manual e depende de `VITE_PIX_KEY`; não existe payload fictício aceito como pagamento.
13. Cartão continua manual: a maquininha física não é integrada ao PDV.

## Testes adicionados

- `src/tests/pdv.test.tsx`: **65 casos**
- `src/tests/reports-and-sync.test.ts`: **4 casos**
- Total de casos declarados: **69**

A nova bateria cobre, entre outros:

- dupla impressão Pedido + Espelho;
- mesma identidade de pedido entre as duas vias;
- lote de itens para impressão;
- pedidos adicionais sem duplicação;
- impressora offline;
- fallback somente para impressora `geral` explícita;
- Balcão, Mesa e Entrega;
- endereço/taxa de entrega;
- pagamento em dinheiro, PIX e cartão;
- troco e caixa físico;
- pagamento parcial;
- cancelamento antes/depois do espelho;
- reabertura administrativa;
- transferência de mesa;
- liberação de mesa;
- idempotência da criação do pedido;
- bloqueio de pedido com caixa fechado;
- bloqueio de status inválido;
- remoção de status legado de produção.

## Resultado da verificação nesta cópia

### Verificações estáticas

- 3 tipos no PDV: **PASS**
- ausência do botão `Enviar Cozinha`: **PASS**
- botão `Confirmar Pedido`: **PASS**
- vínculo Pedido + Espelho: **PASS**
- `itemIds` por lote: **PASS**
- espelho usa somente o lote correspondente: **PASS**
- ausência de KDS/Courier no código web: **PASS**
- `updateOrderStatus` disponível no modal de detalhes: **PASS**
- fallback de impressora aleatória removido: **PASS**
- credencial Firebase Admin removida da cópia: **PASS**

### Execução da suíte automatizada

A execução não pôde ser concluída nesta cópia porque o `node_modules` fornecido no arquivo enviado está incompleto/corrompido: o executável local `vitest` não existe e várias declarações de tipos estão ausentes. Tentativas de reinstalação via npm excederam o tempo disponível.

Portanto, **não declarar os 69 testes como PASSADOS** nesta cópia. Eles foram adicionados e revisados, mas precisam ser executados em uma instalação limpa com:

```bash
npm install
npm test -- --run
npm run lint
npm run build
```

## Critério de aceite

O sistema só deve ser considerado operacionalmente homologado quando os 69 testes passarem em uma instalação limpa e o fluxo físico for validado com duas impressoras térmicas:

- impressora finalidade `pedido`;
- impressora finalidade `espelho`.

A impressão física é a substituta do KDS. Não deve ser reintroduzido um botão ou módulo de "Enviar para cozinha".

## Implementação adicional — sessões de mesa e histórico (2026-09-15)

Foi implementado o fluxo solicitado para mesas:
- Uma mesa aberta passa a possuir uma **sessão** numerada.
- Cada confirmação gera um **novo pedido**, sem editar/sobrescrever o anterior.
- A numeração operacional da mesa segue `1.0`, `1.1`, `1.2`...
- Ao quitar a sessão e liberar a mesa, a próxima ocupação inicia `2.0`.
- O histórico dos pedidos permanece no cadastro de pedidos e é exibido dentro da sessão da mesa.
- Pedidos cancelados permanecem no histórico com indicação visual vermelha; pedidos concluídos ficam preservados como histórico.
- O total da mesa soma os saldos de todos os pedidos não cancelados da sessão.
- **Dar Baixa Manual** registra o pagamento pelos métodos manuais existentes e pode quitar uma sessão composta por vários pedidos.
- A mesa só é liberada automaticamente quando o saldo total da sessão chega a zero.
- O botão `Pagar (F2)` do PDV fica desabilitado para `Mesa`; a baixa da mesa é feita pela tela de Mesas.
- A impressão mostra o código operacional da mesa junto do número global, por exemplo `PEDIDO 1.1 • #1002`.
- `addItemsToTable()` agora cria um novo pedido na mesma sessão em vez de alterar o pedido anterior.

### Testes adicionados
Foram adicionados testes para:
1. primeiro pedido `1.0` e segundo `1.1`;
2. terceiro pedido `1.2` preservando histórico;
3. baixa manual de vários pedidos da mesma sessão;
4. nova ocupação iniciando `2.0`;
5. lançamento adicional criando novo pedido, sem editar o anterior.

### Limitação de execução
Os testes automatizados continuam sem execução neste ambiente porque o pacote entregue não contém `node_modules` e a instalação das dependências não foi concluída anteriormente. Foram feitas verificações estáticas no código. Portanto, **não declarar que a suíte Vitest passou** até executar `npm install`/`npm ci` e `npm test` no ambiente de desenvolvimento.

## Implementação complementar — setembro/2026

Foram adicionados os seguintes fluxos:
- divisão de conta da mesa com pagamento parcial por partes;
- manutenção do histórico de pedidos da sessão 1.0, 1.1, 1.2 etc.;
- caixa operacional manual (abertura, fechamento, suprimento e sangria) já integrado ao registro de auditoria;
- trilha de auditoria para ações administrativas/operacionais;
- perfis de usuário e permissões (`administrador`, `gerente`, `caixa`, `garcom`), com bloqueios para ações sensíveis;
- cadastro de clientes e vínculo opcional do cliente ao pedido;
- módulo de reservas com vínculo opcional à mesa;
- dois cardápios no mesmo ambiente: `Restaurante` e `Lanche`, selecionáveis diretamente no PDV e na gestão do cardápio;
- exceção de Delivery: não cria a via PEDIDO; imprime somente o ESPELHO completo, pronto para ser grampeado na embalagem, conforme regra operacional definida.

Validação estática das novas estruturas: aprovada. A suíte/build não pôde ser executada neste ambiente porque o pacote entregue não possui `node_modules`/executável `vite` instalado.

## 2026-09-15 — Roteamento avançado de impressoras

Implementado o gerenciador de roteamento de impressão inspirado em padrões de PDVs profissionais.

### O que foi adicionado
- Uma impressora pode receber múltiplas funções; não existe mais dependência rígida de uma única finalidade quando há regras avançadas.
- Regras por:
  - documento: Pedido, Espelho, Comprovante;
  - cardápio: Restaurante, Lanche;
  - atendimento: Mesa, Balcão, Delivery;
  - categoria de produto;
  - estação de produção.
- Uma mesma impressora pode ter várias regras simultaneamente.
- Um mesmo pedido pode ser distribuído para impressoras diferentes, cada uma recebendo somente os itens compatíveis com seu roteamento.
- O sistema mantém o mesmo grupo de impressão e agora registra múltiplos IDs de jobs por lote (`pedidoJobIds` / `espelhoJobIds`), preservando os campos antigos para compatibilidade.
- O Delivery continua sem PEDIDO: recebe somente ESPELHO. Para Delivery, uma impressora somente recebe o ESPELHO se a regra casar com o pedido inteiro, evitando gerar um espelho parcial.
- Quando há itens sem destino, a fila registra explicitamente um trabalho de falha de roteamento em vez de enviar silenciosamente para uma impressora aleatória.
- O fallback legado (`finalidade`) continua funcionando em impressoras sem regras avançadas.
- A tela de impressoras agora mostra as regras ativas e permite criar, duplicar, ativar/desativar e excluir regras.

### Exemplo suportado
- Impressora Sucos → Pedido + Espelho → Restaurante + Lanche → categoria Sucos.
- Impressora Pedido Restaurante → Pedido → Restaurante → todas as categorias.
- Impressora Pedido Lanche → Pedido → Lanche → todas as categorias.
- Impressora Espelho Restaurante → Espelho → Restaurante → todas as categorias.
- Impressora Espelho Lanche → Espelho → Lanche → todas as categorias.
- Impressora Delivery → Espelho → Delivery → Restaurante + Lanche → todas as categorias.

### Verificação
- O código alterado foi verificado com `tsc --noEmit`; não surgiram erros de tipos específicos do roteamento após filtrar os erros já conhecidos de dependências ausentes (`react`, `lucide-react`, `react/jsx-runtime` etc.).
- `npm run build` e Vitest continuam não executados porque este projeto está sem `node_modules` neste ambiente.
