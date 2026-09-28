import { EscPosFormatter } from './EscPosFormatter';
import { UsbPrinterConnection } from './UsbPrinter';
import { NetworkPrinterConnection } from './NetworkPrinter';
import { DISCOVERY_TIMEOUT_MS, probePrinter, enumerateHosts, resolveDiscoveryCidrs } from './discovery';
import type { PrinterConnection, PrinterStatus, DiscoveredPrinter } from './printerTypes';

const MAX_SCANNED_HOSTS = Number(process.env.PRINTER_DISCOVERY_MAX_HOSTS) || 1024;
const SCAN_CONCURRENCY = 64;

export class PrinterManager {
  private connections: Map<string, PrinterConnection> = new Map();
  private statusMap: Map<string, PrinterStatus> = new Map();
  private onStatusChangeInternal?: ((printerId: string, status: PrinterStatus) => void) | undefined;

  onStatusChange(callback: (printerId: string, status: PrinterStatus) => void) {
    this.onStatusChangeInternal = callback;
    return this;
  }

  offStatusChange() {
    this.onStatusChangeInternal = undefined;
    return this;
  }

  getConnection(printerId: string): PrinterConnection | undefined {
    return this.connections.get(printerId);
  }

  isConnected(printerId: string): boolean {
    return this.connections.has(printerId);
  }

  discover(timeoutMs: number = 10000): Promise<DiscoveredPrinter[]> {
    const results: DiscoveredPrinter[] = [];
    return new Promise((resolve) => {
      this.discoverMulticast(results)
        .then(() => {
          this.discoverNetworkTcp(results)
            .then(() => resolve(results))
            .catch(() => resolve(results));
        })
        .catch(() => resolve(results));
    });
  }

  getPrinterStatus(printerId: string): PrinterStatus {
    return this.statusMap.get(printerId) || 'offline';
  }

  async testPrinter(printerId: string, connection: PrinterConnection): Promise<PrinterStatus> {
    try {
      const status = await connection.testConnection();
      this.statusMap.set(printerId, status);
      this.onStatusChangeInternal?.(printerId, status);
      return status;
    } catch (error: any) {
      const status = 'erro';
      this.statusMap.set(printerId, status);
      this.onStatusChangeInternal?.(printerId, status);
      return status;
    }
  }

  async print(printerId: string, data: Buffer): Promise<void> {
    const connection = this.connections.get(printerId);
    if (!connection) {
      throw new Error('Impressora não encontrada ou desconectada');
    }
    await connection.print(data);
    const status = connection.getStatus();
    this.statusMap.set(printerId, status);
    this.onStatusChangeInternal?.(printerId, status);
  }

  async connectPrinter(printer: DiscoveredPrinter): Promise<PrinterConnection> {
    let connection: PrinterConnection;
    const target = printer.connection;

    if (target?.type === 'usb') {
      const usbInfo = target.config.device;
      connection = new UsbPrinterConnection(
        usbInfo.vendorId,
        usbInfo.productId,
        usbInfo.serialNumber
      );
    } else if (target?.type === 'network') {
      connection = new NetworkPrinterConnection(target.config);
    } else if (printer.type === 'usb') {
      if (printer.usbVendorId === undefined || printer.usbProductId === undefined) {
        throw new Error('Dados USB insuficientes para conexão');
      }
      connection = new UsbPrinterConnection(printer.usbVendorId, printer.usbProductId);
    } else {
      if (!printer.ip) {
        throw new Error('IP da impressora de rede é obrigatório');
      }
      connection = new NetworkPrinterConnection({ host: printer.ip, port: printer.porta });
    }

    await connection.connect();
    this.connections.set(printer.id, connection);

    const status = await connection.testConnection();
    this.statusMap.set(printer.id, status);
    this.onStatusChangeInternal?.(printer.id, status);

    return connection;
  }

  disconnectPrinter(printerId: string): void {
    const connection = this.connections.get(printerId);
    if (connection) {
      connection.disconnect();
      this.connections.delete(printerId);
      this.statusMap.delete(printerId);
      this.onStatusChangeInternal?.(printerId, 'offline');
    }
  }

