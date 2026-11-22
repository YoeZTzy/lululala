# Rencana Hi-Fi LintasSiaga (mobile)

Branch: `feat/aplikasi-hifi` · Sumber desain: Figma `7xbGb6IY7blGpgDG1eQZLZ`, halaman Hi-Fi (section `10:267`).

## Yang sudah dibaca dari Figma
- Struktur halaman (metadata): 10 layar, frame "Fondasi" (logo, 34 ikon Lucide, 17 komponen).
- Screenshot semua layar dan sebagian komponen.
- Token warna (`get_variable_defs`, koleksi "LintasSiaga · Warna"):
  `brand/biru-tua #0C447C`, `brand/biru #185FA5`, `brand/langit-50 #E6F1FB`, `brand/langit-100 #B5D4F4`, `brand/amber #EF9F27`, `brand/amber-50 #FAEEDA`, `brand/amber-800 #633806`, `risiko/aman #1D9E75`, `risiko/aman-bg #E1F5EE`, `risiko/aman-teks #085041`, `risiko/waspada #EF9F27`, `risiko/waspada-teks #633806`, `risiko/hindari #E24B4A`, `risiko/hindari-teks #791F1F`, `teks/utama #14213D`, `teks/sekunder #5B6675`, `teks/samar #8A94A3`, `teks/terbalik #FFFFFF`, `permukaan/latar #F5F8FC`, `permukaan/kartu #FFFFFF`, `garis/halus #E3E9F0`.
  Belum terlihat di node Beranda: `brand/biru-cerah`, `risiko/waspada-bg`, `risiko/hindari-bg`, `permukaan/isian`. Akan dibaca dari node lain di fase (a). Kalau tetap tidak ada, dipakai nilai cadangan dari brief.
- `get_design_context` per layar/komponen dibaca di awal fase masing-masing, supaya nilai spacing, radius, dan tipografi diambil tepat saat dipakai.

## Fase & file

| Fase | Isi | File utama |
|---|---|---|
| a | Pasang dependency (`npx expo install …`), tema, font, komponen | `src/theme/{colors,typography,spacing,radius,index}.js`, `src/components/{Logo,HeaderRingkas,HeaderAksen,Input,Tombol,Chip,BadgeRisiko,BadgeStatus,TabBar,KartuRute,GarisRuteMini,ItemTitikRawan,BarisRute,Sakelar,AvatarWarga,Penanda,PenandaLokasiSaya,Skeleton,KeadaanKosong,KeadaanError}.js`, `App.js` (memuat font) |
| b | Navigasi baru | `src/navigation/{AppNavigator,AuthStack,MainTabs,BerandaStack,PetaStack}.js` (tab bar kustom, tab disembunyikan di layar detail) |
| c | Login & Daftar, sesi SecureStore, auto-logout 401 | `src/screens/{Login,Daftar}Screen.js`, `src/context/AuthContext.js`, `src/services/ApiService.js` |
| d | Beranda, Tambah Rute, Detail Rute | `src/screens/{Beranda,TambahRute,DetailRute}Screen.js`, `src/utils/{jadwal,geo}.js` (rute berikutnya, parse hari lama/baru) |
| e | Peta, Detail Titik Rawan | `src/screens/{Peta,DetailTitikRawan}Screen.js`, `src/components/KartuRingkasTitik.js` |
| f | Lapor + modal sukses | `src/screens/LaporScreen.js`, `src/components/ModalLaporanTerkirim.js` |
| g | Profil | `src/screens/ProfilScreen.js` |
| h | Celah backend (commit `backend:` terpisah + tes) | `backend/app/modules/{monitoring,risk,iam}/router.py`, `backend/tests/test_api.py` |
| i | Bersih-bersih | Hapus `Home/Reports/Commutes/ProfileScreen.js`, update README bagian mobile |

Fase h dikerjakan sebelum layar yang bergantung padanya: Detail Titik Rawan butuh h1+h2, Profil butuh h3, Beranda butuh h4+h5. Urutan nyatanya: a, b, c, h, d, e, f, g, i.

## Perubahan backend yang diperlukan layar

| # | Perubahan | Dipakai layar | Catatan kompatibilitas |
|---|---|---|---|
| h1 | `GET /api/hazards/{id}`: detail, laporan anggota (`id, source, created_at, confirmations, disputes, is_mine, my_vote`), `target_report_id`. Kolom `hazard_id` ditambah ke `reports` lewat `ALTER TABLE … ADD COLUMN` bila belum ada, lalu diisi saat sinkronisasi klaster. | Detail Titik Rawan, Peta | JWT opsional (`is_mine`/`my_vote` hanya terisi bila login). Data lama tanpa `hazard_id` dipetakan ulang memakai radius 300 m. |
| h2 | Peluruhan TitikRawan saat dibaca: skor & status dihitung dari anggota yang belum kedaluwarsa | Peta, Beranda, Detail | `GET /api/hazards?bbox` tetap sama bentuknya. Nilainya jadi lebih akurat. Hazard yang skornya turun ke Selesai tidak tampil lagi. |
| h3 | `GET /api/me` (alias `/api/auth/me`) dengan `stats {reports, votes, commutes}`; `GET /api/reports?mine=true` | Profil | `/api/auth/me` tetap ada. Field baru hanya ditambahkan. |
| h4 | `days` menerima array `["sen","sel",…]` (teks lama tetap diterima dan disimpan apa adanya); `GET /api/commutes?include_risk=true` menyertakan `risk {risk_level, risk_score, causes}` per rute | Beranda, Tambah Rute | Tanpa query, respons `/api/commutes` sama seperti sekarang |
| h5 | `/api/summary` menambah `reporters_today` | Beranda (kartu "N warga melapor") | Hanya menambah field |

