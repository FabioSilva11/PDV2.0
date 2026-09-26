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
  database: process.env.DB_NAME || 'pdv_murupi', // nome técnico do schema, não identidade de negócio
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
    // Comentários de linha são removidos ANTES do split: sem isso, todo
    // statement iniciado por "--" seria descartado e a tabela nunca criada.
    const withoutComments = sql
      .split(/\r?\n/)
      .filter(line => !line.trim().startsWith('--'))
      .join('\n');
    const statements = withoutComments
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('USE'));

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
    );    // 2. Espelhar pedidos/contas/pagamentos em tabelas estruturadas
      //    (DENTRO de transação; nenhum erro é engolido — falha de
      //    espelhamento aborta o save).
      if (Array.isArray(snapshot?.orders) || Array.isArray(snapshot?.accounts)) {
        const conn = await p.getConnection();
        try {
          await conn.beginTransaction();
          for (const account of Array.isArray(snapshot?.accounts) ? snapshot.accounts : []) {
            if (!account?.id) continue;
            await conn.query(
              `INSERT INTO accounts
               (id, numero, tipo, status, origem, nome_cliente, telefone_cliente,
                mesa_original_id, mesa_original_numero, mesa_atual_id, mesa_atual_numero,
                conta_pai_id, conta_filha_id, total, valor_pago, saldo_restante,
                aberta_em, paga_em, encerrada_em, criada_por, raw_data)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
               ON DUPLICATE KEY UPDATE
                 tipo = VALUES(tipo),
                 status = VALUES(status),
                 origem = VALUES(origem),
                 nome_cliente = VALUES(nome_cliente),
                 telefone_cliente = VALUES(telefone_cliente),
                 mesa_original_id = VALUES(mesa_original_id),
                 mesa_original_numero = VALUES(mesa_original_numero),
                 mesa_atual_id = VALUES(mesa_atual_id),
                 mesa_atual_numero = VALUES(mesa_atual_numero),
                 conta_pai_id = VALUES(conta_pai_id),
                 conta_filha_id = VALUES(conta_filha_id),
                 total = VALUES(total),
                 valor_pago = VALUES(valor_pago),
                 saldo_restante = VALUES(saldo_restante),
                 paga_em = VALUES(paga_em),
                 encerrada_em = VALUES(encerrada_em),
                 raw_data = VALUES(raw_data)`,
              [
                account.id,
                Number(account.numero) || 0,
                account.tipo || 'balcao',
                account.status || 'aberta',
                account.origem || 'balcao',
                account.nomeCliente || null,
                account.telefoneCliente || null,
                account.mesaOriginalId || null,
                account.mesaOriginalNumero ?? null,
                account.mesaAtualId || null,
                account.mesaAtualNumero ?? null,
                account.contaPaiId || null,
                account.contaFilhaId || null,
                Number(account.total) || 0,
                Number(account.valorPago) || 0,
                Number(account.saldoRestante) || 0,
                account.abertaEm ? new Date(account.abertaEm) : null,
                account.pagaEm ? new Date(account.pagaEm) : null,
                account.encerradaEm ? new Date(account.encerradaEm) : null,
                account.criadaPor || null,
                JSON.stringify(account)
              ]
            );
          }
for (const order of Array.isArray(snapshot?.orders) ? snapshot.orders : []) {
            if (!order?.id) continue;
            const total = Number(order.total) || 0;
            const desc = Number(order.desconto) || 0;
            const taxa = Number(order.taxaEntrega) || 0;
            const pago = Number(order.valorTotalPago) || 0;
            const saldo = Number(order.saldoRestante) || 0;
            const criadoEm = order.criadoEm ? new Date(order.criadoEm) : new Date();

            await conn.query(
              `INSERT INTO orders
               (id, numero, tipo, status, status_pagamento, conta_id, conta_numero, sequencia,
                sequencia_global, codigo_exibicao, mesa_numero, mesa_original_numero, codigo_mesa,
                cliente_nome, cliente_telefone, total, desconto, taxa_entrega,
                valor_total_pago, saldo_restante, criado_em, raw_data)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              ON DUPLICATE KEY UPDATE
                status = VALUES(status),
                status_pagamento = VALUES(status_pagamento),
                conta_id = VALUES(conta_id),
                conta_numero = VALUES(conta_numero),
                sequencia = VALUES(sequencia),
                sequencia_global = VALUES(sequencia_global),
                codigo_exibicao = VALUES(codigo_exibicao),
                mesa_numero = VALUES(mesa_numero),
                mesa_original_numero = VALUES(mesa_original_numero),
                total = VALUES(total),
                desconto = VALUES(desconto),
                taxa_entrega = VALUES(taxa_entrega),
                valor_total_pago = VALUES(valor_total_pago),
                saldo_restante = VALUES(saldo_restante),
                codigo_mesa = VALUES(codigo_mesa),
                cliente_nome = VALUES(cliente_nome),
                cliente_telefone = VALUES(cliente_telefone),
                raw_data = VALUES(raw_data)`,
            [
              order.id,
              order.numero || 0,
              order.tipo || 'balcao',
              order.status || 'novo',
              order.statusPagamento || 'pendente',
              order.contaId || null,
              order.contaNumero ?? null,
              order.sequencia ?? null,
              order.sequenciaGlobal ?? null,
              order.codigoExibicao || null,
              order.mesaNumero ?? null,
              order.mesaOriginalNumero ?? null,
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
            );
            // Pagamentos são isolados por conta: é o que impede que a baixa de
            // uma conta altere a mesa de outra.
            for (const payment of Array.isArray(order.pagamentos) ? order.pagamentos : []) {
              if (!payment?.id) continue;
              await conn.query(
                `INSERT INTO payments
                 (id, conta_id, conta_numero, order_id, forma_id, forma_nome, valor,
                  valor_recebido, troco, estornado, observacao, registrado_por, data_hora)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE
                   valor = VALUES(valor),
                   valor_recebido = VALUES(valor_recebido),
                   troco = VALUES(troco),
                   estornado = VALUES(estornado),
                   observacao = VALUES(observacao)`,
                [
                  payment.id,
                  order.contaId || null,
                  order.contaNumero ?? null,
                  order.id,
                  payment.formaId || 'dinheiro',
                  payment.formaNome || null,
                  Number(payment.valor) || 0,
                  Number(payment.valorRecebido) || 0,
                  Number(payment.troco) || 0,
                  payment.estornado ? 1 : 0,
                  payment.observacao || null,
                  payment.registradoPor || null,
                  payment.dataHora ? new Date(payment.dataHora) : new Date()
                ]
              );
            }
          }
          // Espelhar configuração do estabelecimento em tabela estruturada.
          if (snapshot?.settings?.id) {
            const s = snapshot.settings;
            await conn.query(
              `INSERT INTO restaurant_settings (id, nome_fantasia, razao_social, nome_curto, cnpj, telefone, cidade, estado, setup_complete, raw_data)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
               ON DUPLICATE KEY UPDATE
                 nome_fantasia = VALUES(nome_fantasia),
                 razao_social = VALUES(razao_social),
                 nome_curto = VALUES(nome_curto),
                 cnpj = VALUES(cnpj),
                 telefone = VALUES(telefone),
                 cidade = VALUES(cidade),
                 estado = VALUES(estado),
                 setup_complete = VALUES(setup_complete),
                 raw_data = VALUES(raw_data)`,
              [
                String(s.id),
                s.nomeFantasia || null,
                s.razaoSocial || null,
                s.nomeCurto || null,
                s.cnpj || null,
                s.telefone || null,
                s.cidade || null,
                s.estado || null,
                s.setupComplete ? 1 : 0,
                JSON.stringify(s)
              ]
            );
          }
          await conn.commit();
        } catch (e) {
          await conn.rollback();
          throw e;
        } finally {
          conn.release();
        }
      }

      return true;
  } catch (err: any) {
    lastError = err?.message;
    console.error('[MariaDB] Erro ao salvar dados:', err?.message);
    return false;
  }
}
