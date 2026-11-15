/* JEPARA WOODTECH — aplikasi utama
   ==================================
   Fase 2: Beranda + Modul A (Perpustakaan Motif) + simpan offline.
   Modul B, C, D menyusul (Fase 3–5).

   Alur singkat:
   1. Ambil data/motif.json (dibuat oleh build.py dari CSV).
   2. Tampilkan layar sesuai alamat (#/ , #/motif , #/motif/M01 , ...).
   3. Simpan semua foto ke "lemari" HP (Cache Storage) supaya bisa dibuka tanpa internet.

   Aplikasi TIDAK punya akun, iklan, atau pembayaran, dan tidak mengirim data apa pun. */
'use strict';

const ALAMAT_DATA = 'data/motif.json';
const LEMARI_DATA = 'woodtech-data';     // nama simpanan foto & data di HP (sama dengan sw.js)
const NAMA_SUDUT = { depan: 'Depan', samping: 'Samping', detail: 'Detail' };
const URUTAN_SUDUT = ['depan', 'samping', 'detail'];

let DATA = null;                          // { dibuat, jumlah, entri: [...] }
const saring = { cari: '', teknik: '', kayu: '' };   // pilihan pencarian di Perpustakaan
let gulirPerpustakaan = 0;               // posisi gulir daftar, dikembalikan saat kembali
let sudahPindahLayar = false;            // untuk tombol ← (pakai riwayat browser bila ada)

/* ------------------------------------------------------------------ alat bantu */
const $ = s => document.querySelector(s);
const isi = $('#isi');

