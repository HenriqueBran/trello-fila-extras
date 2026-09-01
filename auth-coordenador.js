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

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método não permitido' });

  const boardId = String(req.query.boardId || '').trim();
  const memberId = String(req.query.memberId || '').trim();
  if (!boardId) return res.status(400).json({ error: 'boardId obrigatório' });

  const key = `fila-extras:coordenadores:${boardId}`;

  try {
    const saved = (await kvGet(key)) || memory[key] || {};
    const coordenadores = normalizeIds(saved.coordenadoresAutorizados);
    const configurado = coordenadores.length > 0;
    const autorizado = !!memberId && coordenadores.includes(memberId);

    return res.status(200).json({
      autorizado,
      configurado,
      boardId,
      memberId
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Erro ao validar coordenador' });
  }
}
