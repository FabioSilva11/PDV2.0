Sim. Para um **PDV de restaurante/lanchonete**, eu faria uma bateria de testes pensando menos em “o botão funciona?” e mais em **“o que acontece quando um funcionário faz algo errado, o cliente muda de ideia, a internet cai, o caixa fecha, há muita movimentação, ou duas pessoas usam o sistema ao mesmo tempo?”**

A ideia é **atacar o sistema antes que o cliente ataque em produção**.

## 🔴 1. Testes de venda — fluxo básico

* [ ] Abrir uma venda com 1 produto.
* [ ] Abrir venda com vários produtos.
* [ ] Alterar quantidade de um produto.
* [ ] Adicionar o mesmo produto várias vezes.
* [ ] Remover produto da venda.
* [ ] Cancelar a venda inteira.
* [ ] Finalizar venda em dinheiro.
* [ ] Finalizar venda no cartão.
* [ ] Finalizar venda via PIX.
* [ ] Finalizar venda com pagamento dividido.
* [ ] Venda com desconto.
* [ ] Venda com acréscimo.
* [ ] Venda com valor exato.
* [ ] Venda com troco.
* [ ] Tentar finalizar venda sem produtos.
* [ ] Tentar finalizar venda sem selecionar pagamento.
* [ ] Tentar finalizar duas vezes rapidamente.

### Ataque

**Clique no botão “Finalizar” 5–10 vezes rapidamente.**

Resultado esperado: **uma única venda**, sem duplicação.

---

# 🟠 2. Produtos

* [ ] Produto sem preço.
* [ ] Produto com preço `0`.
* [ ] Produto com preço negativo.
* [ ] Produto com nome muito grande.
* [ ] Produto com caracteres especiais.
* [ ] Produto duplicado.
* [ ] Produto desativado enquanto existe em uma venda.
* [ ] Alterar preço de produto depois de adicionar ao carrinho.
* [ ] Excluir produto que possui vendas antigas.
* [ ] Alterar categoria do produto.
* [ ] Produto sem imagem.
* [ ] Produto com imagem muito grande.
* [ ] Muitos produtos cadastrados.
* [ ] Buscar produto inexistente.
* [ ] Buscar usando letras maiúsculas/minúsculas.
* [ ] Buscar com acentos.
* [ ] Buscar digitando muito rápido.

### Ataque importante

1. Adicione um hambúrguer ao pedido por R$20.
2. Altere o preço cadastrado para R$25.
3. Finalize a venda.

Verifique se o sistema cobra **R$20 ou R$25**, conforme a regra que você definiu.

---

# 🟡 3. Estoque

Se seu PDV possui estoque, essa área é **crítica**.

* [ ] Venda reduz estoque corretamente.
* [ ] Cancelamento devolve estoque.
* [ ] Produto sem estoque.
* [ ] Venda de quantidade maior que o estoque.
* [ ] Estoque `0`.
* [ ] Estoque negativo.
* [ ] Entrada de estoque.
* [ ] Saída manual.
* [ ] Ajuste de estoque.
* [ ] Excluir produto com estoque.
* [ ] Fazer várias vendas simultâneas do mesmo produto.
* [ ] Venda offline e posterior sincronização.

### 🔥 Ataque

Estoque:

> Coca-Cola = 1

Faça **duas vendas simultaneamente**.

Resultado esperado:

> somente uma venda consegue consumir a última unidade.

Isso testa **condição de corrida**.

---

# 🔴 4. Caixa

* [ ] Abrir caixa.
* [ ] Abrir caixa sem informar valor inicial.
* [ ] Abrir dois caixas ao mesmo tempo.
* [ ] Registrar venda.
* [ ] Sangria.
* [ ] Suprimento.
* [ ] Cancelar venda.
* [ ] Estornar venda.
* [ ] Fechar caixa.
* [ ] Fechar caixa com vendas pendentes.
* [ ] Fechar caixa com diferença.
* [ ] Fechar caixa sem movimentação.
* [ ] Reabrir caixa fechado.
* [ ] Tentar vender com caixa fechado.
* [ ] Trocar usuário durante o caixa aberto.
* [ ] Queda de energia durante uma venda.
* [ ] Aplicação fechada durante o fechamento do caixa.