Tambahan saat implementasi: **h6** kolom opsional `origin_label`/`dest_label` pada rute rutin. Dibutuhkan Kartu Rute & Detail Rute untuk menampilkan nama asal/tujuan.

Endpoint mitra (`/api/route-risk`, `/api/hazards?bbox`, `/api/cities/{kota}/summary`) tidak diubah selain penambahan field atau nilai yang lebih akurat dari h2.

## Pemetaan data → desain

- **Cuaca header Beranda:** `summary.weather.rain_mm` diterjemahkan ke label (0 = Cerah, <2,5 = Hujan ringan, <10 = Hujan sedang, ≥10 = Hujan lebat). Suhu tidak ditampilkan; format jadi "Hujan lebat · Bandung".
- **Rute berikutnya:** hari + jam terdekat dari sekarang. Hari dibaca dari format baru (array) maupun lama ("Senin-Jumat", "Sabtu").
- **Garis rute mini:** `causes` diurutkan menurut proyeksi posisinya pada garis asal→tujuan, lalu ditempatkan sesuai fraksi 0–1 di sepanjang garis.
- **Severity Lapor:** Ringan = 2, Sedang = 3, Berat = 5 (ditulis sebagai konstanta di `LaporScreen.js`).
- **Opasitas penanda Peta:** umur dari `updated_at` hazard. 1,0 bila <1 jam, lalu turun linear sampai 0,4 pada 3 jam. Kategori Baru = <30 menit, Aktif/Mereda dari `status`.
- **Konfirmasi/bantahan:** dikirim ke `target_report_id` dari h1 (laporan terbaru yang bukan milik pengguna). Tombol disembunyikan bila semua laporan milik pengguna. Bila sudah memberi suara, tombol dinonaktifkan dengan teks "Kamu sudah memberi tanggapan". Respons 400/409 diubah jadi pesan ramah.
- **Garis rute di Detail Rute:** garis lurus asal→tujuan, atau `segments` bila ada. Tidak memanggil OSRM.
- **Fitur "Segera hadir":** saran jam berangkat, reputasi pelapor, sakelar pengingat (UI saja, disimpan lokal), kotak cari Peta (UI saja).

## Selisih desain vs data (butuh keputusan)
1. Figma menulis "Minimal 8 karakter" untuk password, sedangkan backend `min_length=6`. Rencana: ikut backend (6), teks error menyesuaikan.
2. **Avatar Warga & riwayat "Dilaporkan Rani":** backend sengaja tidak membuka identitas pelapor di hazard. Rencana: avatar memakai inisial generik dari jumlah (mis. bubble "+5" saja), dan riwayat ditulis "Dilaporkan warga". Atau h1 menambah inisial pelapor; itu perubahan privasi.
3. **Tambah Rute "pilih di peta":** Figma tidak punya layar pemilih lokasi. Rencana: modal peta layar penuh dengan pin tengah dan tombol "Pakai lokasi ini", dibangun dari komponen yang ada.
4. **Lonceng Beranda:** tidak ada layar notifikasi di Figma. Rencana: lonceng menampilkan titik amber bila `/api/alerts` tidak kosong, tanpa navigasi.
5. **Prakiraan hujan di Detail Rute:** backend hanya punya hujan observasi. Rencana: baris faktor cuaca bertuliskan "Hujan terkini" dari `weather_factor`, bukan "Prakiraan · Open-Meteo".

## API kelompok lain
`EXPO_PUBLIC_HEALTH_API_URL`, `EXPO_PUBLIC_HEALTH_API_KEY`, `EXPO_PUBLIC_TOURISM_API_URL`, `EXPO_PUBLIC_TOURISM_API_KEY`. Fungsi `getFaskes()` dan `getDestinasi()` mengembalikan mock bila URL kosong (`// TODO`). Belum ditampilkan di layar karena Figma tidak punya slotnya.

## Verifikasi per fase
- `npx expo start` tanpa error bundler, plus `npx expo export --platform android` sebagai cek kompilasi tanpa perangkat.
- Bila backend disentuh: `python -m tests.test_api`.
- Bandingkan tiap layar dengan screenshot Figma, lalu catat selisihnya.
- Cara uji di Expo Go ditulis di akhir tiap fase.

## Risiko
- Expo SDK 58 / RN 0.88: `npx expo install` memilih versi yang cocok. `react-native-maps` di Expo Go Android memakai Google Maps bawaan Expo Go, tanpa API key tambahan untuk pengembangan.
- Gaya peta dasar Figma (ilustrasi) tidak ditiru. Peta asli memakai gaya default.
