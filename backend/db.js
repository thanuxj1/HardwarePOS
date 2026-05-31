import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Neon requires SSL. Standard check to enforce SSL in production
const isProduction = process.env.NODE_ENV === 'production';
const connectionString = process.env.DATABASE_URL;

export const pool = new Pool({
  connectionString,
  ssl: connectionString && (connectionString.includes('neon.tech') || isProduction)
    ? { rejectUnauthorized: false }
    : false
});

// Seed data definition inside DB helper for autonomous initialization
const seedTools = [
  { id: 't1', type: 'rental', name: 'DeWalt Hammer Drill', category: 'Power Tools', dailyRate: 1500, totalStock: 3, condition: 'Excellent', serial: 'DW-HD-001', barcode: '7001000010', emoji: '🔨', description: '20V MAX cordless hammer drill with 2-speed settings.' },
  { id: 't2', type: 'rental', name: 'Makita Angle Grinder', category: 'Power Tools', dailyRate: 1200, totalStock: 2, condition: 'Good', serial: 'MK-AG-002', barcode: '7001000027', emoji: '⚙️', description: '7-inch angle grinder, 15 AMP motor.' },
  { id: 't3', type: 'rental', name: 'Bosch Circular Saw', category: 'Power Tools', dailyRate: 1800, totalStock: 2, condition: 'Excellent', serial: 'BS-CS-003', barcode: '7001000034', emoji: '🪚', description: '7-1/4 inch circular saw with electric brake.' },
  { id: 't4', type: 'rental', name: 'Milwaukee Reciprocating Saw', category: 'Power Tools', dailyRate: 1400, totalStock: 1, condition: 'Good', serial: 'MW-RS-004', barcode: '7001000041', emoji: '🪚', description: 'SAWZALL with 12 AMP motor.' },
  { id: 't5', type: 'rental', name: 'Hilti Rotary Hammer', category: 'Power Tools', dailyRate: 2500, totalStock: 2, condition: 'Excellent', serial: 'HT-RH-005', barcode: '7001000058', emoji: '🔨', description: 'SDS-Plus rotary hammer for concrete drilling.' },
  { id: 't6', type: 'sale', name: 'Random Orbital Sander', category: 'Power Tools', sellingPrice: 18000, totalStock: 3, condition: 'Good', serial: 'BO-OS-006', barcode: '7001000065', emoji: '🔧', description: '5-inch variable speed orbital sander.' },
  { id: 't7', type: 'rental', name: 'Pressure Washer 3000PSI', category: 'Outdoor Equipment', dailyRate: 3000, totalStock: 2, condition: 'Excellent', serial: 'PW-30-007', barcode: '7001000072', emoji: '💧', description: 'Gas-powered 3000 PSI pressure washer.' },
  { id: 't8', type: 'rental', name: 'Concrete Mixer 3.5 Cu Ft', category: 'Construction', dailyRate: 3500, totalStock: 1, condition: 'Fair', serial: 'CM-35-008', barcode: '7001000089', emoji: '🏗️', description: 'Portable concrete mixer, 3.5 cubic feet capacity.', maintenanceUnits: 1 },
  { id: 't9', type: 'rental', name: 'Scaffolding Set 20ft', category: 'Construction', dailyRate: 4000, totalStock: 3, condition: 'Good', serial: 'SC-20-009', barcode: '7001000096', emoji: '🏗️', description: 'Complete scaffolding set, 20 feet height.' },
  { id: 't10', type: 'sale', name: 'Air Compressor 60 Gal', category: 'Pneumatic', sellingPrice: 75000, totalStock: 2, condition: 'Good', serial: 'AC-60-010', barcode: '7001000102', emoji: '💨', description: '60-gallon stationary air compressor, 155 PSI.' },
  { id: 't11', type: 'rental', name: 'Table Saw 10-inch', category: 'Power Tools', dailyRate: 2000, totalStock: 1, condition: 'Excellent', serial: 'TS-10-011', barcode: '7001000119', emoji: '🪚', description: 'Jobsite table saw with 24.5 inch rip capacity.' },
  { id: 't12', type: 'rental', name: 'Jackhammer Electric', category: 'Construction', dailyRate: 4200, totalStock: 2, condition: 'Good', serial: 'JH-EL-012', barcode: '7001000126', emoji: '⛏️', description: '35 lb electric jackhammer for demolition work.' },
  { id: 't13', type: 'sale', name: 'Tile Cutter Wet Saw', category: 'Specialty', sellingPrice: 48000, totalStock: 1, condition: 'Excellent', serial: 'TC-WS-013', barcode: '7001000133', emoji: '🔲', description: '10-inch wet tile saw with sliding table.' },
  { id: 't14', type: 'rental', name: 'Generator 7500W', category: 'Outdoor Equipment', dailyRate: 3800, totalStock: 2, condition: 'Good', serial: 'GN-75-014', barcode: '7001000140', emoji: '⚡', description: 'Portable generator, 7500W running watts.' },
  { id: 't15', type: 'sale', name: 'Laser Level 360°', category: 'Measuring', sellingPrice: 28000, totalStock: 4, condition: 'Excellent', serial: 'LL-36-015', barcode: '7001000157', emoji: '📐', description: 'Self-leveling 360° green laser level.' },
  { id: 't16', type: 'sale', name: 'Pipe Wrench Set', category: 'Hand Tools', sellingPrice: 8500, totalStock: 5, condition: 'Good', serial: 'PW-ST-016', barcode: '7001000164', emoji: '🔧', description: 'Set of 3 pipe wrenches (14", 18", 24").' },
  { id: 't17', type: 'rental', name: 'Chainsaw 20-inch', category: 'Outdoor Equipment', dailyRate: 2500, totalStock: 2, condition: 'Good', serial: 'CS-20-017', barcode: '7001000171', emoji: '🪵', description: '20-inch gas chainsaw, 50cc engine.' },
  { id: 't18', type: 'sale', name: 'Heat Gun Industrial', category: 'Specialty', sellingPrice: 12000, totalStock: 3, condition: 'Excellent', serial: 'HG-IN-018', barcode: '7001000188', emoji: '🌡️', description: 'Industrial heat gun with variable temperature.' },
  { id: 't19', type: 'rental', name: 'Welding Machine MIG', category: 'Specialty', dailyRate: 3200, totalStock: 1, condition: 'Good', serial: 'WM-MG-019', barcode: '7001000195', emoji: '🔥', description: 'MIG welder 200A with gas/gasless capability.' },
  { id: 't20', type: 'rental', name: 'Floor Sander Drum', category: 'Specialty', dailyRate: 2800, totalStock: 1, condition: 'Fair', serial: 'FS-DR-020', barcode: '7001000201', emoji: '🪵', description: 'Drum floor sander for hardwood refinishing.' },
  { id: 't21', type: 'sale', name: 'Safety Harness Kit', category: 'Safety', sellingPrice: 9500, totalStock: 6, condition: 'Excellent', serial: 'SH-KT-021', barcode: '7001000218', emoji: '🦺', description: 'Full body safety harness with lanyard.' },
  { id: 't22', type: 'sale', name: 'Nail Gun Framing', category: 'Pneumatic', sellingPrice: 35000, totalStock: 3, condition: 'Good', serial: 'NG-FR-022', barcode: '7001000225', emoji: '🔫', description: '21-degree pneumatic framing nailer.' }
];

