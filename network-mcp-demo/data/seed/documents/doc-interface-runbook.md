# RB-002: Interface down
SIMULASI. Target contoh: DC-SW-02 Gi0/2.
Bandingkan adminStatus dengan operStatus. Admin up + oper down mengarah pada kemungkinan masalah fisik atau peer.
Periksa kabel, optic/transceiver dan status peer. Pada demo tidak ada akses hardware sungguhan.
Jangan otomatis melakukan shutdown/no shutdown. Buat preview dan minta approval bila perubahan memang diperlukan.
Link topology hanya mencatat koneksi yang dimodelkan; port access ini belum memiliki peer yang dimodelkan.
