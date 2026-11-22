from pathlib import Path
import json, shutil
root=Path('/mnt/data/ayuwork/ayu-zema')
# backend: eliminate automatic seed catalogue and add durable product engagement endpoints
p=root/'server.js'; s=p.read_text(encoding='utf-8')
s=s.replace('const MESSAGES_FILE = path.join(DATA_DIR, "messages.json");','const MESSAGES_FILE = path.join(DATA_DIR, "messages.json");\nconst ENGAGEMENT_FILE = path.join(DATA_DIR, "engagement.json");')
start=s.index('if (!fs.existsSync(PRODUCTS_FILE)) {')
end=s.index('if (!fs.existsSync(ORDERS_FILE))', start)
s=s[:start]+'if (!fs.existsSync(PRODUCTS_FILE)) writeJson(PRODUCTS_FILE, []);\n'+s[end:]
s=s.replace('if (!fs.existsSync(MESSAGES_FILE)) writeJson(MESSAGES_FILE, []);','if (!fs.existsSync(MESSAGES_FILE)) writeJson(MESSAGES_FILE, []);\nif (!fs.existsSync(ENGAGEMENT_FILE)) writeJson(ENGAGEMENT_FILE, {});')
needle='app.get("/api/products", (_req, res) => res.json(readJson(PRODUCTS_FILE, [])));'
insert='''app.get("/api/products", (_req, res) => res.json(readJson(PRODUCTS_FILE, [])));

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
});'''
s=s.replace(needle,insert)
p.write_text(s,encoding='utf-8')
# wipe all starter products so the shop opens empty
(root/'data/products.json').write_text('[]\n',encoding='utf-8')
(root/'data/engagement.json').write_text('{}\n',encoding='utf-8')
# replace homepage with richer stacked customer landing page
index='''<!doctype html><html lang="am"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#090f1d"><meta name="description" content="አዩ ዜማ — የኢትዮጵያ ባህላዊ ሙዚቃ መሣሪያዎች።"><title>አዩ ዜማ | AYU ZEMA</title><link rel="stylesheet" href="/style.css"><link rel="icon" href="/images/Logo.jpg"></head><body>
<header class="topbar"><a class="brand" href="/"><img class="brand-logo" src="/images/Logo.jpg" alt="Ayu Zema"><span><b>አዩ ዜማ</b><small>TRADITIONAL MUSIC DISTRIBUTION</small></span></a><nav><a class="active" href="/">መነሻ</a><a href="/products.html">ምርቶች</a><a href="/about.html">ስለ እኛ</a><a href="/contact.html">አግኙን</a></nav><div class="actions"><button id="langBtn" class="lang">EN</button><a class="cart-btn" href="/cart.html">🛒 ቅርጫት <b id="cartCount">0</b></a></div></header>
<main><section class="hero home-hero" id="home"><div class="hero-copy"><span class="eyebrow">ETHIOPIAN TRADITIONAL MUSIC · ETHIOPIA</span><h1>ባህላችንን<br><em>በዜማ</em> እናቆይ</h1><p>የኢትዮጵያ ባህላዊ የሙዚቃ መሣሪያዎችን በአንድ ቦታ ያግኙ። የሚወዱትን ምርት ይመልከቱ፣ ዝርዝሩን ይክፈቱና ትዕዛዝ ያስገቡ።</p><div class="hero-actions"><a class="gold-btn" href="/products.html">ምርቶችን ይመልከቱ ↗</a><a class="outline-btn" href="/about.html">ስለ አዩ ዜማ</a></div><div class="hero-mini-stats"><span><b>♫</b> ባህላዊ ጥበብ</span><span><b>📦</b> ቀጥታ ትዕዛዝ</span></div></div><div class="hero-art"><div class="art-orbit"></div><div class="hero-symbol">♫</div><span class="art-caption">CRAFTED WITH CULTURE</span></div></section>
<section class="trust-strip"><div><b>01</b><span>ባህላዊ መሣሪያዎች</span></div><div><b>02</b><span>ቀላል የግዢ ሂደት</span></div><div><b>03</b><span>ቀጥታ የደንበኛ ግንኙነት</span></div></section>
<section class="section home-products" id="collection"><div class="section-head"><div><span class="eyebrow">OUR COLLECTION</span><h2>የምርት ስብስባችን</h2><p class="muted">ከታች ያሉትን ምርቶች ይንኩና በሙሉ ስክሪን ዝርዝራቸውን ይመልከቱ።</p></div><a class="text-link" href="/products.html">ሁሉንም ይመልከቱ →</a></div><div id="featuredProducts" class="product-grid"><p class="empty-products">ምርቶች በመጫን ላይ...</p></div></section>
<section class="craft-banner" id="how-to-order"><span class="eyebrow">HOW TO ORDER</span><h2>የሚወዱትን ይምረጡ፤ ትዕዛዝዎን ያስገቡ</h2><p>ምርቱን ይክፈቱ፣ ዋጋውንና የተደረጉ ትዕዛዞችን ይመልከቱ፣ ወደ ቅርጫት ይጨምሩና የመላኪያ መረጃዎን ያስገቡ።</p><a class="gold-btn" href="/products.html">ምርት ይምረጡ ↗</a></section>
<section class="home-contact" id="contact"><div><span class="eyebrow">GET IN TOUCH</span><h2>ጥያቄ አለዎት?</h2><p>ለምርት፣ ለዋጋ ወይም ለትዕዛዝ በቀጥታ ያግኙን።</p></div><a class="outline-btn" href="/contact.html">አግኙን →</a></section></main>
<footer><div><b>አዩ ዜማ · AYU ZEMA</b><p>የኢትዮጵያ ባህላዊ ሙዚቃ መሣሪያዎች ማከፋፈያ</p></div><div><a href="/products.html">ምርቶች</a><a href="/about.html">ስለ እኛ</a><a href="/contact.html">አግኙን</a></div><div>☎ 0978200068<br><a href="https://www.tiktok.com/@ayelebogale" target="_blank" rel="noopener">TikTok @ayelebogale</a></div></footer><script src="/app.js"></script></body></html>'''
(root/'public/index.html').write_text(index,encoding='utf-8')
# product page gets stronger top section nav and a full-width collection intro
products='''<!doctype html><html lang="am"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#090f1d"><title>ምርቶች | AYU ZEMA</title><link rel="stylesheet" href="/style.css"><link rel="icon" href="/images/Logo.jpg"></head><body>
<header class="topbar"><a class="brand" href="/"><img class="brand-logo" src="/images/Logo.jpg" alt="Ayu Zema"><span><b>አዩ ዜማ</b><small>TRADITIONAL MUSIC DISTRIBUTION</small></span></a><nav><a href="/">መነሻ</a><a class="active" href="/products.html">ምርቶች</a><a href="/about.html">ስለ እኛ</a><a href="/contact.html">አግኙን</a></nav><div class="actions"><button id="langBtn" class="lang">EN</button><a class="cart-btn" href="/cart.html">🛒 ቅርጫት <b id="cartCount">0</b></a></div></header>
<main class="page-main catalog-page"><section class="catalog-hero"><span class="eyebrow">AYU ZEMA COLLECTION</span><h1>የባህላዊ ሙዚቃ መሣሪያዎች</h1><p>ምርትን ይምረጡ። ሙሉ ስክሪን ዝርዝሩን ይመልከቱ፤ Like፣ Dislike፣ Comment እና የትዕዛዝ ብዛት ያግኙ።</p><div class="catalog-tools"><input id="search" class="search" placeholder="ምርት ፈልግ / Search"><select id="category" class="search"><option value="">ሁሉም ዓይነቶች</option><option>Krar</option><option>Traditional Instruments</option><option>Wind Instruments</option><option>Percussion</option><option>Accessories</option></select></div></section><section class="catalog-list-section" id="all-products"><div class="section-head"><div><span class="eyebrow">ALL PRODUCTS</span><h2>ሁሉም ምርቶች</h2></div><span class="catalog-note">ምርት ለመክፈት ይንኩ ↗</span></div><div id="products" class="product-grid"></div></section></main>
<footer><div>© AYU ZEMA</div><div><a href="/contact.html">አግኙን</a><a href="/admin">Admin</a></div><div>☎ 0978200068</div></footer><script src="/app.js"></script></body></html>'''
(root/'public/products.html').write_text(products,encoding='utf-8')
# Add a compact section-anchor subnav to other customer pages by retaining their existing content.
for fn in ['about.html','contact.html','cart.html']:
    p=root/'public'/fn; t=p.read_text(encoding='utf-8')
    # mark current page active based on filename
    t=t.replace('<nav><a href="/">መነሻ</a>', '<nav><a href="/">መነሻ</a>')
    t=t.replace('</nav><div class="actions">','</nav><div class="actions">')
    p.write_text(t,encoding='utf-8')
