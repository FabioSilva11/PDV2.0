const ESC_POS = {
  ESC: 0x1B,
  GS: 0x1D,
  LF: 0x0A
} as const;

export { ESC_POS };

interface PrintLine {
  text: string;
  bold?: boolean;
  align?: 'left' | 'center' | 'right';
}

export class EscPosFormatter {
  private buffer: Buffer;
  private width: '80mm' | '58mm';
  private linePositions: number[];

  constructor(width: '80mm' | '58mm' = '80mm') {
    this.width = width;
    this.buffer = Buffer.alloc(0);
    this.linePositions = [];
  }

  private getCharCode(char: string): number {
    return char.charCodeAt(0);
  }

  private encodeText(text: string): Buffer {
    let result = Buffer.alloc(0);
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const code = this.getCharCode(char);
      
      if (code >= 0x20 && code <= 0x7E) {
        result = Buffer.concat([result, Buffer.from([code])]);
      } else {
        const encoded = Buffer.from(text[i], 'utf8');
        result = Buffer.concat([result, encoded]);
      }
    }
    return result;
  }

  formatHeader(text: string, bold: boolean = true): Buffer {
    if (bold) this.bold();
    const header = this.encodeText(text.toUpperCase());
    const rule = this.encodeText('='.repeat(this.charsPerLine()));
    const result = Buffer.concat([header, Buffer.from([0x0A]), rule, Buffer.from([0x0A])]);
    if (bold) this.normal();
    return result;
  }

  formatText(text: string, bold: boolean = false, align?: 'left' | 'center' | 'right'): Buffer {
    if (align === 'center') this.alignCenter();
    else if (align === 'right') this.alignRight();
    if (bold) this.bold();

    const lines = this.wrapText(text);
    for (const line of lines) this.line(line);

    if (bold) this.normal();
    if (align === 'center' || align === 'right') this.alignLeft();

    return this.build();
  }

  private charsPerLine(): number {
    return this.width === '80mm' ? 42 : 32;
  }

  private wrapText(text: string): string[] {
    const charsPerLine = this.charsPerLine();
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      if (currentLine.length + word.length + 1 > charsPerLine) {
        if (currentLine) {
          lines.push(currentLine);
        }
        currentLine = word;
      } else {
        if (currentLine) {
          currentLine += ' ' + word;
        } else {
          currentLine = word;
        }
      }
    }
    if (currentLine) {
      lines.push(currentLine);
    }
    return lines;
  }

  private push(bytes: number[] | Buffer): void {
    this.buffer = Buffer.concat([this.buffer, Buffer.from(bytes)]);
  }

  /**
   * Inicializa a impressora: ESC @ (reset) + ESC a 0 (alinha à esquerda).
   * Deve ser a primeira coisa enviada em cada job.
   */
  init(): this {
    this.push([0x1B, 0x40]); // ESC @ — reset
    this.push([0x1B, 0x61, 0x00]); // ESC a 0 — alinhamento à esquerda
    return this;
  }

  /** Escreve uma linha de texto preservando acentuação (UTF-8). */
  line(text: string): this {
    this.push(this.encodeText(text));
    this.push([0x0A]); // LF
    return this;
  }

  bold(): this {
    this.push([0x1B, 0x45, 0x01]); // ESC E 1 — negrito on
    return this;
  }

  normal(): this {
    this.push([0x1B, 0x45, 0x00]); // ESC E 0 — negrito off
    this.push([0x1B, 0x21, 0x00]); // ESC ! 0 — fonte normal
    return this;
  }

  alignLeft(): this {
    this.buffer = Buffer.concat([this.buffer, Buffer.from([0x1B, 0x61, 0x00])]); // ESC a 00 = left
    return this;
  }

  alignCenter(): this {
    this.buffer = Buffer.concat([this.buffer, Buffer.from([0x1B, 0x61, 0x01])]); // ESC a 01 = center
    return this;
  }

  alignRight(): this {
    this.buffer = Buffer.concat([this.buffer, Buffer.from([0x1B, 0x61, 0x02])]); // ESC a 02 = right
    return this;
  }

  feed(lines: number = 1): this {
    const bytes: number[] = [];
    for (let i = 0; i < lines; i++) bytes.push(0x0A);
    this.push(bytes);
    return this;
  }

  cut(): this {
    this.push([0x1D, 0x56, 0x00]); // GS V 0 — corte total
    return this;
  }

  printQuality(density: 0 | 1 | 2 | 3): this {
    this.push([0x1D, 0x21, density]); // GS ! — qualidade de impressão
    return this;
  }

  qrCode(data: string, size: 1 | 2 | 3 | 4): this {
    // QR code ESC/POS command
    this.buffer = Buffer.concat([this.buffer, Buffer.from([0x1D, 0x28, 0x6B, 0x00, size])]);
    this.buffer = Buffer.concat([this.buffer, Buffer.from(data, 'utf8')]);
    this.buffer = Buffer.concat([this.buffer, Buffer.from([0x1D, 0x28, 0x6B, 0x01])]);
    return this;
  }

  barcode(data: string, type: 'CODE128' | 'CODE39' | 'EAN13' | 'EAN8' | 'UPC-A' = 'CODE128', width: 2 | 3 | 4 | 5 | 6 | 7 | 8 = 3, height: 50 | 100 = 50): this {
    let cmd: number;
    switch (type) {
      case 'CODE128': cmd = 0x48; break;
      case 'CODE39': cmd = 0x42; break;
      case 'EAN13': cmd = 0x47; break;
      case 'EAN8': cmd = 0x65; break;
      case 'UPC-A': cmd = 0x66; break;
      default: cmd = 0x48;
    }
    this.buffer = Buffer.concat([this.buffer, Buffer.from([0x1D, 0x6B, cmd, width, height])]);
    this.buffer = Buffer.concat([this.buffer, Buffer.from(data, 'utf8')]);
    this.buffer = Buffer.concat([this.buffer, Buffer.from([0x1D, 0x6C])]);
    return this;
  }

  build(): Buffer {
    const result = this.buffer;
    this.buffer = Buffer.alloc(0);
    return result;
  }
}