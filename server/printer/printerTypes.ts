export type PrinterConnectionType = 'usb' | 'network' | 'bluetooth';

export type PrinterStatus = 'online' | 'offline' | 'erro' | 'checking';

export interface PrinterConnection {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  testConnection(): Promise<PrinterStatus>;
  print(data: Buffer): Promise<void>;
  getStatus(): PrinterStatus;
}

export interface USBDeviceInfo {
  vendorId: number;
  productId: number;
  serialNumber?: string;
  deviceKey?: string;
  product?: string;
  manufacturer?: string;
}

export interface NetworkPrinterConfig {
  host: string;
  port?: number;
}

export type PrinterConnectionConfig =
  | { type: 'usb'; config: { device: USBDeviceInfo } }
  | { type: 'network'; config: NetworkPrinterConfig };

export interface DiscoveredPrinter {
  id: string;
  name: string;
  type: PrinterConnectionType;
  local: string;
  finalidade: string;
  ip?: string;
  porta?: number;
  modelo: string;
  larguraPapel: '80mm' | '58mm';
  status: PrinterStatus;
  ativa: boolean;
  ultimaVerificacao?: string;
  ultimoErro?: string;
  usbVendorId?: number;
  usbProductId?: number;
  connection?: PrinterConnectionConfig;
}