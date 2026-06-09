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

const memory = globalThis.__filaExtrasMemory || (globalThis.__filaExtrasMemory = {});

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
function previousMonth(ymValue){ const [y,m]=ymValue.split('-').map(Number); const d=new Date(Date.UTC(y,m-2,1)); return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}`; }
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
function normalize(data){
  const currentMonth = ym(getSaoPauloParts());
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
  const base=normalize(data);
  const currentMonth=ym(getSaoPauloParts(date));
  const oldMonth=base.historicoMes || previousMonth(currentMonth);
  if(oldMonth === currentMonth) return { data:base, changed:false, closedMonth:null };
  if(!shouldClose(date)) return { data:base, changed:false, closedMonth:null };
  if(base.fechamentoMensal && base.fechamentoMensal[currentMonth]){ base.historicoMes=currentMonth; return { data:base, changed:false, closedMonth:null }; }
  if(base.historico.length){ base.historicoArquivado[oldMonth] = [...(base.historicoArquivado[oldMonth] || []), ...base.historico]; }
  base.historico=[];
  base.historicoMes=currentMonth;
  base.fechamentoMensal[currentMonth] = { fechadoEm:new Date().toISOString(), mesFechado:oldMonth, regra:'1º dia útil do mês seguinte' };
  return { data:base, changed:true, closedMonth:oldMonth };
}
async function kvGet(key){
  const url=process.env.KV_REST_API_URL, token=process.env.KV_REST_API_TOKEN;
  if(!url || !token) return null;
  const res=await fetch(`${url}/get/${encodeURIComponent(key)}`, { headers:{ Authorization:`Bearer ${token}` }});
  if(!res.ok) throw new Error(`KV GET failed: ${res.status}`);
  const json=await res.json();
  if(!json || json.result == null) return null;
  let parsed = json.result;
  for(let i=0; i<3; i++){
    if(typeof parsed !== 'string') break;
    try { parsed = JSON.parse(parsed); } catch { break; }
  }
  return parsed && typeof parsed === 'object' ? parsed : null;
}
async function kvSet(key,value){
  const url=process.env.KV_REST_API_URL, token=process.env.KV_REST_API_TOKEN;
  if(!url || !token) return false;
  const res=await fetch(`${url}/set/${encodeURIComponent(key)}`, { method:'POST', headers:{ Authorization:`Bearer ${token}`, 'Content-Type':'application/json' }, body:JSON.stringify(value) });
  if(!res.ok) throw new Error(`KV SET failed: ${res.status}`);
  return true;
}
async function kvKeys(){
  const url=process.env.KV_REST_API_URL, token=process.env.KV_REST_API_TOKEN;
  if(!url || !token) return Object.keys(memory).filter(k => k.startsWith('fila-extras:'));
  const res=await fetch(`${url}/keys/${encodeURIComponent('fila-extras:*')}`, { headers:{ Authorization:`Bearer ${token}` }});
  if(!res.ok) throw new Error(`KV KEYS failed: ${res.status}`);
  const json=await res.json();
  return Array.isArray(json.result) ? json.result : [];
}

export default async function handler(req,res){
  if(req.method !== 'GET' && req.method !== 'POST') return res.status(405).json({ error:'Método não permitido' });
  try{
    const keys = await kvKeys();
    const result = { checked:0, closed:0, keys:[] };
    for(const key of keys){
      const current = await kvGet(key) || memory[key] || DEFAULT_DATA;
      const closed = applyMonthlyHistoryClose(current);
      result.checked++;
      if(closed.changed){
        const savedInKv = await kvSet(key, closed.data);
        if(!savedInKv) memory[key] = closed.data;
        result.closed++;
        result.keys.push({ key, closedMonth: closed.closedMonth });
      }
    }
    return res.status(200).json({ ok:true, ...result });
  }catch(err){
    return res.status(500).json({ error: err.message || 'Erro interno' });
  }
}
