---
title: Bank Nusa Demo - Notulen Rapat
date: 2026-10-20
version: 1.0
audience: Tim CS, Operations, BA, dan Solution Architect
---

# Notulen tindak lanjut panduan keluhan transfer

**SINTETIS / BUKAN PRODUKSI.** Nama, rapat, penugasan, dan tanggal adalah rekaan.
Draft untuk diperiksa Lila; tidak ada pesan atau issue yang dikirim.

## 1. Info rapat

- Tanggal: 2026-10-20, 09:00-09:30 WIB / 02:00-02:30 UTC.
- Penyelenggara dan reviewer: Lila, Supervisor (tokoh rekaan).
- Tempat: ruang rapat simulasi. Penulis: Copilot, draft.
- Pembaca: Lila, Mira, Danu, Raka, Ika. Tidak ada tautan meeting.

## 2. Peserta

Lila (Supervisor), Mira (CS), Danu (Operations), Raka (BA), dan Ika (Solution
Architect). Tidak ada yang absen. Sumber: catatan teks, bukan rekaman audio.

## 3. Agenda

Lihat angka keluhan, sepakati isi panduan, bagi tugas bahan review, dan catat
hal yang belum diputuskan.

## 4. Ringkasan

Tim akan menyiapkan panduan kerja, contoh pesan, checklist tutup kasus, dan
perbandingan desain. Aturan awal tetap 15/120 menit. Rapat ini tidak menyetujui
implementasi aplikasi, biaya, atau target layanan baru.

## 5. Keputusan yang disepakati

- Lila menegaskan aturan versi 1.0 tetap dipakai agar bahan latihan konsisten.
- Draft panduan mencakup data kurang lengkap, dugaan penipuan, lewat batas
  waktu, dan pesan gagal kirim. Draft akan direview bersama.
- Sistem saat ini dipisahkan dari usulan scheduler dan outbox.
- Notulen disimpan lokal untuk review Lila, bukan dipublikasikan.

## 6. Tugas berikutnya

| ID | Tugas | PIC rekaan | Tenggat | Selesai kalau |
|---|---|---|---|---|
| A1 | Draft SOP dan diagram | Raka | 2026-10-22 | Semua cabang dan aturan 15/120 menit ada |
| A2 | Contoh pesan pelanggan | Mira | 2026-10-21 | Pesan penerimaan, permintaan data, dan hasil tersedia |
| A3 | Checklist tutup kasus | Danu | 2026-10-22 | Resolusi, bukti pesan berhasil, dan audit dicek |
| A4 | Perbandingan opsi desain | Ika | 2026-10-23 | Manual retry vs outbox, plus-minus dan uji dibahas |

Penugasan ini untuk bahan review, bukan komitmen implementasi sistem.

## 7. Catatan per topik

- Angka contoh: 9/12 respons awal tepat waktu (75%); 5/12 investigasi >120
  menit. Angka ini belum menjelaskan penyebab keterlambatan.
- Panduan: pesan gagal kirim tidak boleh membuat kasus langsung ditutup.
- Arsitektur: scheduler dan outbox belum berjalan; jangan digambar sebagai fakta.

## 8. Yang belum diputuskan

Budget, jadwal implementasi, target layanan baru, dan usulan ambang 90 menit.
Bawa ke pembahasan berikutnya; jangan menuliskannya sebagai keputusan.

## 9. Risiko atau hambatan

Usulan dapat terbaca sebagai fitur yang sudah ada. Raka dan Ika perlu
memisahkan kondisi sekarang dari rencana saat menyiapkan draft.

## 10. Pertemuan berikutnya

2026-10-26 pukul 09:00 WIB. Tujuan: memeriksa empat draft di atas.

## 11. Bahan yang dipakai

`starter/input/meeting-transcript.md` sebagai sumber utama.
Referensi rapat: `business-policy.md`, `complaints.csv`, `system-landscape.md`.
Tidak ada recording, slide, atau tiket eksternal.

## 12. Versi dan perubahan

Versi 1.0, disusun dari catatan rapat 2026-10-20. Status: draft untuk review.
Waktu penyuntingan terakhir contoh: 2026-10-20T03:00:00Z (10:00 WIB).
