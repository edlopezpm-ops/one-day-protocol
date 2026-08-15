![The One-Day Protocol](docs/img/banner.png)

Internal repo for **The One-Day Protocol** — a study aid built from the mind map of Dan Koe's *"How to fix your entire life in 1 day."*

**Live:** https://edlopezpm-ops.github.io/one-day-protocol/ · **[Ship log](https://github.com/edlopezpm-ops/one-day-protocol/releases)** · Built with **[AEKR](https://aekr.io)** · **[@__aerk](https://www.instagram.com/__aerk/)**

> If you were sent here to *use* the thing, don't read this file — open the live link, or grab a copy from [releases](https://github.com/edlopezpm-ops/one-day-protocol/releases/latest). The end-user guides are in [docs/](docs/).

---

## The one rule

**Everything generates from [`data/model.json`](data/model.json).** The app, the Obsidian notes, the canvas, the worksheet — all of it. Edit the model, run the build, commit what falls out.

Never hand-edit a generated file. Your change will be silently overwritten on the next build.

| Generated — don't touch | Source — edit these |
| --- | --- |
| `One Day Protocol.html` | `data/model.json` (all content) |
| `index.html` (identical copy, for hosting) | `tools/template.html` (the app) |
| `vault/**` (notes, canvas, worksheet) | `tools/*.mjs` (build, package, test) |
| `dist/**` (release bundles) | `docs/**`, `README.md`, `CREDITS.md` |

## Working on it

```bash
node tools/build.mjs      # regenerate everything from the model
node tools/uitest.mjs     # drive a real browser and check it actually works
node tools/package.mjs    # stage + zip the release bundles into dist/
```

Run all three before cutting a release. `build` refuses to write output that fails its checks; `uitest` needs Edge or Chrome installed and nothing else.

## Why there are two test suites

`One Day Protocol.html#selftest` runs **in-page** — open it in a browser and you get `PASS n/n`. It calls the app's functions directly, so it verifies logic and layout maths.

**It cannot tell you whether a human clicking the thing gets a result.** It once reported `PASS 574/574` on a build where every click was dead, because pointer capture was swallowing the events and calling `toggle()` directly never touched that path.

`tools/uitest.mjs` exists for that. It drives Chrome DevTools Protocol with real mouse, touch and wheel input — hit-tested, subject to pointer capture, like a person's. It also checks rendered text size, contrast floors in both themes, print completeness, and a 390px phone pass. It takes a path or a URL:

```bash
node tools/uitest.mjs                                          # the local build
node tools/uitest.mjs https://edlopezpm-ops.github.io/one-day-protocol/   # a deployment
```

**When you fix a bug, revert the fix and confirm the new test fails.** A test that passes both ways is decoration.

## What the build refuses to ship

`tools/build.mjs` fails the build — not warns — if any of these break:

- the app stops crediting Dan Koe or @MindBranches, or loses the aekr.io / Instagram links;
- anything would load over the network (the page must work with the Wi-Fi off, so every asset is inline or a `data:` URI);
- a wiki-link in the vault points at a note that doesn't exist;
- a canvas node has broken geometry, or an edge points at a missing node;
- two notes would collide on one filename, or a node lacks an id or label.

`tools/package.mjs` writes the zips itself rather than shelling out to PowerShell, because `Compress-Archive` emits backslash path separators — Windows tolerates it, macOS and Linux extract a single file with a literal backslash in the name.

## Never commit

- **The source images or PDF.** The mind map belongs to @MindBranches and the article to Dan Koe. This repo paraphrases the structure in original wording and redistributes neither. `.gitignore` blocks `*.jpg`, `*.pdf`, `source/`.
- **Anyone's filled-in answers.** They're personal by design. `.gitignore` blocks `*answers*.md` and `*.ics`.
- **Credentials, tokens, internal AEKR material.** None of it is needed here and none of it belongs here.

## Hosting

GitHub Pages, from `main`, root. It redeploys on push; `index.html` exists purely because static hosts can only serve a directory root under that name.

**Note:** Pages on this account requires the repo to stay **public** — flipping it to private disables Pages and takes the link down. Moving to Cloudflare Pages or transferring the repo to an org in the AEKR enterprise both remove that constraint.

The page itself is self-contained and stores answers only in the visitor's own browser — no analytics, no telemetry, no network calls at all.

## Credits and licence

The thinking is Dan Koe's and @MindBranches' — see **[CREDITS.md](CREDITS.md)**. Code [MIT](LICENSE), text [CC BY 4.0](LICENSE-CONTENT.md). Unaffiliated and non-commercial.

Educational and self-reflection material. Not therapy, medical, or mental-health advice.

---

[![Built with AEKR](docs/img/aekr.png)](https://aekr.io)

**[aekr.io](https://aekr.io)** · **[@__aerk on Instagram](https://www.instagram.com/__aerk/)**
