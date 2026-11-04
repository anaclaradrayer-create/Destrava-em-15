// API de Conversões da Meta (servidor) — Destrava em 15
// Recebe os eventos da página e reenvia para a Meta pelo servidor da Vercel.
// O token fica na variável de ambiente META_CAPI_TOKEN (configurada na Vercel).
const PIXEL_ID = '1956594335794951';
const PERMITIDOS = ['PageView', 'ViewContent', 'InitiateCheckout', 'Contact'];

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ erro: 'use POST' });
  const token = process.env.META_CAPI_TOKEN;
  if (!token) return res.status(200).json({ ok: false, motivo: 'token não configurado' });

  let b = req.body;
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch { b = {}; } }
  b = b || {};
  if (!PERMITIDOS.includes(b.event_name) || !b.event_id) return res.status(400).json({ erro: 'evento inválido' });

  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || undefined;
  const user_data = { client_ip_address: ip, client_user_agent: req.headers['user-agent'] };
  if (b.fbp) user_data.fbp = b.fbp;
  if (b.fbc) user_data.fbc = b.fbc;

  const evento = {
    event_name: b.event_name,
    event_time: Math.floor(Date.now() / 1000),
    event_id: String(b.event_id),
    action_source: 'website',
    event_source_url: b.url,
    user_data,
  };
  if (b.custom_data && typeof b.custom_data === 'object') evento.custom_data = b.custom_data;

  try {
    const r = await fetch(`https://graph.facebook.com/v25.0/${PIXEL_ID}/events?access_token=${encodeURIComponent(token)}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data: [evento] }),
    });
    const j = await r.json();
    return res.status(r.ok ? 200 : 502).json({ ok: r.ok, meta: j });
  } catch (e) {
    return res.status(502).json({ ok: false, erro: String(e) });
  }
};
