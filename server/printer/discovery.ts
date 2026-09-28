import net from 'net';
import os from 'os';
import type { DiscoveredPrinter } from './printerTypes';

const SCAN_CONCURRENCY = 64;
const MAX_SCANNED_HOSTS = Number(process.env.PRINTER_DISCOVERY_MAX_HOSTS) || 1024;

export const DISCOVERY_TIMEOUT_MS = Number(process.env.PRINTER_DISCOVERY_TIMEOUT_MS) || 600;

export interface Cidr {
  base: string;
  mask: number;
}

const ipToLong = (ip: string): number => ip.split('.').reduce((acc, octet) => (acc << 8) + Number(octet), 0) >>> 0;
const longToIp = (value: number): string => [(value >>> 24) & 255, (value >>> 16) & 255, (value >>> 8) & 255, value & 255].join('.');

export const isPrivateIpv4 = (ip: string): boolean => {
  const [a, b] = ip.split('.').map(Number);
  if (a === 10) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  return a === 127;
};

const maskToPrefix = (netmask: string): number | null => {
  const mask = ipToLong(netmask);
  if (mask === 0) return 0;
  // A máscara precisa ser uma sequência contínua de bits 1.
  const inverted = (~mask) >>> 0;
  if (((inverted + 1) & inverted) !== 0) return null;
  let prefix = 0;
  for (let bit = 31; bit >= 0; bit--) {
    if ((mask >>> bit) & 1) prefix++;
    else break;
  }
  return prefix;
};

/**
 * Faixas a varrer: PRINTER_DISCOVERY_CIDR quando definido, senão as sub-redes
 * privadas das interfaces IPv4 do próprio host. Nada de rede fixa no código.
 */
export const resolveDiscoveryCidrs = (): Cidr[] => {
  const configured = (process.env.PRINTER_DISCOVERY_CIDR || '')
    .split(',')
    .map(entry => entry.trim())
    .filter(Boolean);

  if (configured.length) {
    return configured.map(entry => {
      const [base, maskText] = entry.split('/');
      const mask = Number(maskText);
      if (!isPrivateIpv4(base) || !Number.isInteger(mask) || mask < 8 || mask > 30) {
        throw new Error(`PRINTER_DISCOVERY_CIDR inválido: ${entry}`);
      }
      return { base, mask };
    });
  }

  const cidrs: Cidr[] = [];
  for (const addresses of Object.values(os.networkInterfaces())) {
    for (const address of addresses || []) {
      if (address.family !== 'IPv4' || address.internal) continue;
      const mask = maskToPrefix(address.netmask);
      if (mask === null || !isPrivateIpv4(address.address)) continue;
      if (cidrs.some(existing => existing.base === address.address && existing.mask === mask)) continue;
      cidrs.push({ base: address.address, mask });
    }
  }
  return cidrs;
};

export const enumerateHosts = (base: string, mask: number, limit: number): string[] => {
  const baseLong = ipToLong(base);
  const size = Math.min(2 ** (32 - mask), limit + 2);
  const networkStart = baseLong & (mask === 0 ? 0 : (0xFFFFFFFF << (32 - mask)) >>> 0);

  const hosts: string[] = [];
  for (let offset = 1; offset < size - 1; offset++) {
    hosts.push(longToIp((networkStart + offset) >>> 0));
  }
  return hosts;
};

/**
 * Confirma a porta 9100 e identifica o dispositivo como ESC/POS lendo o byte
 * de status (DLE EOT 1). Se não responder, o host é ignorado.
 */
export const probePrinter = (ip: string, port: number, timeoutMs: number): Promise<DiscoveredPrinter | null> =>
  new Promise((resolve) => {
    const socket = new net.Socket();
    let settled = false;

    const finish = (printer: DiscoveredPrinter | null) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(printer);
    };

    socket.setTimeout(timeoutMs);
    socket.once('error', () => finish(null));
    socket.once('timeout', () => finish(null));
    socket.once('data', () => {
      finish({
        id: `net-${ip}-${port}`,
        name: `Impressora ESC/POS ${ip}`,
        type: 'network',
        local: 'LAN',
        finalidade: 'geral',
        ip,
        porta: port,
        modelo: 'ESC/POS detectada',
        larguraPapel: '80mm',
        status: 'checking',
        ativa: true,
        connection: { type: 'network', config: { host: ip, port } }
      });
    });

    socket.connect(port, ip, () => {
      // DLE EOT 1 → solicita o status da impressora.
      socket.write(Buffer.from([0x10, 0x04, 0x01]));
    });
  });
