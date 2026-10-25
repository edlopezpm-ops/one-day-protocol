# One Day Protocol: web policy integration

Owner-requested implementation dated 25 October 2026. The canonical AEKR standard is [WEB_POLICY_STANDARD.md](https://github.com/edlopezpm-ops/AEKR/blob/77c71b147f436ea2f182808a41b5325063c8dcc5/toolkit/delivery-standards/privacy/WEB_POLICY_STANDARD.md).

The existing signature now contains ToS, Privacy and Cookies. The data-rights download stays inside Privacy. Existing product data, retention, GPC/DNT, optional rejection, withdrawal and local survey remain independent. No backend, receiver, account, shared identity, provider or dependency was added. The new local policy helper reuses the existing privacy dialog, local export and browser test harness rather than replacing those controls.

Interactive tool actions require two unchecked declarations and a real user action. Records contain only the product, exact internal Terms/Privacy/Cookies revisions, presented language, browser timestamp, action and browser-local scope; up to twelve remain, exportable and erasable in Privacy. This is a browser-local declaration, not verified identity or proof of reading. Navigation, policy reading, optional choices and data rights do not require the declaration. On storage failure, an explicit declaration permits only the current open document and another action is required after reload. Visits, refreshes, language changes and historical records never create a declaration.

`publicVersion: "20261025"` is metadata only. Internal revisions remain in code and local receipts and are absent from policy text. Privacy's existing optional-choice revision remains independent; no previous optional choice is converted into Terms acceptance.

The existing application and source model are English only. Policies are complete in English; no partial Spanish app or second legal-language state is invented. The build embeds both local helpers, preserving the self-contained download and identical hosted/download HTML.

Validation uses only disposable synthetic browser profiles. Run `node tools/privacy-test.mjs` for positive and failure paths, optional-choice isolation, rights before acceptance, stale revisions, no inferred acceptance, GPC, quota failures, concurrency, downloads, CSP and mobile/desktop fit. ODP also retains `node tools/build.mjs` and `node tools/uitest.mjs`. Local checks, source publication, native GitHub Pages build, hosted readback and human acceptance are separate facts. No security certification or legal approval is claimed.

The notice acknowledgement explicitly covers both Privacy and Cookies, separately from optional choices. Current receipts store all three policy revisions in the same explicit action. Earlier two-document declarations remain historical and cannot satisfy this renewed bundle; no cookies acknowledgement is backfilled. The record schema and storage namespace remain unchanged.
