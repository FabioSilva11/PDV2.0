import { createConnection } from 'net';
import { NetworkPrinterConfig, PrinterConnection, PrinterStatus } from './printerTypes';

export class NetworkPrinterConnection implements PrinterConnection {
  private socket: any = null;
  private host: string;
  private port: number;
  private isConnected = false;
  private readonly timeout: number;

  constructor(config: NetworkPrinterConfig, timeout: number = 3000) {
    this.host = config.host;
    this.port = config.port || 9100;
    this.timeout = timeout;
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket = createConnection({
        host: this.host,
        port: this.port,
        timeout: this.timeout,
      });

      this.socket.on('connect', () => {
        this.isConnected = true;
        resolve();
      });

      this.socket.on('error', (err: any) => {
        this.isConnected = false;
        if (this.socket) {
          this.socket.destroy();
          this.socket = null;
        }
        reject(new Error(`Falha ao conectar impressora de rede ${this.host}:${this.port} - ${err.message}`));
      });

      this.socket.on('timeout', () => {
        this.isConnected = false;
        this.socket!.destroy();
        this.socket = null;
        reject(new Error(`Timeout conectando impressora ${this.host}:${this.port}`));
      });

      this.socket.on('close', () => {
        this.isConnected = false;
        this.socket = null;
      });
    });
  }

  async disconnect(): Promise<void> {
    if (this.socket) {
      this.socket.destroy();
      this.socket = null;
      this.isConnected = false;
    }
  }

  async testConnection(): Promise<PrinterStatus> {
    if (!this.isConnected || !this.socket) return 'offline';
    try {
      const testBuf = Buffer.from([0x1B, 0x40]); // ESC @ reset
      this.socket.write(testBuf);
      await new Promise(resolve => setTimeout(resolve, 100));
      return 'online';
    } catch (error: any) {
      this.isConnected = false;
      return 'erro';
    }
  }

  async print(data: Buffer): Promise<void> {
    if (!this.isConnected || !this.socket) {
      throw new Error('Impressora de rede não conectada');
    }
    try {
      this.socket.write(data);
      await new Promise(resolve => setTimeout(resolve, 50));
    } catch (error: any) {
      this.isConnected = false;
      throw new Error(`Falha ao imprimir rede ${this.host}:${this.port} - ${error.message}`);
    }
  }

  getStatus(): PrinterStatus {
    if (!this.isConnected || !this.socket) return 'offline';
    return 'online';
  }
}