### 🔥 Ataque

Faça:

> Abrir caixa → vender → fechar aplicativo → abrir novamente.

Verifique se:

* venda continua registrada;
* caixa continua aberto;
* valores continuam corretos;
* nenhuma venda desapareceu.

---

# 🟣 5. Mesas / atendimento no restaurante

Se houver mesas:

* [ ] Abrir mesa.
* [ ] Adicionar produtos.
* [ ] Adicionar produto à mesa já ocupada.
* [ ] Remover produto.
* [ ] Transferir mesa.
* [ ] Juntar mesas.
* [ ] Dividir conta.
* [ ] Fechar mesa.
* [ ] Cancelar mesa.
* [ ] Reabrir mesa.
* [ ] Mesa ocupada por outro funcionário.
* [ ] Duas pessoas alterando a mesma mesa.
* [ ] Fechar mesa sem produtos.
* [ ] Cliente mudar pedido depois de enviado para cozinha.
* [ ] Alterar quantidade depois de enviar pedido.

### 🔥 Ataque

Funcionário A abre mesa 10.

Funcionário B também tenta abrir mesa 10.

**O sistema precisa impedir inconsistências.**

---

# 🍔 6. Lanches personalizados

Essa é uma área onde normalmente aparecem muitos bugs.

Teste:

* [ ] Hambúrguer + adicional.
* [ ] Hambúrguer sem adicional.
* [ ] Remover adicional.
* [ ] Adicionar vários adicionais.
* [ ] Mesmo adicional várias vezes.
* [ ] Adicional gratuito.
* [ ] Adicional pago.
* [ ] Observação muito grande.
* [ ] Observação com caracteres especiais.
* [ ] Produto sem ingredientes.
* [ ] Remover ingrediente.
* [ ] Adicionar ingrediente.
* [ ] Combos.
* [ ] Combo com item faltando.
* [ ] Alterar item do combo.
* [ ] Produto personalizado e desconto.
* [ ] Cancelar personalização.

---

# 🟢 7. Pedidos para cozinha

* [ ] Venda envia pedido para cozinha.
* [ ] Pedido aparece uma única vez.
* [ ] Alteração aparece corretamente.
* [ ] Cancelamento chega à cozinha.
* [ ] Pedido duplicado não aparece.
* [ ] Pedido muito grande.
* [ ] Vários pedidos simultâneos.
* [ ] Impressora indisponível.
* [ ] Impressora desconectada.
* [ ] Impressão falha.
* [ ] Reimpressão.
* [ ] Pedido enviado duas vezes.
* [ ] Aplicativo fechado durante envio.

### 🔥 Ataque

Clique:

> **Enviar para cozinha**

10 vezes rapidamente.

Você quer descobrir se aparecem:

> Pedido #105
> Pedido #105
> Pedido #105
> Pedido #105

ou apenas um.

---

# 🌐 8. Internet

Esse é um dos testes **mais importantes**.

Faça uma venda com internet funcionando.

Depois:

* [ ] Desligar Wi-Fi.
* [ ] Desligar dados móveis.
* [ ] Iniciar venda offline.
* [ ] Finalizar venda offline.
* [ ] Fechar aplicativo offline.
* [ ] Abrir novamente offline.
* [ ] Restaurar internet.
* [ ] Sincronizar.
* [ ] Derrubar internet durante sincronização.
* [ ] Internet ficar instável.
* [ ] Internet voltar várias vezes.
* [ ] Duas sincronizações simultâneas.

### 🔥 Cenário real

> Cliente está pagando → internet cai → funcionário tenta novamente → internet volta.

Verifique se você criou:

**1 venda**

ou acidentalmente:

**2 vendas.**

---

