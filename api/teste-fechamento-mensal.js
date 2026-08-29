const DEFAULT_DATA = {
  fila: [],
  extrasAtivas: [],
  historico: [],
  historicoMes: '',
  historicoArquivado: {},
  fechamentoMensal: {},
  extrasAceitasCancelaveis: {},
  userModes: {}
};

function getSaoPauloParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short'
  }).formatToParts(date).reduce((acc, p) => {
    acc[p.type] = p.value;
    return acc;
  }, {});
  return { year: Number(parts.year), month: Number(parts.month), day: Number(parts.day), weekday: parts.weekday };
}

function ym(parts){ return `${parts.year}-${String(parts.month).padStart(2,'0')}`; }
function firstBusinessDayOfMonth(year, month){
  for(let day=1; day<=7; day++){
    const date = new Date(Date.UTC(year, month-1, day, 12));
    const weekday = new Intl.DateTimeFormat('en-US', { timeZone:'America/Sao_Paulo', weekday:'short' }).format(date);
    if(weekday !== 'Sat' && weekday !== 'Sun') return day;
  }
  return 1;
}
function shouldClose(date = new Date()){
  const p=getSaoPauloParts(date);
  return p.day >= firstBusinessDayOfMonth(p.year, p.month);
}
function normalize(data, date = new Date()){
  const currentMonth = ym(getSaoPauloParts(date));
  const base = { ...DEFAULT_DATA, ...(data || {}) };
  base.fila = Array.isArray(base.fila) ? base.fila : [];
  base.extrasAtivas = Array.isArray(base.extrasAtivas) ? base.extrasAtivas : [];
  base.historico = Array.isArray(base.historico) ? base.historico.filter(h => h && h.acao !== 'CONFIGURAÇÃO') : [];
  base.historicoMes = typeof base.historicoMes === 'string' && base.historicoMes ? base.historicoMes : currentMonth;
  base.historicoArquivado = base.historicoArquivado && typeof base.historicoArquivado === 'object' ? base.historicoArquivado : {};
  base.fechamentoMensal = base.fechamentoMensal && typeof base.fechamentoMensal === 'object' ? base.fechamentoMensal : {};
  base.extrasAceitasCancelaveis = base.extrasAceitasCancelaveis && typeof base.extrasAceitasCancelaveis === 'object' ? base.extrasAceitasCancelaveis : {};
  base.userModes = base.userModes && typeof base.userModes === 'object' ? base.userModes : {};
  return base;
}
function applyMonthlyHistoryClose(data, date = new Date()){
  const base=normalize(data, date);
  const currentMonth=ym(getSaoPauloParts(date));
  const oldMonth=base.historicoMes;
  if(oldMonth === currentMonth) return { data:base, changed:false, closedMonth:null };
  if(!shouldClose(date)) return { data:base, changed:false, closedMonth:null };
  if(base.fechamentoMensal && base.fechamentoMensal[currentMonth]){ base.historicoMes=currentMonth; return { data:base, changed:false, closedMonth:null }; }
  if(base.historico.length){ base.historicoArquivado[oldMonth] = [...(base.historicoArquivado[oldMonth] || []), ...base.historico]; }
  base.historico=[];
  base.historicoMes=currentMonth;
  base.fechamentoMensal[currentMonth] = { fechadoEm:new Date().toISOString(), mesFechado:oldMonth, regra:'1º dia útil do mês seguinte' };
  return { data:base, changed:true, closedMonth:oldMonth };
}

function assert(condition, message){
  if(!condition) throw new Error(message);
}

