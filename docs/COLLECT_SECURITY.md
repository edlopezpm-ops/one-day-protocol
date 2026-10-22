# The One-Day Protocol: Collect and Security implementation

Date: 2026-10-22. State: tested local candidate, publication and independent review pending. Source baseline `8dedc670fb1e13f8e1540f6ff2442ded0183898f`. Current Pages metadata identifies `https://edlopezpm-ops.github.io/one-day-protocol/` with `main` root publication and HTTPS enforced. Metadata does not establish candidate deployment. No provider configuration, visibility, billing or public runtime was changed by this implementation.

## Real capabilities and proportionality

Static browser application with no account, server-side tenant, application SQL, central collector or commercial receiver. A small first-party local module supports explicit local choices, a useful independent structured survey, retention and actual browser downloads. No backend, external dependency, tracking identity, mail sending or other-product integration is created. This is local collection and preparation, not receipt of research by AEKR. A later central receiver needs its own justified purpose, product contract, recipients, legal review, authorization, budgets, withdrawal enforcement and tests; no destination is silently reused from another AEKR product.

AEKR is established in Chile. Owner-declared institutional notice address: Juan Sebastián Elcano 240, dpto. 301 A, Ñuñoa, Región Metropolitana, 7550000, Chile. Privacy/rights channel: [aekr@aekr.io](mailto:aekr@aekr.io). To request information about AEKR’s legal representative, contact aekr@aekr.io. Para solicitar información sobre el representante legal de AEKR, contacta a aekr@aekr.io. No personal representative name, legal form, registry verification or processing contract is asserted.

## Purpose and field catalogue

| Purpose | Actual input/output | Choice and retention |
| --- | --- | --- |
| Requested product use | `one-day-protocol/v1; one-day-protocol/prefs`; current product state, no automatic upload | Until user erasure by default, preserving the existing user-requested workbook; user may choose shorter inactivity expiry. Configurable7/30/90/365 days or until erasure. Changes restart the clock. |
| Privacy choice | Product, notice version `2026-10-22.1`, action, usage boolean, timestamp, expiry and optional withdrawal floor |180 days; absent/old/expired/corrupt or unavailable storage grants no optional usage. No identifier or historical backfill. |
| Local optional usage | Closed coarse feature category, UTC day and count only; no route detail, text, query, answer or account/customer/order/payment/document fields | Off until explicit choice; maximum200 daily feature totals,90 days. GPC/DNT disables usage and persistently removes its authority. |
| Independent product research | 5 optional categories: tool experience, useful format, future interface improvement, expected frequency and interface usefulness. Every field has Prefer not to answer. No reflection text, personal plans/results, wellbeing, health, personality, identity or inferred sensitive categories. | Per-save explicit unchecked confirmation; works after rejecting usage. Maximum6 entries,180 days; no automatic sending. |
| Rights export | UTF-8 JSON Blob from current product data, privacy choice, retention, local counts and research; separate research-only JSON | Direct user request, local download; object URL revoked. No server bearer URL, role upgrade or shared-tenant export. Current in-memory product changes are represented. |

Accept/reject/configure have the same first-layer styling. Closing, visiting, changing language, refreshing or using a product never opts in. Withdrawal stops optional usage, deletes local optional records and propagates across tabs. A persistent research withdrawal floor prevents old survey rows from becoming active again; saving a new survey is a new explicit action. Storage failure keeps optional usage off and displays the persistence limit. Product functions and local export remain available. Choices/retention/optional schemas use closed export projections and are bounded and validated; closed dropdown values are revalidated on submit and read. Research records must declare the exact `local-product-research` purpose; unknown or absent purposes are rejected, not relabelled. Unexpected stored fields never enter choice, retention, usage or research exports. Valid optional records are not rewritten on ordinary reads. No arbitrary research text or filenames are accepted.

Expiry is enforced on startup, focus, visibility return, export and each active minute. Closed/offline browsers cannot physically purge until the app next runs. Essential local data is erased through explicit confirmation or the selected expiry; this is not account closure or a legal-hold workflow. AEKR cannot recover local erasure. Downloaded copies are user-controlled. Other products, browsers, devices, file copies and provider records are explicitly excluded from exports. Invalid or oversized schema records are excluded from interpretation/export. GitHub Pages paths share an origin: namespacing prevents accidental mixing, not malicious sibling-origin scripts. A trusted browser profile or offline file is appropriate for private workbook content.

## Security and operating boundaries

