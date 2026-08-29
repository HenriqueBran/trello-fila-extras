function cleanUsername(value) {
  return String(value || '').trim().replace(/^@+/, '').toLowerCase();
}

function getCoordenadoresAutorizados() {
  return String(process.env.COORDENADORES_TRELLO || '')
    .split(',')
    .map(cleanUsername)
    .filter(Boolean);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método não permitido' });

  const username = cleanUsername(req.query.username);
  const coordenadores = getCoordenadoresAutorizados();
  const configurado = coordenadores.length > 0;
  const autorizado = configurado && !!username && coordenadores.includes(username);

  return res.status(200).json({
    autorizado,
    configurado,
    username
  });
}
