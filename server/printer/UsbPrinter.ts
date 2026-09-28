import USBAdapter from '@node-escpos/usb-adapter';
import { USBDeviceInfo, PrinterConnection, PrinterStatus } from './printerTypes';

export class UsbPrinterConnection implements PrinterConnection {
  private adapter: USBAdapter | null = null;
  private device: any = null;
  private isConnected = false;
  private readonly vendorId: number;
  private readonly productId: number;
  private serialNumber?: string;
  private deviceKey?: string;

  constructor(vendorId: number, productId: number, serialNumber?: string, deviceKey?: string) {
    this.vendorId = vendorId;
    this.productId = productId;
    this.serialNumber = serialNumber;
    this.deviceKey = deviceKey;
  }

  async connect(): Promise<void> {
    try {
      this.adapter = new USBAdapter({
        vendorId: this.vendorId,
        productId: this.productId,
        serialNumber: this.serialNumber,
        deviceKey: this.deviceKey,
      });
      await this.adapter.open();
      this.device = this.adapter;
      this.isConnected = true;
    } catch (error: any) {
      this.isConnected = false;
      throw new Error(`Falha ao conectar impressora USB: ${error.message}`);
    }
  }

  async disconnect(): Promise<void> {
    if (this.isConnected && this.adapter) {
      try {
        await this.adapter.close();
        this.isConnected = false;
        this.device = null;
      } catch (error: any) {
        console.error('Erro ao desconectar impressora USB:', error);
      }
    }
  }

  async testConnection(): Promise<PrinterStatus> {
    if (!this.isConnected) return 'offline';
    try {
      if (this.device && typeof this.device.write === 'function') {
        const testBuf = Buffer.from([0x1B, 0x40]); // ESC @ = reset printer
        await this.device.write(testBuf);
        return 'online';
      }
      return 'online';
    } catch (error: any) {
      return 'erro';
    }
  }

  async print(data: Buffer): Promise<void> {
    if (!this.isConnected || !this.device) {
      throw new Error('Impressora USB não conectada');
    }
    try {
      await this.device.write(data);
    } catch (error: any) {
      throw new Error(`Falha ao imprimir USB: ${error.message}`);
    }
  }

  getStatus(): PrinterStatus {
    if (!this.isConnected) return 'offline';
    return 'online';
  }
}