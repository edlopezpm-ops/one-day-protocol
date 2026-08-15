# SOP 01 — Open it in your browser

**Time:** 1 minute. **You need:** a computer and any browser from the last few years.

---

## Steps

1. **Download.** Open the [latest release](../../../releases/latest) and click `one-day-protocol.zip`.
2. **Unzip.**
   - *Windows:* right-click the file → **Extract All** → **Extract**.
   - *Mac:* double-click the file.
   - Do not skip this. Opening `index.html` from *inside* a zip will not work.
3. **Open.** Go into the unzipped folder and double-click **`index.html`**.
4. Your browser opens with the map. Done.

## Bookmark it

Press `Ctrl+D` (`Cmd+D`) once it's open. Now it's one click away forever.

---

## The three tabs

- **Map** — the whole model.
  - Click any node with a small circle to fold or unfold it.
  - Drag the background to move around, scroll to zoom.
  - **Expand all** shows everything. **Fit** re-centres if you get lost.
  - **Details** hides the explanatory lines if you want just the skeleton.
- **Workbook** — the questions, with a box under each one. It saves while you type.
- **Game board** — your six answers as a game board. It fills in from the Workbook.

**Palette** switches between the two colour schemes. **Theme** switches light and dark.

---

## Saving your work

Your answers live in the browser's storage on this computer. They survive closing the tab and restarting the machine. They do **not** survive:

- clearing browsing data / cookies / site data,
- using a different browser or a different computer,
- private / incognito windows (which usually block storage entirely — the page will warn you at the top if so).

**So: press `Export Markdown` when you finish.** You get a `.md` file. That is your real copy. It opens in Obsidian, Notepad, TextEdit, Word, VS Code — anything.

`Copy all` puts the same text on your clipboard if downloads are blocked.
`Print / PDF` gives you a paper version — in the print dialog choose *Save as PDF* as the printer.

---

## If something looks wrong

| Symptom | Fix |
| --- | --- |
| Blank page, or the map never appears | You are opening it from inside the zip. Extract the folder first. |
| A red bar says storage is blocked | You're in a private window, or the browser blocks local files' storage. Use a normal window, and export often. |
| The map is a tiny cluster | Click **Fit**, then **Expand all**. |
| Download button does nothing | Use **Copy all** and paste into a text file. |
| Text is unreadably small | Zoom the page with `Ctrl` + `+`, or use the `+` button in the map toolbar. |

**Check it is intact:** open `index.html#selftest` (add `#selftest` to the address bar and press Enter). You should see a line starting with `PASS`. If it says `FAIL`, re-download.
