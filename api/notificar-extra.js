function cleanUsername(value) {
  return String(value || '').trim().replace(/^@+/, '').toLowerCase();
}

function formatDateTime(value) {
  const t = new Date(value || '').getTime();
  if (!Number.isFinite(t)) return '';
  return new Date(t).toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    dateStyle: 'short',
    timeStyle: 'short'
  });
}

function buildComment(extra = {}, tipo = 'gerada') {
  const username = cleanUsername(extra.pessoaUsername);
  const mention = username ? `@${username}` : String(extra.pessoaNome || 'Pessoa da fila');

  const titulo = tipo === 'redirecionada'
    ? 'você recebeu uma hora extra após recusa do membro anterior.'
    : 'você tem uma hora extra disponível para responder.';

  const linhas = [
    `${mention} ${titulo}`,
    '',
    `Abra o Power-Up “Fila de Extras” neste quadro para aceitar ou recusar.`
  ];

  if (extra.descricao) linhas.push(`Descrição: ${extra.descricao}`);
  const inicio = formatDateTime(extra.inicioAt);
  const fim = formatDateTime(extra.fimAt);
  if (inicio || fim) linhas.push(`Período: ${inicio || '-'} até ${fim || '-'}`);
  if (extra.squad) linhas.push(`Squad: ${extra.squad}`);
  if (extra.responsavelAtendimento) linhas.push(`Responsável atendimento: ${extra.responsavelAtendimento}`);
  if (extra.responsavelSolicitante) linhas.push(`Responsável solicitante: ${extra.responsavelSolicitante}`);

  return linhas.join('\n');
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Método não permitido' });

  const key = process.env.TRELLO_API_KEY || process.env.TRELLO_KEY;
  const token = process.env.TRELLO_API_TOKEN || process.env.TRELLO_TOKEN;
  const cardId = process.env.TRELLO_NOTIFICATION_CARD_ID || process.env.TRELLO_CARD_NOTIFICACOES_ID;

  if (!key || !token || !cardId) {
    return res.status(200).json({
      ok: false,
      skipped: true,
      reason: 'Configure TRELLO_API_KEY, TRELLO_API_TOKEN e TRELLO_NOTIFICATION_CARD_ID na Vercel.'
    });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const text = buildComment(body.extra || {}, body.tipo || 'gerada');

    const url = `https://api.trello.com/1/cards/${encodeURIComponent(cardId)}/actions/comments?key=${encodeURIComponent(key)}&token=${encodeURIComponent(token)}`;
    const trelloRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ text })
    });

    const responseText = await trelloRes.text();
    if (!trelloRes.ok) {
      return res.status(200).json({
        ok: false,
        trelloStatus: trelloRes.status,
        trelloResponse: responseText.slice(0, 500)
      });
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    return res.status(200).json({ ok: false, error: error?.message || 'Erro ao notificar no Trello' });
  }
}
