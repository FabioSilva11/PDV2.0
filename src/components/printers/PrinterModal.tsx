import React, { useEffect, useMemo, useState } from 'react';
import { PrinterDevice, PrinterType, PrinterPurpose, PrinterRouteRule, PrintRouteDocument, MenuCatalog, OrderType, CategoryType, KitchenStation } from '../../types';
import { X, Save, Printer, Plus, Trash2, Copy } from 'lucide-react';

interface PrinterModalProps { isOpen: boolean; onClose: () => void; onSave: (printer: PrinterDevice) => void; printerToEdit?: PrinterDevice | null; }

const DOCUMENTOS: { id: PrintRouteDocument; label: string }[] = [
  { id: 'pedido', label: 'Pedido' }, { id: 'espelho', label: 'Espelho' }, { id: 'comprovante', label: 'Comprovante' }
];
const CATALOGOS: { id: MenuCatalog; label: string }[] = [{ id: 'restaurante', label: 'Restaurante' }, { id: 'lanche', label: 'Lanche' }];
const TIPOS: { id: OrderType; label: string }[] = [{ id: 'mesa', label: 'Mesa' }, { id: 'balcao', label: 'Balcão' }, { id: 'delivery', label: 'Delivery' }];
const CATEGORIAS: CategoryType[] = ['Hambúrgueres','Lanches & Burgers','Pizzas','Pratos principais','Entradas','Porções Extras','Bebidas','Sucos de Frutas','Sobremesas','Combos'];
const ESTACOES: { id: KitchenStation; label: string }[] = [{id:'cozinha',label:'Cozinha'},{id:'chapa',label:'Chapa'},{id:'bar',label:'Bar / Bebidas'},{id:'pizza',label:'Pizza'},{id:'sobremesa',label:'Sobremesa'}];

const toggle = <T,>(list: T[], value: T) => list.includes(value) ? list.filter(x => x !== value) : [...list, value];

