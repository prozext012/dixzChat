// Vercel Serverless Function: dixzChat via official Groq API.
// Keep GROQ_API_KEY in Vercel Environment Variables; never expose it in frontend code.
const FB_KEY = process.env.FIREBASE_API_KEY || 'AIzaSyD1656fPz0HWe9nTdiBJcrQz6N02njt_jU';
const hits = new Map();
const SYSTEM = `Kamu adalah AI dixzChat, asisten di dalam aplikasi chat dixzChat. Jawab dengan bahasa yang dipakai pengguna (default: Indonesia santai tapi sopan), ringkas dan jelas, enak dibaca di layar HP. Kalau tidak tahu atau informasinya mungkin sudah berubah, katakan terus terang. Jangan berpura-pura menjadi manusia. Tolak dengan sopan permintaan yang berbahaya atau ilegal. Jangan meminta data sensitif seperti password, PIN, atau nomor kartu.`;
const MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Gunakan POST' });
  try {
    const { idToken, messages } = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    if (!idToken || !Array.isArray(messages) || !messages.length) return res.status(400).json({ error: 'Data tidak lengkap' });
    const v = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FB_KEY}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken }) });
    const uid = (await v.json()).users?.[0]?.localId;
    if (!uid) return res.status(401).json({ error: 'Sesi login tidak valid' });
    if (!process.env.GROQ_API_KEY) return res.status(503).json({ error: 'GROQ_API_KEY belum dipasang di Environment Variables Vercel' });
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
    const upstream = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST', headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: MODEL, messages: [{ role: 'system', content: SYSTEM }, ...clean], temperature: 0.7, max_completion_tokens: 1024 })
    });
    let data; try { data = await upstream.json(); } catch { data = null; }
    if (!upstream.ok) return res.status(502).json({ error: data?.error?.message || `Groq gagal (HTTP ${upstream.status})`, model: MODEL });
    const reply = data?.choices?.[0]?.message?.content?.trim();
    if (!reply) return res.status(502).json({ error: 'Groq tidak mengembalikan jawaban', model: MODEL });
    return res.status(200).json({ reply, model: MODEL });
  } catch (e) { return res.status(500).json({ error: 'Terjadi kesalahan server' }); }
};
