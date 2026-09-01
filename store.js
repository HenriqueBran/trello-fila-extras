const DEFAULT_DATA = {
  fila: [],
  extrasAtivas: [],
  historico: [],
  historicoMes: '',
  historicoArquivado: {},
  fechamentoMensal: {},
  extrasAceitasCancelaveis: {},
  extraConfig: {
    responsaveisSolicitantes: [],
    squads: [],
    responsaveisAtendimento: []
  }
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
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    weekday: parts.weekday
  };
}

function ymFromParts(parts) {
  return `${parts.year}-${String(parts.month).padStart(2, '0')}`;
}

function previousMonth(ym) {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 2, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

function firstBusinessDayOfMonth(year, month) {
  for (let day = 1; day <= 7; day++) {
    const date = new Date(Date.UTC(year, month - 1, day, 12));
    const weekday = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Sao_Paulo', weekday: 'short' }).format(date);
    if (weekday !== 'Sat' && weekday !== 'Sun') return day;
  }
  return 1;
}

function shouldClosePreviousMonth(date = new Date()) {
  const p = getSaoPauloParts(date);
  return p.day >= firstBusinessDayOfMonth(p.year, p.month);
}


function uniqCleanList(list) {
  const seen = new Set();
  return (Array.isArray(list) ? list : [])
    .map(v => String(v || '').trim())
    .filter(Boolean)
    .filter(v => {
      const key = v.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function normalizeExtraConfig(config) {
  const cfg = config && typeof config === 'object' ? config : {};
  const responsaveisAtendimento = Array.isArray(cfg.responsaveisAtendimento) ? cfg.responsaveisAtendimento.map(item => {
    if (typeof item === 'string') {
      const parts = item.split(/\s[-–—|/]\s|[-–—|/]/).map(v => v.trim()).filter(Boolean);
      return { squad: parts[0] || '', nome: parts.slice(1).join(' - ') || '' };
    }
    return { squad: String(item?.squad || '').trim(), nome: String(item?.nome || item?.atendimento || '').trim() };
  }).filter(item => item.squad && item.nome) : [];
  const seenAtendimento = new Set();
  return {
    responsaveisSolicitantes: uniqCleanList(cfg.responsaveisSolicitantes),
    squads: uniqCleanList(cfg.squads),
    responsaveisAtendimento: responsaveisAtendimento.filter(item => {
      const key = `${item.squad.toLowerCase()}|${item.nome.toLowerCase()}`;
      if (seenAtendimento.has(key)) return false;
      seenAtendimento.add(key);
      return true;
    })
  };
}

function normalize(data) {
  const currentMonth = ymFromParts(getSaoPauloParts());
  const src = data && typeof data === 'object' ? data : {};
  const base = { ...DEFAULT_DATA };
  base.fila = Array.isArray(src.fila) ? src.fila : [];
  base.extrasAtivas = Array.isArray(src.extrasAtivas) ? src.extrasAtivas : [];
  base.historico = Array.isArray(src.historico) ? src.historico.filter(h => h && h.acao !== 'CONFIGURAÇÃO') : [];
  base.historicoMes = typeof src.historicoMes === 'string' && src.historicoMes ? src.historicoMes : currentMonth;
  base.historicoArquivado = src.historicoArquivado && typeof src.historicoArquivado === 'object' ? src.historicoArquivado : {};
  base.fechamentoMensal = src.fechamentoMensal && typeof src.fechamentoMensal === 'object' ? src.fechamentoMensal : {};
  base.extrasAceitasCancelaveis = src.extrasAceitasCancelaveis && typeof src.extrasAceitasCancelaveis === 'object' ? src.extrasAceitasCancelaveis : {};
  base.extraConfig = normalizeExtraConfig(src.extraConfig);
  return base;
}

function applyMonthlyHistoryClose(data, date = new Date()) {
  const base = normalize(data);
  const currentMonth = ymFromParts(getSaoPauloParts(date));
  const oldMonth = base.historicoMes || previousMonth(currentMonth);

  if (oldMonth === currentMonth) return { data: base, changed: false, closedMonth: null };
  if (!shouldClosePreviousMonth(date)) return { data: base, changed: false, closedMonth: null };
  if (base.fechamentoMensal && base.fechamentoMensal[currentMonth]) {
    base.historicoMes = currentMonth;
    return { data: base, changed: false, closedMonth: null };
  }

  if (base.historico.length) {
    base.historicoArquivado[oldMonth] = [
      ...(base.historicoArquivado[oldMonth] || []),
      ...base.historico
    ];
  }

  base.historico = [];
  base.historicoMes = currentMonth;
  base.fechamentoMensal[currentMonth] = {
    fechadoEm: new Date().toISOString(),
    mesFechado: oldMonth,
    regra: '1º dia útil do mês seguinte'
  };

  return { data: base, changed: true, closedMonth: oldMonth };
}

function parseKvResult(value) {
  if (value == null) return null;
  let parsed = value;

  // Suporta dados antigos salvos com JSON duplicado.
  for (let i = 0; i < 3; i++) {
    if (typeof parsed !== 'string') break;
    try {
      parsed = JSON.parse(parsed);
    } catch {
      break;
    }
  }

  return parsed && typeof parsed === 'object' ? parsed : null;
}

async function kvGet(key) {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;

  const baseUrl = String(url).trim().replace(/\/+$/, '');
  const res = await fetch(`${baseUrl}/get/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${String(token).trim()}` }
  });

  if (!res.ok) throw new Error(`KV GET failed: ${res.status}`);
  const json = await res.json();
  return parseKvResult(json && json.result);
}

async function kvSet(key, value) {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return false;

  const baseUrl = String(url).trim().replace(/\/+$/, '');
  const res = await fetch(`${baseUrl}/set/${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${String(token).trim()}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(value)
  });

  if (!res.ok) {
    const details = await res.text().catch(() => '');
    throw new Error(`KV SET failed: ${res.status}${details ? ' - ' + details.slice(0, 120) : ''}`);
  }

  return true;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const boardId = String(req.query.boardId || '').trim();
  if (!boardId) return res.status(400).json({ error: 'boardId obrigatório' });
  const key = `fila-extras:${boardId}`;

  try {
    if (req.method === 'GET') {
      let data = await kvGet(key);
      if (!data) data = memory[key] || DEFAULT_DATA;
      const result = applyMonthlyHistoryClose(data);
      if (result.changed) {
        const savedInKv = await kvSet(key, result.data);
        if (!savedInKv) memory[key] = result.data;
      }
      return res.status(200).json(result.data);
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
      const result = applyMonthlyHistoryClose(body.data || body);
      const savedInKv = await kvSet(key, result.data);
      if (!savedInKv) memory[key] = result.data;
      return res.status(200).json({ ok: true, savedInKv, data: result.data });
    }

    return res.status(405).json({ error: 'Método não permitido' });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Erro interno' });
  }
}
