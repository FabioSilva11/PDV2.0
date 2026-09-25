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

-- 2. Tabela estruturada de Pedidos
CREATE TABLE IF NOT EXISTS `orders` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `numero` INT NOT NULL,
  `tipo` ENUM('balcao', 'mesa', 'delivery') NOT NULL DEFAULT 'balcao',
  `status` VARCHAR(32) NOT NULL DEFAULT 'novo',
  `status_pagamento` VARCHAR(32) NOT NULL DEFAULT 'pendente',
  `mesa_numero` INT NULL,
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
  INDEX `idx_criado_em` (`criado_em`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Tabela estruturada de Itens do Cardápio
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

-- 4. Movimentações de Caixa
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

-- 5. Clientes
CREATE TABLE IF NOT EXISTS `customers` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `nome` VARCHAR(255) NOT NULL,
  `telefone` VARCHAR(64) NULL,
  `endereco` TEXT NULL,
  `total_comprado` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `ultimo_pedido_em` DATETIME NULL,
  INDEX `idx_telefone` (`telefone`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Logs de Auditoria
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