const seedCustomers = [
  { id: 'c1', name: 'James Wilson', phone: '(555) 123-4567', email: 'james.w@email.com', address: '142 Oak Street, Springfield', idNumber: 'DL-9812345', balance: 0, createdAt: '2025-08-15' },
  { id: 'c2', name: 'Maria Garcia', phone: '(555) 234-5678', email: 'maria.g@email.com', address: '88 Pine Avenue, Riverside', idNumber: 'DL-7654321', balance: 45, createdAt: '2025-09-20' },
  { id: 'c3', name: 'Robert Chen', phone: '(555) 345-6789', email: 'robert.c@email.com', address: '305 Elm Drive, Lakewood', idNumber: 'DL-1122334', balance: 0, createdAt: '2025-10-05' },
  { id: 'c4', name: 'Sarah Johnson', phone: '(555) 456-7890', email: 'sarah.j@email.com', address: '17 Maple Court, Fairview', idNumber: 'DL-4455667', balance: 120, createdAt: '2025-11-12' },
  { id: 'c5', name: 'David Martinez', phone: '(555) 567-8901', email: 'david.m@email.com', address: '422 Cedar Lane, Greenville', idNumber: 'DL-7788990', balance: 0, createdAt: '2025-12-01' },
  { id: 'c6', name: 'Emily Brown', phone: '(555) 678-9012', email: 'emily.b@email.com', address: '91 Birch Road, Hilltop', idNumber: 'DL-2233445', balance: 0, createdAt: '2026-01-18' },
  { id: 'c7', name: 'Michael Thompson', phone: '(555) 789-0123', email: 'michael.t@email.com', address: '560 Walnut Blvd, Eastport', idNumber: 'DL-5566778', balance: 200, createdAt: '2026-02-10' },
  { id: 'c8', name: 'Lisa Anderson', phone: '(555) 890-1234', email: 'lisa.a@email.com', address: '73 Spruce Way, Northfield', idNumber: 'DL-8899001', balance: 0, createdAt: '2026-03-05' },
  { id: 'c9', name: 'Kevin Park', phone: '(555) 901-2345', email: 'kevin.p@email.com', address: '208 Ash Street, Westview', idNumber: 'DL-3344556', balance: 0, createdAt: '2026-03-22' },
  { id: 'c10', name: 'Amanda White', phone: '(555) 012-3456', email: 'amanda.w@email.com', address: '155 Poplar Circle, Baytown', idNumber: 'DL-6677889', balance: 55, createdAt: '2026-04-01' }
];

