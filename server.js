const express = require("express");
const session = require("express-session");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const bcrypt = require("bcryptjs");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const app = express();
app.set("trust proxy", 1);
const session = require("express-session");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const bcrypt = require("bcryptjs");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const app = express();
app.set("trust proxy", 1);
const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, "data");
const UPLOAD_DIR = path.join(ROOT, "uploads");
const PRODUCTS_FILE = path.join(DATA_DIR, "products.json");
const ORDERS_FILE = path.join(DATA_DIR, "orders.json");
const MESSAGES_FILE = path.join(DATA_DIR, "messages.json");
const ENGAGEMENT_FILE = path.join(DATA_DIR, "engagement.json");
const BACKUP_DIR = path.join(DATA_DIR, "backups");

for (const dir of [DATA_DIR, UPLOAD_DIR, BACKUP_DIR]) fs.mkdirSync(dir, { recursive: true });

function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); }
  catch { return fallback; }
}
function writeJson(file, data) {
  // Keep the latest valid copy before replacing the persistent local database file.
  if (fs.existsSync(file)) {
    try { fs.copyFileSync(file, file + ".bak"); } catch (e) { console.error("Backup warning:", e.message); }
  }
  const temp = file + ".tmp";
  fs.writeFileSync(temp, JSON.stringify(data, null, 2), { encoding: "utf8", mode: 0o600 });
  fs.renameSync(temp, file);
}
if (!fs.existsSync(PRODUCTS_FILE)) writeJson(PRODUCTS_FILE, []);
if (!fs.existsSync(ORDERS_FILE)) writeJson(ORDERS_FILE, []);
if (!fs.existsSync(MESSAGES_FILE)) writeJson(MESSAGES_FILE, []);
if (!fs.existsSync(ENGAGEMENT_FILE)) writeJson(ENGAGEMENT_FILE, {});

app.disable("x-powered-by");
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(session({
  name: "ayu.sid",
  secret: process.env.SESSION_SECRET || "development-only-change-this-secret-before-deploying",
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 8 * 60 * 60 * 1000 }
}));
app.use(express.static(path.join(ROOT, "public")));
app.use("/uploads", express.static(UPLOAD_DIR));

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 8, standardHeaders: true, legacyHeaders: false });
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, crypto.randomUUID() + ext);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 4 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.mimetype)) return cb(new Error("Only JPG, PNG, WEBP or GIF images are allowed"));
    cb(null, true);
  }
});

function adminOnly(req, res, next) {
  if (!req.session.admin) return res.status(401).json({ error: "Please log in as admin." });
  next();
}
function cleanProduct(body, existing = {}) {
  const name = String(body.name ?? existing.name ?? "").trim().slice(0, 100);
  const nameEn = String(body.nameEn ?? existing.nameEn ?? "").trim().slice(0, 100);
  const price = Number(body.price ?? existing.price);
  const stock = Number(body.stock ?? existing.stock ?? 0);
  if (!name || !Number.isFinite(price) || price < 0 || !Number.isInteger(stock) || stock < 0) throw new Error("Name, valid price and stock are required.");
  return {
    id: existing.id || crypto.randomUUID(), name, nameEn,
    price, stock,
    category: String(body.category ?? existing.category ?? "Other").trim().slice(0, 40),
    description: String(body.description ?? existing.description ?? "").trim().slice(0, 500),
    descriptionEn: String(body.descriptionEn ?? existing.descriptionEn ?? "").trim().slice(0, 500),
    image: String(body.image ?? existing.image ?? "").trim().slice(0, 500),
    featured: body.featured === true || body.featured === "true" || (body.featured === undefined && !!existing.featured)
  };
}

app.get("/api/products", (_req, res) => res.json(readJson(PRODUCTS_FILE, [])));

