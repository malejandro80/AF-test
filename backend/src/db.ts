import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";

function getProjectFile(filename: string): string {
  if (process.env.DB_PATH && filename === "data.db") {
    return process.env.DB_PATH;
  }
  const candidates = [
    path.resolve(process.cwd(), filename),
    path.resolve(process.cwd(), "..", filename),
    path.resolve(process.cwd(), "backend", filename),
  ];
  for (const cand of candidates) {
    if (fs.existsSync(cand)) return cand;
  }
  return path.resolve(process.cwd(), filename);
}

function getDatasetDir(): string {
  const candidates = [
    path.resolve(process.cwd(), "dataset"),
    path.resolve(process.cwd(), "..", "dataset"),
    path.resolve(process.cwd(), "backend", "dataset"),
  ];
  for (const cand of candidates) {
    if (fs.existsSync(path.join(cand, "brokers.csv"))) return cand;
  }
  return path.resolve(process.cwd(), "dataset");
}

const dbPath = getProjectFile("data.db");
const db = new Database(dbPath);

// Enable foreign keys
db.pragma("foreign_keys = ON");

// Initialize Schema idempotently
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS brokers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    white_label_name TEXT NOT NULL,
    api_key_hash TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS traders (
    id TEXT PRIMARY KEY,
    broker_id TEXT NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    dob TEXT NOT NULL,
    ssn_last4 TEXT NOT NULL,
    address_line1 TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT,
    postal_code TEXT NOT NULL,
    kyc_status TEXT NOT NULL,
    notes TEXT,
    audit_notes TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (broker_id) REFERENCES brokers(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_traders_broker_id ON traders(broker_id, id);

  CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY,
    trader_id TEXT NOT NULL,
    broker_id TEXT NOT NULL,
    account_number TEXT NOT NULL,
    account_type TEXT NOT NULL,
    balance REAL NOT NULL,
    buying_power REAL NOT NULL,
    max_position_size INTEGER NOT NULL,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (trader_id) REFERENCES traders(id) ON DELETE CASCADE,
    FOREIGN KEY (broker_id) REFERENCES brokers(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_accounts_broker_account ON accounts(broker_id, id);
  CREATE INDEX IF NOT EXISTS idx_accounts_broker_trader ON accounts(broker_id, trader_id);

  CREATE TABLE IF NOT EXISTS instruments (
    symbol TEXT PRIMARY KEY,
    description TEXT NOT NULL,
    exchange TEXT NOT NULL,
    point_value_usd REAL NOT NULL,
    tick_size REAL NOT NULL,
    tick_value_usd REAL NOT NULL,
    initial_margin_usd REAL NOT NULL,
    maintenance_margin_usd REAL NOT NULL
  );

  CREATE TABLE IF NOT EXISTS market_prices (
    symbol TEXT PRIMARY KEY,
    mark_price REAL NOT NULL,
    as_of TEXT NOT NULL,
    FOREIGN KEY (symbol) REFERENCES instruments(symbol) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS fills (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL,
    broker_id TEXT NOT NULL,
    instrument_symbol TEXT NOT NULL,
    side TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    price REAL NOT NULL,
    filled_at TEXT NOT NULL,
    order_id TEXT NOT NULL,
    liquidity TEXT NOT NULL,
    commission_usd REAL NOT NULL,
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
    FOREIGN KEY (broker_id) REFERENCES brokers(id) ON DELETE CASCADE,
    FOREIGN KEY (instrument_symbol) REFERENCES instruments(symbol) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_fills_broker_account ON fills(broker_id, account_id);
  CREATE INDEX IF NOT EXISTS idx_fills_account_filled ON fills(account_id, filled_at);
`);

function parseLine(line: string): string[] {
  const row: string[] = [];
  let inQ = false, curr = "";
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') inQ = !inQ;
    else if (c === "," && !inQ) { row.push(curr.trim()); curr = ""; }
    else curr += c;
  }
  row.push(curr.trim());
  return row;
}

function parseCSV(filePath: string): Record<string, string>[] {
  if (!fs.existsSync(filePath)) return [];
  const lines = fs.readFileSync(filePath, "utf8").trim().split("\n");
  if (lines.length <= 1) return [];
  const headers = parseLine(lines[0]);
  return lines.slice(1).map(l => {
    const r = parseLine(l);
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => { obj[h] = r[idx] ?? ""; });
    return obj;
  });
}

export function seedDatabaseIfEmpty(datasetDir: string = getDatasetDir()) {
  const brokerCount = (db.prepare("SELECT COUNT(*) as count FROM brokers").get() as { count: number }).count;
  const accountCount = (db.prepare("SELECT COUNT(*) as count FROM accounts").get() as { count: number }).count;
  if (brokerCount > 0 && accountCount > 0) {
    return;
  }

  const datasetPath = (file: string) => path.join(datasetDir, file);

  // Load Brokers
  const brokers = parseCSV(datasetPath("brokers.csv"));
  const insertBroker = db.prepare(`
    INSERT INTO brokers (id, name, type, white_label_name, api_key_hash, created_at)
    VALUES (@id, @name, @type, @white_label_name, @api_key_hash, @created_at)
  `);
  brokers.forEach(b => insertBroker.run(b));

  // Load Traders
  const traders = parseCSV(datasetPath("traders.csv"));
  const insertTrader = db.prepare(`
    INSERT INTO traders (id, broker_id, first_name, last_name, email, phone, dob, ssn_last4, address_line1, city, state, postal_code, kyc_status, notes, audit_notes, created_at)
    VALUES (@id, @broker_id, @first_name, @last_name, @email, @phone, @dob, @ssn_last4, @address_line1, @city, @state, @postal_code, @kyc_status, @notes, @audit_notes, @created_at)
  `);
  traders.forEach(t => insertTrader.run(t));

  // Load Accounts
  const accounts = parseCSV(datasetPath("accounts.csv"));

  // Build Trader -> Broker lookup
  const traderBrokerMap: Record<string, string> = {};
  traders.forEach(t => { traderBrokerMap[t.id] = t.broker_id; });

  const insertAccount = db.prepare(`
    INSERT INTO accounts (id, trader_id, broker_id, account_number, account_type, balance, buying_power, max_position_size, status, created_at)
    VALUES (@id, @trader_id, @broker_id, @account_number, @account_type, @balance, @buying_power, @max_position_size, @status, @created_at)
  `);
  accounts.forEach(a => {
    insertAccount.run({
      ...a,
      broker_id: traderBrokerMap[a.trader_id] ?? "BRK-ARWP",
      balance: parseFloat(a.balance),
      buying_power: parseFloat(a.buying_power),
      max_position_size: parseInt(a.max_position_size, 10),
    });
  });

  // Load Instruments
  const instruments = parseCSV(datasetPath("instruments.csv"));
  const insertInstrument = db.prepare(`
    INSERT INTO instruments (symbol, description, exchange, point_value_usd, tick_size, tick_value_usd, initial_margin_usd, maintenance_margin_usd)
    VALUES (@symbol, @description, @exchange, @point_value_usd, @tick_size, @tick_value_usd, @initial_margin_usd, @maintenance_margin_usd)
  `);
  instruments.forEach(i => {
    insertInstrument.run({
      ...i,
      point_value_usd: parseFloat(i.point_value_usd),
      tick_size: parseFloat(i.tick_size),
      tick_value_usd: parseFloat(i.tick_value_usd),
      initial_margin_usd: parseFloat(i.initial_margin_usd),
      maintenance_margin_usd: parseFloat(i.maintenance_margin_usd),
    });
  });

  // Load Market Prices
  const marketPrices = parseCSV(datasetPath("market_prices.csv"));
  const insertPrice = db.prepare(`
    INSERT INTO market_prices (symbol, mark_price, as_of)
    VALUES (@symbol, @mark_price, @as_of)
  `);
  marketPrices.forEach(p => {
    insertPrice.run({
      ...p,
      mark_price: parseFloat(p.mark_price),
    });
  });

  // Build Account -> Broker lookup
  const accountBrokerMap: Record<string, string> = {};
  accounts.forEach(a => { accountBrokerMap[a.id] = traderBrokerMap[a.trader_id] ?? "BRK-ARWP"; });

  // Load Fills
  const fills = parseCSV(datasetPath("fills.csv"));
  const insertFill = db.prepare(`
    INSERT INTO fills (id, account_id, broker_id, instrument_symbol, side, quantity, price, filled_at, order_id, liquidity, commission_usd)
    VALUES (@id, @account_id, @broker_id, @instrument_symbol, @side, @quantity, @price, @filled_at, @order_id, @liquidity, @commission_usd)
  `);
  fills.forEach(f => {
    insertFill.run({
      ...f,
      broker_id: accountBrokerMap[f.account_id] ?? "BRK-ARWP",
      quantity: parseInt(f.quantity, 10),
      price: parseFloat(f.price),
      commission_usd: parseFloat(f.commission_usd),
    });
  });
}

// Automatically seed DB on import if empty
seedDatabaseIfEmpty();

export function createUser(email: string, password: string) {
  const hash = bcrypt.hashSync(password, 10);
  const info = db
    .prepare("INSERT INTO users (email, password_hash) VALUES (?, ?)")
    .run(email, hash);
  return { id: info.lastInsertRowid, email };
}

export function getUser(email: string) {
  return db.prepare("SELECT * FROM users WHERE email = ?").get(email);
}

export default db;
