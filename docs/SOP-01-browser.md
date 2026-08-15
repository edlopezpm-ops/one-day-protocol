# SOP 01 — Open it in your browser

Everything the [README](../README.md) skips: what each control does, and what to do when something misbehaves.

---

## Using the map

- **Click the button in the middle** to open the first level. Keep clicking to go deeper.
- Every node opens — branches reveal their children, end points reveal a short explanation. The small circle on a node's right edge means it has children; the number in the pill is how many.
- **Scroll** the map like any other page — the wheel never zooms. You can also drag the background to move around.
- Clicking a node never moves the map out from under you: the node you clicked stays put and the map grows around it.
- **Expand all** opens everything at once. **Contract all** takes you back to the single button. **Fit to screen** scales the map so its full width is visible — you then scroll down through it, which keeps the text readable instead of shrinking an 8000-pixel-tall map into one screen.
- **Palette** switches between the two colour schemes; **Theme** switches light and dark. Both are remembered.

## Saving your work

Answers live in this browser's storage on this computer. They survive closing the tab and restarting the machine. They do **not** survive clearing browsing data, switching browser or computer, or private windows — which usually block storage outright, in which case a red bar appears at the top.

So: press **Export Markdown** when you finish. You get a `.md` file that opens in Obsidian, Notepad, TextEdit, Word, VS Code, anything.

- **Copy all** — same text to your clipboard, for when downloads are blocked.
- **Print / PDF** — paper version. Choose *Save as PDF* as the printer.
- **Erase my answers** — permanent, with a confirmation.

## Calendar reminders

In the Workbook, under *Part 2*, pick a date and press **Download reminders (.ics)**. Open the downloaded file and your calendar creates the six alarms. They need to fire on the device that's with you, so do this on your phone, or email yourself the file and open it there.

---

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| Blank page, or the map never appears | You're opening it from inside the zip. Extract the folder first. |
| Red bar about storage | Private window, or the browser blocks local-file storage. Use a normal window and export often. |
| Lost in the map | **Contract all** to start over from the single button. |
| Download button does nothing | Use **Copy all**, paste into a text file. |
| Text too small | `Ctrl` + `+` (`Cmd` + `+`) zooms the whole page, as on any website. |

**To check the file is intact:** add `#selftest` to the address bar and press Enter. You should see a line starting with `PASS`. `FAIL` means a corrupted download — get it again.
