// Vercel Serverless Function: XEMOZ_API chat proxy for DixzChat.
// Endpoints and query parameter names are kept server-side; never call them from frontend.
const FB_KEY = process.env.FIREBASE_API_KEY || 'AIzaSyD1656fPz0HWe9nTdiBJcrQz6N02njt_jU';
const hits = new Map();
const SYSTEM = `Kamu adalah AI dixzChat, asisten di dalam aplikasi chat dixzChat. Jawab dengan bahasa yang dipakai pengguna (default: Indonesia santai tapi sopan), ringkas dan jelas, enak dibaca di layar HP. Kalau tidak tahu atau informasinya mungkin sudah berubah, katakan terus terang. Jangan berpura-pura menjadi manusia. Tolak dengan sopan permintaan yang berbahaya atau ilegal. Jangan meminta data sensitif seperti password, PIN, atau nomor kartu.`;
// Endpoint + parameter names follow the URLs supplied by the user.
// claide-haiku-3.php was supplied without a prompt parameter; configure XEMOZ_CLAUDE_PARAM
// only after confirming the provider's documented parameter name.
const MODELS = {
  'ai-image': { label: 'AI Image', url: 'https://api-xemoz-official.my.id/api/ai/ai-image.php', param: 'prompt', kind: 'image' },
  'blackbox': { label: 'Blackbox', url: 'https://api-xemoz-official.my.id/api/ai/blackbox.php', param: 'q', kind: 'chat' },
  'claide-haiku-3': { label: 'Claude Haiku 3', url: 'https://api-xemoz-official.my.id/api/ai/claide-haiku-3.php', param: process.env.XEMOZ_CLAUDE_PARAM || '', kind: 'chat' },
  'deepai-chat': { label: 'DeepAI Chat', url: 'https://api-xemoz-official.my.id/api/ai/deepai-chat.php', param: 'message', kind: 'chat' },
  'deepseek-v3.2-thinking': { label: 'DeepSeek V3.2 Thinking', url: 'https://api-xemoz-official.my.id/api/ai/deepseek-v3.2-thinking.php', param: 'pesan', kind: 'chat' },
  'deepseek-v4-flash': { label: 'DeepSeek V4 Flash', url: 'https://api-xemoz-official.my.id/api/ai/deepseek-v4-flash.php', param: 'pesan', kind: 'chat' },
  'gpt-5.3': { label: 'GPT 5.3', url: 'https://api-xemoz-official.my.id/api/ai/gpt-5.3.php', param: 'pesan', kind: 'chat' },
  'gpt-5.4': { label: 'GPT 5.4', url: 'https://api-xemoz-official.my.id/api/ai/gpt-5.4.php', param: 'pesan', kind: 'chat' },
  'gpt-5.5': { label: 'GPT 5.5', url: 'https://api-xemoz-official.my.id/api/ai/gpt-5.5.php', param: 'pesan', kind: 'chat' },
  'mathgpt-ai': { label: 'MathGPT AI', url: 'https://api-xemoz-official.my.id/api/ai/mathgpt-ai.php', param: 'q', kind: 'math' }
};
function getReply(data) {
  // Known observed schemas include result.reply (GPT 5.5) and data.response (DeepAI Chat).
  const candidates = [data?.result?.reply, data?.data?.response, data?.reply, data?.response, data?.answer, data?.message, data?.text];
  const found = candidates.find(v => typeof v === 'string' && v.trim());
  if (found) return found.trim();
  // Preserve an unknown response instead of guessing its schema.
  return JSON.stringify(data);
}
module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Gunakan POST' });
  try {
    const { idToken, messages } = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    if (!idToken || !Array.isArray(messages) || !messages.length) return res.status(400).json({ error: 'Data tidak lengkap' });
    const v = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FB_KEY}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken }) });
    const uid = (await v.json()).users?.[0]?.localId;
    if (!uid) return res.status(401).json({ error: 'Sesi login tidak valid' });
    const now = Date.now(), arr = (hits.get(uid) || []).filter(t => now - t < 60000);
    if (arr.length >= 12) return res.status(429).json({ error: 'Terlalu cepat, tunggu sebentar lalu coba lagi' });
    arr.push(now); hits.set(uid, arr);
    let total = 0; const clean = [];
    for (const m of messages.slice(-12)) {
      const content = String(m?.text || '').trim().slice(0, 2000);
      if (!content) continue; total += content.length;
      clean.push({ role: m?.role === 'model' || m?.role === 'assistant' ? 'assistant' : 'user', content });
    }
    if (!clean.length || clean[0].role !== 'user' || total > 12000) return res.status(400).json({ error: 'Pesan tidak valid atau terlalu panjang' });
    const modelId = String(req.body?.model || 'gpt-5.5');
    const selected = MODELS[modelId];
    if (!selected) return res.status(400).json({ error: 'Model tidak dikenal' });
    if (selected.kind === 'image' || selected.kind === 'math') return res.status(400).json({ error: 'Model ini bukan model chat umum. Pilih model chat untuk percakapan.' });
    if (!selected.param) return res.status(400).json({ error: 'Parameter prompt Claude Haiku belum diketahui dari URL yang diberikan. Konfirmasi nama parameternya dahulu; jangan ditebak.' });
    // Compact transcript; parameter names are the ones shown in the supplied URLs.
    const transcript = [SYSTEM, ...clean.map(m => `${m.role === 'assistant' ? 'AI dixzChat' : 'Pengguna'}: ${m.content}`), 'AI dixzChat:'].join('\n\n');
    const target = new URL(selected.url);
    target.searchParams.set(selected.param, transcript);
    if (modelId === 'deepseek-v4-flash') target.searchParams.set('session', uid);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);
    let upstream;
    try { upstream = await fetch(target.toString(), { method: 'GET', headers: { 'Accept': 'application/json' }, signal: controller.signal }); }
    finally { clearTimeout(timeout); }
    const raw = await upstream.text();
    let data; try { data = JSON.parse(raw); } catch { data = raw; }
    if (!upstream.ok) return res.status(502).json({ error: `XEMOZ_API gagal (HTTP ${upstream.status})`, model: modelId, detail: typeof data === 'string' ? data.slice(0, 500) : data });
    if (data && typeof data === 'object' && data.status === false) return res.status(502).json({ error: data.message || 'XEMOZ_API melaporkan request gagal', model: modelId, detail: data });
    const reply = typeof data === 'string' ? data.trim() : getReply(data);
    if (!reply) return res.status(502).json({ error: 'XEMOZ_API mengembalikan respons kosong', model: modelId });
    return res.status(200).json({ reply, model: modelId, provider: 'xemoz' });
  } catch (e) { return res.status(500).json({ error: 'Terjadi kesalahan server' }); }
};
