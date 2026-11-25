"use strict";
/* JEPARA WOODTECH — aplikasi utama (TypeScript)
   ==============================================
   File ini DITERJEMAHKAN menjadi aplikasi/app.js dengan perintah:  npm run build
   (Jangan ubah aplikasi/app.js langsung — perubahan akan tertimpa.)

   Fase 2: Beranda + Modul A (Perpustakaan Motif) + simpan offline.
   Modul B, C, D menyusul (Fase 3–5).

   Alur singkat:
   1. Ambil data/motif.json (dibuat oleh build.py dari CSV).
   2. Tampilkan layar sesuai alamat (#/ , #/motif , #/motif/M01 , ...).
   3. Simpan semua foto ke "lemari" HP (Cache Storage) supaya bisa dibuka tanpa internet.

   Aplikasi TIDAK punya akun, iklan, atau pembayaran, dan tidak mengirim data apa pun. */
/* ------------------------------------------------------------------ PENGATURAN PROYEK
   Semua tulisan yang "khas Jepara" dikumpulkan di sini. Sekolah/daerah lain yang meniru
   proyek ini cukup mengubah bagian ini (lihat panduan replikasi).
   JANGAN tulis nama lengkap siswa tanpa izin tertulis orang tua. */
const TIM = 'Tim Siswa SNT 14 JEPARA'; // nama tim yang tampil di web
const DAERAH = 'JEPARA'; // dipakai di sapaan beranda
const LOKASI = 'Desa Mulyoharjo, JEPARA'; // tempat wawancara perajin
const KEGIATAN = 'penelitian ISPO 2026 (bidang Komputer)';
/* ------------------------------------------------------------------ pengaturan teknis */
const ALAMAT_DATA = 'data/motif.json';
const LEMARI_DATA = 'woodtech-data'; // nama simpanan foto & data di HP (sama dengan sw.ts)
const NAMA_SUDUT = { depan: 'Depan', samping: 'Samping', detail: 'Detail' };
const URUTAN_SUDUT = ['depan', 'samping', 'detail'];
let DATA = { dibuat: '', jumlah: 0, entri: [] };
let dataSiap = false;
const saring = { cari: '', teknik: '', kayu: '' }; // pilihan pencarian di Perpustakaan
let fokusCari = false; // true = langsung fokus ke kotak cari saat Perpustakaan dibuka
let gulirPerpustakaan = 0; // posisi gulir daftar, dikembalikan saat kembali
let sudahPindahLayar = false; // untuk tombol ← (pakai riwayat browser bila ada)
/* ------------------------------------------------------------------ alat bantu */
/** Ambil satu elemen halaman. Kalau tidak ada → error jelas (bukan diam-diam rusak). */
function $(pilih) {
    const el = document.querySelector(pilih);
    if (!el)
        throw new Error('Elemen tidak ditemukan: ' + pilih);
    return el;
}
/** Sama seperti $, tetapi boleh tidak ada (hasilnya null). */
function $mungkin(pilih) {
    return document.querySelector(pilih);
}
function semua(pilih, induk = document) {
    return Array.from(induk.querySelectorAll(pilih));
}
const isi = $('#isi');
/** Cegah teks data dibaca sebagai kode HTML (keamanan). */
function aman(t) {
    const ganti = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return String(t ?? '').replace(/[&<>"']/g, c => ganti[c]);
}
/** Huruf kecil + buang tanda aksen, supaya pencarian "Jati" = "jati". */
function normal(t) {
    return String(t ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
}
function hurufBesarAwal(t) { return t.charAt(0).toUpperCase() + t.slice(1); }
/** Nama Indonesia ditampilkan hanya kalau berbeda dari nama lokal. */
function namaIndonesia(e) {
    const ind = (e.nama_indonesia || '').trim();
    if (!ind || normal(ind) === 'sama' || normal(ind) === normal(e.nama_lokal))
        return '';
    return ind;
}
function judul(e) { return e.nama_lokal || e.nama_indonesia || e.kode; }
function daftarUnik(kunci) {
    const set = new Set();
    DATA.entri.forEach(e => (e[kunci] || []).forEach(v => { if (v)
        set.add(v); }));
    return [...set].sort((a, b) => a.localeCompare(b, 'id'));
}
function jumlahPerajin() {
    const set = new Set();
    DATA.entri.forEach(e => {
        const k = normal(e.perajin?.nama || e.perajin?.bengkel);
        if (k)
            set.add(k);
    });
    return set.size;
}
function adaContoh() { return DATA.entri.some(e => e.contoh); }
const lencanaContoh = '<span class="lencana-contoh">CONTOH</span>';
/** Ikon garis dari index.html (#i-buku, #i-bintang, #i-toko, #i-mik, ...). */
const ikon = (nama) => `<svg aria-hidden="true"><use href="#i-${nama}"/></svg>`;
function fotoUtama(e) { return e.foto?.depan || e.foto?.detail || e.foto?.samping; }
function jumlahFoto() {
    return DATA.entri.reduce((n, e) => n + Object.values(e.foto || {}).filter(Boolean).length, 0);
}
/** Motif pilihan di beranda: berganti setiap hari, hanya dari motif yang punya foto. */
function motifPilihan() {
    const berfoto = DATA.entri.filter(e => fotoUtama(e));
    if (!berfoto.length)
        return undefined;
    const hari = Math.floor(Date.now() / 86400000);
    return berfoto[hari % berfoto.length];
}
/** Perajin menjawab "tidak mengetahui" → bukan kutipan makna, tetapi catatan. */
function maknaTidakDiketahui(t) {
    return /^perajin (tidak|belum) (mengetahui|tahu)/.test(normal(t));
}
function angkaAngka(kelas = '') {
    const p = jumlahPerajin();
    return `<div class="angka-angka ${kelas}">
      <div><b>${DATA.entri.length}</b><small>Motif</small></div>
      <div><b>${p}</b><small>Perajin</small></div>
      <div><b>${jumlahFoto()}</b><small>Foto</small></div>
    </div>`;
}
/** Satu kartu motif (dipakai di Perpustakaan & beranda). */
function kartuMotif(e) {
    const foto = fotoUtama(e);
    const ind = namaIndonesia(e);
    return `
      <a class="kartu-motif" href="#/motif/${encodeURIComponent(e.kode)}">
        <span class="gambar">${foto
        ? `<img src="${aman(foto)}" alt="" loading="lazy" decoding="async">`
        : '<span class="tanpa-foto">Foto belum tersedia</span>'}
          ${e.contoh ? lencanaContoh : ''}</span>
        <span class="teks">
          <span class="kode">${aman(e.kode)}</span>
          <b>${aman(judul(e))}</b>
          ${ind ? `<small>${aman(ind)}</small>` : ''}
          <span class="tag">${[...(e.teknik || []), ...(e.kayu || [])].map(t => `<i>${aman(t)}</i>`).join('')}</span>
        </span>
      </a>`;
}
/** Satu kartu kecil untuk deretan "Koleksi terbaru" (bisa digeser) di beranda. */
function kartuGeser(e) {
    const foto = fotoUtama(e);
    const info = [...(e.teknik || []).slice(0, 1), ...(e.kayu || []).slice(0, 1)].map(hurufBesarAwal).join(' · ');
    return `
      <a class="kartu kartu-geser" href="#/motif/${encodeURIComponent(e.kode)}">
        <span class="foto">${foto ? `<img src="${aman(foto)}" alt="" loading="lazy" decoding="async">` : '<span class="tanpa-foto">Foto belum tersedia</span>'}</span>
        <b>${aman(judul(e))}</b>${e.contoh ? lencanaContoh : ''}
        <small>${aman(info)}</small>
      </a>`;
}
const LANGKAH = [
    ['Wawancara', 'Bertanya langsung kepada perajin di bengkelnya.'],
    ['Foto 3 sudut', 'Depan, samping, dan detail dengan cara yang sama.'],
    ['Catat makna', 'Makna ditulis dengan kata-kata perajin sendiri.'],
    ['Periksa & terbit', 'Dicek kelengkapan dan izinnya, lalu masuk aplikasi.'],
];
/* ------------------------------------------------------------------ data */
async function muatData() {
    const res = await fetch(ALAMAT_DATA, { cache: 'no-cache' });
    if (!res.ok)
        throw new Error('Gagal memuat data (' + res.status + ')');
    const d = (await res.json());
    d.entri = (Array.isArray(d.entri) ? d.entri : [])
        .filter(e => e && typeof e.kode === 'string' && KODE_SAH.test(e.kode))
        .map(e => ({ ...e, foto: saringFoto(e.foto) }))
        .sort((a, b) => a.kode.localeCompare(b.kode));
    return d;
}
/* KEAMANAN: data hanya boleh menunjuk foto di folder foto/ milik aplikasi sendiri.
   Alamat lain (mis. "javascript:", situs luar) dibuang, walau datanya pernah salah ketik/diubah orang. */
const KODE_SAH = /^M\d{2,3}$/;
const FOTO_SAH = /^foto\/[A-Za-z0-9_-]+\.webp(\?v=[0-9a-f]{1,16})?$/;
function saringFoto(foto) {
    const hasil = {};
    for (const [sudut, src] of Object.entries(foto || {})) {
        if (typeof src === 'string' && FOTO_SAH.test(src))
            hasil[sudut] = src;
    }
    return hasil;
}
/* ------------------------------------------------------------------ pengatur layar (router)
   Alamat setelah tanda # menentukan layar:
     #/            Beranda
     #/motif       Perpustakaan Motif (daftar)
     #/motif/M01   Detail satu motif
     #/b #/c #/d   Modul yang sedang dibuat
     #/tentang     Tentang aplikasi
     #/karya       Di Balik Layar (karya tim siswa)                    */
function bagianAlamat() { return location.hash.replace(/^#\/?/, '').split('/').filter(Boolean); }
function tampilkan() {
    tutupPenampil();
    const [layar, kode] = bagianAlamat();
    if (isi.dataset.layar === 'perpustakaan')
        gulirPerpustakaan = window.scrollY;
    let judulKecil = '';
    if (!layar)
        layarBeranda();
    else if (layar === 'motif' && kode)
        judulKecil = layarDetail(decodeURIComponent(kode));
    else if (layar === 'motif') {
        layarPerpustakaan();
        judulKecil = 'Perpustakaan Motif';
    }
    else if (layar === 'b' || layar === 'c' || layar === 'd')
        judulKecil = layarSegera(layar);
    else if (layar === 'tentang') {
        layarTentang();
        judulKecil = 'Tentang aplikasi';
    }
    else if (layar === 'karya') {
        layarKarya();
        judulKecil = 'Di Balik Layar';
    }
    else {
        location.replace('#/');
        return;
    }
    $('#judul-layar').textContent = judulKecil;
    $('#tombol-kembali').hidden = !layar;
    document.title = (judulKecil ? judulKecil + ' · ' : '') + 'JEPARA WOODTECH';
    // Kembali ke Perpustakaan → posisi gulir dikembalikan; layar lain mulai dari atas
    const keGulir = isi.dataset.layar === 'perpustakaan' ? gulirPerpustakaan : 0;
    requestAnimationFrame(() => window.scrollTo(0, keGulir));
}
function kembali() {
    const [layar, kode] = bagianAlamat();
    if (sudahPindahLayar)
        history.back();
    else
        location.replace(layar === 'motif' && kode ? '#/motif' : '#/');
}
/* ------------------------------------------------------------------ BERANDA */
function layarBeranda() {
    isi.dataset.layar = 'beranda';
    const pilih = motifPilihan();
    const fotoPilih = pilih ? fotoUtama(pilih) : undefined;
    const terbaru = DATA.entri.slice().reverse().slice(0, 6);
    const p = jumlahPerajin();
    const gembok = `<span class="gembok">${ikon('gembok')}Desember</span>`;
    // Ringkasan pendek untuk "Motif hari ini": awal makna dari perajin, atau nama Indonesia
    const ringkas = (e) => {
        const m = e.makna_cerita;
        if (m && !maknaTidakDiketahui(m))
            return m.length > 110 ? m.slice(0, 107).trimEnd() + '…' : m;
        return namaIndonesia(e);
    };
    const meta = (e) => [e.kode, ...(e.teknik || []).slice(0, 1), ...(e.kayu || []).slice(0, 1)].map(hurufBesarAwal).join(' · ');
    isi.innerHTML = `
    <section class="sambut">
      <h1>Kenali motif ukir <span>${aman(DAERAH)}</span> langsung dari perajinnya</h1>
      <p>Foto, makna, dan cerita setiap motif dari bengkel di ${aman(LOKASI)}.</p>
      <a class="cari-pintas" href="#/motif" id="cari-pintas">${ikon('cari')}Cari motif, kayu, atau teknik…</a>
    </section>

    ${adaContoh() ? `<p class="kotak-info">Data yang tampil sekarang masih <b>CONTOH</b>, bukan data asli dari perajin.</p>` : ''}

    ${pilih ? `
    <section>
      <h2 class="judul-bagian">Motif hari ini</h2>
      <a class="kartu pilihan" href="#/motif/${encodeURIComponent(pilih.kode)}">
        <span class="bingkai">${fotoPilih
        ? `<img src="${aman(fotoPilih)}" alt="" decoding="async" fetchpriority="high">`
        : '<span class="tanpa-foto">Foto belum tersedia</span>'}</span>
        <span class="teks">
          <span class="meta">${aman(meta(pilih))}</span>
          <b>${aman(judul(pilih))} ${pilih.contoh ? lencanaContoh : ''}</b>
          ${ringkas(pilih) ? `<span class="ringkas">${aman(ringkas(pilih))}</span>` : ''}
          <span class="lanjut">Lihat motif ›</span>
        </span>
      </a>
    </section>` : ''}

    <section>
      <h2 class="judul-bagian">Jelajahi</h2>
      <nav class="menu" aria-label="Menu utama">
        <a class="kartu" href="#/motif"><span class="ikon-bulat">${ikon('buku')}</span><b>Perpustakaan Motif</b><small>${DATA.entri.length} motif tersimpan</small></a>
        <a class="kartu dikunci" href="#/c">${gembok}<span class="ikon-bulat">${ikon('bintang')}</span><b>Game Tebak Motif</b><small>Tebak dan susun motif</small></a>
        <a class="kartu dikunci" href="#/b">${gembok}<span class="ikon-bulat">${ikon('toko')}</span><b>Katalog Perajin</b><small>${p ? p + ' perajin' : 'Kenali perajin & karyanya'}</small></a>
        <a class="kartu dikunci" href="#/d">${gembok}<span class="ikon-bulat">${ikon('mik')}</span><b>Misi Wawancara</b><small>Bertanya ke perajin</small></a>
      </nav>
    </section>

    ${terbaru.length ? `
    <section>
      <h2 class="judul-bagian">Koleksi terbaru <a href="#/motif">Lihat semua ›</a></h2>
      <div class="geser-koleksi">${terbaru.map(kartuGeser).join('')}</div>
    </section>` : ''}

    <section class="kotak-tentang">
      <h2>Di balik ensiklopedia ini</h2>
      <p>Setiap motif didokumentasikan langsung di bengkel: perajin diwawancarai, ukiran difoto dari tiga sudut,
         dan maknanya ditulis sesuai penuturan perajin.</p>
      <a href="#/karya">Cara kami mencatat motif ›</a>
    </section>

    <footer class="kaki">
      Karya <b>${aman(TIM)}</b><br>bersama para perajin ukir ${aman(LOKASI)}<br>
      <a href="#/karya">Di balik layar</a> · <a href="#/tentang">Tentang</a> · data ${aman(DATA.dibuat || '-')}<br>
      <span class="en" lang="en">Digital Encyclopedia of ${aman(DAERAH)} Wood Carving Motifs</span>
    </footer>`;
    // Ketuk kotak cari di beranda → buka Perpustakaan dengan kotak cari siap diketik
    $mungkin('#cari-pintas')?.addEventListener('click', () => { fokusCari = true; });
}
/* ------------------------------------------------------------------ MODUL A: PERPUSTAKAAN */
function layarPerpustakaan() {
    isi.dataset.layar = 'perpustakaan';
    const chip = (grup, nilai, label) => `<button type="button" class="chip" data-grup="${grup}" data-nilai="${aman(nilai)}"
       aria-pressed="${saring[grup] === nilai}">${aman(label)}</button>`;
    const grupChip = (grup, judulGrup, nilai) => nilai.length ? `
      <div class="grup-chip" role="group" aria-label="${judulGrup}">
        <span class="label-grup">${judulGrup}</span>
        <div class="chips">${chip(grup, '', 'Semua')}${nilai.map(v => chip(grup, v, hurufBesarAwal(v))).join('')}</div>
      </div>` : '';
    isi.innerHTML = `
    <header class="kepala-layar">
      <h1>Perpustakaan Motif</h1>
      <p>Koleksi motif ukir hasil dokumentasi tim siswa bersama perajin ${LOKASI}.</p>
    </header>
    <div class="kotak-cari">
      ${ikon('cari')}
      <input type="search" id="cari" placeholder="Cari nama motif, ciri, makna…"
             value="${aman(saring.cari)}" autocomplete="off" enterkeyhint="search" aria-label="Cari motif">
    </div>
    ${grupChip('teknik', 'Teknik', daftarUnik('teknik'))}
    ${grupChip('kayu', 'Kayu', daftarUnik('kayu'))}
    <p class="hasil-jumlah" id="hasil-jumlah" aria-live="polite"></p>
    <div class="kisi-motif" id="kisi-motif"></div>`;
    $('#cari').addEventListener('input', ev => {
        saring.cari = ev.target.value;
        isiDaftar();
    });
    semua('.chip', isi).forEach(b => b.addEventListener('click', () => {
        const grup = b.dataset.grup;
        saring[grup] = b.dataset.nilai ?? '';
        semua(`.chip[data-grup="${grup}"]`, isi)
            .forEach(x => x.setAttribute('aria-pressed', String(x === b)));
        isiDaftar();
    }));
    isiDaftar();
    if (fokusCari) {
        fokusCari = false;
        $('#cari').focus();
    }
}
/** Apakah entri cocok dengan pencarian + filter? Semua kata yang diketik harus ditemukan. */
function cocok(e) {
    if (saring.teknik && !(e.teknik || []).includes(saring.teknik))
        return false;
    if (saring.kayu && !(e.kayu || []).includes(saring.kayu))
        return false;
    const kata = normal(saring.cari).split(/\s+/).filter(Boolean);
    if (!kata.length)
        return true;
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
    $mungkin('#hapus-saring')?.addEventListener('click', () => {
        saring.cari = saring.teknik = saring.kayu = '';
        layarPerpustakaan();
    });
    $('#kisi-motif').innerHTML = hasil.length ? hasil.map(kartuMotif).join('') : `<p class="kosong">Tidak ada motif yang cocok.<br>Coba kata lain atau hapus filter.</p>`;
}
function layarDetail(kode) {
    isi.dataset.layar = 'detail';
    const i = DATA.entri.findIndex(e => e.kode === kode);
    if (i < 0) {
        isi.innerHTML = `<p class="kosong">Motif <b>${aman(kode)}</b> tidak ditemukan.</p>
      <p class="tengah"><a class="tombol" href="#/motif">Ke Perpustakaan Motif</a></p>`;
        return 'Perpustakaan Motif';
    }
    const e = DATA.entri[i];
    const sebelum = DATA.entri[i - 1];
    const sesudah = DATA.entri[i + 1];
    const foto = URUTAN_SUDUT
        .filter(s => e.foto?.[s])
        .map(s => ({ sudut: s, src: e.foto[s] }));
    const ind = namaIndonesia(e);
    const p = e.perajin || {};
    const bagian = (judulBagian, html) => `<section class="bagian"><h2>${judulBagian}</h2>${html}</section>`;
    const redup = (t) => `<p class="redup">${t}</p>`;
    const chipLink = (grup, nilai) => `<a class="chip kecil" href="#/motif" data-grup="${grup}" data-nilai="${aman(nilai)}">${aman(hurufBesarAwal(nilai))}</a>`;
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
        ${foto.length > 1 ? `<div class="titik" id="titik">${foto.map((f, n) => `<button type="button" data-n="${n}" aria-label="Foto ${NAMA_SUDUT[f.sudut]}" aria-current="${n === 0}">${NAMA_SUDUT[f.sudut]}</button>`).join('')}</div>` : ''}`
        : '<div class="tanpa-foto besar">Foto belum tersedia</div>'}
    </div>

    <header class="judul-motif">
      <p class="label-kecil">Motif ${aman(e.kode)}</p>
      <h1>${aman(judul(e))}</h1>
      ${ind ? `<p>${aman(ind)}</p>` : ''}
    </header>

    ${e.makna_cerita && !maknaTidakDiketahui(e.makna_cerita) ? `
      <figure class="kutipan">
        ${ikon('kutip')}
        <p class="label-kecil">Makna & cerita</p>
        <blockquote>${aman(e.makna_cerita)}</blockquote>
        <figcaption>— dituturkan oleh ${p.nama ? aman(p.nama) : 'perajin'}${p.bengkel ? `, ${aman(p.bengkel)}` : ''}</figcaption>
      </figure>` : `
      <figure class="kutipan kosong-makna">
        <p class="label-kecil">Makna & cerita</p>
        <blockquote>${e.makna_cerita
        ? 'Perajin yang diwawancarai belum mengetahui makna motif ini. Kalau kamu tahu ceritanya, tanyakan ke perajin lain!'
        : 'Belum ada cerita yang tercatat dari perajin.'}</blockquote>
      </figure>`}

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

    <aside class="jejak">
      ${ikon('mik')}
      <div>
        <p class="label-kecil">Karya Tim Siswa</p>
        <p>Didokumentasikan oleh <b>${aman(TIM)}</b> melalui wawancara langsung${p.nama
        ? ` bersama <b>${aman(p.nama)}</b>` : ' bersama perajin'} di ${LOKASI}.</p>
        <a href="#/karya">Bagaimana motif ini dicatat? ›</a>
      </div>
    </aside>

    ${e.lisensi && foto.length ? `<p class="lisensi"><b>Lisensi foto: ${aman(e.lisensi)}.</b> ${e.lisensi === 'CC BY-NC 4.0'
        ? 'Boleh dibagikan untuk tujuan non-komersial dengan menyebut nama perajin.'
        : 'Hanya untuk aplikasi ini. Jangan disalin atau dipakai ulang tanpa izin perajin.'}</p>` : ''}

    <nav class="sebelum-sesudah" aria-label="Motif lain">
      ${sebelum ? `<a href="#/motif/${encodeURIComponent(sebelum.kode)}">‹ ${aman(judul(sebelum))}</a>` : '<span></span>'}
      ${sesudah ? `<a href="#/motif/${encodeURIComponent(sesudah.kode)}" class="kanan">${aman(judul(sesudah))} ›</a>` : '<span></span>'}
    </nav>`;
    // Ketuk chip teknik/kayu → buka Perpustakaan yang sudah tersaring
    semua('a.chip[data-grup]', isi).forEach(a => a.addEventListener('click', () => {
        saring.cari = '';
        saring.teknik = '';
        saring.kayu = '';
        saring[a.dataset.grup] = a.dataset.nilai ?? '';
        gulirPerpustakaan = 0;
    }));
    // Galeri: geser foto, tombol penanda, ketuk untuk perbesar
    const geser = $mungkin('#geser');
    if (geser) {
        const titik = semua('#titik button', isi);
        titik.forEach(b => b.addEventListener('click', () => geser.scrollTo({ left: geser.clientWidth * Number(b.dataset.n), behavior: 'smooth' })));
        geser.addEventListener('scroll', () => {
            const n = Math.round(geser.scrollLeft / geser.clientWidth);
            titik.forEach(b => b.setAttribute('aria-current', String(Number(b.dataset.n) === n)));
        }, { passive: true });
        semua('.buka-foto', isi).forEach(b => b.addEventListener('click', () => {
            const f = foto[Number(b.dataset.n)];
            bukaPenampil(f.src, `${judul(e)} — ${NAMA_SUDUT[f.sudut]}`);
        }));
    }
    return 'Perpustakaan Motif';
}
/* ------------------------------------------------------------------ penampil foto layar penuh */
function bukaPenampil(src, teks) {
    const gambar = $('#penampil-gambar');
    gambar.src = src;
    gambar.alt = teks;
    $('#penampil-teks').textContent = teks;
    $('#penampil').hidden = false;
    document.body.classList.add('terkunci');
}
function tutupPenampil() {
    $('#penampil').hidden = true;
    document.body.classList.remove('terkunci');
}
$('#penampil').addEventListener('click', tutupPenampil);
document.addEventListener('keydown', ev => { if (ev.key === 'Escape')
    tutupPenampil(); });
/* ------------------------------------------------------------------ modul berikutnya & tentang */
function layarSegera(huruf) {
    isi.dataset.layar = 'segera';
    const daftar = {
        b: ['toko', 'Katalog Titik Temu', 'Kartu perajin dan produknya, dengan tombol telepon/WhatsApp.'],
        c: ['bintang', 'Game Tebak & Susun Motif', 'Kuis foto motif dan menyusun unsur motif, dengan soal yang menyesuaikan kemampuanmu.'],
        d: ['mik', 'Misi Wawancara', 'Panduan langkah demi langkah untuk mewawancarai perajin.'],
    };
    const [namaIkon, namaModul, keterangan] = daftar[huruf];
    isi.innerHTML = `
    <section class="segera">
      <span class="ikon-besar">${ikon(namaIkon)}</span>
      <h1>${namaModul}</h1>
      <p>${keterangan}</p>
      <p class="redup">Modul ini sedang dibuat dan akan muncul di pembaruan berikutnya.</p>
      <a class="tombol" href="#/motif">Buka Perpustakaan Motif</a>
    </section>`;
    return namaModul;
}
function layarTentang() {
    isi.dataset.layar = 'tentang';
    isi.innerHTML = `
    <section class="teks-panjang">
      <h1>Tentang JEPARA WOODTECH</h1>
      <p>Ensiklopedia digital motif ukir JEPARA. Isinya dikumpulkan dari wawancara dengan perajin di
         ${LOKASI}, untuk ${KEGIATAN}.</p>
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
      <h2 lang="en">In English</h2>
      <p class="en-ringkas" lang="en">JEPARA WOODTECH is a digital encyclopedia of JEPARA wood carving motifs,
         built by junior high school students for ISPO 2026. Students interviewed carvers in ${LOKASI},
         photographed each motif from three angles, and recorded its meaning in the carvers' own words.
         The app works offline, needs no account, and shows no ads. Content is in Indonesian.</p>
      <p class="redup">Huruf: Plus Jakarta Sans, karya Tokotype (Indonesia), lisensi SIL Open Font License.</p>
    </section>`;
    perbaruiLencanaOffline();
}
/* ------------------------------------------------------------------ DI BALIK LAYAR (karya tim siswa) */
function layarKarya() {
    isi.dataset.layar = 'karya';
    const kayu = daftarUnik('kayu').length, teknik = daftarUnik('teknik').length;
    isi.innerHTML = `
    <section class="teks-panjang">
      <h1>Di Balik Layar</h1>
      <p class="pembuka">Ensiklopedia ini bukan disalin dari internet. Setiap motif dikumpulkan sendiri oleh
         siswa SMP yang datang ke bengkel perajin di ${LOKASI}.</p>
      ${angkaAngka()}
      <p class="redup">${kayu} jenis kayu · ${teknik} teknik ukir tercatat${adaContoh() ? ' · masih data CONTOH' : ''}</p>

      <h2>Empat langkah mencatat satu motif</h2>
      <ol class="langkah panjang">
        ${LANGKAH.map(([j, k], n) => `<li><span class="no">${n + 1}</span><span><b>${j}</b>${k}</span></li>`).join('')}
      </ol>

      <h2>Janji kami kepada perajin</h2>
      <ul>
        <li>Wawancara dan foto hanya dilakukan <b>setelah perajin mengizinkan</b>.</li>
        <li>Makna motif ditulis <b>dengan kata-kata perajin</b>, tidak dikarang atau diubah.</li>
        <li>Nama, bengkel, dan foto perajin hanya tampil kalau perajin setuju.</li>
        <li>Hal yang perajin minta dirahasiakan tidak pernah dimasukkan ke aplikasi.</li>
      </ul>

      <h2>Kualitas data</h2>
      <p>Setiap entri diperiksa dengan <b>10 bidang wajib</b> (nama, ciri, teknik, kayu, makna, perajin, foto,
         izin, dan lainnya). Motif baru diterbitkan setelah lengkap dan izinnya jelas.</p>

      <h2>Tim</h2>
      <p>${TIM}. Bagian dari ${KEGIATAN}, bersama para perajin ${LOKASI}.
         Terima kasih kepada semua perajin yang telah berbagi cerita.</p>
      <p class="tengah"><a class="tombol" href="#/motif">Lihat koleksi motif</a></p>
    </section>`;
}
/* ------------------------------------------------------------------ SIMPAN OFFLINE
   sw.ts menyimpan halaman & data. Di sini kita pastikan SEMUA foto ikut tersimpan
   (bukan hanya foto yang sudah pernah dilihat), lalu buang foto versi lama.        */
const statusOffline = {
    siap: false, tersimpan: 0, total: 0,
    didukung: 'serviceWorker' in navigator && 'caches' in window,
};
/* Dijaga supaya tidak berjalan dua kali bersamaan (hitungan bisa kacau, mis. "12/6"). */
let sedangMenyimpan = null;
let perluUlang = false;
function simpanSemuaFoto() {
    if (sedangMenyimpan) {
        perluUlang = true;
        return sedangMenyimpan;
    }
    sedangMenyimpan = simpanSemuaFotoSekali().finally(() => {
        sedangMenyimpan = null;
        if (perluUlang) {
            perluUlang = false;
            void simpanSemuaFoto();
        }
    });
    return sedangMenyimpan;
}
async function simpanSemuaFotoSekali() {
    if (!statusOffline.didukung) {
        perbaruiLencanaOffline();
        return;
    }
    const alamat = new Set();
    DATA.entri.forEach(e => Object.values(e.foto || {}).forEach(f => {
        if (f)
            alamat.add(new URL(f, location.href).href);
    }));
    statusOffline.total = alamat.size;
    statusOffline.tersimpan = 0;
    const lemari = await caches.open(LEMARI_DATA);
    for (const url of alamat) {
        if (!(await lemari.match(url))) {
            try {
                const res = await fetch(url);
                if (!res.ok)
                    continue;
                await lemari.put(url, res);
            }
            catch {
                continue; // sedang tidak ada internet → coba lagi lain kali
            }
        }
        statusOffline.tersimpan++;
        perbaruiLencanaOffline();
    }
    // Buang foto lama yang sudah tidak dipakai (mis. foto yang diganti)
    for (const req of await lemari.keys()) {
        if (req.url.includes('/foto/') && !alamat.has(req.url))
            await lemari.delete(req);
    }
    statusOffline.siap = statusOffline.tersimpan === statusOffline.total && !!navigator.serviceWorker.controller;
    perbaruiLencanaOffline();
}
function perbaruiLencanaOffline() {
    const l = $('#lencana-offline');
    const s = statusOffline;
    let ikon, teks, keadaan;
    if (!s.didukung) {
        ikon = '!';
        keadaan = 'gagal';
        teks = 'Browser ini tidak bisa menyimpan aplikasi untuk offline.';
    }
    else if (!navigator.onLine) {
        ikon = '✈';
        keadaan = 'luring';
        teks = 'Sedang tanpa internet — memakai simpanan di HP.';
    }
    else if (s.siap) {
        ikon = '✓';
        keadaan = 'siap';
        teks = `Siap offline: ${s.total} foto tersimpan di HP.`;
    }
    else {
        ikon = '…';
        keadaan = 'proses';
        teks = `Menyimpan untuk offline: ${s.tersimpan}/${s.total} foto.`;
    }
    l.textContent = ikon;
    l.title = teks;
    l.dataset.keadaan = keadaan;
    const info = $mungkin('#info-offline');
    if (info)
        info.textContent = teks;
}
$('#lencana-offline').addEventListener('click', () => {
    if (location.hash !== '#/tentang')
        location.hash = '#/tentang';
});
addEventListener('online', () => { perbaruiLencanaOffline(); if (dataSiap)
    void simpanSemuaFoto(); });
addEventListener('offline', perbaruiLencanaOffline);
/* ------------------------------------------------------------------ mulai */
$('#tombol-kembali').addEventListener('click', kembali);
// Garis tipis di bawah kepala hanya saat halaman sudah digulir (supaya bersih di atas)
addEventListener('scroll', () => $('#kepala').classList.toggle('bergaris', window.scrollY > 4), { passive: true });
addEventListener('hashchange', () => { sudahPindahLayar = true; tampilkan(); });
/* ------------------------------------------------------------------ GERBANG PEMBUKA
   Pintu gebyok di index.html (#gerbang). Tampil setiap kali aplikasi dibuka dari beranda.
   Kalau yang dibuka tautan langsung (mis. #/motif/M01 dari teman), gerbang dilewati. */
const PUTAR_KUNCI_MS = 550; // lama animasi kunci diputar (gaya.css: g-putar-kunci)
const LAMA_BUKA_MS = 1600; // lama pintu terbuka + memudar (gaya.css)
/** Samakan lebar tulisan "JEPARA" dengan "Woodtech" supaya judul seimbang. */
function samakanLebarJudul() {
    const j1 = $mungkin('#g-j1'), j2 = $mungkin('#g-j2');
    if (!j1 || !j2)
        return;
    j1.style.fontSize = '';
    const ukuran = parseFloat(getComputedStyle(j1).fontSize);
    const w1 = j1.getBoundingClientRect().width, w2 = j2.getBoundingClientRect().width;
    if (w1 && w2)
        j1.style.fontSize = `${ukuran * w2 / w1}px`;
}
function siapkanGerbang() {
    const gerbang = $mungkin('#gerbang');
    if (!gerbang)
        return;
    const kepala = $('#kepala');
    const tutup = () => {
        gerbang.remove();
        kepala.inert = false;
        isi.inert = false;
        document.body.classList.remove('terkunci');
        removeEventListener('resize', samakanLebarJudul);
    };
    if (bagianAlamat().length) {
        tutup();
        return;
    } // tautan langsung → tanpa gerbang
    kepala.inert = true; // selama gerbang tampil, isi di belakangnya tidak bisa disentuh/difokus
    isi.inert = true;
    document.body.classList.add('terkunci');
    samakanLebarJudul();
    void document.fonts?.ready.then(samakanLebarJudul);
    addEventListener('resize', samakanLebarJudul);
    let sudahDibuka = false;
    const buka = () => {
        if (sudahDibuka)
            return;
        sudahDibuka = true;
        const pelan = matchMedia('(prefers-reduced-motion: reduce)').matches;
        const jedaKunci = pelan ? 0 : PUTAR_KUNCI_MS;
        gerbang.classList.add('putar'); // 1) kunci diputar
        setTimeout(() => gerbang.classList.add('buka'), jedaKunci); // 2) pintu terbuka
        setTimeout(() => { tutup(); isi.focus({ preventScroll: true }); }, // 3) masuk beranda
        jedaKunci + (pelan ? 350 : LAMA_BUKA_MS));
    };
    $('#g-buka').addEventListener('click', buka);
    $('#g-pintu').addEventListener('click', buka);
}
siapkanGerbang();
async function mulai() {
    if (statusOffline.didukung) {
        try {
            await navigator.serviceWorker.register('sw.js');
        }
        catch (err) {
            console.warn('SW gagal', err);
        }
    }
    try {
        DATA = await muatData();
        dataSiap = true;
    }
    catch (err) {
        isi.innerHTML = `<p class="kotak-info">Data motif belum bisa dimuat. Sambungkan ke internet
      lalu buka lagi aplikasi ini sekali, supaya tersimpan di HP.</p>`;
        console.error(err);
        return;
    }
    tampilkan();
    perbaruiLencanaOffline();
    // Tunggu service worker aktif dulu, baru simpan semua foto
    if (statusOffline.didukung) {
        void navigator.serviceWorker.ready.then(simpanSemuaFoto);
        navigator.serviceWorker.addEventListener('controllerchange', () => void simpanSemuaFoto());
    }
}
void mulai();