// Public product engagement: order totals are calculated from real submitted orders.
app.get("/api/products/:id/engagement", (req, res) => {
  const product = readJson(PRODUCTS_FILE, []).find(p => p.id === req.params.id);
  if (!product) return res.status(404).json({ error: "Product not found." });
  const orders = readJson(ORDERS_FILE, []);
  const engagement = readJson(ENGAGEMENT_FILE, {});
  const item = engagement[req.params.id] || { likes: 0, dislikes: 0, comments: [] };
  const orderCount = orders.filter(o => (o.items || []).some(i => i.id === req.params.id)).length;
  res.json({ orders: orderCount, likes: item.likes || 0, dislikes: item.dislikes || 0, comments: (item.comments || []).slice(-30).reverse() });
});
app.post("/api/products/:id/reaction", (req, res) => {
  const exists = readJson(PRODUCTS_FILE, []).some(p => p.id === req.params.id);
  if (!exists) return res.status(404).json({ error: "Product not found." });
  const type = req.body && req.body.type;
  if (!["like", "dislike"].includes(type)) return res.status(400).json({ error: "Invalid reaction." });
  const data = readJson(ENGAGEMENT_FILE, {});
  data[req.params.id] ||= { likes: 0, dislikes: 0, comments: [] };
  data[req.params.id][type === "like" ? "likes" : "dislikes"]++;
  writeJson(ENGAGEMENT_FILE, data);
  res.status(201).json({ saved: true });
});
app.post("/api/products/:id/comments", (req, res) => {
  const exists = readJson(PRODUCTS_FILE, []).some(p => p.id === req.params.id);
  if (!exists) return res.status(404).json({ error: "Product not found." });
  const text = String((req.body || {}).text || "").trim();
  if (!text || text.length > 350) return res.status(400).json({ error: "አስተያየቱ ከ1 እስከ 350 ፊደል መሆን አለበት።" });
  const data = readJson(ENGAGEMENT_FILE, {});
  data[req.params.id] ||= { likes: 0, dislikes: 0, comments: [] };
  data[req.params.id].comments.push({ text, createdAt: new Date().toISOString() });
  writeJson(ENGAGEMENT_FILE, data);
  res.status(201).json({ saved: true });
});
app.get("/api/status", (_req, res) => res.json({ store: "AYU ZEMA", purpose: "Ethiopian traditional music instrument distribution", database: "persistent-local-json", ok: true }));


// A contact message is stored only after the visitor explicitly submits the form.
app.post("/api/messages", (req, res) => {
  const { name, phone, message } = req.body || {};
  if (!String(name || "").trim() || !/^[0-9+\-\s]{7,20}$/.test(String(phone || "")) || !String(message || "").trim()) {
    return res.status(400).json({ error: "Please complete your name, phone and message before sending." });
  }
  const messages = readJson(MESSAGES_FILE, []);
  const item = {
    id: "MSG-" + Date.now().toString().slice(-8),
    name: String(name).trim().slice(0, 100),
    phone: String(phone).trim().slice(0, 20),
    message: String(message).trim().slice(0, 1200),
    createdAt: new Date().toISOString()
  };
  messages.unshift(item);
  writeJson(MESSAGES_FILE, messages);
  res.status(201).json({ message: "Message sent", messageId: item.id });
});

app.post("/api/orders", (req, res) => {
  const { customerName, phone, address, note, items } = req.body || {};
  if (!String(customerName || "").trim() || !/^[0-9+\-\s]{7,20}$/.test(String(phone || "")) || !String(address || "").trim() || !Array.isArray(items) || !items.length) {
    return res.status(400).json({ error: "Please enter your name, valid phone, delivery address and items." });
  }
  const products = readJson(PRODUCTS_FILE, []);
  const orderItems = [];
  for (const item of items.slice(0, 30)) {
    const product = products.find(p => p.id === item.id);
    const qty = Math.floor(Number(item.quantity));
    if (!product || !Number.isInteger(qty) || qty < 1 || qty > 20 || product.stock < qty) {
      return res.status(400).json({ error: "One or more items are unavailable. Please refresh your cart." });
    }
    orderItems.push({ id: product.id, name: product.name, nameEn: product.nameEn, price: product.price, quantity: qty });
  }
  const total = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const orders = readJson(ORDERS_FILE, []);
  const order = {
    id: "AYZ-" + Date.now().toString().slice(-8),
    customerName: String(customerName).trim().slice(0, 100),
    phone: String(phone).trim().slice(0, 20),
    address: String(address).trim().slice(0, 300),
    note: String(note || "").trim().slice(0, 500),
    items: orderItems, total, status: "New", createdAt: new Date().toISOString()
  };
  orders.unshift(order);
  writeJson(ORDERS_FILE, orders);
  res.status(201).json({ message: "Order received", orderId: order.id });
});