  async printWithFormat(
    printerId: string,
    content: string,
    options: {
      bold?: boolean;
      align?: 'left' | 'center' | 'right';
      feedAfter?: number;
      cutAfter?: boolean;
    } = {}
  ): Promise<void> {
    const { bold = false, align = 'left', feedAfter = 3, cutAfter = true } = options;
    const formatter = new EscPosFormatter('80mm');

    formatter.init();
    if (align === 'center') formatter.alignCenter();
    else if (align === 'right') formatter.alignRight();
    else formatter.alignLeft();

    if (bold) formatter.bold();

    // Cada linha do documento vira uma linha física, preservando as quebras
    // já existentes no conteúdo (buildOrderPrintContent).
    for (const line of content.split('\n')) {
      formatter.line(line);
    }

    if (bold) formatter.normal();
    formatter.feed(feedAfter);
    if (cutAfter) formatter.cut();

    return this.print(printerId, formatter.build());
  }

  /**
   * mDNS/NetBIOS ainda não é emitido pelas impressoras em campo; o ponto de
   * extensão fica aqui para quando o backend for plugado.
   */
  private async discoverMulticast(results: DiscoveredPrinter[]): Promise<void> {
    return Promise.resolve();
  }

  /**
   * Varre as sub-redes privadas do próprio host (ou a faixa configurada em
   * PRINTER_DISCOVERY_CIDR) na porta ESC/POS e confirma o dispositivo lendo o
   * byte de status via DLE EOT — evita reportar portas TCP abertas como
   * impressora.
   */
  private async discoverNetworkTcp(results: DiscoveredPrinter[]): Promise<void> {
    const ranges = resolveDiscoveryCidrs();
    const found: DiscoveredPrinter[] = [];

    for (const { base, mask } of ranges) {
      const hosts = enumerateHosts(base, mask, MAX_SCANNED_HOSTS);
      const port = Number(process.env.PRINTER_DISCOVERY_PORT) || 9100;
      const candidates: DiscoveredPrinter[] = [];

      let cursor = 0;
      const worker = async (): Promise<void> => {
        while (cursor < hosts.length) {
          const ip = hosts[cursor++];
          const printer = await probePrinter(ip, port, DISCOVERY_TIMEOUT_MS);
          if (printer) candidates.push(printer);
        }
      };

      await Promise.all(
        Array.from({ length: Math.min(SCAN_CONCURRENCY, hosts.length) }, () => worker())
      );

      found.push(...candidates);
    }

    results.push(...found);
  }

  private printQueue: Map<string, { data: Buffer; resolve: (value: void) => void; reject: (reason: Error) => void }> = new Map();

  async queuePrint(printerId: string, data: Buffer): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.printQueue.has(printerId)) {
        reject(new Error('Já existe job de impressão pendente para esta impressora'));
        return;
      }

      this.printQueue.set(printerId, { data, resolve, reject });

      this.processPrintQueue(printerId)
        .then(() => {
          this.printQueue.delete(printerId);
          resolve();
        })
        .catch((err: Error) => {
          this.printQueue.delete(printerId);
          reject(err);
        });
    });
  }

  private async processPrintQueue(printerId: string): Promise<void> {
    const job = this.printQueue.get(printerId);
    if (!job) return;

    try {
      await this.print(printerId, job.data);
      job.resolve();
    } catch (error: any) {
      job.reject(new Error(error.message || 'Falha ao imprimir'));
    }
  }

  async printWithFallback(primaryPrinterId: string, fallbackPrinterId: string, data: Buffer): Promise<string> {
    try {
      await this.print(primaryPrinterId, data);
      return 'primary';
    } catch (primaryError: any) {
      try {
        await this.print(fallbackPrinterId, data);
        return 'fallback';
      } catch (fallbackError: any) {
        return `failed:${primaryError.message}|${fallbackError.message}`;
      }
    }
  }

  async retryPrint(printerId: string, data: Buffer, maxTentativas: number = 3): Promise<boolean> {
    for (let i = 0; i < maxTentativas; i++) {
      try {
        await this.print(printerId, data);
        return true;
      } catch (error: any) {
        if (i === maxTentativas - 1) return false;
        await new Promise(resolve => setTimeout(resolve, 500 * (i + 1)));
      }
    }
    return false;
  }

  getAllStatuses(): Map<string, PrinterStatus> {
    return new Map(this.statusMap);
  }

  resetStatus(printerId: string): void {
    this.statusMap.set(printerId, 'checking');
    this.onStatusChangeInternal?.(printerId, 'checking');
  }
}