const now = Date.now();
const DAY = 86400000;

const seedRentals = [
  { id: 'r1', toolId: 't2', customerId: 'c1', startDate: new Date(now - 5*DAY).toISOString(), endDate: new Date(now + 2*DAY).toISOString(), dailyRate: 1200, status: 'active', deposit: 2000, notes: '' },
  { id: 'r2', toolId: 't5', customerId: 'c4', startDate: new Date(now - 10*DAY).toISOString(), endDate: new Date(now - 2*DAY).toISOString(), dailyRate: 2500, status: 'overdue', deposit: 2000, notes: 'Customer called, extending soon' },
  { id: 'r3', toolId: 't9', customerId: 'c2', startDate: new Date(now - 14*DAY).toISOString(), endDate: new Date(now + 7*DAY).toISOString(), dailyRate: 4000, status: 'active', deposit: 2000, notes: 'Construction project' },
  { id: 'r4', toolId: 't14', customerId: 'c7', startDate: new Date(now - 3*DAY).toISOString(), endDate: new Date(now + 4*DAY).toISOString(), dailyRate: 3800, status: 'active', deposit: 2000, notes: '' },
  { id: 'r5', toolId: 't3', customerId: 'c3', startDate: new Date(now - 20*DAY).toISOString(), endDate: new Date(now - 13*DAY).toISOString(), dailyRate: 1800, returnDate: new Date(now - 13*DAY).toISOString(), status: 'returned', deposit: 2000, notes: '' },
  { id: 'r6', toolId: 't11', customerId: 'c5', startDate: new Date(now - 30*DAY).toISOString(), endDate: new Date(now - 23*DAY).toISOString(), dailyRate: 2000, returnDate: new Date(now - 22*DAY).toISOString(), status: 'returned', deposit: 2000, notes: 'Returned 1 day late' },
  { id: 'r7', toolId: 't7', customerId: 'c6', startDate: new Date(now - 15*DAY).toISOString(), endDate: new Date(now - 8*DAY).toISOString(), dailyRate: 3000, returnDate: new Date(now - 8*DAY).toISOString(), status: 'returned', deposit: 2000, notes: '' },
  { id: 'r8', toolId: 't12', customerId: 'c8', startDate: new Date(now - 25*DAY).toISOString(), endDate: new Date(now - 20*DAY).toISOString(), dailyRate: 4200, returnDate: new Date(now - 20*DAY).toISOString(), status: 'returned', deposit: 2000, notes: '' },
  { id: 'r9', toolId: 't1', customerId: 'c9', startDate: new Date(now - 2*DAY).toISOString(), endDate: new Date(now + 5*DAY).toISOString(), dailyRate: 1500, status: 'active', deposit: 2000, notes: '' },
  { id: 'r10', toolId: 't1', customerId: 'c10', startDate: new Date(now - 1*DAY).toISOString(), endDate: new Date(now + 6*DAY).toISOString(), dailyRate: 1500, status: 'active', deposit: 2000, notes: 'Second unit rented' }
];

