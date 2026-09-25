import mysql, { Pool, PoolConnection } from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Carregar variáveis do .env na raiz do projeto
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'pdv_murupi',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
};

let pool: Pool | null = null;
let isConnected = false;
let lastError: string | null = null;

export function getDbStatus() {
  return {
    connected: isConnected,
    host: dbConfig.host,
    port: dbConfig.port,
    database: dbConfig.database,
    user: dbConfig.user,
    lastError
  };
}

/**
 * Inicializa a conexão com o MariaDB, cria o database e as tabelas se necessário.
 */
export async function initMariaDatabase(): Promise<boolean> {
  try {
    // 1. Conectar sem especificar o database para garantir que ele exista
    const adminConnection = await mysql.createConnection({
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.user,
      password: dbConfig.password
    });

    await adminConnection.query(
      `CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
    );
    await adminConnection.end();

    // 2. Criar pool de conexões apontando para o database
    pool = mysql.createPool(dbConfig);

    // Testar conexão
    const conn: PoolConnection = await pool.getConnection();
    
    // Executar auto-criação das tabelas
    await initTables(conn);
    conn.release();

    isConnected = true;
    lastError = null;
    console.log(`[MariaDB] Conectado com sucesso em ${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`);
    return true;
  } catch (err: any) {
    isConnected = false;
    lastError = err?.message || 'Erro ao conectar ao MariaDB';
    console.warn(`[MariaDB] Aviso: Não foi possível conectar ao MariaDB em ${dbConfig.host}:${dbConfig.port} (${lastError}). O sistema continuará operando com cache local e tentará reconectar.`);
    return false;
  }
}

/**
 * Criação automática das tabelas essenciais
 */
async function initTables(conn: PoolConnection) {
  const schemaPath = path.resolve(process.cwd(), 'server', 'schema.sql');
  if (fs.existsSync(schemaPath)) {
    const sql = fs.readFileSync(schemaPath, 'utf8');
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('USE'));

    for (const stmt of statements) {
      try {
        await conn.query(stmt);
      } catch (e: any) {
        // Ignora erros de índice existente etc.
        console.warn('[MariaDB Schema Warning]', e?.message);
      }
    }
  }
}

export function getPool(): Pool {
  if (!pool) {
    pool = mysql.createPool(dbConfig);
  }
  return pool;
}

/**
 * Carrega o snapshot mais recente do banco de dados MariaDB
 */
export async function loadStateFromMariaDB<T>(): Promise<T | null> {
  if (!isConnected) {
    const ok = await initMariaDatabase();
    if (!ok) return null;
  }

  try {
    const p = getPool();
    const [rows]: any = await p.query(
      'SELECT data FROM app_state WHERE id = ? LIMIT 1',
      ['restaurant_snapshot']
    );

    if (rows && rows.length > 0 && rows[0].data) {
      return JSON.parse(rows[0].data) as T;
    }
    return null;
  } catch (err: any) {
    lastError = err?.message;
    console.error('[MariaDB] Erro ao carregar dados:', err?.message);
    return null;
  }
}

/**
 * Salva o snapshot e espelha em tabelas estruturadas no MariaDB
 */
export async function saveStateToMariaDB(snapshot: any): Promise<boolean> {
  if (!isConnected) {
    const ok = await initMariaDatabase();
    if (!ok) return false;
  }

  try {
    const p = getPool();
    const jsonStr = JSON.stringify(snapshot);

    // 1. Salvar snapshot atômico
    await p.query(
      `INSERT INTO app_state (id, data, version) 
       VALUES ('restaurant_snapshot', ?, 1) 
       ON DUPLICATE KEY UPDATE data = VALUES(data), version = version + 1`,
      [jsonStr]
    );

    // 2. Opcional: Atualizar tabela estruturada de pedidos se houver
    if (Array.isArray(snapshot?.orders)) {
      for (const order of snapshot.orders) {
        if (!order?.id) continue;
        const total = Number(order.total) || 0;
        const desc = Number(order.desconto) || 0;
        const taxa = Number(order.taxaEntrega) || 0;
        const pago = Number(order.valorTotalPago) || 0;
        const saldo = Number(order.saldoRestante) || 0;
        const criadoEm = order.criadoEm ? new Date(order.criadoEm) : new Date();

        await p.query(
          `INSERT INTO orders 
           (id, numero, tipo, status, status_pagamento, mesa_numero, codigo_mesa, cliente_nome, cliente_telefone, total, desconto, taxa_entrega, valor_total_pago, saldo_restante, criado_em, raw_data)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             status = VALUES(status),
             status_pagamento = VALUES(status_pagamento),
             total = VALUES(total),
             desconto = VALUES(desconto),
             valor_total_pago = VALUES(valor_total_pago),
             saldo_restante = VALUES(saldo_restante),
             raw_data = VALUES(raw_data)`,
          [
            order.id,
            order.numero || 0,
            order.tipo || 'balcao',
            order.status || 'novo',
            order.statusPagamento || 'pendente',
            order.mesaNumero || null,
            order.codigoMesa || null,
            order.nomeCliente || null,
            order.telefoneCliente || null,
            total,
            desc,
            taxa,
            pago,
            saldo,
            criadoEm,
            JSON.stringify(order)
          ]
        ).catch(() => {});
      }
    }

    return true;
  } catch (err: any) {
    lastError = err?.message;
    console.error('[MariaDB] Erro ao salvar dados:', err?.message);
    return false;
  }
}
