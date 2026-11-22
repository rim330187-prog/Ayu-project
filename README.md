# AYU ZEMA V4 — Traditional Music Instrument Distribution

## Run on Android with Termux
Keep the project in Termux home storage (private internal app storage), NOT in `/storage/emulated/0/Download`, because Android shared storage blocks npm symlinks.

```bash
cd ~/storage/downloads
unzip -o ayu-zema-nodejs-project-v4.zip
cp -r ayu-zema ~/ayu-zema-v4
cd ~/ayu-zema-v4
npm install
npm start
```
Open `http://localhost:3000` on the same phone. Admin: `http://localhost:3000/admin`. Default login: username `admin`, password `ChangeThisPassword123!` (change these with environment variables before public deployment).

## Add your own images
The project ZIP already includes `Realimage.jpg` and `Logo.jpg` inside `public/images/`.


## Persistent database
Products, orders, and sent messages are stored in `data/products.json`, `data/orders.json`, and `data/messages.json`. Data remains after server restarts as long as this project folder is kept. Before each update, the previous database file is preserved as a `.bak` file. Back up the entire `data/` and `uploads/` folders before replacing/upgrading the project. This is local storage on this phone; for data to survive phone loss, back up or deploy to a hosted server with persistent storage.

## Brand
AYU ZEMA is an Ethiopian traditional music instrument distribution store: Krar, Masenqo, Washint, Kebero and related accessories. Palette: blue, bright red, white, black, green and yellow.


## Customer Website V5
- Dark navy and warm gold customer-facing design.
- Top navigation links to Home, Products, About and Contact pages.
- Product cards open a full-screen product viewer with likes, dislikes, comments and order totals.
- Amharic / English toggle updates customer navigation and main page content.
- Products are loaded from the admin-managed `/api/products` data; no demo product is seeded.


## V6: Scrolling home page and Google comments
The home page navigation scrolls to Home, Products, About, Comments and Contact. The separate Products/About/Contact pages remain available.

### Enable Google comments
1. Create a Firebase project and add a Web App.
2. Copy its web config into `public/firebase-config.js`.
3. Enable Google under Firebase Authentication > Sign-in method.
4. Create a Firestore database and publish the rules in `firestore.rules`.
5. Add your deployed domain under Authentication > Settings > Authorized domains.

Until Firebase is configured, the page displays a setup message and keeps comment submission disabled. Never put service-account private keys in frontend files.