Code: `tools/template.html + tools/local-privacy.js; generated index.html and One Day Protocol.html`. UI is DOM/text-based, data is not executed, lists/counts are capped and optional storage reads are limited to100KB. No dependency/service was added. The composed app CSP blocks connection, form action, frame/object and base URI changes. Script/style inline exceptions are necessary for the offline app or generated local control; meta CSP is not a substitute for provider headers or script integrity. HTTPS enforcement is provider metadata only. No WAF, HSTS, IP restriction, authorization system or complete hosting-log deletion is claimed.

If a script regression could expose local content, contain publication by reverting the exact source commit through the normal reviewed Pages process; preserve only synthetic evidence, stop optional collection, identify affected origin/version/time, and assess rights/notification with the responsible operator. Restore source separately from device content. Do not import user workbook files, local browser stores or provider logs into the repository. No incident exercise, universal security certification, legal approval or human acceptance is claimed by the tests.

## C01–C15 applicability

| ID | Disposition | Evidence / remaining boundary |
| --- | --- | --- |
| C01 | IMPLEMENTED_LOCAL / PUBLICATION_PENDING | Institutional notice, bilingual representative-contact clause and rights channel in persistent UI. |
| C02 | PARTIAL | Actual client stores, sources and GitHub role identified; processor contract/countries/log duration not invented. |
| C03 | PARTIAL | Educational/reflection access has no inferred age or jurisdiction; international/audience assessment needed before central or commercial processing. USA is not excluded by language. |
| C04 | IMPLEMENTED_LOCAL | Real synthetic browser requests/storage/CSP tested; provider connection processing remains separate. |
| C05 | IMPLEMENTED_LOCAL | Closed product-specific catalogue; operational/customer/reflection content and identity excluded from optional collection. |
| C06 | BLOCKED_EXTERNAL | No commercial recipient, contract or automatic transfer configured; visit is no commercial permission. |
| C07 | IMPLEMENTED_LOCAL | Functional independent categorical survey with explicit confirmation and no compulsory contact. |
| C08 | IMPLEMENTED_LOCAL | Product-specific version, default-off choice, expiry, GPC/DNT and no imported sibling consent. |
| C09 | IMPLEMENTED_LOCAL / PARTIAL_EXTERNAL | Withdrawal, concurrent-tab denial and downloads tested; provider rights use the identified contact/policy. |
| C10 | IMPLEMENTED_LOCAL / UNKNOWN_PROVIDER | Finite local optional retention and essential user choice; provider retention and restore contracts unresolved. |
| C11 | EXCLUDED | No crowd aggregation, anonymization claim, student/personality profile or representative population inference. |
| C12 | IMPLEMENTED_LOCAL / BLOCKED_EXTERNAL | Separate survey-only export with manifest excludes product answers/progress/usage; no commercial lot issuance. |
| C13 | BLOCKED_EXTERNAL | No licensee or downstream recipient; new recipient requires diligence, contracts and enforceable rights. |
| C14 | IMPLEMENTED_LOCAL_FIXTURES | Synthetic local positive/negative pilot only; no real participant recruitment or public deployment claim. |
| C15 | EXCLUDED | Rights email is not a lead collector; no identity enrichment, advertising, license or marketing permission. |

## F01–F14 applicability

| ID | Disposition | Evidence / remaining boundary |
| --- | --- | --- |
| F01 | PARTIAL | Current remote baseline and Pages branch/source observed; candidate not yet published or mapped to any aekr.io alias. |
| F02 | IMPLEMENTED_LOCAL | No application egress observed through real UI flows; actual CSP connection attempt blocked before local HTTP server. Hosting metadata remains independent. |
| F03 | IMPLEMENTED_LOCAL / PUBLICATION_PENDING | Versioned institutional/local-data notice with scope and no legal certification. |
| F04 | PARTIAL | HTTPS enforcement metadata and meta CSP; provider headers/origin administration not changed or overclaimed. |
| F05 | IMPLEMENTED_LOCAL | Untrusted local JSON/dropdowns validated, closed values and DOM rendering; no backend SQL/RBAC introduced. |
| F06 | IMPLEMENTED_LOCAL / PARTIAL_EXTERNAL | True user downloads, erasure/expiry and rights contact; provider response/deletion not simulated. |
| F07 | IMPLEMENTED_LOCAL | Capped strings/lists/counts, fixed existing model and small static module; no public load/attack scan. |
| F08 | IMPLEMENTED_LOCAL | JSON Blob downloads verified; existing product export formats retained where present; no user-file importer. |
| F09 | NOT_APPLICABLE | No MCP, AI actions, agent capability or remote tool bridge exists. |
| F10 | PARTIAL | Explicit device/source/provider custody, limits of local restore and expiry; no user-data backup copied. |
| F11 | IMPLEMENTED_LOCAL / PUBLICATION_PENDING | Finite local tests, generated artefact equality where relevant, exact candidate commit; main merge/Pages readback require separate reviewed delivery. |
| F12 | IMPLEMENTED_LOCAL | Reusable local code copied independently with separate product configuration; no shared data service, IDs or storage consent. |
| F13 | DOCUMENTED / NOT_EXERCISED | Bounded containment/restore procedure above; no incident response execution claim. |
| F14 | REVIEW_PENDING | Parent review of immutable candidate; tests are not independent security certification. |

