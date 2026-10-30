# RB-001: Koneksi branch lambat
SEMUA DATA DALAM DOKUMEN INI ADALAH SIMULASI.

Gejala: koneksi lambat, uplink congestion, bandwidth tinggi, packet loss.
1. Ambil metrics BR-SW-01 dan status interface Gi0/1.
2. Congestion merupakan kandidat bila utilisasi di atas 85% selama beberapa sampel.
3. Korelasikan packet loss dan error counter dengan log. Jangan menyimpulkan akar masalah hanya dari satu angka.
4. Telusuri topology untuk memperkirakan perangkat downstream.
5. Tinjau jadwal backup. Pada skenario ini, backup window 13:30-14:00 WIB berimpit dengan kenaikan traffic.
6. Usulkan penjadwalan ulang backup atau capacity review. Perubahan aktual harus mendapat approval.

VLAN change bukan obat otomatis untuk congestion. Jangan menyatakan masalah selesai hanya karena VLAN diubah.
Data yang diperlukan: utilizationPct, bandwidthInMbps, packetLossPct, interface.errors.
