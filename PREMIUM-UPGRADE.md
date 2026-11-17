# Tech Pack Builder: Premium Upgrade Brief

You are upgrading the existing Blaze Impex Tech Pack Builder app in this folder. Read the whole codebase first. Do not start from scratch, and do not remove any feature that already works.

Two reference files sit next to this brief:

- `Blaze Impex - Glory Hoodie Tech Pack.pdf`: the target look for the PDF. Match its typography, spacing, black header band, info strip, numbered sections, callout pins, tables and footer as closely as you can.
- `techpack-maker.html`: a working single-file version of that design. Its CSS (everything under `TECH PACK DOCUMENT`) is the design system. Reuse its class structure, sizes (mm units on an A4 landscape page) and colours rather than inventing new ones. Its editor shows how tap-to-place callout pins work.

The owner is not technical. Make sensible decisions yourself, keep the app working at every step, and explain what changed in plain words at the end.

---

## 1. Keep everything that exists

Keep and restyle, never delete:

- The start screen choice: **Factory Version** and **Client Version**.
- Factory Version: full details, pattern name and pattern code, extra notes, part-by-part **Urdu translation**, and the **costing page that saves to Excel**.
- Client Version: saved as JPG, no approve button, no costs.
- The **AI background remover** for uploaded photos.
- All current fields: client/brand, manufacturer, total order, start date, end date, order description, design pictures (front/back), logo, fabric table (part, fabric type, GSM, fabric store), pattern table (part, pattern name, pattern code), printing table (part, print type), colours and sizes quantity grid with totals, labels and packaging (woven label, hangtag/card, packaging), extra notes, and the production progress tracker (fabric bought, cutting, printing, stitching, packing, shipped).

## 2. Brand and look

- Logo: the Blaze Impex wordmark (white "BLAZE" with spaced "IMPEX" beneath). Use the white version on black, the black version on white. Pull it from the existing app assets or from the images embedded in `techpack-maker.html`.
- Palette: ink `#0D0D0D`, paper `#FFFFFF`, warm tint `#F5F3EF`, hairline `#E4E1DB`, muted text `#7A7873`, single accent red `#B8202E` (used only for section numbers, callout pins and measurement lines).
- Type: Inter for text, Inter Tight for headings. Uppercase labels get letter-spacing. Use Noto Nastaliq Urdu for the Urdu text, placed in smaller grey text under each English label (factory version only).
- No heavy blue table headers, no thick gridlines, no spreadsheet look. Tables use one black rule under the header and hairlines between rows.

## 3. The PDF (A4 landscape)

Every page has:
- **Header band** (black, 24 mm): logo on the left, "TECHNICAL PACKAGE" plus the page title in the middle, style number, client and style name on the right.
- **Info strip**: Client, Designer, Style No., Style Name, Date, Stage, Main Fabric, Size range with the sample size highlighted.
- **Footer**: small black logo, website (default `@blaze_impex`, editable in settings), "Factory copy · Confidential" or "Client copy", and page number like `02 / 04`. No phone numbers or addresses.

### Factory Version: 4 pages

1. **Overview & Colourways**: one row per colourway (up to 3) with number, colour name, swatch, Pantone/wash note, tag (for example "Zip-up · 1 sample"), and front, back and side images. Right column: Summary (garment, fit, fabric, finish, closure, decoration, drawstrings, quantity) and Revisions table.
2. **Artwork & Points of Interest**: front and back views of colourway 1 with red numbered pins, a callout list under each view, then Artwork Detail cards (image, name, technique, ink/thread colour, size in inches, placement) and the Printing table.
3. **Materials, Trims & Hardware**: Fabric table, Pattern table (name and code), and the new **Trims & Hardware** section (see section 4), with photos.
4. **Measurements & Production**: how-to-measure drawing with lettered points (A, B, C, D…), measurement spec table (point, name, how to measure, every size, tolerance ±, sample size column highlighted), colour swatches, labels and packaging, wash and finish, colours-and-sizes quantity grid with totals, production progress tracker, factory notes (numbered), and sign-off lines: Prepared by, Client approval, Factory sign-off.

The costing page stays as it is (Excel export) but restyle its screen to match.

### Client Version: 3 pages

Same as factory pages 1, 2 and 4, but leave out costs, fabric store and supplier names, pattern codes, Urdu text and the progress tracker. Export each page as a JPG (as now) and also offer a PDF.

### PDF quality

- Text must be sharp. If the current method renders the page as a picture, switch to a method that keeps text as real text (for example printing the HTML page to PDF through the browser engine). If that isn't possible in this stack, render at 3× resolution at least.
- Nothing may run off a page. If a section is too long (many trims or notes), continue it on an extra page with the same header and footer.

## 4. New: Trims & Hardware section

A repeatable list. Each item has:
- Type (dropdown: Zipper, Zipper puller, Eyelet/grommet, Aglet, Drawcord, Button, Snap, Rivet, Cord stopper, Elastic, Velcro, Woven label, Hangtag, Size label, Care label, Patch, Other)
- Description, size (with units, for example `1"` tape or `20 mm`), colour/finish (for example gunmetal, tonal, matte black), placement, quantity per garment, supplier (factory version only), and a photo.
- Show them as neat cards with the photo on the left and details on the right, 2 per row.

Add the matching Trims & Hardware rows to the Bill of Materials automatically.

## 5. App screens

- Same look as the PDF: black top bar with the logo, form on the left, live preview of the pages on the right that updates as you type. On a phone, Edit and Preview tabs.
- Form sections, each collapsible and numbered: Order details, Summary & revisions, Colourways, Points of interest, Artwork & printing, Fabric & pattern, Trims & hardware, Measurements, Colours/labels/packaging/wash, Quantities & progress, Notes, Costing (factory only).
- **Photo upload**: after any upload, run the AI background remover automatically and show a small "Background removed · Undo" chip. Trim empty space around the garment so drawings sit at the same size.
- **Callout pins**: pick a callout, tap the drawing to place its number (as in `techpack-maker.html`).
- **Measurements**: size columns come from the size range field. Sample size column is highlighted.
- **Checks before export** (shown as a friendly list, not a blocker):
  - Total order must equal the colours-and-sizes grand total.
  - Every measurement needs a unit; label sizes need units (inches or cm).
  - Order description should match the garment type.
  - Any empty section is hidden from the PDF instead of printing blank boxes.
- Autosave drafts, and a list of saved tech packs to reopen, duplicate or delete.

## 6. When you finish

1. Run the app and produce one factory PDF and one client export using the Glory Hoodie sample data from `techpack-maker.html`. Compare them with `Blaze Impex - Glory Hoodie Tech Pack.pdf` and fix differences.
2. Tell the owner in plain words: what's new, where to click, and anything you could not do.
