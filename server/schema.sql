-- ============================================================
-- Schema MariaDB para PDV 2.0 (Localhost)
-- ============================================================

CREATE DATABASE IF NOT EXISTS `pdv_murupi` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `pdv_murupi`;

-- 0. Configuração única do estabelecimento (singleton id=1/'singleton')
CREATE TABLE IF NOT EXISTS `restaurant_settings` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `nome_fantasia` VARCHAR(255) NULL,
  `razao_social` VARCHAR(255) NULL,
  `nome_curto` VARCHAR(128) NULL,
  `cnpj` VARCHAR(32) NULL,
  `telefone` VARCHAR(64) NULL,
  `cidade` VARCHAR(128) NULL,
  `estado` VARCHAR(4) NULL,
  `setup_complete` TINYINT(1) NOT NULL DEFAULT 0,
  `raw_data` LONGTEXT NULL,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 1. Snapshot consolidado de estado operacional (Sincronização Atômica)
CREATE TABLE IF NOT EXISTS `app_state` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `data` LONGTEXT NOT NULL,
  `version` INT NOT NULL DEFAULT 1,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Contas / Checks (atendimento financeiro — independente da mesa)
--    `status` é independente de `orders.status`: uma conta pode estar 'encerrada'
--    com lançamentos ainda 'novo', e uma mesa pode estar 'livre' com conta aberta.
CREATE TABLE IF NOT EXISTS `accounts` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `numero` INT NOT NULL,
  `tipo` ENUM('balcao', 'mesa', 'delivery') NOT NULL DEFAULT 'balcao',
  `status` VARCHAR(32) NOT NULL DEFAULT 'aberta',
  `origem` VARCHAR(32) NOT NULL DEFAULT 'balcao',
  `nome_cliente` VARCHAR(255) NULL,
  `telefone_cliente` VARCHAR(64) NULL,
  `mesa_original_id` VARCHAR(64) NULL,
  `mesa_original_numero` INT NULL,
  `mesa_atual_id` VARCHAR(64) NULL,
  `mesa_atual_numero` INT NULL,
  `conta_pai_id` VARCHAR(64) NULL,
  `conta_filha_id` VARCHAR(64) NULL,
  `total` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `valor_pago` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `saldo_restante` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `aberta_em` DATETIME NULL,
  `paga_em` DATETIME NULL,
  `encerrada_em` DATETIME NULL,
  `criada_por` VARCHAR(128) NULL,
  `raw_data` LONGTEXT NULL,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uq_accounts_numero` (`numero`),
  INDEX `idx_accounts_status` (`status`),
  INDEX `idx_accounts_mesa_atual` (`mesa_atual_numero`),
  INDEX `idx_accounts_mesa_original` (`mesa_original_numero`),
  INDEX `idx_accounts_cliente` (`nome_cliente`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Pagamentos isolados por conta (nunca apenas por número da mesa)
CREATE TABLE IF NOT EXISTS `payments` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `conta_id` VARCHAR(64) NULL,
  `conta_numero` INT NULL,
  `order_id` VARCHAR(64) NULL,
  `forma_id` VARCHAR(32) NOT NULL,
  `forma_nome` VARCHAR(64) NULL,
  `valor` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `valor_recebido` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `troco` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `estornado` TINYINT(1) NOT NULL DEFAULT 0,
  `observacao` TEXT NULL,
  `registrado_por` VARCHAR(128) NULL,
  `data_hora` DATETIME NOT NULL,
  INDEX `idx_payments_conta` (`conta_id`),
  INDEX `idx_payments_order` (`order_id`),
  INDEX `idx_payments_data` (`data_hora`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Tabela estruturada de Pedidos (LANÇAMENTOS de uma conta)
CREATE TABLE IF NOT EXISTS `orders` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `numero` INT NOT NULL,
  `tipo` ENUM('balcao', 'mesa', 'delivery') NOT NULL DEFAULT 'balcao',
  `status` VARCHAR(32) NOT NULL DEFAULT 'novo',
  `status_pagamento` VARCHAR(32) NOT NULL DEFAULT 'pendente',
  `conta_id` VARCHAR(64) NULL,
  `conta_numero` INT NULL,
  `sequencia` INT NULL,
  `sequencia_global` INT NULL,
  `codigo_exibicao` VARCHAR(32) NULL,
  `mesa_numero` INT NULL,
  `mesa_original_numero` INT NULL,
  `codigo_mesa` VARCHAR(32) NULL,
  `cliente_nome` VARCHAR(255) NULL,
  `cliente_telefone` VARCHAR(64) NULL,
  `total` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `desconto` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `taxa_entrega` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `valor_total_pago` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `saldo_restante` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `criado_em` DATETIME NOT NULL,
  `raw_data` LONGTEXT NULL,
  INDEX `idx_numero` (`numero`),
  INDEX `idx_status` (`status`),
  INDEX `idx_tipo` (`tipo`),
  INDEX `idx_conta` (`conta_id`),
  INDEX `idx_conta_numero` (`conta_numero`),
  INDEX `idx_mesa_numero` (`mesa_numero`),
  INDEX `idx_criado_em` (`criado_em`),
  INDEX `idx_sequencia_global` (`sequencia_global`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4.1 Upgrade idempotente: instalações já existentes possuem a versão
--     ANTIGA de `orders` (sem conta/check). `CREATE TABLE IF NOT EXISTS`
--     acima não altera tabelas já criadas — sem estes ALTERs o servidor
--     passaria a gravar colunas inexistentes e a perda de pedidos seria
--     certainada. A migração de dados (mesaSessaoId -> contaId) acontece
--     no cliente, em src/lib/accountMigration.ts, sobre raw_data.
ALTER TABLE `orders` ADD COLUMN IF NOT EXISTS `conta_id` VARCHAR(64) NULL AFTER `status_pagamento`;
ALTER TABLE `orders` ADD COLUMN IF NOT EXISTS `conta_numero` INT NULL AFTER `conta_id`;
ALTER TABLE `orders` ADD COLUMN IF NOT EXISTS `sequencia` INT NULL AFTER `conta_numero`;
ALTER TABLE `orders` ADD COLUMN IF NOT EXISTS `sequencia_global` INT NULL AFTER `sequencia`;
ALTER TABLE `orders` ADD COLUMN IF NOT EXISTS `codigo_exibicao` VARCHAR(32) NULL AFTER `sequencia_global`;
ALTER TABLE `orders` ADD COLUMN IF NOT EXISTS `mesa_original_numero` INT NULL AFTER `mesa_numero`;
ALTER TABLE `orders` ADD INDEX IF NOT EXISTS `idx_conta` (`conta_id`);
ALTER TABLE `orders` ADD INDEX IF NOT EXISTS `idx_conta_numero` (`conta_numero`);
ALTER TABLE `orders` ADD INDEX IF NOT EXISTS `idx_mesa_numero` (`mesa_numero`);
ALTER TABLE `orders` ADD INDEX IF NOT EXISTS `idx_sequencia_global` (`sequencia_global`);

-- 5. Tabela estruturada de Itens do Cardápio
CREATE TABLE IF NOT EXISTS `menu_items` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `nome` VARCHAR(255) NOT NULL,
  `categoria` VARCHAR(64) NOT NULL,
  `catalogo` VARCHAR(32) NOT NULL DEFAULT 'restaurante',
  `preco` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `descricao` TEXT NULL,
  `disponivel` TINYINT(1) NOT NULL DEFAULT 1,
  `raw_data` LONGTEXT NULL,
  INDEX `idx_categoria` (`categoria`),
  INDEX `idx_catalogo` (`catalogo`),
  INDEX `idx_disponivel` (`disponivel`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Movimentações de Caixa
CREATE TABLE IF NOT EXISTS `cash_transactions` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `caixa_id` VARCHAR(64) NULL,
  `tipo` VARCHAR(32) NOT NULL,
  `valor` DECIMAL(10,2) NOT NULL,
  `motivo` TEXT NOT NULL,
  `forma_pagamento` VARCHAR(32) NULL,
  `operador` VARCHAR(128) NOT NULL,
  `pedido_id` VARCHAR(64) NULL,
  `horario` DATETIME NOT NULL,
  INDEX `idx_caixa_tipo` (`caixa_id`, `tipo`),
  INDEX `idx_horario` (`horario`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Clientes
CREATE TABLE IF NOT EXISTS `customers` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `nome` VARCHAR(255) NOT NULL,
  `telefone` VARCHAR(64) NULL,
  `endereco` TEXT NULL,
  `total_comprado` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `ultimo_pedido_em` DATETIME NULL,
  INDEX `idx_telefone` (`telefone`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Logs de Auditoria
CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `acao` VARCHAR(128) NOT NULL,
  `entidade` VARCHAR(64) NOT NULL,
  `entidade_id` VARCHAR(64) NOT NULL,
  `detalhes` TEXT NULL,
  `usuario` VARCHAR(128) NOT NULL,
  `horario` DATETIME NOT NULL,
  INDEX `idx_entidade` (`entidade`, `entidade_id`),
  INDEX `idx_horario` (`horario`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
