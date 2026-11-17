# Tech Pack Builder

A free app for making clothing tech packs. It works on a computer and on an iPhone, and replaces doing tech packs by hand in CorelDraw.

- **Factory Version**: the full working copy for you and your workers (4-page A4 landscape PDF).
- **Client Version**: a clean copy for clients (3 pages), saved as JPG pictures for Instagram or WhatsApp, or as a PDF.
- **Costing page**: the costs for each order. Costs are never shown in any tech pack.
- **Costing Sheet**: all your orders in one Excel file.

Everything is saved **on your device only**. Nothing is sent to a server.

---

## 1. Open and test the app on your computer

1. On the GitHub page of this project, press the green **Code** button, then **Download ZIP**.
2. Find the ZIP file in your Downloads folder. Right-click it and choose **Extract All** (Windows) or double-click it (Mac).
3. Open the new folder and double-click **index.html**. It opens in your web browser. Chrome or Edge work best.
4. Press **Factory Version**, then **+ New tech pack**, and fill in a test order.

> One feature needs internet: **background removal** (its first use downloads a free helper of about 40–80 MB). Everything else works offline.
> If there is no internet, the app uses a simpler background remover (best on white or plain backgrounds).

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

**Try the example first:** on the start screen press **Load the Glory Hoodie example** to see a finished tech pack.

1. **Start screen** → **Factory Version** → **+ New tech pack**.
2. The tech pack screen has the **form on the left** and a **live preview of the pages on the right** (on a phone: **Edit** and **Preview** tabs). Everything saves by itself ("Saved ✓" at the top).
3. Fill in the numbered sections. Tap a section to open or close it:
   - **01 Order details**: style name, style no., client, designer, stage, main fabric, total order, sample size, dates, description.
   - **02 Summary & revisions**: short facts (garment, fit, fabric…) and the revisions table.
   - **03 Colourways**: front, back and side picture per colour. **The background is removed automatically** after each upload. Tap **Undo** on the green chip if it goes wrong. **Crop / size** is still there.
   - **04 Points of interest**: tap a callout to select it, then tap the drawing where it goes. A red numbered pin appears on the tech pack.
   - **05 Artwork & printing**: artwork cards (picture, name, technique, ink colour, size, placement), client logos, printing table.
   - **06 Fabric & pattern**: fabric (with GSM and fabric store), pattern name and code, bill of materials.
   - **07 Trims & hardware**: zippers, eyelets, aglets, drawcords, labels… with a photo. They are added to the bill of materials automatically.
   - **08 Measurements**: inches or cm, tolerance, the how-to-measure drawing (or tap **Use the standard hoodie drawing**), and the measurement table. The sample size column is highlighted.
   - **09 Colours, labels, packaging & wash**.
   - **10 Quantities & progress**: pieces per colour and size (these columns are also your size range), plus the progress tracker.
   - **11 Notes**: tick **Client** for notes the client should see.
   - **12 Costing**: opens the costing page.
4. Above the preview, choose **Factory Version** or **Client Version**.
   - **Factory → Save PDF**: the print window opens. Choose **Save as PDF** (iPhone: tap **Share** → **Save to Files**). Text stays sharp. When you close the print window, the app goes straight to **Costing**.
   - **PDF file (picture)**: a backup way to make the PDF if the print window gives trouble.
   - **Client → Save JPG pictures**: one picture per page, with **Share** on the phone (WhatsApp, Instagram). **Save PDF** works for the client copy too.
5. Before saving, the app shows a friendly **check list**: total order vs. quantities, units on sizes and measurements, description vs. garment type. You can fix them first or continue anyway.
6. **Costing**: type the costs (empty boxes count as zero) and press **Save to Costing Sheet**.
7. **📊 Costing Sheet** (top bar): all orders, **Download Excel file**.
8. On the start screen, **Duplicate** copies an old tech pack for a new order.

**The Factory PDF** has 4 pages: Overview & Colourways · Artwork & Points of Interest · Materials, Trims & Hardware · Measurements & Production.
**The Client copy** has 3 pages. It never shows costs, fabric stores, suppliers, pattern codes or the progress tracker.
If something is too long for a page (many trims or notes), it continues on an extra page with the same header and footer. Empty sections are left out.

How some costs are worked out:
- **Shipping**: total kg for the whole order × price per kg, then divided by the number of pieces.
- **One-off costs** (sample, screen setup and so on): divided by the number of pieces.
- **Custom labels, tags and bags**: the fixed price (from Settings) ÷ the quantity you type, for example 8,000 ÷ 100 = 80 PKR per poly bag.

**Settings** also has: the footer website / Instagram (`@blaze_impex`), your own logo (leave empty for the Blaze Impex logo), and an on/off switch for automatic background removal.

---

## Map of the files (for future changes)

| File | What it does |
|---|---|
| `index.html` | The page that loads everything |
| `css/styles.css` | How the app screens look |
| `css/techpack.css` | How the tech pack pages look (A4 landscape design system, also used for printing) |
| `js/core.js` | Small shared tools (buttons, pop-ups, messages, downloads, sharing) |
| `js/db.js` | Saving on the device |
| `js/model.js` | What a tech pack contains, totals, checks before export, deadline warning, duplicating, upgrading old tech packs |
| `js/settings.js` | Settings page and backup / restore |
| `js/images.js` | Uploading pictures, automatic background removal + undo, crop / rotate / size |
| `js/assets.js` | Built-in Blaze Impex logos and the standard hoodie measuring drawing |
| `js/sample.js`, `js/sample-images.js` | The Glory Hoodie example |
| `js/doc.js` | Builds the tech pack pages (factory and client), continues long sections on extra pages |
| `js/export.js` | Sharp PDF (print), picture PDF, client JPGs |
| `js/home.js` | Start screen |
| `js/editor.js` | Tech pack screen: numbered form sections + live preview |
| `js/costing.js` | Costing page, Costing Sheet and Excel |
| `js/app.js` | Moving between screens, top bar |
| `sw.js`, `manifest.webmanifest`, `icons/` | iPhone home screen icon and offline use |
| `vendor/`, `fonts/` | Free helper libraries (PDF, picture, Excel) and the Inter fonts |

Free tools used: html2canvas, jsPDF, SheetJS, IMG.LY background removal (loaded from the internet only when a background is removed), Inter and Inter Tight fonts.