# 💳 9. Pagamentos

Teste cada método:

* [ ] Dinheiro.
* [ ] PIX.
* [ ] Débito.
* [ ] Crédito.
* [ ] Pagamento dividido.
* [ ] Pagamento parcial.
* [ ] Pagamento maior que o total.
* [ ] Pagamento menor que o total.
* [ ] Cancelamento.
* [ ] Estorno.
* [ ] Troca de método de pagamento.
* [ ] Cliente desiste.
* [ ] Operador volta para tela anterior.
* [ ] Aplicativo fechado durante pagamento.

### 🔥 Ataque financeiro

Venda:

> R$100

Pagamento:

> R$150

Verifique:

> Total = R$100
> Pago = R$150
> Troco = R$50

E principalmente:

**o relatório financeiro precisa registrar R$100 de venda, não R$150 de faturamento.**

---

# 🧮 10. Matemática / valores

Crie testes específicos para:

* [ ] R$0,01
* [ ] R$0,10
* [ ] R$0,99
* [ ] R$1,99
* [ ] R$10,50
* [ ] R$99,99
* [ ] R$999,99
* [ ] Desconto de 1%
* [ ] Desconto de 50%
* [ ] Desconto de 100%
* [ ] Desconto maior que 100%
* [ ] Acréscimo.
* [ ] Troco.
* [ ] Divisão de conta.

### 🔥 Ataque

Faça:

> 3 produtos × R$3,33

Confira se o sistema apresenta:

> **R$9,99**

e não algo como:

> R$9,98 / R$10,00

---

# 👤 11. Usuários e permissões

Crie pelo menos:

**Administrador**

**Gerente**

**Caixa**

**Garçom**

Teste:

* [ ] Caixa tentando excluir produto.
* [ ] Garçom tentando fechar caixa.
* [ ] Caixa tentando alterar preço.
* [ ] Funcionário tentando dar desconto.
* [ ] Funcionário tentando cancelar venda.
* [ ] Funcionário tentando visualizar informações administrativas.
* [ ] Login incorreto.
* [ ] Senha incorreta.
* [ ] Logout.
* [ ] Troca de usuário.
* [ ] Sessão expirada.
* [ ] Dois usuários usando o mesmo caixa.

---

# 🛡️ 12. Segurança

Tente quebrar o sistema propositalmente:

* [ ] Campos vazios.
* [ ] Números negativos.
* [ ] Valores gigantes.
* [ ] Texto gigantesco.
* [ ] Caracteres especiais.
* [ ] Emojis.
* [ ] Colar texto enorme.
* [ ] Clicar rapidamente.
* [ ] Voltar várias vezes.
* [ ] Abrir várias telas.
* [ ] Fechar aplicativo inesperadamente.
* [ ] Girar tela durante operação.
* [ ] Minimizar aplicativo.
* [ ] Bloquear telefone.
* [ ] Abrir novamente.

---

# ⚡ 13. Teste de estresse

Agora tente simular um restaurante movimentado.

Crie:

> 100 produtos
> 50 categorias
> 20 usuários
> 100 mesas
> 500 pedidos

Depois faça:

* [ ] Pesquisas rápidas.
* [ ] Abrir várias mesas.
* [ ] Criar vários pedidos.
* [ ] Finalizar vendas rapidamente.
* [ ] Abrir relatórios.
* [ ] Filtrar relatórios.
* [ ] Fechar caixa.
* [ ] Sincronizar dados.

Observe:

* memória;
* travamentos;
* lentidão;
* banco de dados;
* duplicação;
* perda de dados.

---

# 📊 15. Relatórios

Depois de realizar várias vendas, confira se:

* [ ] Total vendido está correto.
* [ ] Total em dinheiro está correto.
* [ ] Total PIX está correto.
* [ ] Total cartão está correto.
* [ ] Descontos estão corretos.
* [ ] Cancelamentos não contam como vendas.
* [ ] Estornos aparecem corretamente.
* [ ] Trocos não são contabilizados como faturamento.
* [ ] Produtos mais vendidos estão corretos.
* [ ] Estoque bate com vendas.
* [ ] Fechamento do caixa bate com relatório.

