import express from 'express';
import cors from 'cors';
import { initDatabase, resetDatabase, pool } from './db.js';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: '*' })); // Allow all origins to simplify Vercel configuration
app.use(express.json());

// Helper to format values back to JS-friendly types
const formatTool = (row) => ({
  id: row.id,
  type: row.type,
  name: row.name,
  category: row.category,
  dailyRate: row.daily_rate ? Number(row.daily_rate) : undefined,
  sellingPrice: row.selling_price ? Number(row.selling_price) : undefined,
  totalStock: Number(row.total_stock),
  condition: row.condition,
  serial: row.serial,
  barcode: row.barcode,
  emoji: row.emoji,
  description: row.description,
  maintenanceUnits: Number(row.maintenance_units)
});

const formatCustomer = (row) => ({
  id: row.id,
  name: row.name,
  phone: row.phone,
  email: row.email || '',
  address: row.address || '',
  idNumber: row.id_number || '',
  balance: Number(row.balance),
  createdAt: row.created_at ? new Date(row.created_at).toISOString() : ''
});

const formatRental = (row) => ({
  id: row.id,
  toolId: row.tool_id,
  customerId: row.customer_id,
  startDate: row.start_date ? new Date(row.start_date).toISOString() : '',
  endDate: row.end_date ? new Date(row.end_date).toISOString() : '',
  returnDate: row.return_date ? new Date(row.return_date).toISOString() : undefined,
  dailyRate: Number(row.daily_rate),
  status: row.status,
  deposit: Number(row.deposit),
  notes: row.notes || ''
});

const formatInvoice = (row) => ({
  id: row.id,
  rentalId: row.rental_id,
  customerId: row.customer_id,
  items: typeof row.items === 'string' ? JSON.parse(row.items) : row.items,
  subtotal: Number(row.subtotal),
  tax: Number(row.tax),
  deposit: Number(row.deposit),
  total: Number(row.total),
  status: row.status,
  paymentMethod: row.payment_method || '',
  createdAt: row.created_at ? new Date(row.created_at).toISOString() : ''
});

// --- API Endpoints ---

