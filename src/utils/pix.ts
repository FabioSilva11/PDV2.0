export function crc16Ccitt(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i += 1) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc & 0x8000) !== 0 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

function field(id: string, value: string): string {
  return id + value.length.toString().padStart(2, '0') + value;
}

/**
 * Gera o payload PIX Copia e Cola.
 * Os dados do recebedor (nome, cidade, descrição) vêm SEMPRE da
 * configuração do estabelecimento (RestaurantSettings.pix) — a função
 * exige que sejam passados explicitamente, sem fallback de negócio.
 */
export function buildPixPayload(
  key: string,
  amount: number,
  merchantName: string,
  merchantCity: string,
  merchantDescription = 'PEDIDO'
): string {
  const cleanKey = key.trim();
  if (!cleanKey) throw new Error('Chave PIX não configurada. Defina em Configurações.');
  const cleanName = (merchantName || '').trim();
  if (!cleanName) throw new Error('Nome do recebedor PIX não configurado. Defina em Configurações.');
  const cleanCity = (merchantCity || '').trim();
  if (!cleanCity) throw new Error('Cidade do recebedor PIX não configurada. Defina em Configurações.');

  const merchantAccount = field('00', 'BR.GOV.BCB.PIX') + field('01', cleanKey);
  const additional = field('05', merchantDescription.slice(0, 25)) + field('09', '***');
  const payload = [
    field('00', '01'),
    field('26', merchantAccount),
    field('52', '0000'),
    field('53', '986'),
    field('54', amount.toFixed(2)),
    field('58', 'BR'),
    field('59', cleanName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').slice(0, 25).toUpperCase()),
    field('60', cleanCity.normalize('NFD').replace(/[\u0300-\u036f]/g, '').slice(0, 15).toUpperCase()),
    field('62', additional),
    '6304'
  ].join('');
  return payload + crc16Ccitt(payload);
}