const seedInvoices = [
  { id: 'inv1', rentalId: 'r5', customerId: 'c3', items: [{ name: 'Bosch Circular Saw', days: 7, rate: 1800, total: 12600 }], subtotal: 12600, tax: 0, deposit: -2000, total: 10600, status: 'paid', paymentMethod: 'Card', createdAt: new Date(now - 13*DAY).toISOString() },
  { id: 'inv2', rentalId: 'r6', customerId: 'c5', items: [{ name: 'Table Saw 10-inch', days: 8, rate: 2000, total: 16000 }, { name: 'Late fee (1 day)', days: 1, rate: 3000, total: 3000 }], subtotal: 19000, tax: 0, deposit: -2000, total: 17000, status: 'paid', paymentMethod: 'Cash', createdAt: new Date(now - 22*DAY).toISOString() },
  { id: 'inv3', rentalId: 'r7', customerId: 'c6', items: [{ name: 'Pressure Washer 3000PSI', days: 7, rate: 3000, total: 21000 }], subtotal: 21000, tax: 0, deposit: -2000, total: 19000, status: 'paid', paymentMethod: 'Card', createdAt: new Date(now - 8*DAY).toISOString() },
  { id: 'inv4', rentalId: 'r8', customerId: 'c8', items: [{ name: 'Jackhammer Electric', days: 5, rate: 4200, total: 21000 }], subtotal: 21000, tax: 0, deposit: -2000, total: 19000, status: 'unpaid', paymentMethod: '', createdAt: new Date(now - 20*DAY).toISOString() }
];

const seedSettings = {
  shopName: 'ToolFlow',
  shopSubtitle: 'Dynamic Tools',
  shopAddress: 'No. 125, Galle Road, Colombo 03',
  shopPhone: '011-234-5678',
  shopEmail: 'info@toolflow.lk',
  currency: 'LKR',
  language: 'en',
  taxRate: 0,
  lateFeeMultiplier: 1.5,
  gracePeriodDays: 0,
  defaultDeposit: 2000,
  weeklyDiscount: 10,
  monthlyDiscount: 20
};

