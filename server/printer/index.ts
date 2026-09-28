import express from 'express';
import { PrinterManager } from './PrinterManager';
import { DiscoveredPrinter, NetworkPrinterConfig, USBDeviceInfo } from './printerTypes';

const router = express.Router();
const printerManager = new PrinterManager();

/**
 * Registro de impressoras configuradas pelo operador.
 * A configuração canônica permanece no PDV (estado/MariaDB); este mapa
 * mantém o serviço local ciente dos dispositivos para validar, conectar e
 * reportar status sem depender do navegador.
 */
const registry = new Map<string, DiscoveredPrinter>();

const MAX_DOCUMENT_BYTES = 512 * 1024;

const isValidIpv4 = (value: string): boolean => {
  const parts = value.split('.');
  if (parts.length !== 4) return false;
  return parts.every(part => /^\d{1,3}$/.test(part) && Number(part) >= 0 && Number(part) <= 255);
};

const isPrivateHost = (value: string): boolean => {
  if (!isValidIpv4(value)) return false;
  const [a, b] = value.split('.').map(Number);
  if (a === 10) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  return a === 127;
};

const sanitizeNetworkConfig = (input: any): NetworkPrinterConfig => {
  const host = String(input?.host ?? input?.ip ?? '').trim();
  const port = Number(input?.port ?? input?.porta ?? 9100);

  if (!isPrivateHost(host)) {
    throw new Error('Host inválido: use um endereço IP privado (LAN) válido.');
  }
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('Porta inválida: informe um valor entre 1 e 65535.');
  }
  return { host, port };
};

const sanitizeUsbDevice = (input: any): USBDeviceInfo => {
  const vendorId = Number(input?.vendorId);
  const productId = Number(input?.productId);

  if (!Number.isInteger(vendorId) || vendorId < 0 || vendorId > 0xFFFF) {
    throw new Error('vendorId USB inválido.');
  }
  if (!Number.isInteger(productId) || productId < 0 || productId > 0xFFFF) {
    throw new Error('productId USB inválido.');
  }
  return {
    vendorId,
    productId,
    serialNumber: input?.serialNumber ? String(input.serialNumber) : undefined,
    deviceKey: input?.deviceKey ? String(input.deviceKey) : undefined,
    product: input?.product ? String(input.product) : undefined,
    manufacturer: input?.manufacturer ? String(input.manufacturer) : undefined
  };
};

const requireDocument = (content: unknown): string => {
  const text = String(content ?? '');
  if (!text.trim()) throw new Error('Conteúdo de impressão vazio.');
  if (Buffer.byteLength(text, 'utf8') > MAX_DOCUMENT_BYTES) {
    throw new Error('Documento excede o limite de 512 KB.');
  }
  return text;
};

// GET /api/printers - lista as impressoras registradas com o status atual
router.get('/', (req, res) => {
  const printers = Array.from(registry.values()).map(printer => ({
    ...printer,
    status: printerManager.getPrinterStatus(printer.id),
    conectada: printerManager.isConnected(printer.id)
  }));
  res.json({ success: true, printers, count: printers.length });
});

