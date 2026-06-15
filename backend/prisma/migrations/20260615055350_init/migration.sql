-- CreateTable
CREATE TABLE "tenants" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "domain_or_slug" TEXT NOT NULL,
    "license_key" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "settings" TEXT NOT NULL DEFAULT '{}',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "mustahiq" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenant_id" TEXT NOT NULL,
    "nik" TEXT,
    "nama_lengkap" TEXT NOT NULL,
    "kategori" TEXT NOT NULL,
    "jenis_kelamin" TEXT,
    "tanggal_lahir" TEXT,
    "alamat_lengkap" TEXT NOT NULL,
    "no_telepon" TEXT,
    "nama_wali" TEXT,
    "orang_tua_asuh" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SURVEY',
    "catatan" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "mustahiq_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "kelompok" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenant_id" TEXT NOT NULL,
    "nama_kelompok" TEXT NOT NULL,
    "keterangan" TEXT,
    "wilayah" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "kelompok_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "anggota_kelompok" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenant_id" TEXT NOT NULL,
    "kelompok_id" TEXT NOT NULL,
    "mustahiq_id" TEXT NOT NULL,
    "tanggal_bergabung" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "anggota_kelompok_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "anggota_kelompok_kelompok_id_fkey" FOREIGN KEY ("kelompok_id") REFERENCES "kelompok" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "anggota_kelompok_mustahiq_id_fkey" FOREIGN KEY ("mustahiq_id") REFERENCES "mustahiq" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "program_santunan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenant_id" TEXT NOT NULL,
    "nama_program" TEXT NOT NULL,
    "tanggal_pelaksanaan" TEXT NOT NULL,
    "jenis" TEXT NOT NULL,
    "total_anggaran" REAL NOT NULL DEFAULT 0.0,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "program_santunan_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "penyaluran_santunan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenant_id" TEXT NOT NULL,
    "program_id" TEXT NOT NULL,
    "mustahiq_id" TEXT NOT NULL,
    "kelompok_id" TEXT,
    "jumlah_diterima" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'BELUM',
    "tanggal_penyerahan" DATETIME,
    "bukti_penyerahan_url" TEXT,
    "petugas_id" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "penyaluran_santunan_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "penyaluran_santunan_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "program_santunan" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "penyaluran_santunan_mustahiq_id_fkey" FOREIGN KEY ("mustahiq_id") REFERENCES "mustahiq" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "penyaluran_santunan_kelompok_id_fkey" FOREIGN KEY ("kelompok_id") REFERENCES "kelompok" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "kategori" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenant_id" TEXT NOT NULL,
    "nama_kategori" TEXT NOT NULL,
    "keterangan" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_domain_or_slug_key" ON "tenants"("domain_or_slug");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_license_key_key" ON "tenants"("license_key");

-- CreateIndex
CREATE UNIQUE INDEX "mustahiq_tenant_id_nik_key" ON "mustahiq"("tenant_id", "nik");

-- CreateIndex
CREATE UNIQUE INDEX "anggota_kelompok_kelompok_id_mustahiq_id_key" ON "anggota_kelompok"("kelompok_id", "mustahiq_id");

-- CreateIndex
CREATE UNIQUE INDEX "penyaluran_santunan_program_id_mustahiq_id_key" ON "penyaluran_santunan"("program_id", "mustahiq_id");
