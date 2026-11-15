# Tech Pack Builder

A free app for making clothing tech packs. It works on a computer and on an iPhone, and replaces doing tech packs by hand in CorelDraw.

- **Factory Version**: the full working copy for you and your workers. It saves as a PDF and can show Urdu.
- **Client Version**: a clean copy for clients. It saves as a JPG picture for Instagram or WhatsApp.
- **Costing page**: the costs for each order. Costs are never shown in any tech pack.
- **Costing Sheet**: all your orders in one Excel file.

Everything is saved **on your device only**. Nothing is sent to a server.

---

## 1. Open and test the app on your computer

1. On the GitHub page of this project, press the green **Code** button, then **Download ZIP**.
2. Find the ZIP file in your Downloads folder. Right-click it and choose **Extract All** (Windows) or double-click it (Mac).
3. Open the new folder and double-click **index.html**. It opens in your web browser. Chrome or Edge work best.
4. Press **Factory Version**, then **+ New tech pack**, and fill in a test order.

> Two features need internet: **background removal** (its first use downloads a free helper of about 40–80 MB) and **Urdu translation**. Everything else works offline.
> If there is no internet, the app uses a simpler background remover (best on white or plain backgrounds), and basic garment words are translated from a built-in word list.

## 2. Put it online for free

Putting it online gives you a web address you can open on your iPhone.

**Easiest way: Netlify Drop (free, about 2 minutes)**

1. Go to **https://app.netlify.com/drop** and make a free account (you can sign in with Google or GitHub).
2. Drag the whole app folder (the one with `index.html` inside) onto the page.
3. Wait a few seconds. Netlify gives you an address like `https://something-funny-123.netlify.app`.
4. Optional: under **Site configuration → Change site name** you can rename it, for example `blaze-techpacks`.
5. **To update later:** open your site on Netlify, go to **Deploys**, and drag the new folder onto it.

**Other way: GitHub Pages** (free if this GitHub project is *public*): in this project on GitHub, go to **Settings → Pages**, set Source to "Deploy from a branch", pick the `main` branch and the `/ (root)` folder, then press **Save**. After 1–2 minutes your address appears on the same page.

> Your tech packs are **not** uploaded when you put the app online. Only the empty app goes online. Your data stays inside each device's browser.

## 3. Add it to your iPhone home screen

1. On your iPhone, open **Safari** (it must be Safari) and go to your app's online address.
2. Tap the **Share** button (the square with an arrow pointing up) at the bottom.
3. Scroll down and tap **Add to Home Screen**, then tap **Add**.
4. A blue T-shirt icon called **Tech Packs** appears. Open the app from this icon from now on.

Notes for the iPhone:
- The phone and the computer keep **separate** tech packs. To move tech packs from one to the other, use **Settings → Download backup** on one device and **Restore from backup** on the other.
- When you save a PDF or picture, press **Share** to send it on WhatsApp or Instagram, or **Save to Files**.

## 4. Keep a backup before making big changes

**Back up your tech packs (do this every week, and before any big change):**
1. In the app, tap **⚙️ Settings**.
2. Tap **Download backup**. A file named like `Tech Pack Backup 2026-11-15.json` is saved. On the iPhone, choose **Save to Files** or send it to yourself on WhatsApp or email.
3. Keep it somewhere safe, such as Google Drive or email.
4. To bring it back: **Settings → Restore from backup**, then pick the file.

**Back up the app itself (before asking for big changes):**
- Download the ZIP from GitHub (step 1 above) and keep it, for example `techpack-app-2026-11-15.zip`. Every change is also stored in GitHub's history, so an older version can always be brought back.

---

## How to use it (quick guide)

1. **Start screen** → **Factory Version** → **+ New tech pack**.
2. Fill in **Details**. Everything saves by itself (you'll see "Saved ✓" at the top).
   - Pictures: **Add front picture** → **Remove background** (press **Undo background** if it goes wrong) → **Crop / size**.
   - Colours and sizes: add a row for each colour and type the pieces per size. Sizes with 0 pieces are hidden in the final tech pack. If the total doesn't match the order total, a red warning shows.
   - Extra notes: tick **Client** for notes the client should see.
   - **Urdu**: switch on Urdu for any section, or press **All Urdu**. A box appears where you can check and correct the Urdu.
3. **🏭 Factory** tab: tick off the progress stages, then press **Save as PDF**. When the PDF is saved, the app takes you straight to the **Costing** page.
4. **💰 Costing** tab: type the costs (empty boxes count as zero) and press **Save to Costing Sheet**.
5. **📸 Client** tab: press **Save as picture (JPG)**, then **Share**.
6. **📊 Costing Sheet** (at the top): see all orders and **Download Excel file**.
7. On the start screen, **Duplicate** copies an old tech pack so you can start a new order quickly.

How some costs are worked out:
- **Shipping**: total kg for the whole order × price per kg, then divided by the number of pieces.
- **One-off costs** (sample, screen setup and so on): divided by the number of pieces.
- **Custom labels, tags and bags**: the fixed price (from Settings) ÷ the quantity you type, for example 8,000 ÷ 100 = 80 PKR per poly bag.

---

## Map of the files (for future changes)

| File | What it does |
|---|---|
| `index.html` | The page that loads everything |
| `css/styles.css` | Colours and layout. Part 1 is the app screens; Part 2 is the PDF/JPG tech pack design |
| `js/core.js` | Small shared tools (buttons, pop-ups, messages, downloads, sharing) |
| `js/db.js` | Saving on the device |
| `js/model.js` | What a tech pack contains, totals, deadline warning, duplicating |
| `js/settings.js` | Settings page and backup / restore |
| `js/images.js` | Uploading pictures, background removal, crop / rotate / size |
| `js/urdu.js` | Urdu words and translation |
| `js/home.js` | Start screen |
| `js/editor.js` | Details form |
| `js/sheets.js` | Factory and Client tech pack layouts |
| `js/export.js` | Making the PDF and the JPG |
| `js/costing.js` | Costing page, Costing Sheet and Excel |
| `js/app.js` | Moving between screens |
| `sw.js`, `manifest.webmanifest`, `icons/` | iPhone home screen icon and offline use |
| `vendor/`, `fonts/` | Free helper libraries (PDF, picture, Excel) and the Urdu font |

Free tools used: html2canvas, jsPDF, SheetJS, IMG.LY background removal (loaded only when you press "Remove background"), Noto Nastaliq Urdu font.
