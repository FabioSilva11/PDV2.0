-- ============================================================
-- PDV 2.0 — Schema SQLite local (data/pdv.sqlite)
-- Fonte única de persistência. Sem servidor de banco externo.
-- ============================================================

-- 0. Metadados do banco: versão do schema e controle de migração
CREATE TABLE IF NOT EXISTS database_meta (
  `key`   TEXT PRIMARY KEY,
  `value` TEXT
);

-- 0.1 Configuração única do estabelecimento (evita "nova instalação" por porta)
CREATE TABLE IF NOT EXISTS restaurant_settings (
  `id`             TEXT PRIMARY KEY,
  `nome_fantasia`  TEXT,
  `razao_social`   TEXT,
  `nome_curto`     TEXT,
  `cnpj`           TEXT,
  `telefone`       TEXT,
  `cidade`         TEXT,
  `estado`         TEXT,
  `setup_complete` INTEGER NOT NULL DEFAULT 0,
  `raw_data`       TEXT,
  `updated_at`     TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 0.2 Snapshot consolidado (compatibilidade/backup — NÃO é a única estrutura)
CREATE TABLE IF NOT EXISTS app_state (
  `id`         TEXT PRIMARY KEY,
  `data`       TEXT NOT NULL,
  `version`    INTEGER NOT NULL DEFAULT 1,
  `updated_at` TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 1. Usuários e permissões
CREATE TABLE IF NOT EXISTS users (
  `id`         TEXT PRIMARY KEY,
  `nome`       TEXT NOT NULL,
  `usuario`    TEXT,
  `senha_hash` TEXT,
  `cargo`      TEXT,
  `perfil`     TEXT,
  `ativo`      INTEGER NOT NULL DEFAULT 1,
  `is_primary_admin` INTEGER NOT NULL DEFAULT 0,
  `permissoes` TEXT,
  `raw_data`   TEXT,
  `updated_at` TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_users_usuario ON users(usuario);

-- 2. Cardápio — produto único, com um ou mais catálogos
CREATE TABLE IF NOT EXISTS menu_items (
  `id`         TEXT PRIMARY KEY,
  `nome`       TEXT NOT NULL,
  `categoria`  TEXT,
  `catalogos`  TEXT NOT NULL DEFAULT '["restaurante"]',
  `preco`      REAL NOT NULL DEFAULT 0,
  `descricao`  TEXT,
  `disponivel` INTEGER NOT NULL DEFAULT 1,
  `raw_data`   TEXT,
  `updated_at` TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_menu_items_categoria ON menu_items(categoria);
CREATE INDEX IF NOT EXISTS idx_menu_items_nome ON menu_items(nome);

-- 3. Categorias — MenuCategory.catalogos (independente de MenuItem.catalogos)
CREATE TABLE IF NOT EXISTS menu_categories (
  `id`         TEXT PRIMARY KEY,
  `nome`       TEXT NOT NULL,
  `catalogos`  TEXT,
  `ordem`      INTEGER NOT NULL DEFAULT 0,
  `ativo`      INTEGER NOT NULL DEFAULT 1,
  `raw_data`   TEXT,
  `updated_at` TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 4. Contas / Checks (independente da mesa)
CREATE TABLE IF NOT EXISTS accounts (
  `id`                   TEXT PRIMARY KEY,
  `numero`               INTEGER NOT NULL,
  `tipo`                 TEXT NOT NULL DEFAULT 'balcao',
  `status`               TEXT NOT NULL DEFAULT 'aberta',
  `origem`               TEXT NOT NULL DEFAULT 'balcao',
  `nome_cliente`         TEXT,
  `telefone_cliente`     TEXT,
  `mesa_original_id`     TEXT,
  `mesa_original_numero` INTEGER,
  `mesa_atual_id`        TEXT,
  `mesa_atual_numero`    INTEGER,
  `conta_pai_id`         TEXT,
  `conta_filha_id`       TEXT,
  `total`                REAL NOT NULL DEFAULT 0,
  `valor_pago`           REAL NOT NULL DEFAULT 0,
  `saldo_restante`       REAL NOT NULL DEFAULT 0,
  `aberta_em`            TEXT,
  `paga_em`              TEXT,
  `encerrada_em`         TEXT,
  `criada_por`           TEXT,
  `raw_data`             TEXT,
  `updated_at`           TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_accounts_numero ON accounts(numero);
CREATE INDEX IF NOT EXISTS idx_accounts_status ON accounts(status);
CREATE INDEX IF NOT EXISTS idx_accounts_mesa_atual ON accounts(mesa_atual_numero);
CREATE INDEX IF NOT EXISTS idx_accounts_mesa_original ON accounts(mesa_original_numero);

-- 5. Pedidos (lançamentos de uma conta)
CREATE TABLE IF NOT EXISTS orders (
  `id`                   TEXT PRIMARY KEY,
  `numero`               INTEGER NOT NULL DEFAULT 0,
  `tipo`                 TEXT NOT NULL DEFAULT 'balcao',
  `status`               TEXT NOT NULL DEFAULT 'novo',
  `status_pagamento`     TEXT NOT NULL DEFAULT 'pendente',
  `conta_id`             TEXT,
  `conta_numero`         INTEGER,
  `sequencia`            INTEGER,
  `sequencia_global`     INTEGER,
  `codigo_exibicao`      TEXT,
  `mesa_numero`          INTEGER,
  `mesa_original_numero` INTEGER,
  `codigo_mesa`          TEXT,
  `turno_id`             TEXT,
  `cliente_nome`         TEXT,
  `cliente_telefone`     TEXT,
  `total`                REAL NOT NULL DEFAULT 0,
  `desconto`             REAL NOT NULL DEFAULT 0,
  `taxa_entrega`         REAL NOT NULL DEFAULT 0,
  `valor_total_pago`     REAL NOT NULL DEFAULT 0,
  `saldo_restante`       REAL NOT NULL DEFAULT 0,
  `criado_em`            TEXT,
  `raw_data`             TEXT,
  `updated_at`           TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_orders_numero ON orders(numero);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_conta ON orders(conta_id);
CREATE INDEX IF NOT EXISTS idx_orders_conta_numero ON orders(conta_numero);
CREATE INDEX IF NOT EXISTS idx_orders_mesa ON orders(mesa_numero);
CREATE INDEX IF NOT EXISTS idx_orders_turno ON orders(turno_id);
CREATE INDEX IF NOT EXISTS idx_orders_sequencia_global ON orders(sequencia_global);

-- 5.1 Itens do pedido — preserva o vínculo CartItem.menuItemId com o cardápio
CREATE TABLE IF NOT EXISTS order_items (
  `id`           TEXT PRIMARY KEY,
  `order_id`     TEXT NOT NULL,
  `menu_item_id` TEXT,
  `nome`         TEXT,
  `quantidade`   REAL NOT NULL DEFAULT 0,
  `preco`        REAL NOT NULL DEFAULT 0,
  `raw_data`     TEXT,
  `updated_at`   TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_menu ON order_items(menu_item_id);

-- 6. Pagamentos — isolados por conta
CREATE TABLE IF NOT EXISTS payments (
  `id`              TEXT PRIMARY KEY,
  `conta_id`        TEXT,
  `conta_numero`    INTEGER,
  `order_id`        TEXT,
  `forma_id`        TEXT,
  `forma_nome`      TEXT,
  `valor`           REAL NOT NULL DEFAULT 0,
  `valor_recebido`  REAL NOT NULL DEFAULT 0,
  `troco`           REAL NOT NULL DEFAULT 0,
  `estornado`       INTEGER NOT NULL DEFAULT 0,
  `observacao`      TEXT,
  `registrado_por`  TEXT,
  `data_hora`       TEXT,
  `raw_data`        TEXT,
  `updated_at`      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_payments_conta ON payments(conta_id);
CREATE INDEX IF NOT EXISTS idx_payments_order ON payments(order_id);

-- 7. Caixa: estado corrente + turnos + transações
CREATE TABLE IF NOT EXISTS cash_register (
  `id`          TEXT PRIMARY KEY,
  `saldo_atual` REAL NOT NULL DEFAULT 0,
  `turno_atual_id` TEXT,
  `raw_data`    TEXT,
  `updated_at`  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS turnos_operacionais (
  `id`                  TEXT PRIMARY KEY,
  `caixa_id`            TEXT,
  `status`              TEXT NOT NULL DEFAULT 'aberto',
  `operador_abertura`   TEXT,
  `aberto_em`           TEXT,
  `operador_fechamento` TEXT,
  `fechado_em`          TEXT,
  `saldo_inicial`       REAL NOT NULL DEFAULT 0,
  `saldo_final`         REAL,
  `raw_data`            TEXT,
  `updated_at`          TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_turnos_status ON turnos_operacionais(status);
CREATE INDEX IF NOT EXISTS idx_turnos_caixa ON turnos_operacionais(caixa_id);

CREATE TABLE IF NOT EXISTS cash_transactions (
  `id`               TEXT PRIMARY KEY,
  `caixa_id`         TEXT,
  `turno_id`         TEXT,
  `tipo`             TEXT NOT NULL,
  `valor`            REAL NOT NULL DEFAULT 0,
  `motivo`           TEXT,
  `forma_pagamento`  TEXT,
  `operador`         TEXT,
  `pedido_id`        TEXT,
  `horario`          TEXT,
  `raw_data`         TEXT,
  `updated_at`       TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_cash_tx_caixa ON cash_transactions(caixa_id, tipo);
CREATE INDEX IF NOT EXISTS idx_cash_tx_turno ON cash_transactions(turno_id);

-- 8. Mesas
CREATE TABLE IF NOT EXISTS tables (
  `id`         TEXT PRIMARY KEY,
  `numero`     INTEGER NOT NULL,
  `status`     TEXT NOT NULL DEFAULT 'livre',
  `capacidade` INTEGER,
  `raw_data`   TEXT,
  `updated_at` TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_tables_numero ON tables(numero);

-- 9. Formas de pagamento
CREATE TABLE IF NOT EXISTS payment_options (
  `id`        TEXT PRIMARY KEY,
  `nome`      TEXT NOT NULL,
  `ativo`     INTEGER NOT NULL DEFAULT 1,
  `ordem`     INTEGER NOT NULL DEFAULT 0,
  `raw_data`  TEXT,
  `updated_at` TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 10. Clientes
CREATE TABLE IF NOT EXISTS customers (
  `id`                TEXT PRIMARY KEY,
  `nome`              TEXT NOT NULL,
  `telefone`          TEXT,
  `endereco`          TEXT,
  `total_comprado`    REAL NOT NULL DEFAULT 0,
  `ultimo_pedido_em`  TEXT,
  `raw_data`          TEXT,
  `updated_at`        TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_customers_telefone ON customers(telefone);

-- 11. Reservas
CREATE TABLE IF NOT EXISTS reservations (
  `id`         TEXT PRIMARY KEY,
  `nome`       TEXT,
  `telefone`   TEXT,
  `data_hora`  TEXT,
  `mesa_numero` INTEGER,
  `pessoas`    INTEGER,
  `status`     TEXT,
  `raw_data`   TEXT,
  `updated_at` TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 12. Impressoras e fila de impressão
CREATE TABLE IF NOT EXISTS printers (
  `id`            TEXT PRIMARY KEY,
  `nome`          TEXT NOT NULL,
  `tipo`          TEXT,
  `ip`            TEXT,
  `porta`         INTEGER,
  `usb_vendor_id` INTEGER,
  `usb_product_id` INTEGER,
  `finalidade`    TEXT,
  `status`        TEXT,
  `ativa`         INTEGER NOT NULL DEFAULT 1,
  `prioridade`    INTEGER,
  `raw_data`      TEXT,
  `updated_at`    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS print_jobs (
  `id`                TEXT PRIMARY KEY,
  `printer_id`        TEXT,
  `pedido_id`         TEXT,
  `tipo`              TEXT,
  `status`            TEXT,
  `tentativas`        INTEGER NOT NULL DEFAULT 0,
  `data_hora`         TEXT,
  `raw_data`          TEXT,
  `updated_at`        TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_print_jobs_printer ON print_jobs(printer_id);
CREATE INDEX IF NOT EXISTS idx_print_jobs_pedido ON print_jobs(pedido_id);

-- 13. Auditoria
CREATE TABLE IF NOT EXISTS audit_logs (
  `id`          TEXT PRIMARY KEY,
  `acao`        TEXT,
  `entidade`    TEXT,
  `entidade_id` TEXT,
  `usuario`     TEXT,
  `horario`     TEXT,
  `raw_data`    TEXT,
  `updated_at`  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_audit_entidade ON audit_logs(entidade, entidade_id);

-- 14. Alertas do sistema
CREATE TABLE IF NOT EXISTS system_alerts (
  `id`         TEXT PRIMARY KEY,
  `tipo`       TEXT,
  `resolvido`  INTEGER NOT NULL DEFAULT 0,
  `raw_data`   TEXT,
  `updated_at` TEXT NOT NULL DEFAULT (datetime('now'))
);