// POST /api/printers - registra/atualiza uma impressora
router.post('/', (req, res) => {
  try {
    const body = req.body || {};
    const id = String(body.id ?? '').trim();
    if (!id) return res.status(400).json({ success: false, error: 'ID da impressora é obrigatório.' });

    const type = body.type === 'usb' ? 'usb' : 'network';
    const printer: DiscoveredPrinter = {
      id,
      name: String(body.nome ?? body.name ?? id),
      type,
      local: type === 'usb' ? 'usb' : 'LAN',
      finalidade: String(body.finalidade ?? 'geral'),
      modelo: String(body.modelo ?? 'ESC/POS'),
      larguraPapel: body.larguraPapel === '58mm' ? '58mm' : '80mm',
      status: 'checking',
      ativa: body.ativa !== false,
      ip: body.ip ? String(body.ip) : undefined,
      porta: body.porta ? Number(body.porta) : undefined,
      usbVendorId: body.usbVendorId != null ? Number(body.usbVendorId) : undefined,
      usbProductId: body.usbProductId != null ? Number(body.usbProductId) : undefined,
      connection: type === 'usb'
        ? { type: 'usb', config: { device: sanitizeUsbDevice(body.connection?.config?.device ?? body) } }
        : { type: 'network', config: sanitizeNetworkConfig(body.connection?.config ?? body) }
    };

    registry.set(id, printer);
    res.json({ success: true, printer });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// DELETE /api/printers/:id - remove a impressora e encerra a conexão
router.delete('/:printerId', (req, res) => {
  const { printerId } = req.params;
  registry.delete(printerId);
  printerManager.disconnectPrinter(printerId);
  res.json({ success: true });
});

// POST /api/printers/discover - descoberta de impressoras na rede local
router.post('/discover', async (req, res) => {
  try {
    const results = await printerManager.discover(10000);
    res.json({ success: true, printers: results, count: results.length });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/printers/test/:printerId - testa uma impressora já conectada
router.post('/test/:printerId', async (req, res) => {
  const { printerId } = req.params;
  const connection = printerManager.getConnection(printerId);
  if (!connection) {
    return res.status(409).json({ success: false, status: 'offline', error: 'Impressora não conectada' });
  }
  try {
    const status = await printerManager.testPrinter(printerId, connection);
    const printer = registry.get(printerId);
    res.json({ success: true, status, printerNome: printer?.name });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/printers/connect - abre a conexão com a impressora
router.post('/connect', async (req, res) => {
  try {
    const printerId = String(req.body?.printerId ?? req.body?.printer?.id ?? '').trim();
    if (!printerId) {
      return res.status(400).json({ success: false, error: 'ID da impressora é obrigatório' });
    }
    const registered = registry.get(printerId);
    const payload = req.body?.printer ?? registered;
    if (!payload) {
      return res.status(404).json({ success: false, error: 'Impressora não registrada' });
    }

    const type = payload.type === 'usb' ? 'usb' : 'network';
    const printer: DiscoveredPrinter = {
      ...(registered ?? (payload as DiscoveredPrinter)),
      ...(payload as DiscoveredPrinter),
      id: printerId,
      type,
      connection: type === 'usb'
        ? { type: 'usb', config: { device: sanitizeUsbDevice(payload.connection?.config?.device ?? payload) } }
        : { type: 'network', config: sanitizeNetworkConfig(payload.connection?.config ?? payload) }
    };

    const connection = await printerManager.connectPrinter(printer);
    registry.set(printerId, printer);
    res.json({ success: true, connectionStatus: connection.getStatus() });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// POST /api/printers/disconnect/:printerId - encerra a conexão
router.post('/disconnect/:printerId', (req, res) => {
  printerManager.disconnectPrinter(req.params.printerId);
  res.json({ success: true });
});

// GET /api/printers/:printerId/status - status atual
router.get('/:printerId/status', (req, res) => {
  const { printerId } = req.params;
  res.json({
    success: true,
    status: printerManager.getPrinterStatus(printerId),
    conectada: printerManager.isConnected(printerId)
  });
});

// POST /api/printers/print - envia bytes ESC/POS já prontos
router.post('/print', async (req, res) => {
  const { printerId, data } = req.body || {};
  if (!printerId || !data) {
    return res.status(400).json({ success: false, error: 'printerId e data são obrigatórios' });
  }
  try {
    requireDocument(data);
    await printerManager.print(String(printerId), Buffer.from(String(data), 'utf8'));
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/printers/print-with-format - monta o ESC/POS e imprime
router.post('/print-with-format', async (req, res) => {
  const { printerId, content, bold, align, feedAfter, cutAfter } = req.body || {};
  if (!printerId || !content) {
    return res.status(400).json({ success: false, error: 'printerId e content são obrigatórios' });
  }
  try {
    requireDocument(content);
    await printerManager.printWithFormat(String(printerId), String(content), {
      bold: Boolean(bold),
      align,
      feedAfter: feedAfter ?? 3,
      cutAfter: cutAfter !== false
    });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/printers/reprint - reimprime o conteúdo de um job
router.post('/reprint', async (req, res) => {
  const { printerId, conteudo, content } = req.body || {};
  if (!printerId || !(conteudo || content)) {
    return res.status(400).json({ success: false, error: 'printerId e conteudo são obrigatórios' });
  }
  try {
    requireDocument(conteudo || content);
    await printerManager.retryPrint(String(printerId), Buffer.from(String(conteudo || content), 'utf8'), 3);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
