/* AEKR local privacy controls v1. No remote receiver, identifiers or network transport. */
(function () {
  "use strict";
  window.createAEKRLocalPrivacy = function (config) {
    const es = config.lang === "es";
    const t = (en, spanish) => es ? spanish : en;
    const DAY = 86400000;
    const notice = "2026-10-22.1";
    const keys = Object.fromEntries(["choice", "usage", "research", "retention"].map(k => [k, config.id + "/privacy/" + k + "/v1"]));
    let storageOK = true;
    let choice = null;
    let focusBefore;
    let policies;
    const signal = () => navigator.globalPrivacyControl === true || navigator.doNotTrack === "1" || window.doNotTrack === "1";
    const now = () => Date.now();
    const read = (key) => {
      try {
        const raw = localStorage.getItem(key);
        return raw && raw.length <= 100000 ? JSON.parse(raw) : null;
      } catch (_) { storageOK = false; return null; }
    };
    const write = (key, value) => {
      try { const encoded = JSON.stringify(value); localStorage.setItem(key, encoded); if (localStorage.getItem(key) !== encoded) throw new Error("storage write unconfirmed"); return true; }
      catch (_) {
        storageOK = false;
        // A failed denial must not leave an older optional grant for the next page.
        if (key === keys.choice) remove(keys.choice);
        return false;
      }
    };
    const remove = (key) => {
      try { localStorage.removeItem(key); if (localStorage.getItem(key) !== null) throw new Error("storage deletion unconfirmed"); return true; }
      catch (_) { storageOK = false; return false; }
    };
    const validTime = value => Number.isFinite(value) && value > 0 && value <= now();
    const loadChoice = () => {
      const value = read(keys.choice);
      choice = value && value.notice === notice && value.product === config.id &&
        typeof value.usage === "boolean" && ["accept", "reject", "configure", "withdraw"].includes(value.action) &&
        (value.researchFloor === undefined || validTime(value.researchFloor)) &&
        validTime(value.at) && value.expires === value.at + 180 * DAY && value.expires > now() &&
        (!value.usage || ["accept", "configure"].includes(value.action)) ? {
          product: config.id, notice, action: value.action, usage: value.usage, at: value.at, expires: value.expires,
          ...(value.researchFloor === undefined ? {} : { researchFloor: value.researchFloor })
        } : null;
      if (signal() && choice?.usage) {
        const at = now();
        const denied = { product: config.id, notice, action: "withdraw", usage: false, at, expires: at + 180 * DAY, ...(choice.researchFloor ? { researchFloor: choice.researchFloor } : {}) };
        choice = write(keys.choice, denied) ? denied : null;
      }
      if (!choice || !choice.usage || signal()) remove(keys.usage);
      if (!choice && value) remove(keys.choice);
      return choice;
    };
    function usage() {
      const rows = read(keys.usage);
      if (!choice?.usage || signal() || !Array.isArray(rows)) return [];
      return rows.filter(r => r && config.features.includes(r.feature) && /^\d{4}-\d{2}-\d{2}$/.test(r.day) &&
        Date.parse(r.day) > now() - 90 * DAY && Date.parse(r.day) <= now() && Number.isInteger(r.count) && r.count > 0 && r.count <= 10000).slice(-200).map(r => ({ feature: r.feature, day: r.day, count: r.count }));
    }
    function research() {
      const rows = read(keys.research);
      if (!Array.isArray(rows)) return [];
      return rows.filter(r => r && r.purpose === "local-product-research" && r.notice === notice && validTime(r.at) && r.at > (choice?.researchFloor || 0) && r.at > now() - 180 * DAY &&
        r.answers && typeof r.answers === "object" && !Array.isArray(r.answers) &&
        Object.keys(r.answers).length === config.questions.length && config.questions.every(q => q.options.some(o => o[0] === r.answers[q.id]))).slice(-6).map(r => ({
          notice, at: r.at, purpose: "local-product-research",
          answers: Object.fromEntries(config.questions.map(q => [q.id, r.answers[q.id]]))
        }));
    }
    const cleanOptional = () => {
      const beforeUsage = read(keys.usage), beforeResearch = read(keys.research);
      const u = usage(), r = research();
      // Storage events must not rewrite valid data: that can resurrect a concurrent deletion.
      // Compare again before a necessary expiry/schema trim. A withdrawal also carries a floor
      // in the choice record, so stale research rows can never regain active status.
      if (!u.length) remove(keys.usage);
      else if (JSON.stringify(beforeUsage) !== JSON.stringify(u) && JSON.stringify(read(keys.usage)) === JSON.stringify(beforeUsage)) write(keys.usage, u);
      if (!r.length) remove(keys.research);
      else if (JSON.stringify(beforeResearch) !== JSON.stringify(r) && JSON.stringify(read(keys.research)) === JSON.stringify(beforeResearch)) write(keys.research, r);
    };
    function retention() {
      const value = read(keys.retention);
      return value && [0, 7, 30, 90, 365].includes(value.days) && validTime(value.changedAt) ? { days: value.days, changedAt: value.changedAt } : null;
    }
    function checkRetention() {
      const r = retention();
      if (r?.days && r.changedAt + r.days * DAY <= now()) {
        config.clear();
        remove(keys.retention);
        return true;
      }
      return false;
    }
    function productChanged() {
      const r = retention();
      write(keys.retention, { days: r ? r.days : config.defaultRetention, changedAt: now() });
    }
    loadChoice();
    checkRetention();
    cleanOptional();
    // Legacy essential data has no known creation time. Start the stated clock prospectively.
    if (!retention() && config.hasData()) productChanged();

    const make = (tag, text, attrs = {}) => {
      const el = document.createElement(tag);
      if (text) el.textContent = text;
      Object.entries(attrs).forEach(([name, value]) => el.setAttribute(name, value));
      return el;
    };
    const style = make("style");
    style.textContent = `.aekr-privacy-entry{position:fixed;right:16px;bottom:12px;z-index:30;border:1px solid currentColor;border-radius:7px;background:#142431;color:#fff;padding:9px 12px;font:600 13px system-ui;cursor:pointer}.aekr-privacy{box-sizing:border-box;width:min(690px,94vw);max-height:88vh;padding:24px;border:1px solid #b4beb9;border-radius:12px;background:#f5f7f2;color:#142431;font:15px/1.55 system-ui;overflow:auto}.aekr-privacy::backdrop{background:rgba(10,20,30,.6)}.aekr-privacy *{box-sizing:border-box}.aekr-privacy h2{font:700 24px/1.2 system-ui;margin:0 0 12px}.aekr-privacy h3{font:700 18px/1.3 system-ui;margin:22px 0 8px}.aekr-privacy p{margin:8px 0;text-align:justify;text-align-last:auto;text-justify:inter-word;overflow-wrap:anywhere;hyphens:auto}.aekr-privacy label{display:block;margin:12px 0}.aekr-privacy input[type=checkbox]{width:auto;margin-right:8px;accent-color:#142431}.aekr-privacy select{display:block;width:100%;padding:9px;border:1px solid #687e78;background:#fff;color:#142431;font:inherit;border-radius:5px}.aekr-privacy button{border:1px solid #142431;border-radius:5px;background:#fff;color:#142431;padding:10px 12px;font:600 14px system-ui;cursor:pointer}.aekr-privacy button:disabled{opacity:.6;cursor:not-allowed}.aekr-privacy button:focus-visible,.aekr-privacy a:focus-visible,.aekr-privacy select:focus-visible,.aekr-privacy-entry:focus-visible{outline:3px solid #00735b;outline-offset:3px}.aekr-privacy a{color:#00604c;text-decoration:underline}.aekr-privacy-actions{display:flex;flex-wrap:wrap;gap:8px;margin:16px 0}.aekr-privacy-actions>button{flex:1 1 145px}.aekr-privacy-status{border-left:3px solid #00735b;padding-left:10px}.aekr-privacy fieldset{border:1px solid #b4beb9;padding:12px;margin:12px 0}.aekr-privacy small{font-size:13px}.aekr-privacy [hidden]{display:none!important}@media print{.aekr-privacy-entry,.aekr-privacy{display:none!important}}`;
    document.head.append(style);
    style.textContent += ".aekr-privacy-entry.aekr-privacy-inline{position:static;z-index:auto;color:inherit;background:transparent;font:inherit;padding:6px 9px;margin:0;border-radius:8px}";
    const entry = make("button", t("Privacy and data", "Privacidad y datos"), { type: "button", class: "aekr-privacy-entry", id: "privacy-open" });
    const dialog = make("dialog", "", { class: "aekr-privacy", id: "privacy-dialog", "aria-labelledby": "privacy-title" });
    const close = make("button", t("Close", "Cerrar"), { type: "button", id: "privacy-close" });
    const title = make("h2", t("Privacy and data", "Privacidad y datos"), { id: "privacy-title" });
    const intro = make("p", t(
      "This product works without optional collection. Answers, progress and preferences stay in this browser. Optional usage counts and structured research also stay here; AEKR receives nothing automatically. No advertising, sale or cross-product tracking.",
      "Este producto funciona sin recolección opcional. Las respuestas, el progreso y las preferencias permanecen en este navegador. Los conteos de uso y la investigación estructurada opcionales también quedan aquí; AEKR no recibe nada automáticamente. Sin publicidad, venta ni seguimiento entre productos."));
    const signalText = make("p", "", { id: "privacy-signal" });
    const status = make("p", "", { class: "aekr-privacy-status", id: "privacy-status", role: "status", "aria-live": "polite" });
    const actions = make("div", "", { class: "aekr-privacy-actions" });
    const buttons = {};
    [["accept", t("Accept optional usage", "Aceptar uso opcional")], ["reject", t("Reject optional usage", "Rechazar uso opcional")], ["configure", t("Configure", "Configurar")]].forEach(([id, label]) => {
      buttons[id] = make("button", label, { type: "button", id: "privacy-" + id });
      actions.append(buttons[id]);
    });
    const settings = make("section", "", { id: "privacy-settings", hidden: "" });
    settings.append(make("h3", t("Purposes and choices", "Finalidades y opciones")));
    settings.append(make("p", t("Necessary: your requested workbook or learning progress, display preferences and this choice. Rejection leaves every product function available. The optional purpose is to help you review coarse feature-use counts locally for 90 days (maximum 200 daily feature totals). No search text, reflection answers, customer, order or payment data is included.", "Necesario: tu cuaderno o progreso de aprendizaje, preferencias de pantalla y esta elección. Rechazar mantiene todas las funciones. La finalidad opcional es revisar localmente conteos generales de uso por 90 días (máximo 200 totales diarios por función). No incluye búsquedas, reflexiones, clientes, pedidos ni pagos.")));
    const usageLabel = make("label");
    const usageCheck = make("input", "", { type: "checkbox", id: "privacy-usage" });
    usageLabel.append(usageCheck, document.createTextNode(t("Optional local usage counts", "Conteos de uso locales opcionales")));
    const save = make("button", t("Save choices", "Guardar opciones"), { type: "button", id: "privacy-save" });
    settings.append(usageLabel, save);
    const withdraw = make("button", t("Withdraw and delete optional data", "Retirar y borrar datos opcionales"), { type: "button", id: "privacy-withdraw" });
    const researchTitle = make("h3", t("Independent local product research", "Investigación local independiente del producto"));
    const researchIntro = make("p", t("You may reject usage counts and still save this survey. Only the categories you choose are stored, for 180 days, with a maximum of six entries. No free text or identity fields. This is local preparation for your own review/export, not a submission to AEKR or consent to marketing or transfer.", "Puedes rechazar los conteos y guardar esta encuesta. Solo se guardan las categorías que elijas por 180 días, máximo seis entradas. Sin texto libre ni identidad. Es preparación local para tu revisión/exportación, no un envío a AEKR ni permiso de marketing o transferencia."));
    const form = make("form", "", { id: "privacy-research" });
    const selectInputs = {};
    config.questions.forEach(q => {
      const label = make("label", q.label);
      const select = make("select", "", { name: q.id, id: "research-" + q.id });
      q.options.forEach(([value, labelText]) => select.append(make("option", labelText, { value })));
      label.append(select); form.append(label); selectInputs[q.id] = select;
    });
    const researchConsent = make("input", "", { type: "checkbox", id: "privacy-research-consent", required: "" });
    const researchLabel = make("label");
    researchLabel.append(researchConsent, document.createTextNode(t("I choose to save these categories locally for product research. No automatic sending.", "Elijo guardar estas categorías localmente para investigar el producto. Sin envío automático.")));
    form.append(researchLabel, make("button", t("Save survey locally", "Guardar encuesta localmente"), { type: "submit", id: "privacy-research-save" }));
    const researchDownload = make("button", t("Download survey only", "Descargar solo la encuesta"), { type: "button", id: "privacy-research-download" });
    const dataTitle = make("h3", t("Your local data and retention", "Tus datos locales y conservación"));
    const dataIntro = make("p", config.dataDescription);
    const retentionLabel = make("label", t("Essential product data: delete after inactivity", "Datos necesarios del producto: borrar tras inactividad"));
    const retentionSelect = make("select", "", { id: "privacy-retention" });
    [[0, t("Until I erase it", "Hasta que lo borre")], [7, t("7 days", "7 días")], [30, t("30 days", "30 días")], [90, t("90 days", "90 días")], [365, t("365 days", "365 días")]].forEach(([value, text]) => retentionSelect.append(make("option", text, { value: String(value) })));
    retentionLabel.append(retentionSelect);
    const retentionSave = make("button", t("Save retention", "Guardar conservación"), { type: "button", id: "privacy-retention-save" });
    const dataActions = make("div", "", { class: "aekr-privacy-actions" });
    const download = make("button", t("Download my local data", "Descargar mis datos locales"), { type: "button", id: "privacy-download" });
    const clearProduct = make("button", t("Erase product data", "Borrar datos del producto"), { type: "button", id: "privacy-clear-product" });
    dataActions.append(download, clearProduct);
    const limits = make("p", t("Scope: this product in this browser and origin/file copy only; no account or shared tenant exists. Excludes other browsers, devices, products, hosting-provider records and copies you downloaded. AEKR cannot recover erased local data. Expiry is checked when the page is active or reopened; closed browsers cannot run cleanup. Existing records without dates start their retention clock when first read by this version. The notice/choice expires after 180 days. Erasing local data is not a legal hold or provider-data deletion workflow.", "Alcance: solo este producto en este navegador y origen/copia del archivo; no existe cuenta ni tenant compartido. Excluye otros navegadores, dispositivos, productos, registros del proveedor y copias descargadas. AEKR no recupera datos locales borrados. El vencimiento se comprueba con la página activa o al abrirla; un navegador cerrado no ejecuta limpieza. Registros anteriores sin fecha inician el plazo al leerlos con esta versión. El aviso/elección vence a los 180 días. Borrar datos locales no resuelve una retención legal ni elimina registros del proveedor."));
    const institutional = make("section");
    limits.append(document.createTextNode(t(" Storage namespaces prevent accidental mixing; they do not isolate applications sharing the same origin. For private workbook content, use a trusted browser profile or the offline file.", " Los nombres separados evitan mezclas accidentales; no aíslan aplicaciones del mismo origen. Para contenido privado del cuaderno, usa un perfil de navegador de confianza o el archivo sin conexión.")));
    institutional.append(make("h3", t("AEKR contact and rights", "Contacto AEKR y derechos")), make("p", "AEKR · Chile · Juan Sebastián Elcano 240, dpto. 301 A, Ñuñoa, Región Metropolitana, 7550000, Chile"));
    const contact = make("p", t("For access, correction, deletion, objection or privacy questions, contact ", "Para acceso, rectificación, eliminación, oposición o consultas de privacidad, contacta a "));
    contact.append(make("a", "aekr@aekr.io", { href: "mailto:aekr@aekr.io" }));
    institutional.append(contact,
      make("p", t("To request information about AEKR’s legal representative, contact aekr@aekr.io.", "Para solicitar información sobre el representante legal de AEKR, contacta a aekr@aekr.io.")),
      make("p", t("Hosted on GitHub Pages: GitHub may process connection/usage information under its own policy. This control does not delete provider logs. External reference links navigate only when you choose them. No new Terms acceptance, marketing permission or legal certification is implied.", "Alojado en GitHub Pages: GitHub puede tratar información de conexión/uso según su política. Este control no elimina registros del proveedor. Los enlaces externos se abren cuando los eliges. No implica nuevos Términos, permiso de marketing ni certificación legal.")),
      make("a", t("GitHub privacy statement", "Declaración de privacidad de GitHub"), { href: "https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement", target: "_blank", rel: "noopener noreferrer" }),
      make("p", config.product));
    dialog.append(close, title, intro, signalText, status, actions, settings, withdraw, researchTitle, researchIntro, form, researchDownload, dataTitle, dataIntro, retentionLabel, retentionSave, dataActions, limits, institutional);
    const entryMount = config.entryMount ? document.querySelector(config.entryMount) : null;
    if (entryMount) { entry.classList.add("aekr-privacy-inline"); entryMount.append(entry); }
    else document.body.append(entry);
    document.body.append(dialog);
    function render(message) {
      usageCheck.checked = !!choice?.usage && !signal();
      usageCheck.disabled = signal();
      buttons.accept.disabled = signal();
      signalText.textContent = signal() ? t("GPC / Do Not Track detected: optional usage is disabled. Independent local survey remains your choice.", "GPC / Do Not Track detectado: uso opcional desactivado. La encuesta local independiente sigue siendo tu elección.") : t("No optional usage until an explicit choice. You can change or withdraw it here at any time.", "Sin uso opcional hasta una elección explícita. Puedes cambiarla o retirarla aquí cuando quieras.");
      status.textContent = message || (!storageOK ? t("Local storage unavailable. Optional collection is off. Product use and download remain available; choices cannot persist.", "Almacenamiento local no disponible. Recolección opcional desactivada. Puedes usar el producto y descargar; las opciones no persistirán.") : choice ? t("Choice saved: ", "Elección guardada: ") + (choice.usage && !signal() ? t("local usage allowed", "uso local permitido") : t("local usage rejected", "uso local rechazado")) + ". " + research().length + t(" local survey entries.", " encuestas locales.") : t("Optional usage is off. No choice has been saved for this notice version.", "Uso opcional desactivado. No hay elección guardada para esta versión del aviso."));
      retentionSelect.value = String(retention()?.days ?? config.defaultRetention);
    }
    function choose(enabled, action) {
      loadChoice();
      const at = now();
      const researchFloor = action === "withdraw" ? at : choice?.researchFloor;
      const value = { product: config.id, notice, action, usage: enabled && !signal(), at, ...(researchFloor ? { researchFloor } : {}) };
      value.expires = value.at + 180 * DAY;
      choice = write(keys.choice, value) ? value : null;
      if (!choice?.usage) remove(keys.usage);
      render();
    }
    function open() {
      focusBefore = document.activeElement;
      loadChoice(); checkRetention(); cleanOptional(); render();
      if (policies) policies.show(dialog); else dialog.showModal();
      close.focus();
    }
    entry.addEventListener("click", open);
    close.addEventListener("click", () => dialog.close());
    dialog.addEventListener("close", () => focusBefore?.focus());
    buttons.accept.addEventListener("click", () => choose(true, "accept"));
    buttons.reject.addEventListener("click", () => choose(false, "reject"));
    buttons.configure.addEventListener("click", () => { settings.hidden = false; usageCheck.focus(); });
    save.addEventListener("click", () => choose(usageCheck.checked, "configure"));
    withdraw.addEventListener("click", () => {
      choose(false, "withdraw");
      const cleared = remove(keys.usage) && remove(keys.research);
      researchConsent.checked = false;
      render(cleared && storageOK ? t("Optional consent withdrawn; local optional data deleted.", "Consentimiento opcional retirado; datos opcionales locales borrados.") : t("Optional collection is off. Browser storage blocked deletion; clear site storage in browser settings.", "Recolección opcional desactivada. El navegador bloqueó el borrado; elimina los datos del sitio en su configuración."));
    });
    form.addEventListener("submit", event => {
      event.preventDefault();
      if (!researchConsent.checked) return;
      const answers = Object.fromEntries(config.questions.map(q => [q.id, selectInputs[q.id].value]));
      if (!config.questions.every(q => q.options.some(o => o[0] === answers[q.id]))) return;
      const rows = research();
      rows.push({ notice, at: now(), purpose: "local-product-research", answers });
      const saved = write(keys.research, rows.slice(-6));
      researchConsent.checked = false;
      render(saved ? t("Survey saved locally. Nothing was sent.", "Encuesta guardada localmente. No se envió nada.") : undefined);
    });
    retentionSave.addEventListener("click", () => {
      const days = Number(retentionSelect.value);
      if (![0, 7, 30, 90, 365].includes(days)) return;
      write(keys.retention, { days, changedAt: now() });
      render(storageOK ? t("Retention saved. This clock starts now and resets when product data changes.", "Conservación guardada. El plazo inicia ahora y se reinicia al cambiar datos del producto.") : undefined);
    });
    clearProduct.addEventListener("click", () => {
      if (!confirm(t("Erase this product’s local data and preferences? Download first if needed. This cannot be undone.", "¿Borrar los datos locales y preferencias del producto? Descarga antes si los necesitas. No se puede deshacer."))) return;
      const cleared = config.clear();
      remove(keys.retention);
      render(cleared === false || !storageOK ? t("Deletion could not be confirmed. Clear this site’s storage in browser settings.", "No se pudo confirmar el borrado. Elimina el almacenamiento del sitio en la configuración del navegador.") : t("Product data erased. Optional choices remain separate.", "Datos del producto borrados. Las opciones opcionales son independientes."));
    });
    function snapshot() {
      loadChoice(); checkRetention(); cleanOptional();
      return {
        manifest: { schema: "aekr-local-export/v1", product: config.product, productId: config.id, notice, preparedAt: new Date().toISOString(), scope: "current browser / current origin or file copy / no account or tenant", included: ["productData fields listed below", "privacyChoice", "retention", "usage", "research", "policyAcknowledgements"], exclusions: ["other products/browsers/devices/file copies", "hosting-provider connection records", "previously downloaded copies", "no central collector or commercial recipient configured"], transport: "local browser Blob download; no remote upload", limitations: "Browser user controls this storage. Local data is not a verified identity or a complete provider-data response." },
        productData: config.snapshot(), privacyChoice: choice, retention: retention(), usage: usage(), research: research(), policyAcknowledgements: policies.snapshot()
      };
    }
    function deliver(value, suffix) {
      try {
        const blob = new Blob([JSON.stringify(value, null, 2)], { type: "application/json;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const link = make("a", "", { href: url, download: config.id + "-" + suffix + ".json" });
        document.body.append(link); link.click(); link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        render(t("Local download prepared. Keep or erase your downloaded copy yourself.", "Descarga local preparada. Conserva o borra tu copia descargada."));
      } catch (_) { render(t("Download failed. No data was sent. Try a browser that supports local downloads.", "La descarga falló. No se enviaron datos. Prueba un navegador que permita descargas locales.")); }
    }
    download.addEventListener("click", () => deliver(snapshot(), "local-data"));
    researchDownload.addEventListener("click", () => {
      loadChoice(); cleanOptional();
      deliver({ manifest: { schema: "aekr-local-research/v1", product: config.product, notice, preparedAt: new Date().toISOString(), purpose: "user-requested local copy of explicitly saved structured product research", included: ["research"], exclusions: ["workbook answers", "learning progress", "usage", "identity", "display preferences", "hosting records"], recipient: "current browser user only; no central or commercial recipient configured", transport: "local Blob download; nothing is sent" }, research: research() }, "research-local");
    });
    window.addEventListener("storage", event => {
      if (event.key === null || Object.values(keys).includes(event.key)) {
        loadChoice(); checkRetention(); cleanOptional(); render();
      }
    });
    // Enforce expiry in long-lived tabs; no background server or task is implied.
    const sweep = () => { loadChoice(); checkRetention(); cleanOptional(); if (dialog.open) render(); };
    window.addEventListener("focus", sweep);
    document.addEventListener("visibilitychange", () => { if (!document.hidden) sweep(); });
    setInterval(sweep, 60000);
    policies = window.createAEKRLocalPolicy({ id: config.id, product: config.product, lang: config.lang, privacyEntry: entry, privacyDialog: dialog, openPrivacy: open, chooseCookies: enabled => choose(enabled, enabled ? "accept" : "reject") });
    render();
    if (!policies.openRequested(new URLSearchParams(location.search).get("policy")) && !choice) open();
    return {
      productChanged, snapshot,
      event(feature) {
        loadChoice();
        if (!storageOK || !choice?.usage || signal() || !config.features.includes(feature)) return;
        const rows = usage(), day = new Date().toISOString().slice(0, 10);
        const item = rows.find(r => r.day === day && r.feature === feature);
        if (item) item.count = Math.min(10000, item.count + 1); else rows.push({ feature, day, count: 1 });
        write(keys.usage, rows.slice(-200));
      }
    };
  };
})();
