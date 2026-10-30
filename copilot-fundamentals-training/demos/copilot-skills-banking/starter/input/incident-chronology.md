# Kronologi gangguan - portal keluhan lambat

**SINTETIS / BUKAN PRODUKSI.** Bank, kejadian, bukti, dan semua nama adalah rekaan.
Ini latihan menulis laporan gangguan, bukan petunjuk operasi sistem bank nyata.
Data kejadian ini terpisah dari 12 kasus pada complaints.csv.

## Ringkasan kejadian

- ID: DEMO-INC-001.
- Judul: Portal keluhan transfer lambat setelah perubahan interval polling.
- Tanggal: 2026-10-21; zona waktu WIB (UTC+07:00).
- Tingkat: P2 khusus simulasi, bukan klasifikasi bank nyata.
- Koordinator insiden: Bima, Lead Operations (tokoh rekaan).
- On-call: Nara, Reliability Engineer (tokoh rekaan).
- Komponen: Portal & CS Workspace, API Gateway, Complaint Service.
- Dampak: beberapa tampilan status keluhan timeout atau lambat dimuat.
- Status akhir: pulih; dikonfirmasi stabil pukul 09:45 WIB.
- Bukan gangguan pemindahan uang. Simulator tidak menyediakan operasi uang.
- Tidak ada data hilang/korup dalam pemeriksaan fixture; jangan mengklaim hasil
  ini membuktikan keamanan atau integritas sistem bank nyata.
- Target SLO layanan, penalti, dan dampak finansial tidak diberikan: TBD.

## Bukti contoh dan urutan kejadian

| WIB | UTC | Kejadian | Bukti rekaan |
|---|---|---|---|
| 08:55 | 01:55 | Interval polling status portal diubah dari 10 detik ke 1 detik. | EVT-01, catatan perubahan konfigurasi |
| 09:00 | 02:00 | Gejala pertama: sebagian permintaan status mulai timeout. | EVT-02, log simulator |
| 09:05 | 02:05 | Alert error rate berbunyi; Nara mulai memeriksa. | EVT-03, alert latihan |
| 09:10 | 02:10 | Bima menyatakan insiden P2 simulasi dan membuka koordinasi. | EVT-04, catatan koordinasi |
| 09:15 | 02:15 | Terlihat antrean request naik dan pool koneksi penuh. Interval polling menjadi dugaan awal, belum kesimpulan final. | EVT-05, snapshot antrean dan koneksi |
| 09:20 | 02:20 | Dalam simulasi, interval polling dikembalikan ke 10 detik. | EVT-06, catatan mitigasi |
| 09:35 | 02:35 | Error rate kembali normal; pemantauan stabilitas dilanjutkan. | EVT-07, metrik latihan |
| 09:45 | 02:45 | Pemeriksaan lanjutan stabil; Bima mengonfirmasi layanan pulih. | EVT-08, konfirmasi pemulihan |
| 09:50 | 02:50 | Pemberitahuan pemulihan dicatat pada kanal komunikasi dummy. Tidak ada pesan nyata terkirim. | EVT-09, catatan komunikasi |
| 10:30 | 03:30 | Review log fixture mengonfirmasi hubungan polling cepat, antrean, dan timeout. Gap checklist dan uji beban juga dikonfirmasi. | EVT-10, hasil review rekaan |

Label EVT adalah referensi dalam cerita ini, bukan URL atau log produksi.
Jangan mengarang detail teknis tambahan seolah ada file log lain.

## Angka yang diberikan

- Jendela dampak: 09:00 sampai 09:45 WIB, yaitu 45 menit.
- Dari deteksi alert sampai pulih: 09:05 sampai 09:45, yaitu 40 menit.
- Waktu dari gejala pertama ke alert: 5 menit.
- Sampel selama jendela dampak: 2.400 request status, 120 timeout.
- Persentase timeout sampel: 120 / 2.400 x 100% = 5%.
- Puncak error rate per menit: 20%; kondisi normal contoh: <1%.
  Puncak per menit berbeda dari persentase seluruh jendela.
- Ada 18 pengguna sintetis unik terdampak; itu bukan 120 pengguna.

Jangan memakai 5/12 dari complaints.csv untuk menghitung gangguan ini.
Jangan menyebut 40 menit sebagai seluruh durasi dampak.

## Penyebab yang sudah dikonfirmasi dalam cerita

Review EVT-10 menyatakan polling 1 detik menaikkan request status berulang.
Endpoint belum membatasi polling per kasus; antrean dan pool koneksi
menjadi penuh, sehingga sebagian request timeout.

Gap proses yang terkonfirmasi: checklist perubahan belum memeriksa dampak
interval polling, dan skenario uji beban belum mencakup polling agresif.
Ini bukan kesalahan orang tertentu. Jangan menambah klaim kebocoran data,
uang hilang, atau error vendor yang tidak ada pada bahan.

## Tindak lanjut yang sudah disepakati (semua untuk latihan)

| Aksi | PIC rekaan | Tenggat | Bukti selesai |
|---|---|---|---|
| Tambahkan batas interval polling dan uji penolakannya pada desain simulasi. | Ika | 2026-10-23 | Desain dan uji batas tersedia untuk review. |
| Tambahkan skenario polling 1 detik ke rencana uji beban. | Sinta, QA | 2026-10-26 | Kasus uji dan hasil simulasi dicatat. |
| Tambahkan pemantauan panjang antrean dan koneksi aktif ke runbook contoh. | Nara | 2026-10-23 | Runbook menyebut metrik, langkah cek, dan kondisi eskalasi. |
| Perbarui checklist perubahan konfigurasi dan langkah pemulihan. | Bima | 2026-10-22 | Checklist mencakup dampak polling dan bukti layanan stabil. |

Reviewer laporan: Bima. Simpan draft lokal; jangan membuka incident, issue,
mengubah konfigurasi, melakukan rollback, atau mengirim komunikasi sungguhan.
