# Infrastruktur dev/test Portal Keluhan Mini

Terraform CLI langsung. Tidak menggunakan Bicep, azd, container, atau AKS.
Konfigurasi ini **belum diterapkan**, tidak mengunggah aplikasi, dan tidak
mengimpor data. Source aplikasi masih menggunakan JSON/upload lokal.

## Arsitektur

```text
Penguji -> HTTPS + Entra -> Linux App Service B1 (UI + Express API)
                              | managed identity
                              +-> StorageV2 Standard LRS
                              |     +-> Table Complaints
                              |     +-> Blob attachments (private)
                              +-> Application Insights -> Log Analytics
```

Satu instance B1 dipilih untuk hosting Node langsung dengan Always On.
Biaya compute tetap berjalan walaupun trafik kosong; menghentikan web app
tidak otomatis menghentikan biaya App Service Plan. Region, harga, kuota, dan
ketersediaan Node 24 LTS/B1 belum diperiksa terhadap subscription.

Table cukup untuk demo kecil tanpa join dan pencarian server kompleks.
Lampiran dipisahkan ke Blob. Satu akun Storage mengurangi jumlah layanan.
Endpoint Storage terbuka secara jaringan, tetapi bukan anonim: akses data
membutuhkan Entra/RBAC, HTTPS wajib, Shared Key dimatikan. Tidak ada CORS
browser ke Storage karena semua akses harus melalui API.

Log Analytics memakai retensi 30 hari dan quota ingest 1 GB/hari; Application
Insights memakai sampling 25% dan cap 1 GB/hari. Ini bukan jaminan batas biaya
keras; cap dapat menghentikan pengumpulan dan sampling SDK harus diselaraskan
pada fase integrasi. Soft delete Blob/container tujuh hari bukan backup Table.
Stack ini bukan rancangan produksi untuk data nasabah.

## File

- `versions.tf`: Terraform >= 1.7 dan AzureRM 5.12.0 yang dipin.
- `providers.tf`: subscription/tenant eksplisit, tanpa registrasi provider otomatis.
- `variables.tf`: input wajib dan gate kesiapan.
- `main.tf`: hosting, storage kosong, identity/RBAC, authentication, monitoring.
- `outputs.tf`: endpoint/ID non-secret; bukan bukti aplikasi telah berjalan.
- `terraform.tfvars.example`: placeholder; bukan nilai yang siap dipakai.
- `.terraform.lock.hcl`: checksum provider, ikut version control.
- `tests/configuration.tftest.hcl`: pengujian dengan mock AzureRM, tanpa Azure.

Resource AzureRM langsung dipilih karena lingkup kecil. Tidak ada module
eksternal, provider AzureAD, backend remote, provisioner, `local-exec`, upload
ZIP, seed entity, atau pembuatan app registration otomatis.

## Validasi lokal tanpa Azure

Dari direktori ini, jalankan:

```powershell
terraform fmt -check -recursive
terraform init -backend=false -input=false
terraform validate
terraform test
```

`init` mengunduh provider publik, bukan login Azure. Seluruh test menggunakan
`mock_provider`; perintah `plan` di dalam test adalah simulasi lokal, bukan
`terraform plan` terhadap subscription. ID, region, dan secret dalam test
adalah nilai sintetis yang tidak mengidentifikasi resource nyata.

Validasi ini tidak membuktikan availability, izin, login Entra, penyebaran
RBAC, atau keberhasilan aplikasi di Azure.

## Pengaman dan autentikasi yang belum diputuskan

`authentication_confirmed` dan `application_integration_verified` default-nya
`false`. Precondition pada resource group menolak plan/apply sampai **keduanya**
benar. Ini adalah gerbang review, bukan deteksi otomatis kondisi aplikasi.
Jangan mengubahnya hanya untuk melewati error. Gerbang ini tidak mencegah
Terraform mencoba autentikasi/refresh saat menjalankan plan nyata; karena itu
plan nyata tetap membutuhkan persetujuan terpisah.

Belum ada tenant, subscription, region, atau registrasi Entra yang dipilih.
Input berikut wajib diisi setelah disepakati:

- `subscription_id`, `tenant_id`, `location`, `name_prefix`.
- `entra_client_id`: registrasi aplikasi **single-tenant** dengan platform Web.
- `entra_client_secret`: secret login browser, bukan credential Storage.
- `allowed_tester_object_ids`: minimal satu **user object ID** penguji, bukan
  email atau group ID.

Konfigurasi Easy Auth yang disiapkan adalah opsi Web login berbasis client
secret. Pemilihan/pembuatan registrasi tetap belum dilakukan. Bila kebijakan
organisasi mewajibkan secretless federation, revisi konfigurasi ini dahulu,
bukan melemahkan autentikasi.

Registrasi harus memiliki redirect URI:

```text
https://app-<name_prefix>-<environment>.azurewebsites.net/.auth/login/aad/callback
```

Konfirmasi nama/hostname final sebelum registrasi dan provisioning. Pembatasan
user object ID diterapkan melalui default authorization policy Easy Auth;
login pengguna lain harus ditolak dalam pengujian cloud. Hanya `/health`
dikecualikan untuk probe; endpoint itu harus minim informasi. Redirect login
pada request API perlu ditangani frontend ketika sesi berakhir.

Managed identity web app memperoleh:

- Storage Table Data Contributor pada tabel Complaints.
- Storage Blob Data Contributor pada container attachments.

Identitas operator Terraform berbeda dari identity aplikasi. Pada tahap
provisioning nanti, operator perlu izin membuat resource dan role assignment,
serta izin data-plane yang diperlukan provider untuk pengelolaan Storage.
Provider registration Microsoft.Web, Microsoft.Storage,
Microsoft.OperationalInsights, dan Microsoft.Insights perlu ditinjau sebelum
provisioning; konfigurasi tidak mendaftarkannya otomatis.

