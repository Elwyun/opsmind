# PRD — OpsMind
Versi 0.1 · Draft prototype · 10 Oktober 2026

## 1. Ringkasan
OpsMind adalah AI Operational Intelligence yang membantu operations manager menemukan potensi inefisiensi energi. Sistem menghitung metrik dari produksi, konsumsi listrik, jam operasi, dan cuaca; lalu meminta Gemini menjelaskan temuan, menyusun hipotesis yang dapat diuji, dan merekomendasikan pemeriksaan.

## 2. Problem
Data operasi sering terpisah. Lonjakan listrik tidak selalu sebanding dengan produksi, sehingga manager harus mengumpulkan data, membandingkan periode, menghitung biaya, dan mencari kemungkinan penyebab secara manual.

## 3. Target pengguna
- Primary: Operations / Factory Manager di fasilitas manufaktur kecil-menengah.
- Secondary: pemilik bisnis, energy analyst, ESG manager.

## 4. Jobs to be done
Pengguna ingin mengetahui apakah konsumsi tidak biasa, melihat bukti dan baseline, memahami kemungkinan faktor, memperkirakan dampak biaya dengan asumsi jelas, serta mencatat tindakan dan membandingkan hasilnya.

## 5. Tujuan MVP
- Data operasional demo sekitar 30 hari.
- Energy intensity (kWh/unit) dihitung oleh kode.
- Deteksi kandidat anomali dengan metode transparan.
- Bukti yang dapat ditelusuri.
- Investigasi Gemini dengan output terstruktur dan tervalidasi.
- Pencatatan tindakan manusia.
- Perbandingan before/after bila data memadai.

## 6. Non-goals
Tidak termasuk kontrol mesin otomatis, carbon accounting tersertifikasi, pemantauan gunung berapi/air quality/wind real-time, integrasi ERP/POS/IoT, jaminan penghematan, nasihat kepatuhan hukum, atau billing multi-tenant.

## 7. Prioritas fitur
### P0 — wajib
- Dashboard KPI: listrik, produksi, energy intensity, estimasi biaya potensial.
- Dataset sintetis deterministik dengan label SIMULATED DATA.
- Detail anomaly: tanggal, aktual, baseline, threshold, deviasi, bukti.
- Investigate yang memanggil backend.
- Panel AI: observasi, hipotesis, bukti, pemeriksaan, rekomendasi, keterbatasan.
- Status tindakan Open / In progress / Completed.
- Validasi input dan error state.

### P1
- Filter tanggal, upload CSV dengan preview/validasi, cuaca API nyata, verifikasi before/after, export ringkasan.

### P2
- Air quality, wind, environmental events, estimasi emisi dengan faktor bersumber, multi-site, IoT/ERP.

## 8. User journey
1. Buka dashboard.
2. Pilih kandidat anomali.
3. Periksa data dan baseline.
4. Klik Investigate.
5. Backend menghitung metrik dan mengirim konteks minimum ke Gemini.
6. Output divalidasi dan ditampilkan bersama bukti.
7. Pengguna memilih rekomendasi dan mencatat tindakan.
8. Sistem membandingkan periode sebelum/sesudah; perubahan tidak otomatis dianggap disebabkan oleh tindakan.

## 9. Acceptance criteria
- Semua angka berasal dari data/fungsi kalkulasi, bukan karangan model.
- Setiap alert menampilkan tanggal, aktual, baseline, threshold, dan deviasi.
- Estimasi biaya menunjukkan rumus, tarif, dan asumsi.
- AI membedakan fakta dari hipotesis.
- Jika Gemini gagal atau output invalid, tampilkan error nyata; jangan berpura-pura sukses.
- Data simulasi diberi label terlihat.
- API key tidak ada di browser/repository.
- Unit tests meliputi intensity, baseline, threshold, cost impact, zero production, dan data tidak cukup.

## 10. Risiko/asumsi
Data demo sintetis. Cuaca dapat disimulasikan dahulu. Produksi, mesin, shift, dan cuaca memiliki faktor lain yang tidak dimodelkan. Baseline sederhana bukan standar industri. Periksa ketentuan resmi hackathon dan ketersediaan Gemini API sebelum final submission.

## 11. Keputusan terbuka
Pilih PostgreSQL atau MySQL; pilih provider cuaca; putuskan kebutuhan login dan upload CSV.
