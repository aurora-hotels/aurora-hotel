import { pathToFileURL } from 'node:url';
import { randomUUID } from 'node:crypto';
import { config } from './config.js';
import { get, run, transaction } from './db.js';
import { hashPassword, now } from './security.js';
import { initIntegrations } from './integrations/index.js';

// Seed dopisuje brakujące dane. Ponowne uruchomienie nie zmienia haseł ani ofert.
export function seed() {
  transaction(() => {
    if (!get("SELECT id FROM users WHERE id='user-admin' OR role='admin' LIMIT 1")) {
      if (!config.adminPassword || config.adminPassword.length < config.passwordMinLength)
        throw new Error('Ustaw ADMIN_PASSWORD przed pierwszym uruchomieniem seed.');
      run(
        'INSERT INTO users(id,email,passwordHash,name,phone,role,createdAt) VALUES(?,?,?,?,?,?,?)',
        'user-admin',
        config.adminEmail,
        hashPassword(config.adminPassword),
        'Administrator Aurora',
        '',
        'admin',
        now(),
      );
    }
    const rooms = [
      [
        'room-101',
        '101',
        'Standard',
        'Przytulny pokój dwuosobowy z łazienką.',
        2,
        24000,
        ['Wi-Fi', 'Telewizor', 'Prysznic'],
      ],
      [
        'room-102',
        '102',
        'Standard',
        'Pokój dla jednej lub dwóch osób.',
        2,
        24000,
        ['Wi-Fi', 'Biurko', 'Prysznic'],
      ],
      [
        'room-201',
        '201',
        'Rodzinny',
        'Więcej miejsca na pobyt z rodziną.',
        4,
        38000,
        ['Wi-Fi', 'Aneks kuchenny', 'Wanna'],
      ],
      [
        'room-202',
        '202',
        'Komfort',
        'Jasny pokój z balkonem i widokiem na ogród.',
        3,
        32000,
        ['Wi-Fi', 'Balkon', 'Klimatyzacja'],
      ],
      [
        'room-301',
        '301',
        'Apartament',
        'Sypialnia i osobny salon na spokojny wypoczynek.',
        4,
        52000,
        ['Wi-Fi', 'Salon', 'Ekspres do kawy', 'Klimatyzacja'],
      ],
    ] as const;
    for (const [id, number, type, description, capacity, price, equipment] of rooms)
      run(
        'INSERT OR IGNORE INTO rooms(id,number,type,description,capacity,nightlyRateMinor,equipment,active) VALUES(?,?,?,?,?,?,?,1)',
        id,
        number,
        type,
        description,
        capacity,
        price,
        JSON.stringify(equipment),
      );
    const packages = [
      {
        id: 'package-rest',
        name: 'Spokojny odpoczynek',
        description: 'Śniadanie w hotelu oraz jeden masaż u partnera A.',
        price: 18000,
        items: [
          { name: 'Śniadanie', partner: 'HOTEL', offerId: '', quantity: 1 },
          { name: 'Masaż relaksacyjny', partner: 'A', offerId: 'A-MASSAGE', quantity: 1 },
        ],
      },
      {
        id: 'package-active',
        name: 'Aktywny pobyt',
        description: 'Trening personalny u partnera B oraz masaż u partnera A.',
        price: 26000,
        items: [
          { name: 'Trening personalny', partner: 'B', offerId: 'B-PERSONAL', quantity: 1 },
          { name: 'Masaż relaksacyjny', partner: 'A', offerId: 'A-MASSAGE', quantity: 1 },
        ],
      },
    ];
    for (const pack of packages)
      if (!get('SELECT id FROM packages WHERE id=?', pack.id)) {
        run(
          'INSERT INTO packages(id,name,description,priceMinor,active) VALUES(?,?,?,?,1)',
          pack.id,
          pack.name,
          pack.description,
          pack.price,
        );
        for (const item of pack.items)
          run(
            'INSERT INTO package_items(id,packageId,name,partner,offerId,quantity) VALUES(?,?,?,?,?,?)',
            randomUUID(),
            pack.id,
            item.name,
            item.partner,
            item.offerId,
            item.quantity,
          );
      }
  });
  initIntegrations();
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  seed();
  console.log('Dane startowe są gotowe. Istniejące konta i oferty pozostawiono bez zmian.');
}
