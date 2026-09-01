const memory = globalThis.__filaExtrasCoordinatorAuth || (globalThis.__filaExtrasCoordinatorAuth = {});

function normalizeIds(value) {
  const seen = new Set();
  return (Array.isArray(value) ? value : [])
    .map(v => String(v || '').trim())
    .filter(Boolean)
    .filter(id => {
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
}

function parseKvResult(value) {
  if (value == null) return null;
  let parsed = value;
  for (let i = 0; i < 3; i++) {
    if (typeof parsed !== 'string') break;
    try { parsed = JSON.parse(parsed); } catch { break; }
  }
  return parsed && typeof parsed === 'object' ? parsed : null;
}

async function kvGet(key) {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  const baseUrl = String(url).trim().replace(/\/+$/, '');
  const response = await fetch(`${baseUrl}/get/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${String(token).trim()}` }
  });
  if (!response.ok) throw new Error(`KV GET failed: ${response.status}`);
  const json = await response.json();
  return parseKvResult(json && json.result);
}

async function kvSet(key, value) {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return false;
  const baseUrl = String(url).trim().replace(/\/+$/, '');
  const response = await fetch(`${baseUrl}/set/${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${String(token).trim()}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(value)
  });
  if (!response.ok) throw new Error(`KV SET failed: ${response.status}`);
  return true;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const boardId = String(req.query.boardId || '').trim();
  if (!boardId) return res.status(400).json({ error: 'boardId obrigatório' });
  const key = `fila-extras:coordenadores:${boardId}`;

  try {
    if (req.method === 'GET') {
      const saved = (await kvGet(key)) || memory[key] || {};
      return res.status(200).json({
        boardId,
        coordenadoresAutorizados: normalizeIds(saved.coordenadoresAutorizados),
        atualizadoEm: saved.atualizadoEm || '',
        atualizadoPor: saved.atualizadoPor || ''
      });
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
      const adminId = String(body.adminId || '').trim();
      const adminConfirmado = body.adminConfirmado === true;
      if (!adminId || !adminConfirmado) {
        return res.status(403).json({ error: 'Somente um administrador do quadro pode alterar esta configuração.' });
      }

      const payload = {
        coordenadoresAutorizados: normalizeIds(body.coordenadoresAutorizados),
        atualizadoEm: new Date().toISOString(),
        atualizadoPor: adminId
      };
      const savedInKv = await kvSet(key, payload);
      if (!savedInKv) memory[key] = payload;

      return res.status(200).json({ ok: true, savedInKv, ...payload });
    }

    return res.status(405).json({ error: 'Método não permitido' });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Erro ao salvar coordenadores' });
  }
}
