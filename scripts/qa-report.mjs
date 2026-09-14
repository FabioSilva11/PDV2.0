import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const results = JSON.parse(readFileSync('test-results.json', 'utf8'));
const tests = results.testResults.flatMap(s => s.assertionResults);
const clean = s => String(s).replace(/\u001b\[[0-9;]*m/g, '').replaceAll('|', '\\|').replaceAll('\n', '<br>');
const severity = title => /PAG|CAI|EST|ATAQUE|PER|venda completa|estresse/.test(title) ? 'Alta' : 'Média';
mkdirSync('docs/qa', { recursive: true });
const rows = tests.map((t, i) => {
  const error = (t.failureMessages || []).join('\n').replace(/\u001b\[[0-9;]*m/g, '');
  return `| QA-${String(i + 1).padStart(3, '0')} | ${clean(t.title)} | Executar o caso de mesmo nome em src/tests/pdv.test.tsx, com fixture isolada | Asserções do caso; rejeitar operações inválidas sem alterar estado | ${t.status === 'passed' ? 'Asserções satisfeitas' : clean(error.split('\n').slice(0, 12).join('\n'))} | ${t.status === 'failed' ? severity(t.title) : '—'} | ${t.status === 'passed' ? 'PASSOU' : 'FALHOU'} | ${t.status === 'failed' ? 'Reproduzido; ver evidência' : 'Não observado neste caso'} |`;
});
const plan = readFileSync('docs/qa/PLANO_ORIGINAL.md', 'utf8');
let section = '';
let n = 0;
const inventory = [];
for (const line of plan.split(/\r?\n/)) {
  if (/^#{1,2} /.test(line)) section = line.replace(/^#+\s*/, '');
  const match = line.match(/^\* \[ \] (.+)$/);
  if (match) inventory.push(`| PL-${String(++n).padStart(3, '0')} | ${clean(section)} | ${clean(match[1])} | Conferir cobertura nos casos QA; execução integral do checklist ainda pendente |`);
}
writeFileSync('docs/qa/MATRIZ_TESTES.md', `# Matriz de testes do PDV\n\nExecução: ${new Date(results.startTime).toISOString()}. ${tests.length} casos automatizados, ${tests.filter(t => t.status === 'passed').length} passaram, ${tests.filter(t => t.status === 'failed').length} falharam. Falhas permanecem abertas; não foram convertidas em testes de falha esperada.\n\nOs passos exatos e as expectativas estão no teste de mesmo nome. Cada caso inicia um restaurante sintético com caixa de R$200, produto de R$20 e estoque de 1.000 unidades. Firebase e áudio são substituídos no setup.\n\n| ID | Cenário | Passos | Resultado esperado | Resultado obtido | Severidade | Status | Bug encontrado |\n|---|---|---|---|---|---|---|---|---|\n${rows.join('\n')}\n\n## Inventário completo do checklist recebido\n\nEsta lista preserva os ${n} itens marcados no texto original. Um caso automatizado que passou não homologa todos os passos manuais da mesma área. Ataques narrativos, jornada e modo destruição permanecem disponíveis no plano original.\n\n| ID | Área | Cenário original | Cobertura |\n|---|---|---|---|\n${inventory.join('\n')}\n`, 'utf8');
console.log(`Matriz gerada: ${tests.length} resultados e ${n} itens do checklist.`);