export const PrinterModal: React.FC<PrinterModalProps> = ({ isOpen, onClose, onSave, printerToEdit }) => {
  const [nome,setNome]=useState(''); const [local,setLocal]=useState('Cozinha Chapa'); const [tipo,setTipo]=useState<PrinterType>('rede');
  const [finalidade,setFinalidade]=useState<PrinterPurpose>('geral'); const [ip,setIp]=useState('192.168.1.200'); const [porta,setPorta]=useState(9100);
  const [modelo,setModelo]=useState('Epson TM-T20X (ESC/POS)'); const [larguraPapel,setLarguraPapel]=useState<'80mm'|'58mm'>('80mm');
  const [regras,setRegras]=useState<PrinterRouteRule[]>([]);
  useEffect(()=>{
    if(printerToEdit){ setNome(printerToEdit.nome); setLocal(printerToEdit.local); setTipo(printerToEdit.tipo); setFinalidade(printerToEdit.finalidade||'geral'); setIp(printerToEdit.ip); setPorta(printerToEdit.porta); setModelo(printerToEdit.modelo); setLarguraPapel(printerToEdit.larguraPapel); setRegras(printerToEdit.regras||[]); }
    else { setNome('');setLocal('Cozinha Chapa');setTipo('rede');setFinalidade('geral');setIp('192.168.1.200');setPorta(9100);setModelo('Epson TM-T20X (ESC/POS)');setLarguraPapel('80mm');setRegras([]); }
  },[printerToEdit,isOpen]);
  const addRule=()=>setRegras(prev=>[...prev,{id:`route-${Date.now()}`,nome:`Regra ${prev.length+1}`,documentos:['pedido'],catalogos:[],tiposPedido:[],categorias:[],estacoes:[],prioridade:prev.length+1,modo:'incluir',ativo:true}]);
  const updateRule=(id:string,patch:Partial<PrinterRouteRule>)=>setRegras(prev=>prev.map(r=>r.id===id?{...r,...patch}:r));
  const duplicateRule=(r:PrinterRouteRule)=>setRegras(prev=>[...prev,{...r,id:`route-${Date.now()}`,nome:`${r.nome} (cópia)`,prioridade:prev.length+1}]);
  const removeRule=(id:string)=>setRegras(prev=>prev.filter(r=>r.id!==id));
  const allCategories=useMemo(()=>CATEGORIAS,[ ]);
  if(!isOpen)return null;
  const submit=(e:React.FormEvent)=>{e.preventDefault();if(!nome.trim())return;onSave({id:printerToEdit?.id||`prn-${Date.now()}`,nome:nome.trim(),local:local.trim(),tipo,finalidade,ip:ip.trim(),porta:Number(porta)||9100,modelo:modelo.trim(),larguraPapel,status:printerToEdit?.status||'online',ativa:printerToEdit?.ativa!==false,itensNaFila:printerToEdit?.itensNaFila||0,regras});onClose();};
  return <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
    <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-stone-200">
      <div className="sticky top-0 z-10 px-6 py-4 border-b border-stone-200 flex items-center justify-between bg-stone-50"><div className="flex items-center gap-2"><Printer className="w-5 h-5 text-blue-600"/><h3 className="font-bold text-stone-900">{printerToEdit?'Editar Impressora':'Nova Impressora Térmica'}</h3></div><button onClick={onClose} className="p-1 rounded-lg hover:bg-stone-200 text-stone-500"><X/></button></div>
      <form onSubmit={submit} className="p-6 space-y-6">
        <section className="space-y-3"><h4 className="font-bold text-sm text-stone-900">Dispositivo</h4><div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Nome"><input value={nome} onChange={e=>setNome(e.target.value)} required className="input" placeholder="Ex.: Impressora Sucos"/></Field>
          <Field label="Setor / Local"><input value={local} onChange={e=>setLocal(e.target.value)} className="input" placeholder="Ex.: Bar"/></Field>
          <Field label="Finalidade legada / fallback"><select value={finalidade} onChange={e=>setFinalidade(e.target.value as PrinterPurpose)} className="input"><option value="geral">Geral</option><option value="pedido">Pedido</option><option value="espelho">Espelho</option><option value="comprovante">Comprovante</option></select><small className="text-[10px] text-stone-500">Usada somente quando esta impressora não possui regras avançadas.</small></Field>
          <Field label="Conexão"><select value={tipo} onChange={e=>setTipo(e.target.value as PrinterType)} className="input"><option value="rede">Rede Ethernet / Wi-Fi (TCP/IP)</option><option value="usb">USB Direta</option><option value="bluetooth">Bluetooth</option></select></Field>
          <Field label="IP / endereço"><input value={ip} onChange={e=>setIp(e.target.value)} className="input font-mono"/></Field><Field label="Porta"><input type="number" value={porta} onChange={e=>setPorta(Number(e.target.value))} className="input font-mono"/></Field>
          <Field label="Modelo"><select value={modelo} onChange={e=>setModelo(e.target.value)} className="input"><option>Epson TM-T20X (ESC/POS)</option><option>Bematech MP-4200 TH</option><option>Daruma DR800</option><option>Elgin i9 ESC/POS</option><option>Generic ESC/POS 80mm</option></select></Field><Field label="Bobina"><select value={larguraPapel} onChange={e=>setLarguraPapel(e.target.value as '80mm'|'58mm')} className="input"><option value="80mm">80mm</option><option value="58mm">58mm</option></select></Field>
        </div></section>
        <section className="rounded-2xl border border-sky-200 bg-sky-50/40 p-4 space-y-4"><div className="flex items-start justify-between gap-3"><div><h4 className="font-bold text-sm text-stone-900">Roteamento de impressão</h4><p className="text-xs text-stone-600 mt-1">A mesma impressora pode receber várias funções. Cada regra combina documento, cardápio, atendimento, categoria e estação. Se nenhum campo for selecionado, a regra funciona como “todos”.</p></div><button type="button" onClick={addRule} className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold"><Plus className="w-4 h-4"/>Adicionar regra</button></div>
          {!regras.length?<div className="p-4 rounded-xl bg-white border border-stone-200 text-xs text-stone-500">Sem regras avançadas. A finalidade legada acima continua funcionando.</div>:regras.map((r,idx)=><RuleEditor key={r.id} rule={r} index={idx} onChange={patch=>updateRule(r.id,patch)} onDelete={()=>removeRule(r.id)} onDuplicate={()=>duplicateRule(r)} allCategories={allCategories}/>)}
        </section>
        <div className="pt-4 flex justify-end gap-3 border-t border-stone-200"><button type="button" onClick={onClose} className="px-4 py-2 rounded-xl border border-stone-300 text-xs font-bold">Cancelar</button><button type="submit" className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold flex items-center gap-1.5"><Save className="w-4 h-4"/>Salvar Impressora</button></div>
      </form>
    </div>
  </div>;
};