app.post("/api/admin/login", loginLimiter, async (req, res) => {
  const username = process.env.ADMIN_USERNAME || "admin";
  const password = process.env.ADMIN_PASSWORD || "ChangeThisPassword123!";
  const { user, pass } = req.body || {};
  if (user !== username || !await bcrypt.compare(String(pass || ""), await bcrypt.hash(password, 10))) {
    return res.status(401).json({ error: "Incorrect username or password." });
  }
  req.session.admin = true;
  res.json({ message: "Logged in" });
});
app.post("/api/admin/logout", adminOnly, (req, res) => req.session.destroy(() => res.json({ message: "Logged out" })));
app.get("/api/admin/me", (req, res) => res.json({ authenticated: !!req.session.admin }));

app.get("/api/admin/orders", adminOnly, (_req, res) => res.json(readJson(ORDERS_FILE, [])));
app.get("/api/admin/messages", adminOnly, (_req, res) => res.json(readJson(MESSAGES_FILE, [])));
app.patch("/api/admin/orders/:id", adminOnly, (req, res) => {
  const orders = readJson(ORDERS_FILE, []);
  const order = orders.find(o => o.id === req.params.id);
  const allowed = ["New", "Confirmed", "Completed", "Cancelled"];
  if (!order) return res.status(404).json({ error: "Order not found." });
  if (!allowed.includes(req.body.status)) return res.status(400).json({ error: "Invalid order status." });
  order.status = req.body.status;
  writeJson(ORDERS_FILE, orders);
  res.json(order);
});

app.post("/api/admin/products", adminOnly, upload.single("photo"), (req, res) => {
  try {
    const products = readJson(PRODUCTS_FILE, []);
    const body = { ...req.body };
    if (req.file) body.image = "/uploads/" + req.file.filename;
    const product = cleanProduct(body);
    products.unshift(product);
    writeJson(PRODUCTS_FILE, products);
    res.status(201).json(product);
  } catch (e) { res.status(400).json({ error: e.message }); }
});
app.put("/api/admin/products/:id", adminOnly, upload.single("photo"), (req, res) => {
  try {
    const products = readJson(PRODUCTS_FILE, []);
    const index = products.findIndex(p => p.id === req.params.id);
    if (index < 0) return res.status(404).json({ error: "Product not found." });
    const body = { ...req.body };
    if (req.file) body.image = "/uploads/" + req.file.filename;
    products[index] = cleanProduct(body, products[index]);
    writeJson(PRODUCTS_FILE, products);
    res.json(products[index]);
  } catch (e) { res.status(400).json({ error: e.message }); }
});
app.delete("/api/admin/products/:id", adminOnly, (req, res) => {
  const products = readJson(PRODUCTS_FILE, []);
  const next = products.filter(p => p.id !== req.params.id);
  if (next.length === products.length) return res.status(404).json({ error: "Product not found." });
  writeJson(PRODUCTS_FILE, next);
  res.json({ message: "Product deleted." });
});

app.get("/admin", (_req, res) => res.sendFile(path.join(ROOT, "public", "admin.html")));
app.use((err, _req, res, _next) => {
  console.error(err.message);
  res.status(400).json({ error: err.message || "Request failed." });
});

