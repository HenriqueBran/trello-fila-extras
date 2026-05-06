const DEFAULT_DATA = {
  fila: [],
  extrasAtivas: [],
  historico: [],
  extrasAceitasCancelaveis: {},
  userModes: {}
};

const memory = globalThis.__filaExtrasMemory || (globalThis.__filaExtrasMemory = {});

function normalize(data) {
  const base = { ...DEFAULT_DATA, ...(data || {}) };
  base.fila = Array.isArray(base.fila) ? base.fila : [];
  base.extrasAtivas = Array.isArray(base.extrasAtivas) ? base.extrasAtivas : [];
  base.historico = Array.isArray(base.historico) ? base.historico.filter(h => h && h.acao !== 'CONFIGURAÇÃO') : [];
  base.extrasAceitasCancelaveis = base.extrasAceitasCancelaveis && typeof base.extrasAceitasCancelaveis === 'object' ? base.extrasAceitasCancelaveis : {};
  base.userModes = base.userModes && typeof base.userModes === 'object' ? base.userModes : {};
  return base;
}

async function kvGet(key) {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  const res = await fetch(`${url}/get/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error(`KV GET failed: ${res.status}`);
  const json = await res.json();
  if (!json || json.result == null) return null;
  if (typeof json.result === 'string') {
    try { return JSON.parse(json.result); } catch { return json.result; }
  }
  return json.result;
}

async function kvSet(key, value) {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return false;
  const res = await fetch(`${url}/set/${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(JSON.stringify(value))
  });
  if (!res.ok) throw new Error(`KV SET failed: ${res.status}`);
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
      return res.status(200).json(normalize(data));
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
      const data = normalize(body.data || body);
      const savedInKv = await kvSet(key, data);
      if (!savedInKv) memory[key] = data;
      return res.status(200).json({ ok: true, savedInKv, data });
    }

    return res.status(405).json({ error: 'Método não permitido' });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Erro interno' });
  }
}
