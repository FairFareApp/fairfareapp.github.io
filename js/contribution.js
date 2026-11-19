import {
  icon,
  escapeHTML as h,
  notice,
  loading,
  field,
  options,
  attributesForm,
  today,
  money,
} from "./ui.js";
import { compressImage, discardImage } from "./images.js";
import { submitObservation } from "./api.js";

export function createContributionFlow({
  state,
  devMock,
  navigate,
  render,
  identify,
}) {
  const drafts = {};
  let pending = 0;
  function fresh(purchase) {
    return {
      step: 0,
      request_id: crypto.randomUUID(),
      product: null,
      evidence: null,
      values: {
        category_id: "wooden_elephant",
        material: "wood",
        finish: "plain",
        segment: "shop",
        carving_detail: "unknown",
        ...(purchase ? state.attributes : {}),
        price_type: purchase ? "paid" : "asking",
        source_type: purchase ? "own_purchase" : "seller_quote",
        locality: "",
        observed_at: today(),
        notes: "",
      },
    };
  }
  function draft(purchase) {
    const key = purchase ? "purchase" : "contributor";
    return (drafts[key] ||= fresh(purchase));
  }
  function clear() {
    for (const d of Object.values(drafts)) {
      discardImage(d.product);
      discardImage(d.evidence);
    }
    delete drafts.purchase;
    delete drafts.contributor;
  }
  const input = (id, name, type, value, extra = "") =>
    `<input id="${id}" name="${name}" type="${type}" value="${h(value || "")}" ${extra}>`;
  function priceFields(d, purchase) {
    const v = d.values;
    return `<div class="price-entry">${field("Price (₹)", "price", input("price", "price_inr", "number", v.price_inr, 'min="1" max="100000" step="0.01" inputmode="decimal" placeholder="0" required'))}</div><div class="wizard-fields">${
      purchase
        ? '<p class="purchase-kind">Your own purchase · price paid</p>'
        : field(
            "Price type",
            "price-type",
            `<select id="price-type" name="price_type">${options(
              [
                ["asking", "Seller’s asking price"],
                ["paid", "Price paid"],
                ["observed", "Displayed price"],
              ],
              v.price_type,
            )}</select>`,
          )
    }${field("Market / locality in Jaipur", "locality", input("locality", "locality", "text", v.locality, 'minlength="2" maxlength="120" placeholder="e.g. Bapu Bazaar" list="jaipur-markets" required') + '<datalist id="jaipur-markets"><option value="Bapu Bazaar"><option value="Johari Bazaar"><option value="Nehru Bazaar"></datalist>')}</div><details class="wizard-extra"><summary>Date${purchase ? "" : " & price source"}</summary><div class="form-grid">${field("Date", "observed", input("observed", "observed_at", "date", v.observed_at, `min="2020-01-01" max="${today()}" required`))}${
      purchase
        ? ""
        : field(
            "Source",
            "source-type",
            `<select id="source-type" name="source_type">${options(
              [
                ["seller_quote", "Seller quote"],
                ["own_purchase", "My own purchase"],
                ["field_observation", "Field observation"],
                ["receipt", "Receipt"],
              ],
              v.source_type,
            )}</select>`,
          )
    }</div></details>${purchase ? `<details><summary>Product details · ${h(v.size_cm)} cm, ${h(v.finish)}</summary>${attributesForm(v, "p-")}</details>` : ""}`;
  }
  function evidenceFields(d, purchase) {
    const v = d.values;
    return `${purchase && state.image ? `<label class="check"><input id="attach-scan" type="checkbox" name="attach_scan" ${v.attach_scan ? "checked" : ""}><span>Attach my scan photo for private review.</span></label>` : ""}<div class="field"><label for="evidence-file">Receipt or evidence photo <span class="muted">(optional)</span></label><input id="evidence-file" type="file" accept="image/jpeg,image/png,image/webp"><small>Crop names, receipt identifiers and payment details.</small></div><div id="evidence-preview">${d.evidence ? `<img class="evidence-preview" src="${d.evidence.url}" alt="Your evidence photo"><button class="text-link" type="button" id="remove-evidence">Remove evidence</button>` : ""}</div><div id="evidence-feedback" aria-live="polite"></div><label class="check" id="photo-consent" ${d.product || d.evidence || v.attach_scan ? "" : "hidden"}><input id="image-consent" type="checkbox" name="image_consent" ${v.image_consent ? "checked" : ""}><span>I consent to storing the attached photos privately for review.</span></label><details class="wizard-extra" ${v.notes ? "open" : ""}><summary>Notes (optional)</summary>${field("Notes", "notes", `<textarea id="notes" name="notes" maxlength="2000" rows="3" placeholder="Anything else the reviewer should know?">${h(v.notes)}</textarea>`)}</details>`;
  }
  function review(d, purchase) {
    const v = d.values,
      product = purchase ? (v.attach_scan ? state.image : null) : d.product;
    return `<div class="review-product">${product ? `<img src="${product.url}" width="76" height="76" alt="Product attached for review">` : icon("tag")}<div><strong>Wooden elephant</strong><p>${h(v.size_cm)} cm · ${h(v.finish)} · ${h(v.segment)}</p></div><button class="text-link" type="button" data-edit="${purchase ? 0 : 1}">Edit</button></div><dl class="review-list"><div><dt>${purchase ? "You paid" : h(v.price_type) + " price"}</dt><dd>${money(v.price_inr)}</dd></div><div><dt>Locality</dt><dd>${h(v.locality)}, Jaipur</dd></div><div><dt>Photos</dt><dd>${Number(Boolean(product)) + Number(Boolean(d.evidence))} attached</dd></div></dl><details class="wizard-extra review-extra"><summary>Date, source & other details</summary><dl class="review-list"><div><dt>Date</dt><dd>${h(v.observed_at)}</dd></div><div><dt>Source</dt><dd>${h(v.source_type.replaceAll("_", " "))}</dd></div><div><dt>Material</dt><dd>${h(v.material)}</dd></div><div><dt>Carving</dt><dd>${h(v.carving_detail || "unknown")}</dd></div>${v.notes ? `<div><dt>Notes</dt><dd>${h(v.notes)}</dd></div>` : ""}</dl><button type="button" class="text-link" data-edit="${purchase ? 0 : 2}">Edit price & location</button><button type="button" class="text-link" data-edit="${purchase ? 1 : 3}">Edit evidence</button></details><label class="check honest-check"><input id="honest-observation" name="accurate" type="checkbox" required ${v.accurate ? "checked" : ""}><span>I confirm this is accurate and my photos contain no personal details.</span></label><p class="review-note">${icon("clock")}Submissions go to review.</p><p class="small muted">By submitting, you agree to the <button type="button" class="text-link" data-dialog="terms">contribution terms</button> and <button type="button" class="text-link" data-dialog="privacy">privacy notice</button>.</p>`;
  }
  function page(purchase) {
    const d = draft(purchase),
      steps = purchase
        ? ["Price", "Evidence", "Review"]
        : ["Photo", "Details", "Price", "Evidence", "Review"],
      step = steps[d.step];
    const titles = {
      Photo: "Product photo",
      Details: "Product details",
      Price: purchase ? "What did you pay?" : "Record the price.",
      Evidence: "Evidence",
      Review: "Review observation",
    };
    let content = "";
    if (step === "Photo")
      content = `<div class="wizard-photo">${d.product ? `<img class="product-preview" src="${d.product.url}" alt="Your contribution product photo">` : `<button type="button" id="contributor-camera" class="capture-tile"><span class="viewfinder">${icon("camera")}</span><strong>Take a photo</strong></button>`}</div><div class="photo-actions">${d.product ? `<button type="button" class="button secondary" id="contributor-camera">${icon("camera")}Retake</button>` : ""}<button type="button" class="button secondary" id="contributor-gallery">${icon("image")}${d.product ? "Replace" : "Gallery"}</button></div><input id="contributor-photo" class="sr-only" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" tabindex="-1"><input id="contributor-file" class="sr-only" type="file" accept="image/jpeg,image/png,image/webp" tabindex="-1"><div id="photo-feedback" aria-live="polite"></div>`;
    if (step === "Details")
      content = `${attributesForm(d.values, "s-")}<button class="text-link" type="button" id="contributor-identify">${icon("magnifying-glass")}Suggest details from photo${devMock ? " (mock)" : ""}</button><div id="contributor-ai" aria-live="polite"></div>`;
    if (step === "Price") content = priceFields(d, purchase);
    if (step === "Evidence") content = evidenceFields(d, purchase);
    if (step === "Review") content = review(d, purchase);
    return `<div class="wizard-layout"><a class="back-link" href="${purchase ? "/compare" : "/contribute"}">${icon("arrow-left")}${purchase ? "Your comparison" : "Contributor desk"}</a><div class="wizard-progress"><span>Step ${d.step + 1} of ${steps.length} · ${step}</span><progress value="${d.step + 1}" max="${steps.length}" aria-label="Observation progress"></progress></div><div class="page-heading"><h1>${titles[step]}</h1></div>${devMock ? notice("Development mock · nothing will be stored.") : ""}<form id="submission-form" class="wizard-card panel" novalidate><div id="submission-feedback" tabindex="-1" aria-live="polite"></div>${content}<div class="wizard-actions task-actions" ${step === "Photo" && !d.product ? "hidden" : ""}>${d.step ? '<button class="button secondary" type="button" id="wizard-back">Back</button>' : ""}<button class="button primary" type="submit" id="wizard-next">${step === "Review" ? "Submit for review" : step === "Evidence" ? "Review observation" : "Continue"}${step === "Review" ? "" : icon("chevron-right")}</button></div></form></div>`;
  }
  function bind(purchase, signal) {
    const d = draft(purchase),
      form = document.querySelector("#submission-form"),
      feedback = document.querySelector("#submission-feedback"),
      step = d.step,
      evidenceStep = purchase ? 1 : 3,
      last = purchase ? 2 : 4;
    const save = () => {
      for (const el of form.elements) {
        if (!el.name || el.type === "file" || el.type === "submit") continue;
        d.values[el.name] = el.type === "checkbox" ? el.checked : el.value;
      }
    };
    form.oninput = (e) => {
      save();
      e.target.removeAttribute("aria-invalid");
      e.target.setCustomValidity?.("");
    };
    form.onchange = (event) => {
      const source = form.elements.source_type;
      if (event.target.name === "source_type") d.sourceEdited = true;
      if (event.target.name === "price_type" && source && !d.sourceEdited) {
        source.value = {
          asking: "seller_quote",
          paid: "own_purchase",
          observed: "field_observation",
        }[event.target.value];
      }
      save();
    };
    const move = (n) => {
      save();
      d.step = n;
      render();
    };
    const back = document.querySelector("#wizard-back");
    if (back) back.onclick = () => move(Math.max(0, step - 1));
    form
      .querySelectorAll("[data-edit]")
      .forEach((b) => (b.onclick = () => move(Number(b.dataset.edit))));
    const showError = (message, id) => {
      feedback.innerHTML = notice(h(message), "error");
      feedback.focus();
      if (id) document.getElementById(id)?.setAttribute("aria-invalid", "true");
    };
    async function fileInput(input, kind) {
      const file = input.files[0];
      input.value = "";
      if (!file || pending) return;
      pending++;
      const target = document.querySelector(
        kind === "product" ? "#photo-feedback" : "#evidence-feedback",
      );
      target.innerHTML = loading("Preparing photo…");
      document.querySelector("#wizard-next").disabled = true;
      try {
        const image = await compressImage(file);
        if (signal.aborted) {
          discardImage(image);
          return;
        }
        save();
        discardImage(d[kind]);
        d[kind] = image;
        d.values.image_consent = false;
        render();
      } catch (e) {
        if (!signal.aborted) showError(e.message);
      } finally {
        pending--;
        if (!signal.aborted)
          document.querySelector("#wizard-next").disabled = false;
      }
    }
    if (!purchase && step === 0) {
      const camera = document.querySelector("#contributor-photo"),
        gallery = document.querySelector("#contributor-file");
      document.querySelector("#contributor-camera").onclick = () =>
        camera.click();
      document.querySelector("#contributor-gallery").onclick = () =>
        gallery.click();
      camera.onchange = () => fileInput(camera, "product");
      gallery.onchange = () => fileInput(gallery, "product");
    }
    const ai = document.querySelector("#contributor-identify");
    if (ai)
      ai.onclick = async () => {
        save();
        const target = document.querySelector("#contributor-ai");
        ai.disabled = true;
        document.querySelector("#wizard-next").disabled = true;
        target.innerHTML = loading("Taking a closer look…");
        try {
          const a = await identify(d.product, signal);
          if (signal.aborted) return;
          d.values = {
            ...d.values,
            category_id: a.category_id,
            material: a.material,
            finish: a.finish,
            decoration: a.decoration || "",
          };
          render();
          document.querySelector("#contributor-ai").innerHTML = notice(
            "Suggestions ready. Please check them; height and wood species cannot be measured from a photo.",
          );
        } catch (e) {
          if (!signal.aborted) {
            target.innerHTML = notice(h(e.message), "error");
            ai.disabled = false;
            document.querySelector("#wizard-next").disabled = false;
          }
        }
      };
    const attachScan = document.querySelector("#attach-scan");
    if (attachScan)
      attachScan.addEventListener("change", () => {
        const consent = document.querySelector("#photo-consent");
        consent.hidden = !attachScan.checked && !d.evidence;
        if (consent.hidden) {
          document.querySelector("#image-consent").checked = false;
          save();
        }
      });
    const evidence = document.querySelector("#evidence-file");
    if (evidence) evidence.onchange = () => fileInput(evidence, "evidence");
    const remove = document.querySelector("#remove-evidence");
    if (remove)
      remove.onclick = () => {
        save();
        discardImage(d.evidence);
        d.evidence = null;
        d.values.image_consent = false;
        render();
      };
    form.onsubmit = async (e) => {
      e.preventDefault();
      save();
      feedback.innerHTML = "";
      if (pending) {
        showError("Please wait for your photo to finish preparing.");
        return;
      }
      if (!purchase && step === 0 && !d.product) {
        showError("Add a product photo to continue.", "contributor-photo");
        return;
      }
      if ((!purchase && step === 1) || (purchase && step === 0)) {
        form.elements.category_id.setCustomValidity(
          d.values.category_id === "wooden_elephant"
            ? ""
            : "This pilot accepts wooden elephants only.",
        );
        form.elements.finish.setCustomValidity(
          ["plain", "painted", "inlay", "openwork"].includes(d.values.finish)
            ? ""
            : "Choose a finish before continuing.",
        );
      }
      if (
        step === evidenceStep &&
        (d.product || d.evidence || (purchase && d.values.attach_scan)) &&
        !d.values.image_consent
      ) {
        showError(
          "Please consent to private photo storage, or remove the attachments.",
          "image-consent",
        );
        return;
      }
      const invalid = [...form.elements].find(
        (el) => el.willValidate && !el.validity.valid,
      );
      if (invalid) {
        for (
          let details = invalid.closest("details");
          details;
          details = details.parentElement.closest("details")
        )
          details.open = true;
        invalid.setAttribute("aria-invalid", "true");
        showError(
          `${invalid.labels?.[0]?.textContent?.trim() || "Check this field"}: ${invalid.validationMessage}`,
          invalid.id,
        );
        invalid.focus();
        return;
      }
      if (step < last) {
        d.step++;
        render();
        return;
      }
      const v = d.values,
        product = purchase ? (v.attach_scan ? state.image : null) : d.product;
      if ((product || d.evidence) && !v.image_consent) {
        d.step = evidenceStep;
        render();
        return;
      }
      const body = {
        request_id: d.request_id,
        kind: purchase ? "purchase" : "contributor",
        ...v,
        size_cm: Number(v.size_cm),
        city: "Jaipur",
        price_inr: Number(v.price_inr),
        price_type: purchase ? "paid" : v.price_type,
        source_type: purchase ? "own_purchase" : v.source_type,
        product_image: product?.data || null,
        evidence_image: d.evidence?.data || null,
        image_consent: v.image_consent === true,
        accurate: v.accurate === true,
      };
      document.querySelector("#wizard-next").disabled = true;
      feedback.innerHTML = loading("Sending for review…");
      try {
        const result = devMock
          ? { id: "mock-observation-not-saved", status: "pending" }
          : await submitObservation(body, signal);
        if (signal.aborted) return;
        state.submission = result;
        discardImage(state.image);
        state.image = null;
        state.analysis = null;
        state.result = null;
        clear();
        navigate("/submitted");
      } catch (e) {
        if (!signal.aborted) {
          showError(e.message);
          document.querySelector("#wizard-next").disabled = false;
        }
      }
    };
  }
  return {
    page,
    bind,
    clear,
    startPurchase() {
      if (drafts.purchase) {
        discardImage(drafts.purchase.evidence);
      }
      drafts.purchase = fresh(true);
    },
  };
}
