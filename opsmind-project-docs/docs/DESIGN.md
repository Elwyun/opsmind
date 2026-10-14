# Design & UX — OpsMind
Versi 0.1

## Tujuan
Manager harus cepat memahami apa yang perlu diperhatikan, besarnya penyimpangan, bukti yang tersedia, dan pemeriksaan berikutnya. Produk harus terasa seperti alat kerja operasional, bukan chatbot umum.

## Brand
- Working name: OpsMind
- Descriptor: AI Operational Intelligence
- Voice: tenang, konkret, transparan.
- Gunakan istilah “Potential inefficiency”, “Possible contributing factor”, “Estimated impact”, “Needs verification”.
- Hindari “pasti boros”, “penyebab pasti”, dan “AI menghemat uang” tanpa bukti.

## Layout
### Global shell
Sidebar: Overview, Investigations, Actions, Data. Header: perusahaan demo, periode, badge `SIMULATED DATA`.

### Overview
- KPI: electricity used (kWh), production (units), energy intensity (kWh/unit), estimated potential additional cost.
- Grafik tren listrik dan produksi dengan label unit jelas.
- Investigation queue: tanggal, deviasi, severity.
- Satu bagian “What needs attention?” yang mengarah ke bukti.

### Investigation detail
- Summary anomali.
- Evidence: aktual vs baseline, intensity, deviasi, jam operasi, temperatur, sumber dan waktu.
- Hypotheses: bukti pendukung dan data yang belum tersedia.
- Recommended checks: tindakan manusia yang spesifik.
- Cost estimate: actual, expected, potential excess, tarif, rumus.
- Action controls: create / in progress / completed.
- Limitations: apa yang tidak dapat disimpulkan.

### Actions / Data
Action memuat judul, investigasi terkait, status, catatan penyelesaian. Tabel data menampilkan filter tanggal dan label sumber: Simulated, Manual upload, atau provider.

## Design tokens
Gunakan neutral background, surface bersih, primary navy/teal, amber untuk perlu diperiksa, merah hanya untuk hal mendesak, hijau untuk status selesai. Warna harus disertai label teks/icon. Angka memakai unit dan tabular numerals. Radius dan spacing konsisten.

## Copy examples
Baik: “Electricity was 36% above the selected baseline on 17 Sep.”
Baik: “Higher temperature may have contributed; cooling-system runtime is unavailable to confirm this.”
Baik: “Estimated additional cost: Rp337,500, based on 225 kWh × Rp1,500/kWh.”
Hindari: “HVAC caused the anomaly” jika belum ada bukti.

## Accessibility
Kontras memadai, label tombol jelas, loading/error states, chart punya ringkasan teks/tabel, status tidak hanya warna, tanggal/mata uang konsisten.

## Demo 3 menit
- 0:00–0:25 problem: angka terpisah menyulitkan deteksi.
- 0:25–0:50 tunjukkan produksi stabil dan listrik naik (data simulasi).
- 0:50–1:35 klik Investigate; jelaskan fakta, hipotesis, bukti, data yang hilang.
- 1:35–2:10 tunjukkan rumus estimasi biaya.
- 2:10–2:40 catat pemeriksaan/tindakan.
- 2:40–3:00 jelaskan verification dan visi produk.

## Responsive
Desktop sidebar + multi-column; tablet dua kolom; mobile satu kolom. Jangan membuat grafik sebagai satu-satunya cara membaca angka.