app.listen(PORT, "0.0.0.0", () => console.log(`Ayu Zema is running at http://localhost:${PORT}`));

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, "data");
const UPLOAD_DIR = path.join(ROOT, "uploads");
const PRODUCTS_FILE = path.join(DATA_DIR, "products.json");
const ORDERS_FILE = path.join(DATA_DIR, "orders.json");
const MESSAGES_FILE = path.join(DATA_DIR, "messages.json");
const ENGAGEMENT_FILE = path.join(DATA_DIR, "engagement.json");
const BACKUP_DIR = path.join(DATA_DIR, "backups");

for (const dir of [DATA_DIR, UPLOAD_DIR, BACKUP_DIR]) fs.mkdirSync(dir, { recursive: true });

function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); }
  catch { return fallback; }
}
function writeJson(file, data) {
  // Keep the latest valid copy before replacing the persistent local database file.
  if (fs.existsSync(file)) {
    try { fs.copyFileSync(file, file + ".bak"); } catch (e) { console.error("Backup warning:", e.message); }
  }
  const temp = file + ".tmp";
  fs.writeFileSync(temp, JSON.stringify(data, null, 2), { encoding: "utf8", mode: 0o600 });
  fs.renameSync(temp, file);
}
if (!fs.existsSync(PRODUCTS_FILE)) writeJson(PRODUCTS_FILE, []);
if (!fs.existsSync(ORDERS_FILE)) writeJson(ORDERS_FILE, []);
if (!fs.existsSync(MESSAGES_FILE)) writeJson(MESSAGES_FILE, []);
if (!fs.existsSync(ENGAGEMENT_FILE)) writeJson(ENGAGEMENT_FILE, {});

app.disable("x-powered-by");
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(session({
  name: "ayu.sid",
  secret: process.env.SESSION_SECRET || "development-only-change-this-secret-before-deploying",
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 8 * 60 * 60 * 1000 }
}));
app.use(express.static(path.join(ROOT, "public")));
app.use("/uploads", express.static(UPLOAD_DIR));

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 8, standardHeaders: true, legacyHeaders: false });
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, crypto.randomUUID() + ext);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 4 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.mimetype)) return cb(new Error("Only JPG, PNG, WEBP or GIF images are allowed"));
    cb(null, true);
  }
});

function adminOnly(req, res, next) {
  if (!req.session.admin) return res.status(401).json({ error: "Please log in as admin." });
  next();
}
function cleanProduct(body, existing = {}) {
  const name = String(body.name ?? existing.name ?? "").trim().slice(0, 100);
  const nameEn = String(body.nameEn ?? existing.nameEn ?? "").trim().slice(0, 100);
  const price = Number(body.price ?? existing.price);
  const stock = Number(body.stock ?? existing.stock ?? 0);
  if (!name || !Number.isFinite(price) || price < 0 || !Number.isInteger(stock) || stock < 0) throw new Error("Name, valid price and stock are required.");
  return {
    id: existing.id || crypto.randomUUID(), name, nameEn,
    price, stock,
    category: String(body.category ?? existing.category ?? "Other").trim().slice(0, 40),
    description: String(body.description ?? existing.description ?? "").trim().slice(0, 500),
    descriptionEn: String(body.descriptionEn ?? existing.descriptionEn ?? "").trim().slice(0, 500),
    image: String(body.image ?? existing.image ?? "").trim().slice(0, 500),
    featured: body.featured === true || body.featured === "true" || (body.featured === undefined && !!existing.featured)
  };
}

app.get("/api/products", (_req, res) => res.json(readJson(PRODUCTS_FILE, [])));

