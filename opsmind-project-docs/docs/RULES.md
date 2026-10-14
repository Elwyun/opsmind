# Product, AI & Engineering Rules — OpsMind
Versi 0.1

## Product
1. Fokus MVP: investigasi potensi inefisiensi energi.
2. Setiap insight menjawab “apa buktinya?”.
3. Pisahkan fakta, observasi, hipotesis, rekomendasi, dan hasil terverifikasi.
4. Jangan menambah air quality, volcano monitoring, ESG, POS, ERP sebelum core journey stabil.
5. Data demo wajib berlabel `SIMULATED DATA`.
6. AI menyarankan; manusia menyetujui tindakan.

## Calculations
1. `energyIntensity = electricityKwh / productionUnits`.
2. Jika produksi <= 0 atau data tidak lengkap, jangan hitung intensity; tandai insufficient data.
3. Baseline harus memakai periode pembanding yang jelas; jangan memasukkan titik yang diuji jika membuat perbandingan bias.
4. Threshold adalah heuristik prototype, bukan standar industri.
5. `expectedKwh = productionUnits * baselineIntensity`.
6. `potentialExcessKwh = max(0, actualKwh - expectedKwh)`.
7. `estimatedAdditionalCost = potentialExcessKwh * electricityTariff`.
8. Tarif harus per kWh; simpan uang/tarif dengan Decimal jika presisi penting.
9. Jangan bandingkan periode atau perusahaan berbeda tanpa normalisasi.
10. Jika baseline terlalu sedikit, tampilkan `Insufficient baseline data`.

## AI
1. Gemini hanya menyimpulkan dari konteks backend.
2. Jangan mengarang nilai, sumber, waktu, tarif, atau status mesin.
3. Setiap hipotesis mencantumkan evidence dan missing evidence.
4. Korelasi cuaca dan listrik bukan bukti sebab-akibat.
5. Jangan mengklaim penghematan nyata tanpa pengukuran before/after yang memadai.
6. Jangan menyarankan kontrol otomatis terhadap peralatan industri.
7. Output wajib JSON terstruktur dan divalidasi server-side.
8. Jangan mengeksekusi SQL/shell/kode dari model.
9. Jika AI gagal atau output invalid, tampilkan status gagal; jangan berpura-pura sukses.
10. Confidence bersifat kualitatif kecuali sudah dikalibrasi secara ilmiah.

## Evidence
1. Simpan tanggal, unit, sumber, dan periode.
2. Data cuaca eksternal menyimpan provider dan timestamp.
3. Data sintetis tidak boleh disebut data live.
4. Hubungkan anomaly ke record sumber.
5. Simpan versi metode deteksi, prompt, dan model untuk reproducibility.

## Security
1. API key hanya di server.
2. Jangan commit `.env` atau credential.
3. Validasi semua query/body.
4. Authorization harus diperiksa di server ketika login ditambahkan.
5. Validasi tipe/ukuran file CSV.
6. Kirim hanya data minimum ke LLM.
7. Redact secret dari log.
8. Terapkan timeout/rate limit untuk endpoint AI sebelum demo publik.
9. Render output model sebagai teks aman, bukan HTML mentah.
10. Gunakan HTTPS saat deployment.

## Engineering
1. TypeScript strict.
2. Kalkulasi bisnis berada di fungsi murni dan dites.
3. Weather dan Gemini dibungkus adapter/service.
4. API error punya struktur konsisten.
5. Gunakan schema validation, misalnya Zod.
6. Jangan mengklaim test/build lulus tanpa menjalankannya.
7. Periksa perubahan kode yang dihasilkan AI sebelum merge.
8. Implementasikan satu milestone, tes, baru lanjut.

## Demo
1. Siapkan jalur offline/fallback yang diberi label demo.
2. Mock AI tidak boleh disebut live AI.
3. Fokus pada satu kasus end-to-end.
4. Sediakan reset demo.
5. Siapkan skenario AI gagal, data kurang, dan cuaca tidak tersedia.
