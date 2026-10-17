# dixzChat
Static site (tanpa build) · HTML + CSS + Vanilla JS (ES modules) + Firebase 13.0.0 (CDN) · Neo-Brutalism + motion + efek suara.

## Fitur
Login/register + captcha · kontak otomatis (semua user) · chat 1-1 & grup · centang terkirim/diterima/dibaca ·
indikator mengetik · hapus pesan untuk semua (tekan lama) · foto/video (kompres + progres) · pesan suara (tahan mic atau menu) ·
dokumen · lokasi (link Google Maps) · status 24 jam (teks/foto) · foto profil, ganti username, bio · PWA (bisa di-install, shell offline).

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
- Panggilan suara/video belum ada (tab Telepon masih kosong). Butuh WebRTC + server TURN.
- Notifikasi saat aplikasi ditutup belum ada (butuh FCM + backend/Cloud Functions).
- Lampiran bisa dibaca siapa pun yang sudah login dan tahu URL-nya (URL berisi token acak), bukan hanya anggota chat.
- Setelah deploy ulang, buka dua kali (service worker memuat versi lama dulu). Naikkan `V` di `sw.js` tiap rilis.

## AI dixzChat (XEMOZ_API lewat backend Vercel)

AI chat memakai endpoint XEMOZ_API melalui `api/ai-chat.js` di server Vercel. URL endpoint tidak dipanggil langsung dari frontend. Pengguna yang membuka chat bot dapat memilih GPT 5.5, GPT 5.4, GPT 5.3, DeepSeek V4 Flash, DeepSeek V3.2 Thinking, DeepAI Chat, atau Blackbox.

### Deploy
1. Push perubahan file ke GitHub lalu tunggu Vercel selesai deploy.
2. Tidak perlu `GROQ_API_KEY` atau `GROQ_MODEL` untuk alur XEMOZ_API ini.
3. `FIREBASE_API_KEY` tetap bisa diatur di Environment Variables; bila tidak ada, fungsi memakai nilai fallback proyek yang sudah ada.
4. Login ke DixzChat, buka kontak bot AI, pilih model, lalu kirim pesan.

### Catatan pengujian
- URL GPT 5.5 dengan parameter `pesan` dan DeepAI Chat dengan parameter `message` berhasil memberikan JSON saat dicek.
- Format respons model lain belum diverifikasi. Parser hanya mengenali beberapa kunci umum dan menampilkan JSON mentah bila formatnya tidak dikenali.
- Endpoint Claude Haiku tidak ditambahkan karena URL yang diberikan tidak menunjukkan parameter untuk mengirim prompt. Image generation dan MathGPT juga tidak ditambahkan karena fitur yang dipilih saat ini hanya chat.
- XEMOZ_API merupakan layanan pihak ketiga; ketersediaan, batas pemakaian, privasi, dan stabilitasnya bergantung pada penyedianya.


## XEMOZ_API: 10 endpoint dan perintah @AI di grup

- Semua 10 endpoint yang diberikan tercatat di `api/ai-chat.js`: AI Image, Blackbox, Claude Haiku 3, DeepAI Chat, DeepSeek V3.2 Thinking, DeepSeek V4 Flash, GPT 5.3, GPT 5.4, GPT 5.5, dan MathGPT AI.
- Jalur chat umum hanya menerima model chat. AI Image dan MathGPT terdaftar, tetapi sengaja ditolak oleh jalur chat karena bukan model chat umum.
- Di grup, kirim pesan yang diawali `@AI`, contoh: `@AI cari info berita hari ini`. Pesan perintah tetap terlihat di grup; klien pengirim memanggil GPT 5.5 dan mem-posting balasan sebagai `AI dixzChat` ke grup. Hanya aplikasi pengirim perintah yang menjalankan panggilan tersebut, untuk menghindari setiap anggota memanggil AI berulang kali.
- URL Claude Haiku 3 yang diberikan tidak memuat parameter prompt. Kode tidak menebak parameternya; model itu akan memberi pesan penjelasan sampai nama parameter dikonfirmasi. Jika sudah dikonfirmasi, set Environment Variable `XEMOZ_CLAUDE_PARAM` di Vercel ke nama parameter resmi, lalu redeploy.
- Format respons yang belum diketahui tidak dipaksakan ke skema tertentu; respons JSON yang tidak cocok ditampilkan sebagai teks JSON mentah.
- Endpoint XEMOZ belum dapat diuji langsung dari lingkungan pembuatan ini karena DNS jaringan tidak tersedia. Setelah deploy, uji satu per satu.