// Public product engagement: order totals are calculated from real submitted orders.
app.get("/api/products/:id/engagement", (req, res) => {
  const product = readJson(PRODUCTS_FILE, []).find(p => p.id === req.params.id);
  if (!product) return res.status(404).json({ error: "Product not found." });
  const orders = readJson(ORDERS_FILE, []);
  const engagement = readJson(ENGAGEMENT_FILE, {});
  const item = engagement[req.params.id] || { likes: 0, dislikes: 0, comments: [] };
  const orderCount = orders.filter(o => (o.items || []).some(i => i.id === req.params.id)).length;
  res.json({ orders: orderCount, likes: item.likes || 0, dislikes: item.dislikes || 0, comments: (item.comments || []).slice(-30).reverse() });
});
app.post("/api/products/:id/reaction", (req, res) => {
  const exists = readJson(PRODUCTS_FILE, []).some(p => p.id === req.params.id);
  if (!exists) return res.status(404).json({ error: "Product not found." });
  const type = req.body && req.body.type;
  if (!["like", "dislike"].includes(type)) return res.status(400).json({ error: "Invalid reaction." });
  const data = readJson(ENGAGEMENT_FILE, {});
  data[req.params.id] ||= { likes: 0, dislikes: 0, comments: [] };
  data[req.params.id][type === "like" ? "likes" : "dislikes"]++;
  writeJson(ENGAGEMENT_FILE, data);
  res.status(201).json({ saved: true });
});
app.post("/api/products/:id/comments", (req, res) => {
  const exists = readJson(PRODUCTS_FILE, []).some(p => p.id === req.params.id);
  if (!exists) return res.status(404).json({ error: "Product not found." });
  const text = String((req.body || {}).text || "").trim();
  if (!text || text.length > 350) return res.status(400).json({ error: "አስተያየቱ ከ1 እስከ 350 ፊደል መሆን አለበት።" });
  const data = readJson(ENGAGEMENT_FILE, {});
  data[req.params.id] ||= { likes: 0, dislikes: 0, comments: [] };
  data[req.params.id].comments.push({ text, createdAt: new Date().toISOString() });
  writeJson(ENGAGEMENT_FILE, data);
  res.status(201).json({ saved: true });
});
app.get("/api/status", (_req, res) => res.json({ store: "AYU ZEMA", purpose: "Ethiopian traditional music instrument distribution", database: "persistent-local-json", ok: true }));


// A contact message is stored only after the visitor explicitly submits the form.
app.post("/api/messages", (req, res) => {
  const { name, phone, message } = req.body || {};
  if (!String(name || "").trim() || !/^[0-9+\-\s]{7,20}$/.test(String(phone || "")) || !String(message || "").trim()) {
    return res.status(400).json({ error: "Please complete your name, phone and message before sending." });
  }
  const messages = readJson(MESSAGES_FILE, []);
  const item = {
    id: "MSG-" + Date.now().toString().slice(-8),
    name: String(name).trim().slice(0, 100),
    phone: String(phone).trim().slice(0, 20),
    message: String(message).trim().slice(0, 1200),
    createdAt: new Date().toISOString()
  };
  messages.unshift(item);
  writeJson(MESSAGES_FILE, messages);
  res.status(201).json({ message: "Message sent", messageId: item.id });
});

app.post("/api/orders", (req, res) => {
  const { customerName, phone, address, note, items } = req.body || {};
  if (!String(customerName || "").trim() || !/^[0-9+\-\s]{7,20}$/.test(String(phone || "")) || !String(address || "").trim() || !Array.isArray(items) || !items.length) {
    return res.status(400).json({ error: "Please enter your name, valid phone, delivery address and items." });
  }
  const products = readJson(PRODUCTS_FILE, []);
  const orderItems = [];
  for (const item of items.slice(0, 30)) {
    const product = products.find(p => p.id === item.id);
    const qty = Math.floor(Number(item.quantity));
    if (!product || !Number.isInteger(qty) || qty < 1 || qty > 20 || product.stock < qty) {
      return res.status(400).json({ error: "One or more items are unavailable. Please refresh your cart." });
    }
    orderItems.push({ id: product.id, name: product.name, nameEn: product.nameEn, price: product.price, quantity: qty });
  }
  const total = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const orders = readJson(ORDERS_FILE, []);
  const order = {
    id: "AYZ-" + Date.now().toString().slice(-8),
    customerName: String(customerName).trim().slice(0, 100),
    phone: String(phone).trim().slice(0, 20),
    address: String(address).trim().slice(0, 300),
    note: String(note || "").trim().slice(0, 500),
    items: orderItems, total, status: "New", createdAt: new Date().toISOString()
  };
  orders.unshift(order);
  writeJson(ORDERS_FILE, orders);
  res.status(201).json({ message: "Order received", orderId: order.id });
});

