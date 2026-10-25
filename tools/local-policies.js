/* Product-local policy UI. No identity verification, receiver or network transport. */
(function () {
  "use strict";
  window.createAEKRLocalPolicy = function (config) {
    const es = config.lang === "es";
    const t = (en, spanish) => es ? spanish : en;
    const versions = Object.freeze({ publicVersion: "20261025", terms: "terms-20261025.1", privacy: "privacy-20261025.1", cookies: "cookies-20261025.1" });
    const key = config.id + "/policies/ack/v1";
    let volatileAck = null;
    const make = (tag, text, attrs = {}) => {
      const el = document.createElement(tag);
      if (text) el.textContent = text;
      for (const [name, value] of Object.entries(attrs)) el.setAttribute(name, value);
      return el;
    };
    document.head.append(make("meta", "", { name: "aekr-public-version", content: versions.publicVersion }));
    const style = make("style");
    style.textContent = ".aekr-policy-links{display:inline-flex;flex-wrap:wrap;align-items:center;gap:8px;margin-inline-start:10px}.aekr-policy-links button{position:static!important;background:transparent!important;color:inherit!important;border:0!important;font:inherit!important;padding:5px 2px!important;min-height:32px;cursor:pointer;text-decoration:underline;text-underline-offset:3px}.aekr-policy-links button:focus-visible{outline:3px solid #00735b;outline-offset:3px}.aekr-policy-language{margin:8px}.aekr-policy-check{display:flex!important;align-items:flex-start;gap:8px}.aekr-policy-check input{margin-top:5px}.aekr-policy-links button:hover{opacity:.8}@media print{.aekr-policy-links{display:none!important}}";
    document.head.append(style);
    const language = document.getElementById("language-toggle");
    const languageHome = language?.parentNode;
    const dialogs = [];
    let focusBefore;
    function show(dialog) {
      focusBefore = document.activeElement;
      for (const other of document.querySelectorAll("dialog[open]")) if (other !== dialog) other.close();
      if (language) { language.classList.add("aekr-policy-language"); dialog.prepend(language); }
      if (!dialog.open) dialog.showModal();
    }
    function modal(id, title) {
      const dialog = make("dialog", "", { id, class: "aekr-privacy", "aria-labelledby": id + "-title" });
      const close = make("button", t("Close", "Cerrar"), { type: "button", id: id + "-close" });
      close.addEventListener("click", () => dialog.close());
      dialog.append(close, make("h2", title, { id: id + "-title" }));
      document.body.append(dialog); dialogs.push(dialog);
      return dialog;
    }
    const terms = modal("terms-dialog", t("Terms of Service", "Términos de uso"));
    const termsSections = [
      [t("Product and operator", "Producto y operador"), t(config.product + " is a local educational tool operated personally under the AEKR project name in Chile. AEKR is a personal project, not a claim of incorporation. Questions: aekr@aekr.io.", config.product + " es una herramienta educativa local operada personalmente bajo el nombre de proyecto AEKR en Chile. AEKR es un proyecto personal, sin afirmar constitución como sociedad. Consultas: aekr@aekr.io.")],
      [t("Purpose and limits", "Finalidad y límites"), config.id === "sckb" ? t("The atlas and simulation use fictional learning examples. They are not instructions for operating a real warehouse, an inventory system or a professional certification. Verify decisions against your actual operation and authorized sources.", "El atlas y la simulación usan ejemplos ficticios de aprendizaje. No son instrucciones para operar un almacén real, un sistema de inventario ni una certificación profesional. Verifica las decisiones con tu operación y fuentes autorizadas.") : t("This is an independent educational and self-reflection aid, not therapy, medical or mental-health advice. No result or personal transformation is guaranteed. The original authors and their materials retain their rights; AEKR does not claim their endorsement.", "Es una ayuda independiente de aprendizaje y reflexión personal, no terapia ni consejo médico o de salud mental. No se garantiza un resultado ni una transformación personal. Los autores originales conservan sus derechos; AEKR no afirma su respaldo.")],
      [t("Authorized and responsible use", "Uso autorizado y responsable"), t("Use the tool lawfully and only with material you are entitled to use. Do not insert stolen or unlawful material, third-party confidential information, credentials or real customer records. Do not use it for fraud, harassment, exploitation or unauthorized access. You remain responsible for your decisions and lawful exports.", "Usa la herramienta lícitamente y solo con material que tengas derecho a usar. No introduzcas material robado o ilícito, información confidencial de terceros, credenciales ni registros reales de clientes. No la uses para fraude, acoso, explotación o acceso no autorizado. Conservas responsabilidad por tus decisiones y exportaciones lícitas.")],
      [t("Local records and your copies", "Registros locales y tus copias"), t("The application does not upload your work to AEKR. Records remain in this browser and origin or offline file copy. Browser cleanup, device loss and storage failures can erase them. Keep your own exports when needed. Privacy explains the actual data, rights and optional choices; optional collection is not a condition of using the tool.", "La aplicación no envía tu trabajo a AEKR. Los registros quedan en este navegador y origen o copia del archivo sin conexión. La limpieza del navegador, pérdida del dispositivo o fallos de almacenamiento pueden borrarlos. Conserva exportaciones propias cuando las necesites. Privacy explica los datos, derechos y opciones reales; la colección opcional no es condición de uso.")],
      [t("Availability, changes and rights", "Disponibilidad, cambios y derechos"), t("The tool may change or become unavailable. No availability, recovery or accuracy guarantee is offered. Material changes requiring acknowledgement ask for a new explicit action. Nothing here excludes mandatory rights or liabilities that cannot lawfully be excluded, or invents a court, arbitration agreement or unlimited indemnity. Existing code and content licences remain applicable.", "La herramienta puede cambiar o dejar de estar disponible. No se ofrece garantía de disponibilidad, recuperación o exactitud. Los cambios materiales que requieran acuse solicitan una nueva acción explícita. Nada excluye derechos o responsabilidades irrenunciables ni inventa tribunal, arbitraje o indemnidad ilimitada. Siguen aplicando las licencias existentes de código y contenido.")]
    ];
    for (const [title, body] of termsSections) terms.append(make("h3", title), make("p", body));
    const cookies = modal("cookies-dialog", t("Cookies and browser storage", "Cookies y almacenamiento del navegador"));
    cookies.append(make("p", t("This static application does not set application cookies or send application analytics to a receiver. Necessary local storage keeps the requested product data, display settings, retention choices and the local policy declaration. GitHub Pages may process connection records under its own privacy policy; these controls do not delete provider records.", "Esta aplicación estática no establece cookies de aplicación ni envía analítica a un receptor. El almacenamiento local necesario conserva datos solicitados del producto, preferencias de pantalla, conservación y la declaración local de políticas. GitHub Pages puede tratar registros de conexión según su política; estos controles no borran registros del proveedor.")), make("p", t("Optional feature-use counts stay off until an explicit choice and remain local for up to 90 days. The independent local research survey requires its own unchecked confirmation and lasts up to 180 days. GPC / Do Not Track disables optional usage. Closing a dialog, accepting Terms or acknowledging Privacy does not enable either purpose.", "Los conteos opcionales de uso permanecen desactivados hasta una elección explícita y quedan localmente hasta 90 días. La encuesta local independiente requiere su propia confirmación sin marcar y dura hasta 180 días. GPC / Do Not Track desactiva el uso opcional. Cerrar un diálogo, aceptar ToS o confirmar Privacy no activa ninguna finalidad.")));
    const reject = make("button", t("Reject optional usage", "Rechazar uso opcional"), { type: "button", id: "cookies-reject" });
    reject.addEventListener("click", () => { config.chooseCookies(false); cookieStatus.textContent = t("Optional usage is off. Other choices remain independent.", "El uso opcional está desactivado. Las demás opciones son independientes."); });
    const preferences = make("button", t("Manage choices in Privacy", "Gestionar opciones en Privacy"), { type: "button", id: "cookies-preferences" });
    preferences.addEventListener("click", config.openPrivacy);
    const cookieStatus = make("p", "", { role: "status", id: "cookies-status" });
    const cookieActions = make("div", "", { class: "aekr-privacy-actions" }); cookieActions.append(reject, preferences); cookies.append(cookieActions, cookieStatus);
    const ack = modal("policy-ack-dialog", t("Before using the interactive tool", "Antes de usar la herramienta interactiva"));
    ack.append(make("p", t("Review the full policies. Continue only if you choose to accept the Terms and acknowledge the Privacy notice. This declaration stays in this browser; it does not verify identity or prove reading. Optional choices remain separate. You may close this to read, manage cookies or exercise data rights.", "Revisa las políticas completas. Continúa solo si eliges aceptar los ToS y confirmar el aviso de Privacy. La declaración queda en este navegador; no verifica identidad ni demuestra lectura. Las opciones opcionales son independientes. Puedes cerrar para leer, gestionar cookies o ejercer derechos.")));
    const ackLinks = make("div", "", { class: "aekr-privacy-actions" });
    for (const [id, label, open] of [["terms", "ToS", () => show(terms)], ["privacy", "Privacy", config.openPrivacy], ["cookies", "Cookies", () => show(cookies)]]) {
      const button = make("button", label, { type: "button", id: "policy-review-" + id }); button.addEventListener("click", open); ackLinks.append(button);
    }
    ack.append(ackLinks);
    const boxes = {};
    for (const [id, text] of [["terms", t("I accept the Terms of Service", "Acepto los Términos de uso")], ["privacy", t("I acknowledge that I have read the Privacy notice", "Confirmo que he leído el aviso de privacidad")]]) {
      const label = make("label", "", { class: "aekr-policy-check" });
      const input = make("input", "", { type: "checkbox", id: "policy-" + id + "-check" }); label.append(input, document.createTextNode(text)); ack.append(label); boxes[id] = input;
    }
    const ackStatus = make("p", "", { role: "status", id: "policy-ack-status" });
    const proceed = make("button", t("Accept and continue", "Aceptar y continuar"), { type: "button", id: "policy-continue", disabled: "" });
    for (const input of Object.values(boxes)) input.addEventListener("change", () => { proceed.disabled = !(boxes.terms.checked && boxes.privacy.checked); });
    ack.append(ackStatus, proceed);
    function records() {
      try {
        const raw = localStorage.getItem(key); if (!raw || raw.length > 30000) return [];
        const rows = JSON.parse(raw); if (!Array.isArray(rows)) return [];
        return rows.filter(r => r && r.schema === 1 && r.productId === config.id && r.action === "explicit-policy-acknowledgement" && r.scope === "browser-local-unverified" && ["en", "es"].includes(r.language) && Number.isSafeInteger(r.at) && r.at > 0 && r.at <= Date.now() && /^terms-\d{8}\.\d+$/.test(r.termsRevision) && /^privacy-\d{8}\.\d+$/.test(r.privacyRevision)).slice(-12).map(r => ({ schema: 1, productId: config.id, action: r.action, scope: r.scope, language: r.language, at: r.at, termsRevision: r.termsRevision, privacyRevision: r.privacyRevision }));
      } catch (_) { return []; }
    }
    const current = () => volatileAck || records().findLast(r => r.termsRevision === versions.terms && r.privacyRevision === versions.privacy) || null;
    const status = make("p", "", { id: "policy-local-status", role: "status" });
    config.privacyDialog.append(make("h3", t("Local policy declaration", "Declaración local de políticas")), make("p", t("AEKR is a personal project operated from Chile. A local declaration stores the product, exact policy revisions, presented language, action and browser timestamp. Up to twelve declarations remain until erased below or through browser storage settings. They do not identify a person or prove reading. The data download includes these declarations; rights and optional choices do not require accepting new Terms.", "AEKR es un proyecto personal operado desde Chile. La declaración local guarda producto, revisiones exactas, idioma presentado, acción y fecha del navegador. Se conservan hasta doce declaraciones hasta borrarlas aquí o en la configuración del navegador. No identifican a una persona ni prueban lectura. La descarga incluye estas declaraciones; los derechos y opciones no requieren aceptar nuevos ToS.")), status);
    function renderStatus() { status.textContent = current() ? volatileAck ? t("Declaration applies to this open page only: browser storage did not confirm persistence. Reloading requires a new explicit action.", "La declaración solo vale en esta página abierta: el almacenamiento no confirmó persistencia. Al recargar se requiere una nueva acción explícita.") : t("A local declaration is available for the current policies. This is not a verified identity record.", "Existe una declaración local para las políticas actuales. No es un registro de identidad verificada.") : t("No declaration for the current policies. Reading, cookie choices and data rights remain available.", "Sin declaración de las políticas actuales. Lectura, opciones de cookies y derechos siguen disponibles."); }
    proceed.addEventListener("click", event => {
      if (!event.isTrusted || !boxes.terms.checked || !boxes.privacy.checked) return;
      const record = { schema: 1, productId: config.id, termsRevision: versions.terms, privacyRevision: versions.privacy, language: config.lang, at: Date.now(), action: "explicit-policy-acknowledgement", scope: "browser-local-unverified" };
      const encoded = JSON.stringify([...records(), record].slice(-12));
      try { localStorage.setItem(key, encoded); if (localStorage.getItem(key) !== encoded) throw new Error("unconfirmed"); volatileAck = null; }
      catch (_) { volatileAck = record; }
      renderStatus(); ack.close(); window.dispatchEvent(new Event("aekr:policyacknowledged"));
    });
    const clear = make("button", t("Erase local policy declarations", "Borrar declaraciones locales de políticas"), { type: "button", id: "policy-clear-local" });
    clear.addEventListener("click", () => { volatileAck = null; try { localStorage.removeItem(key); if (localStorage.getItem(key) !== null) throw new Error("unconfirmed"); renderStatus(); } catch (_) { status.textContent = t("Deletion could not be confirmed. Clear this site's storage in browser settings.", "No se pudo confirmar el borrado. Borra el almacenamiento del sitio en la configuración del navegador."); } });
    config.privacyDialog.append(clear);
    function ensure() {
      if (current()) return true;
      boxes.terms.checked = false; boxes.privacy.checked = false; proceed.disabled = true;
      ackStatus.textContent = t("Choose both declarations explicitly to continue. Your cookie preferences are independent.", "Elige ambas declaraciones explícitamente para continuar. Las preferencias de cookies son independientes.");
      show(ack); return false;
    }
    const selectors = config.id === "sckb" ? "#runtime-choices button,#runtime-next,#runtime-reset,#runtime-track button,.journey-tab,.flow-node,#prev-step,#next-step,.architecture-card,.route-button,#route-reset,.warehouse-zone,#route-hint" : "#nodes .node,.maptools button,.tabs button,#workBody textarea,#workBody button";
    for (const type of ["click", "pointerdown", "beforeinput", "keydown"]) document.addEventListener(type, event => {
      if (type === "keydown" && !["Enter", " ", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) return;
      if (!(event.target instanceof Element) || !event.target.closest(selectors)) return;
      if (!ensure()) { event.preventDefault(); event.stopImmediatePropagation(); }
    }, true);
    const footer = make("nav", "", { class: "aekr-policy-links", "aria-label": t("Product policies", "Políticas del producto") });
    const termsEntry = make("button", "ToS", { type: "button", id: "terms-open" }); termsEntry.addEventListener("click", () => show(terms));
    const cookiesEntry = make("button", "Cookies", { type: "button", id: "cookies-open" }); cookiesEntry.addEventListener("click", () => show(cookies));
    config.privacyEntry.textContent = "Privacy";
    config.privacyEntry.before(footer); footer.append(termsEntry, config.privacyEntry, cookiesEntry);
    dialogs.push(config.privacyDialog);
    for (const dialog of dialogs) dialog.addEventListener("close", () => {
      if (!document.querySelector("dialog[open]")) { if (language && languageHome) { language.classList.remove("aekr-policy-language"); languageHome.append(language); } focusBefore?.focus(); }
    });
    window.addEventListener("storage", event => { if (event.key === key || event.key === null) { volatileAck = null; renderStatus(); } });
    window.AEKR_POLICY = { ensure, current, versions };
    renderStatus();
    return { show, snapshot: () => ({ records: records(), current: current(), persistence: volatileAck ? "memory-this-page-only" : "browser-local", identityVerified: false, readingProven: false }), openRequested(name) { if (name === "terms") show(terms); else if (name === "cookies") show(cookies); else if (name === "privacy") config.openPrivacy(); else if (name === "ack") ensure(); else return false; return true; } };
  };
})();
