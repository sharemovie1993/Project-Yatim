-- SQL Schema for Mustahiq Care (Project-Yatim)
-- Run this in the SQL Editor of your Supabase Studio

-- Enable UUID generation extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Master Tenants Table
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    domain_or_slug VARCHAR(100) UNIQUE NOT NULL,
    license_key VARCHAR(100) UNIQUE,
    is_active BOOLEAN DEFAULT true,
    settings JSONB DEFAULT '{}'::jsonb NOT NULL, -- Flexible tenant personalization settings (theme, branding, rules, etc.)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Mustahiq Table (Orphans, Poor, Needy)
CREATE TYPE kategori_mustahiq AS ENUM ('YATIM', 'PIATU', 'YATIM_PIATU', 'FAKIR', 'MISKIN', 'DHUAFA');
CREATE TYPE status_kelayakan AS ENUM ('AKTIF', 'TIDAK_AKTIF', 'SURVEY');

CREATE TABLE mustahiq (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    nik VARCHAR(16),
    nama_lengkap VARCHAR(255) NOT NULL,
    kategori kategori_mustahiq NOT NULL,
    jenis_kelamin VARCHAR(10),
    tanggal_lahir DATE,
    alamat_lengkap TEXT NOT NULL,
    no_telepon VARCHAR(20),
    nama_wali VARCHAR(255),
    orang_tua_asuh VARCHAR(255),
    status status_kelayakan DEFAULT 'SURVEY',
    catatan TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(tenant_id, nik) -- NIK is unique per tenant
);

-- 3. Kelompok Table (Distribution Groups)
CREATE TABLE kelompok (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    nama_kelompok VARCHAR(100) NOT NULL,
    keterangan TEXT,
    wilayah VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Anggota Kelompok Table (Junction Table)
CREATE TABLE anggota_kelompok (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    kelompok_id UUID REFERENCES kelompok(id) ON DELETE CASCADE,
    mustahiq_id UUID REFERENCES mustahiq(id) ON DELETE CASCADE,
    tanggal_bergabung TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(kelompok_id, mustahiq_id)
);

-- 5. Program Santunan Table
CREATE TYPE jenis_santunan AS ENUM ('UANG_TUNAI', 'SEMBAKO', 'PENDIDIKAN', 'LAINNYA');
CREATE TYPE status_program AS ENUM ('DRAFT', 'BERJALAN', 'SELESAI');

CREATE TABLE program_santunan (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    nama_program VARCHAR(255) NOT NULL,
    tanggal_pelaksanaan DATE NOT NULL,
    jenis jenis_santunan NOT NULL,
    total_anggaran NUMERIC(15, 2) DEFAULT 0.00,
    status status_program DEFAULT 'DRAFT',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Penyaluran Santunan Table
CREATE TYPE status_penyerahan AS ENUM ('BELUM', 'TERSALURKAN', 'BATAL');

CREATE TABLE penyaluran_santunan (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    program_id UUID REFERENCES program_santunan(id) ON DELETE CASCADE,
    mustahiq_id UUID REFERENCES mustahiq(id) ON DELETE CASCADE,
    kelompok_id UUID REFERENCES kelompok(id) ON DELETE SET NULL,
    jumlah_diterima VARCHAR(255) NOT NULL, -- e.g. "Rp 250.000" or "Beras 5kg + Minyak 2L"
    status status_penyerahan DEFAULT 'BELUM',
    tanggal_penyerahan TIMESTAMP WITH TIME ZONE,
    bukti_penyerahan_url TEXT,
    petugas_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(program_id, mustahiq_id)
);

-- Insert a default demo tenant for testing
INSERT INTO tenants (name, domain_or_slug, license_key, settings)
VALUES (
    'Madrasah Uji Coba', 
    'demo', 
    'ORK-DEMO-TEST-KEY-2026', -- Using the same test key from license server for testing convenience
    '{"theme": {"primary_color": "#059669", "accent_color": "#D97706"}, "branding": {"slogan": "Berbagi Kehangatan Bersama Yatim Dhuafa"}, "rules": {"max_mustahiq": 100, "max_age_yatim": 15}}'::jsonb
) ON CONFLICT DO NOTHING;
