import type { PrinterConnection, PrinterStatus } from './printerTypes';

/**
 * O adaptador USB é carregado sob demanda. A versão publicada do
 * `@node-escpos/usb-adapter` usa uma API do pacote `usb` que pode não existir na
 * versão instalada; importando no topo, um único módulo incompatível derrubaria
 * o backend inteiro — inclusive as impressoras de rede. Aqui a falha fica
 * restrita à impressão USB e reporta um erro claro.
 */
type UsbAdapterCtor = new (vendorId?: number, productId?: number) => {
  open(callback?: (error: Error | null) => void): unknown;
  close(callback?: (error: Error | null) => void): unknown;
  write(data: string | Buffer, callback?: (error: Error | null) => void): unknown;
};

let usbAdapter: UsbAdapterCtor | null = null;
let usbLoadError: string | null = null;

const loadUsbAdapter = async (): Promise<UsbAdapterCtor> => {
  if (usbAdapter) return usbAdapter;
  if (usbLoadError) throw new Error(usbLoadError);

  try {
    const module = await import('@node-escpos/usb-adapter');
    const ctor = ((module as any).default ?? module) as UsbAdapterCtor;
    if (typeof ctor !== 'function') throw new Error('Adaptador USB não expõe um construtor válido.');
    usbAdapter = ctor;
    return ctor;
  } catch (error: any) {
    usbLoadError = `Adaptador USB indisponível (${error?.message}). Reinstale com uma versão compatível de "usb".`;
    throw new Error(usbLoadError);
  }
};

/** Usado pela tela de saúde para explicar por que a USB não funciona. */
export const getUsbAdapterError = (): string | null => usbLoadError;

export const listUsbDevices = async (): Promise<{ vendorId: number; productId: number; product?: string; manufacturer?: string }[]> => {
  const adapter = await loadUsbAdapter();
  const ctor = adapter as unknown as { findPrinter?: () => any[] };
  if (typeof ctor.findPrinter !== 'function') return [];
  return ctor.findPrinter().map((device: any) => ({
    vendorId: Number(device?.deviceDescriptor?.idVendor),
    productId: Number(device?.deviceDescriptor?.idProduct),
    product: device?.deviceDescriptor?.product,
    manufacturer: device?.deviceDescriptor?.manufacturer
  }));
};

export class UsbPrinterConnection implements PrinterConnection {
  private adapter: any = null;
  private isConnected = false;
  private readonly vendorId: number;
  private readonly productId: number;
  private readonly serialNumber?: string;

  constructor(vendorId: number, productId: number, serialNumber?: string) {
    this.vendorId = vendorId;
    this.productId = productId;
    this.serialNumber = serialNumber;
  }

  private open(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.adapter.open((error: Error | null) => (error ? reject(error) : resolve()));
    });
  }

  private closeDevice(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.adapter.close((error: Error | null) => (error ? reject(error) : resolve()));
    });
  }

  private write(data: Buffer): Promise<void> {
    return new Promise((resolve, reject) => {
      this.adapter.write(data, (error: Error | null) => (error ? reject(error) : resolve()));
    });
  }

  async connect(): Promise<void> {
    try {
      const Adapter = await loadUsbAdapter();
      this.adapter = new Adapter(this.vendorId, this.productId);
      await this.open();
      this.isConnected = true;
    } catch (error: any) {
      this.isConnected = false;
      throw new Error(`Falha ao conectar impressora USB: ${error?.message}`);
    }
  }

  async disconnect(): Promise<void> {
    if (this.isConnected && this.adapter) {
      try {
        await this.closeDevice();
      } catch (error: any) {
        console.error('Erro ao desconectar impressora USB:', error?.message);
      }
    }
    this.isConnected = false;
    this.adapter = null;
  }

  async testConnection(): Promise<PrinterStatus> {
    if (!this.isConnected || !this.adapter) return 'offline';
    try {
      // DLE EOT 1 — solicita o status. Não altera a impressora.
      await this.write(Buffer.from([0x10, 0x04, 0x01]));
      return 'online';
    } catch {
      return 'erro';
    }
  }

  async print(data: Buffer): Promise<void> {
    if (!this.isConnected || !this.adapter) {
      throw new Error('Impressora USB não conectada');
    }
    await this.write(data);
  }

  getStatus(): PrinterStatus {
    return this.isConnected ? 'online' : 'offline';
  }

  get serial(): string | undefined {
    return this.serialNumber;
  }
}
