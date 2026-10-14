# Data Schema — OpsMind
Versi 0.1 · Rancangan Prisma

Pilih provider sebelum migrasi. Contoh berikut menggunakan PostgreSQL. Tinjau schema sebelum dipakai pada database penting.

## Entitas dan relasi
- Company 1—N DailyOperationalData
- Company 1—N Investigation
- Investigation 1—N ActionItem
- ActionItem 1—N Verification

## Prisma schema draft
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Company {
  id              String                 @id @default(cuid())
  name            String
  location        String?
  createdAt       DateTime               @default(now())
  updatedAt       DateTime               @updatedAt
  operationalData DailyOperationalData[]
  investigations  Investigation[]
  @@index([name])
}

model DailyOperationalData {
  id               String        @id @default(cuid())
  companyId        String
  date             DateTime      @db.Date
  productionUnits  Int
  electricityKwh   Decimal       @db.Decimal(12, 3)
  operatingHours   Decimal       @db.Decimal(6, 2)
  temperatureC     Decimal?      @db.Decimal(5, 2)
  humidityPercent  Decimal?      @db.Decimal(5, 2)
  weather          String?
  electricityPrice Decimal       @db.Decimal(12, 2)
  sourceType       DataSourceType @default(SIMULATED)
  sourceName       String?
  createdAt        DateTime      @default(now())
  updatedAt        DateTime      @updatedAt
  company          Company       @relation(fields: [companyId], references: [id], onDelete: Cascade)
  @@unique([companyId, date])
  @@index([companyId, date])
}

model Investigation {
  id                 String               @id @default(cuid())
  companyId          String
  targetDate         DateTime             @db.Date
  status             InvestigationStatus  @default(PENDING)
  severity           AnomalySeverity?
  actualIntensity    Decimal?             @db.Decimal(12, 6)
  baselineIntensity  Decimal?             @db.Decimal(12, 6)
  deviationPercent   Decimal?             @db.Decimal(8, 2)
  potentialExcessKwh Decimal?             @db.Decimal(12, 3)
  estimatedCost      Decimal?             @db.Decimal(14, 2)
  currency           String               @default("IDR")
  methodVersion      String               @default("baseline-v1")
  modelName          String?
  promptVersion      String?
  resultJson         Json?
  errorCode          String?
  createdAt          DateTime             @default(now())
  updatedAt          DateTime             @updatedAt
  company            Company              @relation(fields: [companyId], references: [id], onDelete: Cascade)
  actions            ActionItem[]
  @@index([companyId, targetDate])
  @@index([status, createdAt])
}

model ActionItem {
  id              String       @id @default(cuid())
  investigationId String
  title           String
  description     String?
  status          ActionStatus @default(OPEN)
  ownerName       String?
  completionNote  String?
  startedAt       DateTime?
  completedAt     DateTime?
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt
  investigation   Investigation @relation(fields: [investigationId], references: [id], onDelete: Cascade)
  verifications   Verification[]
  @@index([investigationId, status])
}

model Verification {
  id              String   @id @default(cuid())
  actionItemId    String
  beforeFrom      DateTime @db.Date
  beforeTo        DateTime @db.Date
  afterFrom       DateTime @db.Date
  afterTo         DateTime @db.Date
  beforeIntensity Decimal? @db.Decimal(12, 6)
  afterIntensity  Decimal? @db.Decimal(12, 6)
  changePercent   Decimal? @db.Decimal(8, 2)
  notes           String?
  createdAt       DateTime @default(now())
  actionItem      ActionItem @relation(fields: [actionItemId], references: [id], onDelete: Cascade)
  @@index([actionItemId, createdAt])
}

enum DataSourceType {
  SIMULATED
  MANUAL
  CSV_IMPORT
  WEATHER_API
  SENSOR
}
enum InvestigationStatus {
  PENDING
  RUNNING
  COMPLETED
  FAILED
  INSUFFICIENT_DATA
}
enum AnomalySeverity {
  INFO
  LOW
  MEDIUM
  HIGH
}
enum ActionStatus {
  OPEN
  IN_PROGRESS
  COMPLETED
  CANCELLED
}
```

## Catatan
- `electricityPrice` adalah tarif per kWh, bukan total tagihan.
- Suhu/kelembapan nullable karena konteks cuaca bisa tidak tersedia.
- `sourceType` membedakan data simulasi dari data nyata.
- `resultJson` harus menyimpan output yang sudah divalidasi.
- Metrik investigasi disimpan agar hasil dapat direproduksi.
- Contoh provider PostgreSQL; jika memilih MySQL, sesuaikan provider dan uji migrasi dengan versi Prisma proyek.
- Implementasi paling kecil boleh dimulai hanya dengan Company dan DailyOperationalData, lalu tambahkan model lain saat fiturnya dibangun.

## Contoh row API
```json
{
  "date": "2026-09-17",
  "productionUnits": 1020,
  "electricityKwh": "735.000",
  "operatingHours": "11.00",
  "temperatureC": "34.00",
  "humidityPercent": "78.00",
  "weather": "Hot",
  "electricityPrice": "1500.00",
  "sourceType": "SIMULATED"
}
```
