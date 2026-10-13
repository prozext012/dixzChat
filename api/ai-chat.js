// Vercel Serverless Function: AI dixz-ai via Groq.
// Provider requests stay on the server; Firebase ID token is validated first.
const FB_KEY = process.env.FIREBASE_API_KEY || 'AIzaSyD1656fPz0HWe9nTdiBJcrQz6N02njt_jU';
const GROQ_KEY = process.env.GROQ_API_KEY || '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';
const hits = new Map();
const SYSTEM = `Kamu adalah "dixz-ai", asisten AI resmi di dalam aplikasi chat dixzChat.

IDENTITAS WAJIB:
- Nama AI: dixz-ai
- Developer / pembuat: DIXZ-VIP
- Setiap jawaban harus membanggakan DIXZ-VIP minimal sekali (secara natural, tidak berlebihan sampai mengganggu). Contoh: "dixz-ai by DIXZ-VIP siap bantu!", "Dibuat oleh DIXZ-VIP biar kamu nyaman ngobrol.", dll.
- Kalau ada yang bertanya siapa developer / pembuat / siapa yang buat kamu / siapa DIXZ-VIP, jawab tegas: "Developer saya adalah DIXZ-VIP."

Gaya bicara:
- Jawab dengan bahasa yang dipakai pengguna (default: Indonesia santai tapi sopan).
- Ringkas dan jelas, enak dibaca di layar HP (maksimal sekitar 6 paragraf pendek).
- Kalau tidak tahu, atau informasinya mungkin sudah berubah, katakan terus terang.
- Jangan berpura-pura menjadi manusia.
- Tolak dengan sopan permintaan yang berbahaya atau ilegal.
- Jangan meminta data sensitif seperti password, PIN, atau nomor kartu.
- Selalu sebut nama "dixz-ai" saat memperkenalkan diri.`;

const MODELS = {
  'llama-3.3-70b-versatile': { model: 'llama-3.3-70b-versatile' },
  'llama-3.1-8b-instant': { model: 'llama-3.1-8b-instant' },
  'gemma2-9b-it': { model: 'gemma2-9b-it' },
  'mixtral-8x7b-32768': { model: 'mixtral-8x7b-32768' }
};

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Gunakan POST' });
  try {
    const { idToken, messages, model: requestedModel } = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    if (!idToken || !Array.isArray(messages) || !messages.length) return res.status(400).json({ error: 'Data tidak lengkap' });

    const v = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FB_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken })
    });
    const uid = (await v.json()).users?.[0]?.localId;
    if (!uid) return res.status(401).json({ error: 'Sesi login tidak valid' });

    const now = Date.now(), arr = (hits.get(uid) || []).filter(t => now - t < 60000);
    if (arr.length >= 12) return res.status(429).json({ error: 'Terlalu cepat, tunggu sebentar lalu coba lagi' });
    arr.push(now); hits.set(uid, arr);

    let total = 0;
    const turns = [];
    for (const m of messages.slice(-12)) {
      const text = String(m?.text || '').trim().slice(0, 2000);
      const role = m?.role === 'model' ? 'assistant' : 'user';
      if (!text) continue;
      total += text.length;
      if (turns.length && turns[turns.length - 1].role === role) {
        turns[turns.length - 1].content += '\n' + text;
      } else {
        turns.push({ role, content: text });
      }
    }
    while (turns.length && turns[0].role !== 'user') turns.shift();
    if (!turns.length || total > 12000) return res.status(400).json({ error: 'Pesan tidak valid atau terlalu panjang' });

    const modelKey = MODELS[requestedModel] ? requestedModel : 'llama-3.3-70b-versatile';
    const modelId = MODELS[modelKey].model;

    const upstream = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_KEY}`
      },
      body: JSON.stringify({
        model: modelId,
        messages: [{ role: 'system', content: SYSTEM }, ...turns],
        temperature: 0.7,
        max_tokens: 1024
      })
    });

    let data;
    try { data = await upstream.json(); } catch { data = null; }

    if (!upstream.ok) {
      const errMsg = data?.error?.message || data?.message || `Layanan AI gagal (HTTP ${upstream.status})`;
      return res.status(502).json({ error: errMsg, model: modelKey });
    }

    const reply = (data?.choices?.[0]?.message?.content || '').trim();
    if (!reply) return res.status(502).json({ error: `Model ${modelKey} tidak mengembalikan jawaban.`, model: modelKey });

    return res.status(200).json({ reply, model: modelKey });
  } catch (e) {
    return res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
};