function runTests(){
  const base = {
    fila: [
      { nome:'Pessoa 1', usuarioTrello:'@pessoa1' },
      { nome:'Pessoa 2', usuarioTrello:'@pessoa2' }
    ],
    extrasAtivas: [{ id:'extra-ativa' }],
    historico: [
      { acao:'EXTRA GERADA', texto:'teste 1' },
      { acao:'EXTRA ACEITA', texto:'teste 2' }
    ],
    historicoMes: '2026-06',
    historicoArquivado: {},
    fechamentoMensal: {},
    extrasAceitasCancelaveis: { abc:true },
    userModes: { card123:'coordenador' }
  };

  const sameMonth = applyMonthlyHistoryClose(JSON.parse(JSON.stringify(base)), new Date('2026-06-15T15:00:00-03:00'));
  assert(sameMonth.changed === false, 'Não pode fechar quando ainda está no mesmo mês do histórico.');
  assert(sameMonth.data.historico.length === 2, 'Histórico não pode ser apagado no mesmo mês.');

  const beforeFirstBusinessDay = applyMonthlyHistoryClose({ ...base, historicoMes:'2026-07' }, new Date('2026-08-02T15:00:00-03:00'));
  // 01/08/2026 e 02/08/2026 caem no fim de semana; o primeiro dia útil é 03/08/2026.
  assert(beforeFirstBusinessDay.changed === false, 'Não pode fechar antes do 1º dia útil.');
  assert(beforeFirstBusinessDay.data.historico.length === 2, 'Histórico deve continuar antes do 1º dia útil.');

  const closeOnFirstBusinessDay = applyMonthlyHistoryClose({ ...base, historicoMes:'2026-07' }, new Date('2026-08-03T15:00:00-03:00'));
  assert(closeOnFirstBusinessDay.changed === true, 'Deve fechar no 1º dia útil do mês seguinte.');
  assert(closeOnFirstBusinessDay.closedMonth === '2026-07', 'Mês fechado deve ser o mês anterior do histórico.');
  assert(closeOnFirstBusinessDay.data.historico.length === 0, 'Histórico atual deve reiniciar após fechamento.');
  assert(closeOnFirstBusinessDay.data.historicoMes === '2026-08', 'Mês do histórico deve virar o mês atual.');
  assert(closeOnFirstBusinessDay.data.historicoArquivado['2026-07'].length === 2, 'Histórico antigo deve ser arquivado.');
  assert(closeOnFirstBusinessDay.data.fila.length === 2, 'Fila não pode ser apagada.');
  assert(closeOnFirstBusinessDay.data.extrasAtivas.length === 1, 'Extras ativas não podem ser apagadas.');
  assert(closeOnFirstBusinessDay.data.userModes.card123 === 'coordenador', 'Modo de usuário não pode ser apagado.');

  const repeat = applyMonthlyHistoryClose(closeOnFirstBusinessDay.data, new Date('2026-08-03T16:00:00-03:00'));
  assert(repeat.changed === false, 'Fechamento não pode rodar duas vezes no mesmo mês.');
  assert(repeat.data.historicoArquivado['2026-07'].length === 2, 'Arquivo não pode duplicar histórico no segundo teste.');

  return [
    { nome:'Mesmo mês', ok:true, resultado:'Não reinicia o histórico antes da troca de mês.' },
    { nome:'Antes do 1º dia útil', ok:true, resultado:'Não reinicia se o mês virou, mas ainda não chegou o 1º dia útil.' },
    { nome:'No 1º dia útil', ok:true, resultado:'Arquiva o histórico do mês anterior e limpa apenas o histórico atual.' },
    { nome:'Proteção contra duplicidade', ok:true, resultado:'Não fecha duas vezes no mesmo mês.' },
    { nome:'Dados preservados', ok:true, resultado:'Fila, extras ativas, usuários e modos continuam salvos.' }
  ];
}

export default async function handler(req,res){
  if(req.method !== 'GET' && req.method !== 'POST') return res.status(405).json({ error:'Método não permitido' });
  try{
    const testes = runTests();
    return res.status(200).json({
      ok:true,
      mensagem:'Teste concluído. A lógica de fechamento mensal passou em todos os cenários simulados e não altera seus dados reais.',
      total:testes.length,
      testes
    });
  }catch(err){
    return res.status(500).json({
      ok:false,
      mensagem:'O teste encontrou um problema na regra de fechamento mensal.',
      erro: err.message || 'Erro interno'
    });
  }
}