/** Cegah teks data dibaca sebagai kode HTML (keamanan). */
function aman(t) {
  return String(t ?? '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
/** Huruf kecil + buang tanda aksen, supaya pencarian "Jati" = "jati". */
function normal(t) {
  return String(t ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
}
function hurufBesarAwal(t) { t = String(t ?? ''); return t.charAt(0).toUpperCase() + t.slice(1); }

/** Nama Indonesia ditampilkan hanya kalau berbeda dari nama lokal. */
function namaIndonesia(e) {
  const ind = (e.nama_indonesia || '').trim();
  if (!ind || normal(ind) === 'sama' || normal(ind) === normal(e.nama_lokal)) return '';
  return ind;
}
function judul(e) { return e.nama_lokal || e.nama_indonesia || e.kode; }

function daftarUnik(kunci) {
  const set = new Set();
  DATA.entri.forEach(e => (e[kunci] || []).forEach(v => v && set.add(v)));
  return [...set].sort((a, b) => a.localeCompare(b, 'id'));
}
function jumlahPerajin() {
  const set = new Set();
  DATA.entri.forEach(e => {
    const p = e.perajin || {};
    const k = normal(p.nama || p.bengkel);
    if (k) set.add(k);
  });
  return set.size;
}
function adaContoh() { return DATA.entri.some(e => e.contoh); }
const lencanaContoh = '<span class="lencana-contoh">CONTOH</span>';

/* ------------------------------------------------------------------ data */
async function muatData() {
  const res = await fetch(ALAMAT_DATA, { cache: 'no-cache' });
  if (!res.ok) throw new Error('Gagal memuat data (' + res.status + ')');
  const d = await res.json();
  d.entri = (d.entri || []).slice().sort((a, b) => a.kode.localeCompare(b.kode));
  return d;
}

/* ------------------------------------------------------------------ pengatur layar (router)
   Alamat setelah tanda # menentukan layar:
     #/            Beranda
     #/motif       Perpustakaan Motif (daftar)
     #/motif/M01   Detail satu motif
     #/b #/c #/d   Modul yang sedang dibuat
     #/tentang     Tentang aplikasi                                    */
function bagianAlamat() { return (location.hash.replace(/^#\/?/, '') || '').split('/').filter(Boolean); }

function tampilkan() {
  tutupPenampil();
  const [layar, kode] = bagianAlamat();
  const dariPerpustakaan = isi.dataset.layar === 'perpustakaan';
  if (dariPerpustakaan) gulirPerpustakaan = window.scrollY;

  let judulKecil = 'Ensiklopedia motif ukir';
  if (!layar) layarBeranda();
  else if (layar === 'motif' && kode) judulKecil = layarDetail(decodeURIComponent(kode));
  else if (layar === 'motif') { layarPerpustakaan(); judulKecil = 'Perpustakaan Motif'; }
  else if (['b', 'c', 'd'].includes(layar)) judulKecil = layarSegera(layar);
  else if (layar === 'tentang') { layarTentang(); judulKecil = 'Tentang aplikasi'; }
  else { location.replace('#/'); return; }

  $('#judul-layar').textContent = judulKecil;
  $('#tombol-kembali').hidden = !layar;
  document.title = (layar ? judulKecil + ' · ' : '') + 'JEPARA WOODTECH';

  // Kembali ke Perpustakaan → posisi gulir dikembalikan; layar lain mulai dari atas
  const keGulir = isi.dataset.layar === 'perpustakaan' ? gulirPerpustakaan : 0;
  requestAnimationFrame(() => window.scrollTo(0, keGulir));
}

function kembali() {
  const [layar, kode] = bagianAlamat();
  if (sudahPindahLayar) history.back();
  else location.replace(layar === 'motif' && kode ? '#/motif' : '#/');
}

/* ------------------------------------------------------------------ BERANDA */
function layarBeranda() {
  isi.dataset.layar = 'beranda';
  const n = DATA.entri.length, p = jumlahPerajin();
  isi.innerHTML = `
    <section class="sambutan">
      <h1>Kenali motif ukir Jepara</h1>
      <p>Foto, ciri, teknik, kayu, dan cerita motif langsung dari perajin Desa Mulyoharjo.</p>
      <p class="angka"><b>${n}</b> motif${p ? ` · <b>${p}</b> perajin` : ''}</p>
    </section>
    ${adaContoh() ? `<p class="kotak-info">Data yang tampil sekarang masih <b>CONTOH</b>, bukan data asli dari perajin.</p>` : ''}
    <nav class="menu-modul" aria-label="Modul">
      <a class="modul aktif" href="#/motif">
        <span class="huruf">A</span>
        <span><b>Perpustakaan Motif</b><small>Cari motif menurut nama, teknik, atau kayu</small></span>
      </a>
      <a class="modul" href="#/b">
        <span class="huruf">B</span>
        <span><b>Katalog Titik Temu</b><small>Kenali perajin & produknya · segera hadir</small></span>
      </a>
      <a class="modul" href="#/c">
        <span class="huruf">C</span>
        <span><b>Game Tebak & Susun Motif</b><small>Kuis foto dan menyusun motif · segera hadir</small></span>
      </a>
      <a class="modul" href="#/d">
        <span class="huruf">D</span>
        <span><b>Misi Wawancara</b><small>Panduan mewawancarai perajin · segera hadir</small></span>
      </a>
    </nav>
    <p class="kaki"><a href="#/tentang">Tentang aplikasi</a> · data ${aman(DATA.dibuat || '-')}</p>`;
}

/* ------------------------------------------------------------------ MODUL A: PERPUSTAKAAN */
function layarPerpustakaan() {
  isi.dataset.layar = 'perpustakaan';
  const chip = (grup, nilai, label) =>
    `<button type="button" class="chip" data-grup="${grup}" data-nilai="${aman(nilai)}"
       aria-pressed="${saring[grup] === nilai}">${aman(label)}</button>`;
  const grupChip = (grup, judulGrup, nilai) => nilai.length ? `
      <div class="grup-chip" role="group" aria-label="${judulGrup}">
        <span class="label-grup">${judulGrup}</span>
        <div class="chips">${chip(grup, '', 'Semua')}${nilai.map(v => chip(grup, v, hurufBesarAwal(v))).join('')}</div>
      </div>` : '';

  isi.innerHTML = `
    <div class="kotak-cari">
      <input type="search" id="cari" placeholder="Cari nama motif, ciri, makna…"
             value="${aman(saring.cari)}" autocomplete="off" enterkeyhint="search" aria-label="Cari motif">
    </div>
    ${grupChip('teknik', 'Teknik', daftarUnik('teknik'))}
    ${grupChip('kayu', 'Kayu', daftarUnik('kayu'))}
    <p class="hasil-jumlah" id="hasil-jumlah" aria-live="polite"></p>
    <div class="kisi-motif" id="kisi-motif"></div>`;

  $('#cari').addEventListener('input', ev => { saring.cari = ev.target.value; isiDaftar(); });
  isi.querySelectorAll('.chip').forEach(b => b.addEventListener('click', () => {
    saring[b.dataset.grup] = b.dataset.nilai;
    isi.querySelectorAll(`.chip[data-grup="${b.dataset.grup}"]`)
      .forEach(x => x.setAttribute('aria-pressed', x === b));
    isiDaftar();
  }));
  isiDaftar();
}

/** Apakah entri cocok dengan pencarian + filter? Semua kata yang diketik harus ditemukan. */
function cocok(e) {
  if (saring.teknik && !(e.teknik || []).includes(saring.teknik)) return false;
  if (saring.kayu && !(e.kayu || []).includes(saring.kayu)) return false;
  const kata = normal(saring.cari).split(/\s+/).filter(Boolean);
  if (!kata.length) return true;
  const teks = normal([e.kode, e.nama_lokal, e.nama_indonesia, e.varian, e.makna_cerita,
    ...(e.ciri || []), ...(e.teknik || []), ...(e.kayu || []), ...(e.alat || []),
    e.perajin?.nama, e.perajin?.bengkel].join(' '));
  return kata.every(k => teks.includes(k));
}

function isiDaftar() {
  const hasil = DATA.entri.filter(cocok);
  const disaring = saring.cari || saring.teknik || saring.kayu;
  $('#hasil-jumlah').innerHTML = disaring
    ? `${hasil.length} dari ${DATA.entri.length} motif · <button type="button" class="tautan" id="hapus-saring">hapus filter</button>`
    : `${hasil.length} motif`;
  $('#hapus-saring')?.addEventListener('click', () => {
    saring.cari = saring.teknik = saring.kayu = '';
    layarPerpustakaan();
  });

  $('#kisi-motif').innerHTML = hasil.length ? hasil.map(e => {
    const foto = e.foto?.depan || e.foto?.detail || e.foto?.samping;
    const ind = namaIndonesia(e);
    return `
      <a class="kartu-motif" href="#/motif/${encodeURIComponent(e.kode)}">
        <span class="gambar">${foto
          ? `<img src="${aman(foto)}" alt="" loading="lazy" decoding="async">`
          : '<span class="tanpa-foto">Foto belum tersedia</span>'}
          ${e.contoh ? lencanaContoh : ''}</span>
        <span class="teks">
          <b>${aman(judul(e))}</b>
          ${ind ? `<small>${aman(ind)}</small>` : ''}
          <span class="tag">${[...(e.teknik || []), ...(e.kayu || [])].map(t => `<i>${aman(t)}</i>`).join('')}</span>
        </span>
      </a>`;
  }).join('') : `<p class="kosong">Tidak ada motif yang cocok.<br>Coba kata lain atau hapus filter.</p>`;
}

/* ------------------------------------------------------------------ MODUL A: DETAIL MOTIF */
function layarDetail(kode) {
  isi.dataset.layar = 'detail';
  const i = DATA.entri.findIndex(e => e.kode === kode);
  if (i < 0) {
    isi.innerHTML = `<p class="kosong">Motif <b>${aman(kode)}</b> tidak ditemukan.</p>
      <p class="tengah"><a class="tombol" href="#/motif">Ke Perpustakaan Motif</a></p>`;
    return 'Perpustakaan Motif';
  }
  const e = DATA.entri[i];
  const sebelum = DATA.entri[i - 1], sesudah = DATA.entri[i + 1];
  const foto = URUTAN_SUDUT.filter(s => e.foto?.[s]).map(s => ({ sudut: s, src: e.foto[s] }));
  const ind = namaIndonesia(e);
  const p = e.perajin || {};
  const bagian = (judulBagian, html) => `<section class="bagian"><h2>${judulBagian}</h2>${html}</section>`;
  const redup = t => `<p class="redup">${t}</p>`;
  const chipLink = (grup, nilai) =>
    `<a class="chip kecil" href="#/motif" data-grup="${grup}" data-nilai="${aman(nilai)}">${aman(hurufBesarAwal(nilai))}</a>`;

  isi.innerHTML = `
    ${e.contoh ? `<p class="kotak-info">${lencanaContoh} Entri ini <b>contoh</b>, bukan data asli dari perajin.</p>` : ''}
    <div class="galeri">
      ${foto.length ? `
        <div class="geser" id="geser">
          ${foto.map((f, n) => `
            <figure data-n="${n}">
              <button type="button" class="buka-foto" data-n="${n}" aria-label="Perbesar foto ${NAMA_SUDUT[f.sudut]}">
                <img src="${aman(f.src)}" alt="${aman(judul(e))} — tampak ${NAMA_SUDUT[f.sudut].toLowerCase()}" decoding="async">
              </button>
              <figcaption>${NAMA_SUDUT[f.sudut]}</figcaption>
            </figure>`).join('')}
        </div>
        ${foto.length > 1 ? `<div class="titik" id="titik">${foto.map((f, n) =>
          `<button type="button" data-n="${n}" aria-label="Foto ${NAMA_SUDUT[f.sudut]}" aria-current="${n === 0}">${NAMA_SUDUT[f.sudut]}</button>`).join('')}</div>` : ''}`
      : '<div class="tanpa-foto besar">Foto belum tersedia</div>'}
    </div>

    <header class="judul-motif">
      <small>${aman(e.kode)}</small>
      <h1>${aman(judul(e))}</h1>
      ${ind ? `<p>${aman(ind)}</p>` : ''}
    </header>

    ${bagian('Makna & cerita', e.makna_cerita
      ? `<blockquote>${aman(e.makna_cerita)}</blockquote>`
      : redup('Belum ada cerita yang tercatat dari perajin.'))}

    ${bagian('Ciri visual', (e.ciri || []).length
      ? `<ul>${e.ciri.map(c => `<li>${aman(c)}</li>`).join('')}</ul>` : redup('Belum tercatat.'))}

    ${e.varian ? bagian('Varian', `<p>${aman(hurufBesarAwal(e.varian))}</p>`) : ''}

    ${bagian('Teknik & alat', `
      <div class="chips">${(e.teknik || []).map(t => chipLink('teknik', t)).join('') || '<span class="redup">-</span>'}</div>
      ${(e.alat || []).length ? `<p class="alat"><b>Alat:</b> ${e.alat.map(aman).join(', ')}</p>` : ''}`)}

    ${bagian('Jenis kayu', `<div class="chips">${(e.kayu || []).map(k => chipLink('kayu', k)).join('') || '<span class="redup">-</span>'}</div>`)}

    ${bagian('Perajin', (p.nama || p.bengkel)
      ? `<p class="perajin">${p.nama ? `<b>${aman(p.nama)}</b>` : ''}${p.nama && p.bengkel ? '<br>' : ''}${p.bengkel ? aman(p.bengkel) : ''}</p>`
      : redup('Identitas perajin tidak ditampilkan (sesuai izin perajin).'))}

    ${e.lisensi && foto.length ? `<p class="lisensi"><b>Lisensi foto: ${aman(e.lisensi)}.</b> ${
      e.lisensi === 'CC BY-NC 4.0'
        ? 'Boleh dibagikan untuk tujuan non-komersial dengan menyebut nama perajin.'
        : 'Hanya untuk aplikasi ini. Jangan disalin atau dipakai ulang tanpa izin perajin.'}</p>` : ''}

    <nav class="sebelum-sesudah" aria-label="Motif lain">
      ${sebelum ? `<a href="#/motif/${encodeURIComponent(sebelum.kode)}">‹ ${aman(judul(sebelum))}</a>` : '<span></span>'}
      ${sesudah ? `<a href="#/motif/${encodeURIComponent(sesudah.kode)}" class="kanan">${aman(judul(sesudah))} ›</a>` : '<span></span>'}
    </nav>`;

  // Ketuk chip teknik/kayu → buka Perpustakaan yang sudah tersaring
  isi.querySelectorAll('a.chip[data-grup]').forEach(a => a.addEventListener('click', () => {
    saring.cari = ''; saring.teknik = ''; saring.kayu = '';
    saring[a.dataset.grup] = a.dataset.nilai;
    gulirPerpustakaan = 0;
  }));

  // Galeri: geser foto, tombol penanda, ketuk untuk perbesar
  const geser = $('#geser');
  if (geser) {
    const titik = isi.querySelectorAll('#titik button');
    titik.forEach(b => b.addEventListener('click', () =>
      geser.scrollTo({ left: geser.clientWidth * +b.dataset.n, behavior: 'smooth' })));
    geser.addEventListener('scroll', () => {
      const n = Math.round(geser.scrollLeft / geser.clientWidth);
      titik.forEach(b => b.setAttribute('aria-current', +b.dataset.n === n));
    }, { passive: true });
    isi.querySelectorAll('.buka-foto').forEach(b => b.addEventListener('click', () => {
      const f = foto[+b.dataset.n];
      bukaPenampil(f.src, `${judul(e)} — ${NAMA_SUDUT[f.sudut]}`);
    }));
  }
  return 'Perpustakaan Motif';
}

/* ------------------------------------------------------------------ penampil foto layar penuh */
function bukaPenampil(src, teks) {
  $('#penampil-gambar').src = src;
  $('#penampil-gambar').alt = teks;
  $('#penampil-teks').textContent = teks;
  $('#penampil').hidden = false;
  document.body.classList.add('terkunci');
}
function tutupPenampil() {
  $('#penampil').hidden = true;
  document.body.classList.remove('terkunci');
}
$('#penampil').addEventListener('click', tutupPenampil);
document.addEventListener('keydown', ev => { if (ev.key === 'Escape') tutupPenampil(); });

/* ------------------------------------------------------------------ modul berikutnya & tentang */
function layarSegera(huruf) {
  isi.dataset.layar = 'segera';
  const info = {
    b: ['Katalog Titik Temu', 'Kartu perajin dan produknya, dengan tombol telepon/WhatsApp.'],
    c: ['Game Tebak & Susun Motif', 'Kuis foto motif dan menyusun unsur motif, dengan soal yang menyesuaikan kemampuanmu.'],
    d: ['Misi Wawancara', 'Panduan langkah demi langkah untuk mewawancarai perajin.'],
  }[huruf];
  isi.innerHTML = `
    <section class="segera">
      <span class="huruf besar">${huruf.toUpperCase()}</span>
      <h1>${info[0]}</h1>
      <p>${info[1]}</p>
      <p class="redup">Modul ini sedang dibuat dan akan muncul di pembaruan berikutnya.</p>
      <a class="tombol" href="#/motif">Buka Perpustakaan Motif</a>
    </section>`;
  return info[0];
}

function layarTentang() {
  isi.dataset.layar = 'tentang';
  isi.innerHTML = `
    <section class="teks-panjang">
      <h1>Tentang JEPARA WOODTECH</h1>
      <p>Ensiklopedia digital motif ukir Jepara. Isinya dikumpulkan dari wawancara dengan perajin di
         Desa Mulyoharjo, Jepara, untuk penelitian ISPO 2026 (bidang Komputer).</p>
      <h2>Privasi</h2>
      <ul>
        <li>Tanpa akun, tanpa iklan, tanpa pembayaran.</li>
        <li>Nama, bengkel, dan foto perajin hanya ditampilkan bila perajin mengizinkan.</li>
        <li>Aplikasi tidak mengirim data pribadimu ke mana pun.</li>
      </ul>
      <h2>Tanpa internet</h2>
      <p>Setelah dibuka sekali dengan internet, semua halaman dan foto tersimpan di HP.
         Aplikasi tetap bisa dibuka walau HP dalam mode pesawat.</p>
      <p id="info-offline" class="redup"></p>
      <p class="redup">Data diperbarui: ${aman(DATA.dibuat || '-')} · ${DATA.entri.length} motif</p>
    </section>`;
  perbaruiLencanaOffline();
}

/* ------------------------------------------------------------------ SIMPAN OFFLINE
   sw.js menyimpan halaman & data. Di sini kita pastikan SEMUA foto ikut tersimpan
   (bukan hanya foto yang sudah pernah dilihat), lalu buang foto versi lama.        */
const statusOffline = { siap: false, tersimpan: 0, total: 0, didukung: 'serviceWorker' in navigator && 'caches' in window };

/* Dijaga supaya tidak berjalan dua kali bersamaan (hitungan bisa kacau, mis. "12/6"). */
let sedangMenyimpan = null, perluUlang = false;
function simpanSemuaFoto() {
  if (sedangMenyimpan) { perluUlang = true; return sedangMenyimpan; }
  sedangMenyimpan = simpanSemuaFotoSekali().finally(() => {
    sedangMenyimpan = null;
    if (perluUlang) { perluUlang = false; simpanSemuaFoto(); }
  });
  return sedangMenyimpan;
}

async function simpanSemuaFotoSekali() {
  if (!statusOffline.didukung) { perbaruiLencanaOffline(); return; }
  const alamat = new Set();
  DATA.entri.forEach(e => Object.values(e.foto || {}).forEach(f => alamat.add(new URL(f, location.href).href)));
  statusOffline.total = alamat.size;
  statusOffline.tersimpan = 0;
  const lemari = await caches.open(LEMARI_DATA);

  for (const url of alamat) {
    if (!(await lemari.match(url))) {
      try {
        const res = await fetch(url);
        if (res.ok) await lemari.put(url, res);
        else continue;
      } catch { continue; }          // sedang tidak ada internet → coba lagi lain kali
    }
    statusOffline.tersimpan++;
    perbaruiLencanaOffline();
  }
  // Buang foto lama yang sudah tidak dipakai (mis. foto yang diganti)
  for (const req of await lemari.keys()) {
    if (req.url.includes('/foto/') && !alamat.has(req.url)) await lemari.delete(req);
  }
  statusOffline.siap = statusOffline.tersimpan === statusOffline.total && !!navigator.serviceWorker.controller;
  perbaruiLencanaOffline();
}

function perbaruiLencanaOffline() {
  const l = $('#lencana-offline');
  const s = statusOffline;
  let ikon, teks;
  if (!s.didukung) { ikon = '!'; teks = 'Browser ini tidak bisa menyimpan aplikasi untuk offline.'; }
  else if (!navigator.onLine) { ikon = '✈'; teks = 'Sedang tanpa internet — memakai simpanan di HP.'; }
  else if (s.siap) { ikon = '✓'; teks = `Siap offline: ${s.total} foto tersimpan di HP.`; }
  else { ikon = '…'; teks = `Menyimpan untuk offline: ${s.tersimpan}/${s.total} foto.`; }
  l.textContent = ikon;
  l.title = teks;
  l.dataset.keadaan = !s.didukung ? 'gagal' : !navigator.onLine ? 'luring' : s.siap ? 'siap' : 'proses';
  const info = $('#info-offline');
  if (info) info.textContent = teks;
}
$('#lencana-offline').addEventListener('click', () => {
  if (location.hash !== '#/tentang') location.hash = '#/tentang';
});
addEventListener('online', () => { perbaruiLencanaOffline(); if (DATA) simpanSemuaFoto(); });
addEventListener('offline', perbaruiLencanaOffline);

/* ------------------------------------------------------------------ mulai */
$('#tombol-kembali').addEventListener('click', kembali);
addEventListener('hashchange', () => { sudahPindahLayar = true; tampilkan(); });

async function mulai() {
  if (statusOffline.didukung) {
    try { await navigator.serviceWorker.register('sw.js'); } catch (err) { console.warn('SW gagal', err); }
  }
  try {
    DATA = await muatData();
  } catch (err) {
    isi.innerHTML = `<p class="kotak-info">Data motif belum bisa dimuat. Sambungkan ke internet
      lalu buka lagi aplikasi ini sekali, supaya tersimpan di HP.</p>`;
    console.error(err);
    return;
  }
  tampilkan();
  perbaruiLencanaOffline();
  // Tunggu service worker aktif dulu, baru simpan semua foto
  if (statusOffline.didukung) {
    navigator.serviceWorker.ready.then(simpanSemuaFoto);
    navigator.serviceWorker.addEventListener('controllerchange', simpanSemuaFoto);
  }
}
mulai();