## Verification and release

Use Node24+ and an installed Edge/Chrome. `node tools/privacy-test.mjs` starts a loopback-only fixture server, uses a task-owned temporary browser profile and real clicks/downloads, exercises defaults/rejection/positive opt-in/independent research, own and survey-only exports, cross-tab withdrawal, GPC, stale/malformed state, expiry, blocked storage, parser bounds and actual CSP denial. It cleans only its own temporary directory. It never contacts the deployed application or uses production data. The browser test source is auditable; no mock204 endpoint is substituted for a receiver.

Main publishes this public Pages site. Candidate commits stay on a review branch until review/release authority is resolved; no force push, protection bypass, paid service or automatic PROD promotion is part of this candidate. After a permitted merge, verify the exact deployed HTML/source revision and the public Privacy and data control separately. Keep local tests, provider build, hosted observation and human acceptance distinct.

Primary reference ledger, refreshed2026-10-22: [Chile19.628](https://www.bcn.cl/leychile/navegar?idNorma=141599), [EDPB consent guidelines](https://www.edpb.europa.eu/system/files/documents/files/file1/edpb_guidelines_202005_consent_en.pdf), [ICO storage/access guidance](https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guidance-on-the-use-of-storage-and-access-technologies/), [California CCPA/GPC](https://oag.ca.gov/privacy/ccpa), [GitHub privacy statement](https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement), [GitHub Pages HTTPS](https://docs.github.com/en/pages/getting-started-with-github-pages/securing-your-github-pages-site-with-https). These inform boundaries, not a jurisdiction-specific approval. Chile21.719 has a distinct future commencement; no proposed postponement is assumed enacted.


### Executed candidate checks

-18/18 real Edge browser/privacy checks PASS, including actual downloads with storage blocked, independent survey-only download, cross-tab withdrawal, GPC and DNT, expiry, invalid records, CSP request blocked before the fixture server,390px dialog fit and Escape/focus restoration. Synthetic local fixtures only.
-Build PASS:87 model nodes,86 Canvas edges,39 wikilinks resolved; the two generated HTML files are byte-identical.46/46 existing real UI checks PASS;586/586 in-page checks PASS. Packaging PASS for application and Obsidian bundles, kept in ignored dist/.
-Cross-tab product erasure cancels an in-flight250ms workbook save; malformed/non-string/unknown/oversized stored fields cannot become executable content.
-Before/after failures retained as scope evidence: the new browser test caught optional survey resurrection across tabs before the withdrawal-floor/cleanup fix; the existing phone suite caught the floating privacy button covering Fit before mounting it in the existing header controls. No assertion was weakened.
-Indexed publication scan uses pinned gitleaks8.30.1 without suppression. Main/Pages publication, hosted candidate readback and independent acceptance remain pending.

### Review correction: closed record projections

Independent review identified that formerly validated optional records still returned raw objects, allowing unexpected properties into downloads. Choice, usage, retention and research now project only the declared fields; research answers project only the product question IDs, with exact purpose matching. The withdrawal floor and conditional cleanup remain in force. The added real-browser regressions download full and research-only JSON containing synthetic taint, reject wrong/missing purposes, and verify no unnecessary writes for valid optional records. Both previous candidate sources fail the new tainted-download assertion after five earlier checks; both corrected sources pass all18 browser/privacy checks. The before/after run used disposable archived-source fixtures, not user data. Shared local module SHA-256: `d00307f25bf64d9cac9b83201420d729f40f5762bbf20f06c227a09a2d420753`.