// SQL Queries to initialize database schema
const schemaQueries = `
  CREATE TABLE IF NOT EXISTS tools (
    id VARCHAR(50) PRIMARY KEY,
    type VARCHAR(20) NOT NULL,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(100),
    daily_rate NUMERIC,
    selling_price NUMERIC,
    total_stock INTEGER NOT NULL DEFAULT 1,
    condition VARCHAR(50),
    serial VARCHAR(100),
    barcode VARCHAR(100),
    emoji VARCHAR(10),
    description TEXT,
    maintenance_units INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS customers (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    email VARCHAR(100),
    address TEXT,
    id_number VARCHAR(50),
    balance NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS rentals (
    id VARCHAR(50) PRIMARY KEY,
    tool_id VARCHAR(50) REFERENCES tools(id),
    customer_id VARCHAR(50) REFERENCES customers(id) ON DELETE CASCADE,
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP NOT NULL,
    return_date TIMESTAMP,
    daily_rate NUMERIC NOT NULL,
    status VARCHAR(20) NOT NULL,
    deposit NUMERIC NOT NULL DEFAULT 0,
    notes TEXT
  );

  CREATE TABLE IF NOT EXISTS invoices (
    id VARCHAR(50) PRIMARY KEY,
    rental_id VARCHAR(50) REFERENCES rentals(id) ON DELETE SET NULL,
    customer_id VARCHAR(50) REFERENCES customers(id) ON DELETE CASCADE,
    items JSONB NOT NULL,
    subtotal NUMERIC NOT NULL,
    tax NUMERIC NOT NULL DEFAULT 0,
    deposit NUMERIC NOT NULL DEFAULT 0,
    total NUMERIC NOT NULL,
    status VARCHAR(20) NOT NULL,
    payment_method VARCHAR(50),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS settings (
    key VARCHAR(50) PRIMARY KEY,
    value JSONB NOT NULL
  );
`;

export async function initDatabase() {
  console.log('Initializing database schema...');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(schemaQueries);
    
    // Check if tools table is empty, if so, seed the initial data
    const toolCountRes = await client.query('SELECT COUNT(*) FROM tools');
    const toolCount = parseInt(toolCountRes.rows[0].count, 10);
    
    if (toolCount === 0) {
      console.log('Seeding initial tools...');
      for (const t of seedTools) {
        await client.query(
          `INSERT INTO tools (id, type, name, category, daily_rate, selling_price, total_stock, condition, serial, barcode, emoji, description, maintenance_units)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
          [t.id, t.type, t.name, t.category, t.dailyRate || null, t.sellingPrice || null, t.totalStock, t.condition, t.serial, t.barcode, t.emoji, t.description, t.maintenanceUnits || 0]
        );
      }

      console.log('Seeding initial customers...');
      for (const c of seedCustomers) {
        await client.query(
          `INSERT INTO customers (id, name, phone, email, address, id_number, balance, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [c.id, c.name, c.phone, c.email || null, c.address || null, c.idNumber || null, c.balance, new Date(c.createdAt)]
        );
      }

      console.log('Seeding initial rentals...');
      for (const r of seedRentals) {
        await client.query(
          `INSERT INTO rentals (id, tool_id, customer_id, start_date, end_date, return_date, daily_rate, status, deposit, notes)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [r.id, r.toolId, r.customerId, new Date(r.startDate), new Date(r.endDate), r.returnDate ? new Date(r.returnDate) : null, r.dailyRate, r.status, r.deposit, r.notes]
        );
      }

      console.log('Seeding initial invoices...');
      for (const inv of seedInvoices) {
        await client.query(
          `INSERT INTO invoices (id, rental_id, customer_id, items, subtotal, tax, deposit, total, status, payment_method, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [inv.id, inv.rentalId, inv.customerId, JSON.stringify(inv.items), inv.subtotal, inv.tax, inv.deposit, inv.total, inv.status, inv.paymentMethod || null, new Date(inv.createdAt)]
        );
      }

      console.log('Seeding initial settings...');
      await client.query(
        `INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2`,
        ['config', JSON.stringify(seedSettings)]
      );
    } else {
      console.log('Database already has data. Skipping seed.');
    }
    
    await client.query('COMMIT');
    console.log('Database schema and seed check completed successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error during database initialization:', err);
    throw err;
  } finally {
    client.release();
  }
}

export async function resetDatabase() {
  console.log('Resetting database...');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DROP TABLE IF EXISTS invoices CASCADE');
    await client.query('DROP TABLE IF EXISTS rentals CASCADE');
    await client.query('DROP TABLE IF EXISTS customers CASCADE');
    await client.query('DROP TABLE IF EXISTS tools CASCADE');
    await client.query('DROP TABLE IF EXISTS settings CASCADE');
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error dropping tables:', err);
    throw err;
  } finally {
    client.release();
  }
  await initDatabase();
}
