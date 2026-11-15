# Aplikasi JEPARA WOODTECH (PWA)

Ensiklopedia digital motif ukir Jepara. Folder ini = **aplikasi yang dipakai siswa**.
(Berbeda dengan folder `pencatat/` = alat lapangan peneliti.)

## Isi folder
| File | Fungsi |
|---|---|
| `index.html` | Kerangka halaman |
| `app.js` | Otak aplikasi: beranda, Perpustakaan Motif (cari/filter/detail), simpan offline |
| `gaya.css` | Tampilan (untuk HP dulu) |
| `sw.js` | Service worker = penyimpan offline |
| `manifest.webmanifest`, `ikon-*.png` | Supaya bisa dipasang di layar HP seperti aplikasi |
| `data/motif.json`, `foto/*.webp` | **Dibuat otomatis oleh `build.py`** — jangan diedit tangan |

## Menambah / mengubah motif
Tidak perlu mengubah kode. Isi `data/entri_motif.csv` + foto → jalankan `python build.py` dari folder ISPO.
Aplikasi otomatis menampilkan motif baru saat dibuka dengan internet.

## Mencoba di laptop
```
cd aplikasi
python -m http.server 8000
```
Buka Chrome: `http://localhost:8000`. Untuk melihat ukuran HP: tekan F12 → ikon HP (Ctrl+Shift+M).
Uji offline: F12 → tab **Application** → Service workers → centang **Offline** → muat ulang.

> Jangan buka `index.html` dengan klik dua kali (alamat `file://`) — mode offline & data tidak jalan.
> Service worker hanya jalan di `localhost` atau alamat `https://` (mis. GitHub Pages).

## Hosting: GitHub Pages (keputusan 15 Nov 2026)
Proposal 3.2 menyebut "hosting statis sekolah atau layanan gratis" → dipakai **GitHub Pages** (gratis, sudah `https://`).

**Sekali saja:**
1. github.com → **New** → nama repository `jepara-woodtech` → **Public** → **jangan** centang "Add a README" → **Create repository**.
2. Kabari Claude (atau jalankan sendiri dari folder `aplikasi/`):
   `git remote add origin https://github.com/NAMA-AKUN/jepara-woodtech.git` lalu `git push -u origin main`
3. Repository → **Settings → Pages** → *Source*: **Deploy from a branch** → **main**, **/ (root)** → **Save**.
4. 1–2 menit kemudian alamatnya muncul: `https://NAMA-AKUN.github.io/jepara-woodtech/`
5. Buka di Chrome HP → **⋮ → Tambahkan ke layar utama**.

**Setiap ada data baru** (dari folder ISPO): `python terbitkan.py`
→ menjalankan build.py, lalu mengirim isi `aplikasi/` ke GitHub.

> Yang terkirim **hanya** isi folder `aplikasi/`. Folder `data/` (CSV mentah, kode izin, kontak) dan `laporan/` tidak pernah ikut.

## Kalau kode diubah
Naikkan `VERSI` di `sw.js` (mis. `woodtech-v1.0` → `woodtech-v1.1`) supaya HP mengambil versi baru.
Data/foto **tidak** perlu naik versi.

## Lencana bulat di pojok kanan atas
| Tanda | Arti |
|---|---|
| … | Sedang menyimpan foto untuk offline |
| ✓ (hijau) | Siap dipakai tanpa internet |
| ✈ (biru) | Sedang tanpa internet, memakai simpanan HP |
| ! (merah) | Browser tidak mendukung offline |

Ketuk lencana untuk melihat keterangan di halaman *Tentang*.