app.post("/api/admin/login", loginLimiter, async (req, res) => {
  const username = process.env.ADMIN_USERNAME || "admin";
  const password = process.env.ADMIN_PASSWORD || "ChangeThisPassword123!";
  const { user, pass } = req.body || {};
  if (user !== username || !await bcrypt.compare(String(pass || ""), await bcrypt.hash(password, 10))) {
    return res.status(401).json({ error: "Incorrect username or password." });
  }
  req.session.admin = true;
  res.json({ message: "Logged in" });
});
app.post("/api/admin/logout", adminOnly, (req, res) => req.session.destroy(() => res.json({ message: "Logged out" })));
app.get("/api/admin/me", (req, res) => res.json({ authenticated: !!req.session.admin }));

app.get("/api/admin/orders", adminOnly, (_req, res) => res.json(readJson(ORDERS_FILE, [])));
app.get("/api/admin/messages", adminOnly, (_req, res) => res.json(readJson(MESSAGES_FILE, [])));
app.patch("/api/admin/orders/:id", adminOnly, (req, res) => {
  const orders = readJson(ORDERS_FILE, []);
  const order = orders.find(o => o.id === req.params.id);
  const allowed = ["New", "Confirmed", "Completed", "Cancelled"];
  if (!order) return res.status(404).json({ error: "Order not found." });
  if (!allowed.includes(req.body.status)) return res.status(400).json({ error: "Invalid order status." });
  order.status = req.body.status;
  writeJson(ORDERS_FILE, orders);
  res.json(order);
});

app.post("/api/admin/products", adminOnly, upload.single("photo"), (req, res) => {
  try {
    const products = readJson(PRODUCTS_FILE, []);
    const body = { ...req.body };
    if (req.file) body.image = "/uploads/" + req.file.filename;
    const product = cleanProduct(body);
    products.unshift(product);
    writeJson(PRODUCTS_FILE, products);
    res.status(201).json(product);
  } catch (e) { res.status(400).json({ error: e.message }); }
});
app.put("/api/admin/products/:id", adminOnly, upload.single("photo"), (req, res) => {
  try {
    const products = readJson(PRODUCTS_FILE, []);
    const index = products.findIndex(p => p.id === req.params.id);
    if (index < 0) return res.status(404).json({ error: "Product not found." });
    const body = { ...req.body };
    if (req.file) body.image = "/uploads/" + req.file.filename;
    products[index] = cleanProduct(body, products[index]);
    writeJson(PRODUCTS_FILE, products);
    res.json(products[index]);
  } catch (e) { res.status(400).json({ error: e.message }); }
});
app.delete("/api/admin/products/:id", adminOnly, (req, res) => {
  const products = readJson(PRODUCTS_FILE, []);
  const next = products.filter(p => p.id !== req.params.id);
  if (next.length === products.length) return res.status(404).json({ error: "Product not found." });
  writeJson(PRODUCTS_FILE, next);
  res.json({ message: "Product deleted." });
});

app.get("/admin", (_req, res) => res.sendFile(path.join(ROOT, "public", "admin.html")));
app.use((err, _req, res, _next) => {
  console.error(err.message);
  res.status(400).json({ error: err.message || "Request failed." });
});

app.listen(PORT, "0.0.0.0", () => console.log(`Ayu Zema is running at http://localhost:${PORT}`));