## State dan secret

Local state dipilih untuk satu operator. Lindungi direktori ini dengan izin
filesystem dan enkripsi disk; jangan taruh di folder bersama/sinkronisasi yang
tidak disetujui. State dan saved plan dapat menyimpan secret dalam plaintext.
`sensitive` menyembunyikan tampilan biasa, **bukan mengenkripsi state**.
Jangan commit state, plan, tfvars nyata, atau credential. Jangan mengeluarkan
state/log debug ke chat.

Secret Entra nanti dipasok melalui mekanisme environment aman
`TF_VAR_entra_client_secret`, bukan ditulis di tfvars atau source. Ia akan
masuk app settings dan state. Key Vault belum ditambahkan karena belum ada
kebutuhan secret store terpusat yang disepakati. Remote backend terpisah
diperlukan sebelum kolaborasi/CI; bootstrap dan migrasi state harus disetujui
tersendiri, bukan memakai akun data aplikasi sebagai backend tersembunyi.

## Pekerjaan aplikasi yang sengaja belum dilakukan

Variabel app settings di Terraform adalah **kontrak integrasi mendatang**.
Kode sekarang belum membaca `STORAGE_BACKEND` maupun endpoint Table/Blob.
Menambahkan app settings tidak mengubah perilaku penyimpanan kode lama.

1. Tambahkan repository async memakai `@azure/data-tables` dan
   `@azure/identity`; ganti snapshot/callback store lokal. Gunakan
   PartitionKey ID keluhan, entity utama dan entity metadata lampiran terpisah.
   Rekonstruksi array lampiran, pertahankan bentuk respons API, urutan data,
   paging internal, dan ETag untuk mencegah lost update.
2. Tambahkan adapter `@azure/storage-blob` untuk upload/download melalui server.
   Pertahankan limit 2 MB, signature/type checks, sanitasi nama, download
   attachment, dan otorisasi. Tangani kegagalan parsial Blob/Table dengan
   kompensasi dan error eksplisit; jangan membuat fallback JSON diam-diam.
3. Pertahankan mode lokal; gunakan Azure hanya bila dipilih eksplisit.
   Terapkan bind HOST/PORT, trust proxy terbatas, origin check HTTPS yang
   benar, health/readiness, dan penanganan sesi autentikasi kedaluwarsa.
4. Pasang instrumentasi OpenTelemetry sebelum memuat Express/SDK. Gunakan
   `APPLICATIONINSIGHTS_CONNECTION_STRING`, filter data sensitif, dan
   selaraskan sampling. Terraform saja tidak menginstrumentasi Node.
5. Perbarui teks UI lokal, `.env.example`, README, dan test; data tetap sintetis.
6. Sediakan skrip impor terpisah, eksplisit, idempotent, dan tidak dijalankan
   otomatis. Azure dimulai kosong; jangan seed delapan fixture saat startup.
   Skrip harus memverifikasi ID, metadata, jumlah, dan hash lampiran,
   serta tidak menghapus data lokal. Penulisan skrip ditunda ke fase aplikasi
   sesuai batasan Terraform-saja.
7. Uji CRUD, konkurensi, persistensi setelah restart, upload/download identik,
   kegagalan dependency, pembatasan pengguna, dan telemetri yang masuk.

## Tahap berikutnya, bukan izin eksekusi

Selesaikan integrasi aplikasi dan Entra lebih dulu. Kemudian minta persetujuan
terpisah untuk login/konteks Azure dan pengecekan region/biaya/izin.
Setelah itu baru validate, plan nyata yang ditinjau, dan apply terhadap saved
plan dengan izin tersendiri. Jangan gunakan auto-approve.

Deployment paket aplikasi juga langkah tersendiri, misalnya ZIP deploy dengan
identitas Entra operator/CI dan hasil build Linux yang sesuai. Jangan kirim
node_modules Windows, `.env`, data lokal, tfvars, atau state. Pengaturan build,
publishing, dan verifikasi endpoint harus direncanakan saat tahap deployment.

## Referensi yang digunakan

- [AzureRM 5.12.0](https://registry.terraform.io/providers/hashicorp/azurerm/5.12.0/docs)
- [Linux Web App](https://github.com/hashicorp/terraform-provider-azurerm/blob/v5.12.0/website/docs/r/linux_web_app.html.markdown)
- [Storage Table](https://github.com/hashicorp/terraform-provider-azurerm/blob/v5.12.0/website/docs/r/storage_table.html.markdown)
- [Storage Container](https://github.com/hashicorp/terraform-provider-azurerm/blob/v5.12.0/website/docs/r/storage_container.html.markdown)
- [Storage Account](https://github.com/hashicorp/terraform-provider-azurerm/blob/v5.12.0/website/docs/r/storage_account.html.markdown)
- [Table design](https://learn.microsoft.com/en-us/azure/storage/tables/table-storage-design)
- [Table Entra authorization](https://learn.microsoft.com/en-us/azure/storage/tables/authorize-access-azure-active-directory)
- [Entra App Service authentication](https://learn.microsoft.com/en-us/azure/app-service/configure-authentication-provider-aad)
- [OpenTelemetry](https://learn.microsoft.com/en-us/azure/azure-monitor/app/opentelemetry-enable?tabs=nodejs)
- [Terraform mock providers](https://developer.hashicorp.com/terraform/language/tests/mocking)

Panduan Azure Prepare/Terraform dan Azure MCP digunakan untuk perencanaan.
Contoh lama tidak disalin tanpa verifikasi schema provider yang dipin.
