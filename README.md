# LMS TIF - Learning Management & Quiz System 🎓

Aplikasi Learning Management System (LMS) dan platform kuis interaktif modern untuk dosen dan mahasiswa. Mendukung pembuatan kuis interaktif, generator soal otomatis bertenaga **Google Gemini AI**, import/export format JSON & CSV, pembagian kuis instan via **QR Code**, pengerjaan kuis real-time, serta analisis hasil dan leaderboard mahasiswa.

---

## 📋 Daftar Isi
1. [Fitur Utama](#-fitur-utama)
2. [Prasyarat Sistem](#-prasyarat-sistem)
3. [Panduan Instalasi & Menjalankan di Lokal](#-panduan-instalasi--menjalankan-di-lokal)
4. [Akses Kuis Mahasiswa via HP di Jaringan Lokal](#-cara-agar-mahasiswa-bisa-scan-qr-code-dari-hp-di-komputer-lokal)
5. [Daftar Perintah (NPM Scripts)](#-daftar-perintah-npm-scripts)
6. [Konfigurasi Environment (.env)](#-konfigurasi-environment-env)
7. [Struktur Folder](#-struktur-folder)

---

## ✨ Fitur Utama
* **Dashboard Dosen / Pembuat Kuis**: Manajemen kuis, pembuatan soal manual (pilihan ganda), bobot nilai, dan timer pengerjaan.
* **AI Question Generator**: Pembuatan bank soal otomatis sesuai topik materi perkuliahan menggunakan Google Gemini AI.
* **Import & Export Soal**: Dukungan template soal siap pakai menggunakan format **JSON** dan **CSV**.
* **Live QR Code & Link Sharing**: Bagikan kuis secara instan kepada mahasiswa melalui QR Code yang dinamis.
* **Pengalaman Ujian Mahasiswa**: Antarmuka responsif ramah smartphone, timer hitung mundur, penyimpanan progres otomatis (*autosave*), dan deteksi anti-curang.
* **Analisis & Rekap Hasil**: Tinjauan performa kelas, distribusi jawaban, nilai rata-rata, dan leaderboard skor.
* **Multi-Bahasa**: Dukungan Bahasa Indonesia dan English.

---

## 💻 Prasyarat Sistem
Pastikan perangkat komputer/laptop Anda telah terpasang:
* **Node.js**: Versi `18.x`, `20.x`, atau yang lebih baru ([Unduh Node.js](https://nodejs.org/))
* **NPM**: Bawaan dari instalasi Node.js (atau gunakan `pnpm` / `yarn` / `bun`)
* **Koneksi Internet**: Diperlukan karena penyimpanan kuis menggunakan cloud **Firebase Firestore**, serta fitur AI generator membutuhkan akses ke Google Gemini API.

---

## 🚀 Panduan Instalasi & Menjalankan di Lokal

### 1. Buka Terminal / Command Prompt
Buka terminal di folder proyek ini (atau buka proyek di **VS Code** lalu buka terminal terintegrasi dengan shortcut ``Ctrl + ` `` atau `` Cmd + ` ``).

### 2. Install Dependensi
Jalankan perintah berikut untuk mengunduh semua paket pustaka yang dibutuhkan:
```bash
npm install
```

### 3. Buat File Konfigurasi Environment (`.env`)
Salin file `.env.example` menjadi `.env`:
* **Windows (PowerShell / Command Prompt)**:
  ```powershell
  copy .env.example .env
  ```
* **macOS / Linux**:
  ```bash
  cp .env.example .env
  ```

Buka file `.env` dan sesuaikan nilainya:
```env
# Opsional: Masukkan API Key Google Gemini untuk mengaktifkan AI Generator Soal
GEMINI_API_KEY="AIzaSy..."

# Port server (default: 3000)
PORT=3000
```
> **Catatan:** Jika Anda belum memiliki `GEMINI_API_KEY`, aplikasi tetap dapat berjalan normal untuk membuat soal secara manual maupun import file JSON/CSV.

### 4. Jalankan Aplikasi dalam Mode Pengembangan (Development)
```bash
npm run dev
```

Setelah server aktif, terminal akan menampilkan pesan:
```
Server running on http://localhost:3000
```

Buka peramban (browser) Anda di:
👉 **[http://localhost:3000](http://localhost:3000)**

---

## 📱 Cara Agar Mahasiswa Bisa Scan QR Code dari HP di Komputer Lokal

Ketika Anda menjalankan aplikasi di komputer via `http://localhost:3000`, browser mahasiswa di smartphone **tidak dapat** mengakses alamat `localhost` karena `localhost` pada HP merujuk ke HP mereka sendiri.

Gunakan salah satu dari 2 solusi mudah berikut:

---

### Solusi 1: Satu Jaringan Wi-Fi (Gunakan Alamat IP Komputer) — *Paling Cepat*

Pastikan laptop Anda dan smartphone mahasiswa terhubung ke **Wi-Fi yang sama** (atau hotspot yang sama dari smartphone).

1. **Cari tahu IP Lokal Komputer Anda:**
   * **Windows**: Buka CMD/Terminal, ketik:
     ```cmd
     ipconfig
     ```
     Cari bagian *IPv4 Address* (contoh: `192.168.1.15`).
   * **macOS**: Buka Terminal, ketik:
     ```bash
     ipconfig getifaddr en0
     ```
   * **Linux**: Buka Terminal, ketik:
     ```bash
     hostname -I
     ```

2. **Buka aplikasi di browser laptop menggunakan IP tersebut**, BUKAN localhost:
   ```
   http://192.168.1.15:3000
   ```
   *(Ganti `192.168.1.15` dengan alamat IP komputer Anda).*

3. **Tampilkan Kuis & Bagikan QR Code**:
   * QR Code yang dihasilkan di layar laptop Anda otomatis akan memuat tautan berawalan `http://192.168.1.15:3000/quiz/...`.
   * Mahasiswa tinggal melakukan scan QR Code menggunakan kamera HP masing-masing dan langsung masuk ke halaman ujian!

---

### Solusi 2: VS Code Port Forwarding (HTTPS Publik) — *Bisa Akses dari Mana Saja*

Jika laptop dan HP mahasiswa menggunakan jaringan berbeda (misal mahasiswa pakai kuota seluler sendiri), gunakan fitur bawaan VS Code:

1. Di VS Code, buka tab **Ports** (di panel bawah sebelah Terminal).
2. Klik **Forward a Port** dan masukkan angka `3000`.
3. Klik kanan pada port yang baru ditambahkan -> ubah **Port Visibility** menjadi **Public**.
4. Salin **Forwarded Address** (contoh: `https://xxxx-3000.asse.devtunnels.ms`).
5. Buka tautan HTTPS tersebut di browser Anda, lalu buka halaman kuis. QR Code akan mengarah ke alamat publik tersebut dan bisa diakses oleh siapa saja.

---

## 🛠️ Daftar Perintah (NPM Scripts)

| Perintah | Deskripsi |
| :--- | :--- |
| `npm run dev` | Menjalankan server development terintegrasi (Express + Vite HMR). |
| `npm run build` | Melakukan build produksi untuk frontend (Vite) dan backend (`dist/server.cjs`). |
| `npm run start` | Menjalankan bundle produksi yang siap digunakan di cloud/server. |
| `npm run lint` | Memeriksa tipe data TypeScript tanpa menghasilkan file output (`tsc --noEmit`). |
| `npm run clean` | Menghapus direktori `dist` hasil build sebelumnya. |

---

## ⚙️ Konfigurasi Database & Layanan Cloud

* **Database (Firestore)**: Konfigurasi project Firebase tersimpan di `firebase-applet-config.json` dan aturan keamanan tersimpan di `firestore.rules`. Data soal dan respons kuis tersimpan secara aman dan persisten di cloud.
* **AI Question Generator**: Menggunakan `@google/genai` dengan model `gemini-3.5-flash` melalui endpoint aman server-side di `/api/gemini/generate-questions`.

---

## 📁 Struktur Folder

```
├── .env.example                # Contoh variabel environment
├── firebase-applet-config.json # Konfigurasi Firebase Firestore
├── firestore.rules             # Aturan keamanan database
├── package.json                # Dependensi dan skrip proyek
├── server.ts                   # Backend server Express + middleware Vite & Gemini API
├── vite.config.ts              # Konfigurasi bundler Vite
├── src/
│   ├── App.tsx                 # Routing & tata letak aplikasi
│   ├── main.tsx                # Entry point React
│   ├── types.ts                # Deklarasi tipe data TypeScript
│   ├── lib/
│   │   ├── firebase.ts         # Inisialisasi Firebase Auth & Firestore
│   │   └── i18n.ts             # Konfigurasi lokalisasi bahasa (ID & EN)
│   └── pages/                  # Halaman-halaman antarmuka aplikasi
│       ├── QuizListPage.tsx    # Daftar & manajemen kuis
│       ├── QuizCreatePage.tsx  # Pembuatan & edit kuis (Manual, AI, CSV, JSON)
│       ├── QuizTakePage.tsx    # Antarmuka ujian mahasiswa
│       └── QuizResultsPage.tsx # Rekap nilai & analisis hasil
```

---

## 🚢 Panduan Deploy ke Render / Cloud VPS

Aplikasi ini sudah mendukung **Full-Stack Node.js**:
1. Hubungkan repositori GitHub Anda ke [Render.com](https://render.com).
2. Buat **Web Service** baru:
   * **Build Command**: `npm install && npm run build`
   * **Start Command**: `npm run start`
3. Tambahkan environment variables di dashboard Render:
   * `NODE_ENV`: `production`
   * `GEMINI_API_KEY`: *(API Key Google Gemini Anda)*
4. Klik **Deploy** — Render akan membuatkan tautan web HTTPS publik otomatis.
