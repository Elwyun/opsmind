# OpsMind — Documentation Pack

Dokumentasi v0.1 untuk prototype hackathon AI Operational Intelligence.

- `docs/PRD.md`: kebutuhan produk, scope, user journey, acceptance criteria.
- `docs/ARCHITECTURE.md`: komponen, alur data, API, deployment, failure handling.
- `docs/DESIGN.md`: layout, UX, copy rules, design tokens, demo 3 menit.
- `docs/RULES.md`: aturan produk, kalkulasi, AI, keamanan, engineering.
- `docs/SCHEMA.md`: model data dan rancangan Prisma.
- `docs/AI_PROMPTS.md`: prompt coding agent dan Gemini.
- `docs/ROADMAP.md`: milestone pembangunan.

## Product direction
OpsMind mendeteksi potensi inefisiensi energi dengan menggabungkan data produksi, listrik, jam operasi, dan konteks cuaca. Kode menghitung angka secara deterministik; Gemini menjelaskan bukti, menyusun hipotesis, dan menyarankan pemeriksaan.

**Status:** spesifikasi kerja, bukan klaim bahwa semua fitur sudah diimplementasikan. Data demo wajib diberi label simulasi. Pilih satu database provider sebelum migrasi. Jangan mengklaim penghematan nyata tanpa data before/after yang valid.

Stack yang disarankan: Next.js + TypeScript, Prisma, PostgreSQL atau MySQL, Gemini API di backend, dan Google Cloud Run. Firebase Auth dan layanan lain bersifat opsional.