// Get all data at boot (single request optimization)
app.get('/api/all', async (req, res) => {
  try {
    const toolsRes = await pool.query('SELECT * FROM tools');
    const customersRes = await pool.query('SELECT * FROM customers');
    const rentalsRes = await pool.query('SELECT * FROM rentals');
    const invoicesRes = await pool.query('SELECT * FROM invoices');
    const settingsRes = await pool.query('SELECT value FROM settings WHERE key = $1', ['config']);

    const settings = settingsRes.rows[0] ? settingsRes.rows[0].value : {};

    res.json({
      tools: toolsRes.rows.map(formatTool),
      customers: customersRes.rows.map(formatCustomer),
      rentals: rentalsRes.rows.map(formatRental),
      invoices: invoicesRes.rows.map(formatInvoice),
      settings
    });
  } catch (err) {
    console.error('Error fetching all data:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// --- Tools ---
app.get('/api/tools', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM tools');
    res.json(rows.map(formatTool));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/tools', async (req, res) => {
  try {
    const t = req.body;
    await pool.query(
      `INSERT INTO tools (id, type, name, category, daily_rate, selling_price, total_stock, condition, serial, barcode, emoji, description, maintenance_units)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       ON CONFLICT (id) DO UPDATE SET
         type = EXCLUDED.type,
         name = EXCLUDED.name,
         category = EXCLUDED.category,
         daily_rate = EXCLUDED.daily_rate,
         selling_price = EXCLUDED.selling_price,
         total_stock = EXCLUDED.total_stock,
         condition = EXCLUDED.condition,
         serial = EXCLUDED.serial,
         barcode = EXCLUDED.barcode,
         emoji = EXCLUDED.emoji,
         description = EXCLUDED.description,
         maintenance_units = EXCLUDED.maintenance_units`,
      [t.id, t.type, t.name, t.category, t.dailyRate || null, t.sellingPrice || null, t.totalStock || 1, t.condition || 'Good', t.serial || '', t.barcode || '', t.emoji || '', t.description || '', t.maintenanceUnits || 0]
    );
    res.status(201).json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/tools/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const t = req.body;
    await pool.query(
      `UPDATE tools SET
         type = COALESCE($1, type),
         name = COALESCE($2, name),
         category = COALESCE($3, category),
         daily_rate = COALESCE($4, daily_rate),
         selling_price = COALESCE($5, selling_price),
         total_stock = COALESCE($6, total_stock),
         condition = COALESCE($7, condition),
         serial = COALESCE($8, serial),
         barcode = COALESCE($9, barcode),
         emoji = COALESCE($10, emoji),
         description = COALESCE($11, description),
         maintenance_units = COALESCE($12, maintenance_units)
       WHERE id = $13`,
      [t.type, t.name, t.category, t.dailyRate !== undefined ? t.dailyRate : null, t.sellingPrice !== undefined ? t.sellingPrice : null, t.totalStock, t.condition, t.serial, t.barcode, t.emoji, t.description, t.maintenanceUnits, id]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/tools/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM tools WHERE id = $1', [id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Customers ---
app.get('/api/customers', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM customers');
    res.json(rows.map(formatCustomer));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/customers', async (req, res) => {
  try {
    const c = req.body;
    await pool.query(
      `INSERT INTO customers (id, name, phone, email, address, id_number, balance, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         phone = EXCLUDED.phone,
         email = EXCLUDED.email,
         address = EXCLUDED.address,
         id_number = EXCLUDED.id_number,
         balance = EXCLUDED.balance,
         created_at = EXCLUDED.created_at`,
      [c.id, c.name, c.phone, c.email || '', c.address || '', c.idNumber || '', c.balance || 0, c.createdAt ? new Date(c.createdAt) : new Date()]
    );
    res.status(201).json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/customers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const c = req.body;
    await pool.query(
      `UPDATE customers SET
         name = COALESCE($1, name),
         phone = COALESCE($2, phone),
         email = COALESCE($3, email),
         address = COALESCE($4, address),
         id_number = COALESCE($5, id_number),
         balance = COALESCE($6, balance)
       WHERE id = $7`,
      [c.name, c.phone, c.email, c.address, c.idNumber, c.balance, id]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/customers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM customers WHERE id = $1', [id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Rentals ---
app.get('/api/rentals', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM rentals');
    res.json(rows.map(formatRental));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/rentals', async (req, res) => {
  try {
    const r = req.body;
    await pool.query(
      `INSERT INTO rentals (id, tool_id, customer_id, start_date, end_date, return_date, daily_rate, status, deposit, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (id) DO UPDATE SET
         tool_id = EXCLUDED.tool_id,
         customer_id = EXCLUDED.customer_id,
         start_date = EXCLUDED.start_date,
         end_date = EXCLUDED.end_date,
         return_date = EXCLUDED.return_date,
         daily_rate = EXCLUDED.daily_rate,
         status = EXCLUDED.status,
         deposit = EXCLUDED.deposit,
         notes = EXCLUDED.notes`,
      [r.id, r.toolId, r.customerId, new Date(r.startDate), new Date(r.endDate), r.returnDate ? new Date(r.returnDate) : null, r.dailyRate, r.status, r.deposit || 0, r.notes || '']
    );
    res.status(201).json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/rentals/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const r = req.body;
    await pool.query(
      `UPDATE rentals SET
         tool_id = COALESCE($1, tool_id),
         customer_id = COALESCE($2, customer_id),
         start_date = COALESCE($3, start_date),
         end_date = COALESCE($4, end_date),
         return_date = $5,
         daily_rate = COALESCE($6, daily_rate),
         status = COALESCE($7, status),
         deposit = COALESCE($8, deposit),
         notes = COALESCE($9, notes)
       WHERE id = $10`,
      [r.toolId, r.customerId, r.startDate ? new Date(r.startDate) : null, r.endDate ? new Date(r.endDate) : null, r.returnDate ? new Date(r.returnDate) : null, r.dailyRate, r.status, r.deposit, r.notes, id]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Invoices ---
app.get('/api/invoices', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM invoices');
    res.json(rows.map(formatInvoice));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/invoices', async (req, res) => {
  try {
    const inv = req.body;
    await pool.query(
      `INSERT INTO invoices (id, rental_id, customer_id, items, subtotal, tax, deposit, total, status, payment_method, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (id) DO UPDATE SET
         rental_id = EXCLUDED.rental_id,
         customer_id = EXCLUDED.customer_id,
         items = EXCLUDED.items,
         subtotal = EXCLUDED.subtotal,
         tax = EXCLUDED.tax,
         deposit = EXCLUDED.deposit,
         total = EXCLUDED.total,
         status = EXCLUDED.status,
         payment_method = EXCLUDED.payment_method,
         created_at = EXCLUDED.created_at`,
      [inv.id, inv.rentalId || null, inv.customerId, JSON.stringify(inv.items), inv.subtotal, inv.tax || 0, inv.deposit || 0, inv.total, inv.status, inv.paymentMethod || '', inv.createdAt ? new Date(inv.createdAt) : new Date()]
    );
    res.status(201).json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/invoices/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const inv = req.body;
    await pool.query(
      `UPDATE invoices SET
         rental_id = COALESCE($1, rental_id),
         customer_id = COALESCE($2, customer_id),
         items = COALESCE($3, items),
         subtotal = COALESCE($4, subtotal),
         tax = COALESCE($5, tax),
         deposit = COALESCE($6, deposit),
         total = COALESCE($7, total),
         status = COALESCE($8, status),
         payment_method = COALESCE($9, payment_method)
       WHERE id = $10`,
      [inv.rentalId, inv.customerId, inv.items ? JSON.stringify(inv.items) : null, inv.subtotal, inv.tax, inv.deposit, inv.total, inv.status, inv.paymentMethod, id]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Settings ---
app.get('/api/settings', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT value FROM settings WHERE key = $1', ['config']);
    res.json(rows[0] ? rows[0].value : {});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/settings', async (req, res) => {
  try {
    const config = req.body;
    await pool.query(
      `INSERT INTO settings (key, value) VALUES ($1, $2)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
      ['config', JSON.stringify(config)]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Reset / Seed Operations ---
app.post('/api/reset', async (req, res) => {
  try {
    await resetDatabase();
    res.json({ ok: true, message: 'Database reset and seeded successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Root check endpoint
app.get('/', (req, res) => {
  res.send('HardwarePOS Backend API is running.');
});

// Bootstrapping function
async function startServer() {
  try {
    // Check connection first, then initialize the database tables
    await initDatabase();
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Fatal database initialization failure:', err);
    process.exit(1);
  }
}

startServer();
