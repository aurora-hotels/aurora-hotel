import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { config } from './config.js';

if (config.databasePath !== ':memory:')
  mkdirSync(path.dirname(config.databasePath), { recursive: true });
export const db = new DatabaseSync(config.databasePath);
db.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 1500;');
export function get<T = Record<string, any>>(
  sql: string,
  ...params: SQLInputValue[]
): T | undefined {
  return db.prepare(sql).get(...params) as T | undefined;
}
export function all<T = Record<string, any>>(sql: string, ...params: SQLInputValue[]): T[] {
  return db.prepare(sql).all(...params) as T[];
}
export function run(sql: string, ...params: SQLInputValue[]) {
  return db.prepare(sql).run(...params);
}

// Blokada zapisu musi powstać PRZED sprawdzeniem wolnego pokoju.
// Funkcja jest synchroniczna: nie wolno przekazywać tu callbacku async.
export function transaction<T>(fn: () => T): T {
  db.exec('BEGIN IMMEDIATE');
  try {
    const value = fn();
    if (value instanceof Promise) throw new Error('Transakcja SQLite nie może zawierać await.');
    db.exec('COMMIT');
    return value;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}
export function initializeDB() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, appliedAt TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, passwordHash TEXT NOT NULL, name TEXT NOT NULL,
      phone TEXT NOT NULL DEFAULT '', role TEXT NOT NULL CHECK(role IN ('client','receptionist','admin')),
      active INTEGER NOT NULL DEFAULT 1, mustChangePassword INTEGER NOT NULL DEFAULT 0, createdAt TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY, userId TEXT REFERENCES users(id), csrfToken TEXT NOT NULL, expiresAt TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS sessions_user ON sessions(userId);
    CREATE TABLE IF NOT EXISTS rooms (
      id TEXT PRIMARY KEY, number TEXT NOT NULL UNIQUE, type TEXT NOT NULL, description TEXT NOT NULL DEFAULT '',
      capacity INTEGER NOT NULL CHECK(capacity > 0), nightlyRateMinor INTEGER NOT NULL CHECK(nightlyRateMinor >= 0),
      equipment TEXT NOT NULL DEFAULT '[]', active INTEGER NOT NULL DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS packages (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT NOT NULL DEFAULT '',
      priceMinor INTEGER NOT NULL CHECK(priceMinor >= 0), active INTEGER NOT NULL DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS package_items (
      id TEXT PRIMARY KEY, packageId TEXT NOT NULL REFERENCES packages(id), name TEXT NOT NULL,
      partner TEXT NOT NULL CHECK(partner IN ('HOTEL','A','B')), offerId TEXT NOT NULL DEFAULT '', quantity INTEGER NOT NULL CHECK(quantity > 0)
    );
    CREATE TABLE IF NOT EXISTS reservations (
      id TEXT PRIMARY KEY, number TEXT NOT NULL UNIQUE, userId TEXT REFERENCES users(id), partnerId TEXT,
      roomId TEXT NOT NULL REFERENCES rooms(id), packageId TEXT REFERENCES packages(id),
      checkIn TEXT NOT NULL, checkOut TEXT NOT NULL, guests INTEGER NOT NULL CHECK(guests > 0),
      guestName TEXT NOT NULL, guestEmail TEXT NOT NULL, guestPhone TEXT NOT NULL DEFAULT '', guestNames TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('confirmed','checked_in','completed','cancelled')),
      nightlyRateMinor INTEGER NOT NULL, packagePriceMinor INTEGER NOT NULL, totalMinor INTEGER NOT NULL,
      version INTEGER NOT NULL DEFAULT 1, fundingSource TEXT NOT NULL DEFAULT 'direct', voucherReference TEXT,
      hotelComponentId TEXT, createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL,
      CHECK(checkIn < checkOut)
    );
    CREATE INDEX IF NOT EXISTS reservations_dates ON reservations(roomId,checkIn,checkOut,status);
    CREATE TABLE IF NOT EXISTS reservation_items (
      id TEXT PRIMARY KEY, reservationId TEXT NOT NULL REFERENCES reservations(id), name TEXT NOT NULL,
      partner TEXT NOT NULL, offerId TEXT NOT NULL DEFAULT '', guestIndex INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'unplanned', note TEXT NOT NULL DEFAULT ''
    );
    CREATE TABLE IF NOT EXISTS idempotency_records (
      actorKey TEXT NOT NULL, requestKey TEXT NOT NULL, requestHash TEXT NOT NULL, response TEXT NOT NULL,
      createdAt TEXT NOT NULL, PRIMARY KEY(actorKey, requestKey)
    );
    CREATE TABLE IF NOT EXISTS audit_events (
      id TEXT PRIMARY KEY, actorType TEXT NOT NULL, actorId TEXT NOT NULL, actorName TEXT NOT NULL,
      action TEXT NOT NULL, entityId TEXT NOT NULL, details TEXT NOT NULL, createdAt TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS hotel_settings (
      id INTEGER PRIMARY KEY CHECK(id=1), hotelName TEXT NOT NULL DEFAULT 'Aurora Hotels',
      checkInTime TEXT NOT NULL DEFAULT '14:00', checkOutTime TEXT NOT NULL DEFAULT '11:00',
      timezone TEXT NOT NULL DEFAULT 'Europe/Warsaw', currency TEXT NOT NULL DEFAULT 'PLN'
    );
    INSERT OR IGNORE INTO hotel_settings(id) VALUES(1);
    INSERT OR IGNORE INTO schema_migrations(version,appliedAt) VALUES(1,datetime('now'));
  `);
}
initializeDB();