const Field:React.FC<{label:string;children:React.ReactNode}> = ({label,children})=><div className="space-y-1"><label className="text-xs font-bold text-stone-700">{label}</label>{children}</div>;
const ChipGroup:React.FC<{label:string;items:{id:string;label:string}[];selected:string[];onToggle:(id:string)=>void}> = ({label,items,selected,onToggle})=><div><div className="text-[10px] uppercase tracking-wide font-bold text-stone-500 mb-1.5">{label}</div><div className="flex flex-wrap gap-1.5">{items.map(x=><button type="button" key={x.id} onClick={()=>onToggle(x.id)} className={`px-2 py-1 rounded-lg border text-[10px] font-semibold ${selected.includes(x.id)?'bg-sky-100 border-sky-300 text-sky-900':'bg-white border-stone-200 text-stone-600'}`}>{x.label}</button>)}</div></div>;
const RuleEditor:React.FC<{rule:PrinterRouteRule;index:number;onChange:(p:Partial<PrinterRouteRule>)=>void;onDelete:()=>void;onDuplicate:()=>void;allCategories:CategoryType[]}> = ({rule,index,onChange,onDelete,onDuplicate,allCategories})=> <div className="bg-white rounded-xl border border-stone-200 p-4 space-y-4">
  <div className="flex items-center gap-2"><input value={rule.nome} onChange={e=>onChange({nome:e.target.value})} className="input font-bold"/><label className="ml-auto flex items-center gap-1.5 text-[10px] font-bold text-stone-600"><input type="checkbox" checked={rule.ativo} onChange={e=>onChange({ativo:e.target.checked})}/> Ativa</label><button type="button" onClick={onDuplicate} title="Duplicar" className="p-2 rounded-lg hover:bg-stone-100"><Copy className="w-4 h-4"/></button><button type="button" onClick={onDelete} title="Excluir" className="p-2 rounded-lg hover:bg-rose-50 text-rose-600"><Trash2 className="w-4 h-4"/></button></div>
  <ChipGroup label="Documentos" items={DOCUMENTOS} selected={rule.documentos} onToggle={id=>onChange({documentos:toggle(rule.documentos,id as PrintRouteDocument)})}/>
  <ChipGroup label="Cardápios" items={CATALOGOS} selected={rule.catalogos} onToggle={id=>onChange({catalogos:toggle(rule.catalogos,id as MenuCatalog)})}/>
  <ChipGroup label="Atendimento" items={TIPOS} selected={rule.tiposPedido} onToggle={id=>onChange({tiposPedido:toggle(rule.tiposPedido,id as OrderType)})}/>
  <ChipGroup label="Estações" items={ESTACOES} selected={rule.estacoes} onToggle={id=>onChange({estacoes:toggle(rule.estacoes,id as KitchenStation)})}/>
  <div><div className="text-[10px] uppercase tracking-wide font-bold text-stone-500 mb-1.5">Categorias</div><div className="flex flex-wrap gap-1.5">{allCategories.map(c=><button type="button" key={c} onClick={()=>onChange({categorias:toggle(rule.categorias,c)})} className={`px-2 py-1 rounded-lg border text-[10px] font-semibold ${rule.categorias.includes(c)?'bg-sky-100 border-sky-300 text-sky-900':'bg-white border-stone-200 text-stone-600'}`}>{c}</button>)}</div></div>
  <div className="text-[10px] text-stone-400">Prioridade {index+1}. Regras são acumulativas: se esta impressora casar com qualquer regra ativa, ela recebe os itens correspondentes.</div>
</div>;
