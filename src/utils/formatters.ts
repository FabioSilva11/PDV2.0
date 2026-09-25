export function formatCurrency(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return 'R$ —';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function formatDateTime(isoString?: string): string {
  if (!isoString) return '--:--';
  const date = new Date(isoString);
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export function formatFullDate(isoString?: string): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function getPaymentMethodName(method?: string): string {
  switch (method) {
    case 'dinheiro': return 'Dinheiro';
    case 'pix': return 'PIX';
    case 'debito': return 'Cartão de Débito';
    case 'credito': return 'Cartão de Crédito';
    default: return 'Não especificado';
  }
}

export function getOrderStatusBadge(status: string): { label: string; bg: string; text: string } {
  switch (status) {
    case 'novo':
      return { label: 'Aguardando Espelho', bg: 'bg-sky-100 border-sky-300', text: 'text-sky-800' };
    case 'pronto':
      return { label: 'Pronto', bg: 'bg-emerald-100 border-emerald-300', text: 'text-emerald-800' };
    case 'entregue':
      return { label: 'Entregue', bg: 'bg-blue-100 border-blue-300', text: 'text-blue-800' };
    case 'finalizado':
      return { label: 'Finalizado', bg: 'bg-stone-100 border-stone-300', text: 'text-stone-700' };
    case 'cancelado':
      return { label: 'Cancelado', bg: 'bg-red-100 border-red-300', text: 'text-red-700' };
    default:
      return { label: status, bg: 'bg-stone-100 border-stone-200', text: 'text-stone-700' };
  }
}
