-- Script de création des tables pour LyonClimb sur Supabase (PostgreSQL)

CREATE TABLE gyms (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  website TEXT,
  description TEXT,
  "openingHours" JSONB,
  pricing JSONB,
  features JSONB,
  image TEXT,
  "crowdLevel" INTEGER DEFAULT 1,
  latitude FLOAT,
  longitude FLOAT
);

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT,
  name TEXT,
  "deviceId" TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE subscriptions (
  id TEXT PRIMARY KEY,
  "userId" TEXT REFERENCES users(id) ON DELETE CASCADE,
  "gymId" TEXT REFERENCES gyms(id) ON DELETE CASCADE,
  "pushToken" TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Note: j'ai omis notifications car vide dans data.json, à ajouter si besoin au backend

CREATE TABLE "crowdUpdates" (
  id TEXT PRIMARY KEY,
  "gymId" TEXT REFERENCES gyms(id) ON DELETE CASCADE,
  "userId" TEXT REFERENCES users(id) ON DELETE CASCADE,
  "crowdLevel" INTEGER NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE "plannedVisits" (
  id TEXT PRIMARY KEY,
  "gymId" TEXT REFERENCES gyms(id) ON DELETE CASCADE,
  "userId" TEXT REFERENCES users(id) ON DELETE CASCADE,
  "arrivalTime" TEXT,
  duration INTEGER,
  "visitDate" TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);
