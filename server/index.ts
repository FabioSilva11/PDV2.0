import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { 
  initMariaDatabase, 
  getDbStatus, 
  loadStateFromMariaDB, 
  saveStateToMariaDB 
} from './db';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const app = express();
const port = Number(process.env.SERVER_PORT) || 3001;

// Middlewares
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Health Check do Servidor e do MariaDB
app.get('/api/health', (req, res) => {
  const status = getDbStatus();
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    mariadb: status
  });
});

// Carregar dados completos do MariaDB
app.get('/api/database', async (req, res) => {
  try {
    const data = await loadStateFromMariaDB();
    if (data) {
      res.json({ success: true, data });
    } else {
      res.json({ success: true, data: null, message: 'Nenhum dado salvo no MariaDB ainda ou banco offline' });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Salvar / Sincronizar estado completo no MariaDB
app.post('/api/database', async (req, res) => {
  try {
    const snapshot = req.body;
    if (!snapshot || typeof snapshot !== 'object') {
      return res.status(400).json({ success: false, error: 'Snapshot inválido.' });
    }

    const saved = await saveStateToMariaDB(snapshot);
    if (saved) {
      res.json({ success: true, message: 'Dados salvos com sucesso no MariaDB.' });
    } else {
      res.status(503).json({ success: false, message: 'Não foi possível gravar no MariaDB. Verifique a conexão com o banco.' });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Inicialização
async function start() {
  console.log('[Servidor Local] Iniciando serviço backend PDV Murupi...');
  await initMariaDatabase();

  app.listen(port, () => {
    console.log(`[Servidor Local] API rodando em http://localhost:${port}`);
    console.log(`[Servidor Local] Rotas disponíveis:`);
    console.log(`  - GET  http://localhost:${port}/api/health`);
    console.log(`  - GET  http://localhost:${port}/api/database`);
    console.log(`  - POST http://localhost:${port}/api/database`);
  });
}

start().catch(err => {
  console.error('[Servidor Local] Erro crítico ao iniciar:', err);
});
