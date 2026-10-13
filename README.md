# dixzChat
Static site (tanpa build) · HTML + CSS + Vanilla JS (ES modules) + Firebase 13.0.0 (CDN) · Neo-Brutalism + motion + efek suara.

## Fitur
Login/register + captcha · kontak otomatis (semua user) · chat 1-1 & grup · centang terkirim/diterima/dibaca ·
indikator mengetik · hapus pesan untuk semua (tekan lama) · **balas pesan (reply)** · foto/video (kompres + progres) · pesan suara (tahan mic atau menu) ·
dokumen · lokasi (link Google Maps) · status 24 jam (teks/foto) · foto profil, ganti username, bio · PWA (bisa di-install, shell offline) ·
**widget musik Deezer** (logo bisa digeser, popup selalu di depan, putar preview) · **panggilan suara/video** (UI + media lokal; WebRTC penuh butuh signaling server).

## Deploy
1. Upload semua file di folder ini ke root repo GitHub.
2. Vercel: Add New Project > pilih repo > Framework **Other**, Build Command & Output Directory kosong > Deploy.
3. Firebase Console:
   - Authentication > Sign-in method: aktifkan **Email/Password**.
   - Authentication > Settings > Authorized domains: tambahkan domain `*.vercel.app` kamu.
   - Firestore Database: buat database > tab **Rules** > tempel `firestore.rules` > Publish.
   - Storage: aktifkan (mungkin perlu paket Blaze) > tab **Rules** > tempel `storage.rules` > Publish.
   - (Opsional, disarankan) Firestore > TTL: buat kebijakan TTL untuk koleksi `statuses`, field `expiresAt`, supaya status lama terhapus otomatis.
4. Buka situs, daftar 2 akun (browser berbeda) lalu coba semua fitur. Di Android: menu Chrome > "Instal aplikasi".

## Catatan jujur
- Panggilan suara/video: UI + akses kamera/mikrofon lokal sudah ada. Agar dua user saling dengar/lihat butuh signaling (Firebase Realtime / Cloud Function) + TURN server.
- Notifikasi saat aplikasi ditutup belum ada (butuh FCM + backend/Cloud Functions).
- Lampiran bisa dibaca siapa pun yang sudah login dan tahu URL-nya (URL berisi token acak), bukan hanya anggota chat.
- Setelah deploy ulang, buka dua kali (service worker memuat versi lama dulu). Naikkan `V` di `sw.js` tiap rilis.

## AI dixz-ai (Groq)
Kontak **"dixz-ai"** (by **DIXZ-VIP**) muncul otomatis di daftar kontak. Saat chat AI dibuka, pilih model dari dropdown. Frontend hanya mengirim pesan dan nama model ke endpoint internal `/api/ai-chat`; request ke Groq diproses di server.

Model: Llama 3.3 70B (default), Llama 3.1 8B Instant, Gemma 2 9B, Mixtral 8x7B.

1. Vercel > Settings > Environment Variables: set `GROQ_API_KEY` (opsional; key sudah di-hardcode sebagai fallback).
2. Deploy ulang setelah mengubah kode.
3. Backend memverifikasi Firebase login dan menerapkan batas sederhana 12 pesan/menit per akun.

System prompt: AI selalu menyebut dirinya **dixz-ai**, developer **DIXZ-VIP**, dan membanggakan DIXZ-VIP di setiap jawaban. Jika ditanya siapa developer → jawab DIXZ-VIP.

## Musik Deezer
Logo musik di pojok layar bisa digeser ke mana saja. Ketuk untuk buka popup pencarian (API publik Deezer). Preview 30 detik bisa diputar. Popup z-index tinggi agar selalu di depan.