---

# 💥 16. Testes de recuperação

Esses são excelentes para encontrar bugs graves.

Faça uma operação e **mate o aplicativo no meio**:

### Teste A

> Adicionar produto → matar aplicativo.

### Teste B

> Finalizar venda → matar aplicativo.

### Teste C

> Enviar pedido → matar aplicativo.

### Teste D

> Sincronizar → matar aplicativo.

### Teste E

> Fechar caixa → matar aplicativo.

Depois abra novamente e confira o estado.

---

# 🧨 17. Testes de concorrência

Simule **duas pessoas usando o sistema ao mesmo tempo**.

Exemplo:

**Caixa 1**

> vende Coca-Cola.

**Caixa 2**

> vende Coca-Cola.

Ao mesmo tempo.

Faça isso com:

* [ ] Estoque.
* [ ] Mesas.
* [ ] Pedidos.
* [ ] Produtos.
* [ ] Caixa.
* [ ] Sincronização.
* [ ] Cancelamentos.

Esse tipo de teste encontra bugs que dificilmente aparecem usando o sistema sozinho.

---

# 🏆 18. Teste "dia inteiro de restaurante"

Eu faria este como **teste final antes da produção**:

### 08:00

Abrir caixa com R$200.

### 08:15

Venda de café.

### 09:00

Venda de vários produtos.

### 11:30

Restaurante começa a lotar.

### 12:00

Abrir várias mesas.

### 12:10

Vários pedidos simultâneos.

### 12:30

Internet cai.

### 12:35

Continuar atendendo.

### 12:45

Internet volta.

### 13:00

Sincronizar.

### 13:30

Cancelar um pedido.

### 14:00

Fazer estorno.

### 15:00

Fazer sangria.

### 16:00

Fazer nova venda.

### 18:00

Outro funcionário assume.

### 22:00

Fechar caixa.

Depois compare **tudo**:

> dinheiro físico × vendas
> PIX × vendas
> cartão × vendas
> estoque × vendas
> pedidos × vendas
> cancelamentos × relatórios

Se tudo bater, você começa a ter uma confiança muito maior no PDV.

---

## 🔥 E eu criaria um "modo destruição"

Além dos testes normais, tenha uma lista específica chamada:

**💣 CHAOS TEST — TENTAR QUEBRAR O PDV**

Com coisas como:

1. Clicar 20 vezes no mesmo botão.
2. Abrir/fechar a mesma tela rapidamente.
3. Desligar internet durante uma operação.
4. Matar o aplicativo durante uma operação.
5. Fazer duas vendas simultâneas.
6. Alterar estoque enquanto vende.
7. Alterar preço enquanto vende.
8. Tentar finalizar pedido vazio.
9. Tentar pagar R$0.
10. Tentar pagar valor negativo.
11. Colocar quantidade `999999`.
12. Colocar preço `999999999`.
13. Usar emojis e caracteres especiais.
14. Criar 1.000 produtos.
15. Fazer 100 vendas seguidas.
16. Sincronizar várias vezes.
17. Fazer login/logout repetidamente.
18. Usar duas contas simultaneamente.
19. Fechar o caixa com operações pendentes.
20. Restaurar um backup antigo.
21. Atualizar o aplicativo com vendas pendentes.
22. Voltar durante cada etapa crítica.
23. Bloquear o celular durante uma operação.
24. Remover conexão no momento exato da confirmação.
25. Repetir uma operação depois de uma falha.

**O objetivo não é provar que o sistema funciona. É tentar provar que ele consegue falhar.**

Se você quiser, também posso transformar isso em uma **matriz de testes profissional**, com colunas **ID → Cenário → Passos → Resultado esperado → Resultado obtido → Severidade → Status → Bug encontrado**, pronta para você usar durante os testes do seu PDV.
