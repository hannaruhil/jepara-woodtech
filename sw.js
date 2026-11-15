"use strict";
/* Service worker JEPARA WOODTECH (TypeScript) = "penjaga pintu" antara aplikasi dan internet.
   File ini DITERJEMAHKAN menjadi aplikasi/sw.js dengan perintah:  npm run build

   Setiap kali aplikasi meminta file, penjaga ini memutuskan diambil dari mana:
   1. File aplikasi (HTML, JS, CSS, ikon) → dari SIMPANAN di HP dulu (cepat & bisa offline),
      lalu diam-diam diperbarui dari internet kalau ada sinyal.
   2. data/motif.json → dari INTERNET dulu (supaya motif baru langsung muncul);
      kalau tidak ada sinyal / terlalu lama (4 detik) → pakai simpanan.
   3. Foto → dari SIMPANAN (foto tidak berubah; kalau diganti, alamatnya ikut berubah ?v=...).

   PENTING: naikkan VERSI setiap kali file aplikasi (HTML/TS/CSS) diubah.
   Data & foto TIDAK perlu naik versi — cukup jalankan build.py / terbitkan.py. */
// Di dalam service worker, "self" adalah penjaga itu sendiri (bukan jendela halaman).
const sw = self;
const VERSI = 'woodtech-v1.1';
const LEMARI_DATA = 'woodtech-data'; // data + foto (tidak dihapus saat versi naik)
const BERKAS = ['./', './index.html', './app.js', './gaya.css', './manifest.webmanifest',
    './ikon-192.png', './ikon-512.png'];
const BATAS_TUNGGU_MS = 4000;
sw.addEventListener('install', ev => {
    ev.waitUntil((async () => {
        await (await caches.open(VERSI)).addAll(BERKAS);
        // Coba simpan data sejak awal (kalau gagal tidak apa-apa; app.ts akan mencoba lagi)
        try {
            const res = await fetch('data/motif.json', { cache: 'no-cache' });
            if (res.ok)
                await (await caches.open(LEMARI_DATA)).put(new URL('data/motif.json', sw.location.href).href, res);
        }
        catch { /* offline saat pemasangan */ }
        await sw.skipWaiting();
    })());
});
sw.addEventListener('activate', ev => {
    ev.waitUntil((async () => {
        const nama = await caches.keys();
        await Promise.all(nama.filter(k => k !== VERSI && k !== LEMARI_DATA).map(k => caches.delete(k)));
        await sw.clients.claim();
    })());
});
sw.addEventListener('fetch', ev => {
    const req = ev.request;
    const url = new URL(req.url);
    if (req.method !== 'GET' || url.origin !== sw.location.origin)
        return;
    if (url.pathname.endsWith('/data/motif.json'))
        ev.respondWith(dataInternetDulu(req, url));
    else if (url.pathname.includes('/foto/'))
        ev.respondWith(fotoSimpananDulu(req));
    else
        ev.respondWith(aplikasiSimpananDulu(req, ev));
});
async function dataInternetDulu(req, url) {
    const lemari = await caches.open(LEMARI_DATA);
    const kunci = url.origin + url.pathname; // abaikan ?... supaya satu simpanan saja
    try {
        const res = await Promise.race([
            fetch(req),
            new Promise((_, gagal) => setTimeout(() => gagal(new Error('terlalu lama')), BATAS_TUNGGU_MS)),
        ]);
        if (res.ok)
            await lemari.put(kunci, res.clone());
        return res;
    }
    catch {
        return (await lemari.match(kunci)) ?? new Response('{"entri":[]}', {
            status: 503, headers: { 'Content-Type': 'application/json' }
        });
    }
}
async function fotoSimpananDulu(req) {
    const lemari = await caches.open(LEMARI_DATA);
    const simpanan = await lemari.match(req);
    if (simpanan)
        return simpanan;
    try {
        const res = await fetch(req);
        if (res.ok)
            await lemari.put(req, res.clone());
        return res;
    }
    catch {
        return Response.error();
    }
}
async function aplikasiSimpananDulu(req, ev) {
    const lemari = await caches.open(VERSI);
    const simpanan = await lemari.match(req, { ignoreSearch: true });
    const dariInternet = fetch(req).then(res => {
        if (res.ok)
            void lemari.put(req, res.clone());
        return res;
    }).catch(() => null);
    if (simpanan) {
        ev.waitUntil(dariInternet);
        return simpanan;
    }
    return (await dariInternet) ??
        (req.mode === 'navigate' ? (await lemari.match('./index.html')) ?? Response.error() : Response.error());
}
