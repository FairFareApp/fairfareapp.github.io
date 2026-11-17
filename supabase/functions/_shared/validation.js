export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
export function text(value, max = 300) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}
export function decodeImage(value) {
  if (typeof value !== "string" || value.length > 2100000)
    throw new HttpError(400, "Choose a compressed image under 1.5 MB.");
  const match = value.match(
    /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/,
  );
  if (!match)
    throw new HttpError(400, "Only JPEG, PNG and WebP images are accepted.");
  let data;
  try {
    data = Uint8Array.from(atob(match[2]), (c) => c.charCodeAt(0));
  } catch {
    throw new HttpError(400, "The image data is invalid.");
  }
  if (!data.length || data.length > 1500000)
    throw new HttpError(400, "The photo exceeds the 1.5 MB limit.");
  const jpeg = data[0] === 255 && data[1] === 216 && data[2] === 255;
  const png =
    data[0] === 137 &&
    data[1] === 80 &&
    data[2] === 78 &&
    data[3] === 71 &&
    data[4] === 13 &&
    data[5] === 10 &&
    data[6] === 26 &&
    data[7] === 10;
  const webp =
    String.fromCharCode(...data.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...data.slice(8, 12)) === "WEBP";
  if (!(
    (match[1] === "image/jpeg" && jpeg) ||
    (match[1] === "image/png" && png) ||
    (match[1] === "image/webp" && webp)
  ))
    throw new HttpError(400, "The photo format does not match its content.");
  return {
    data,
    mime: match[1],
    extension: match[1] === "image/jpeg" ? "jpg" : match[1].split("/")[1],
  };
}
export function normalizeIdentification(value) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    !["wooden_elephant", "unsupported"].includes(value.category_id) ||
    !text(value.product_name)
  )
    throw new HttpError(
      502,
      "The photo service returned unclear details. Try a clearer photo or enter details manually.",
    );
  if (
    !["wood", "resin", "stone", "unknown"].includes(value.material) ||
    !["plain", "painted", "inlay", "openwork", "unknown"].includes(value.finish)
  )
    throw new HttpError(
      502,
      "The photo service returned unsupported attributes. Please enter the details manually.",
    );
  return {
    category_id: value.category_id,
    product_name: text(value.product_name, 100),
    material: ["wood", "unknown"].includes(value.material)
      ? value.material
      : "unknown",
    finish: value.finish,
    decoration: text(value.decoration),
    shape: text(value.shape, 100),
    colour_pattern: text(value.colour_pattern),
    decorative_style: text(value.decorative_style),
    visible_characteristics: text(value.visible_characteristics, 600),
    uncertainty:
      text(value.uncertainty, 600) ||
      "Size, wood species, authenticity and workmanship quality cannot be verified from this image.",
    unknown_attributes: [
      "physical dimensions",
      "wood species",
      "authenticity",
      "origin",
      "craftsmanship quality",
    ],
    finish_uncertain: value.finish === "unknown",
  };
}
export function validateSubmission(b, now = new Date()) {
  if (!b || typeof b !== "object" || Array.isArray(b))
    throw new HttpError(400, "Invalid submission.");
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      b.request_id,
    )
  )
    throw new HttpError(
      400,
      "A valid submission reference is required. Reload and try again.",
    );
  if (
    !["contributor", "purchase"].includes(b.kind) ||
    b.category_id !== "wooden_elephant" ||
    b.city !== "Jaipur"
  )
    throw new HttpError(
      400,
      "The pilot accepts Jaipur wooden elephant observations only.",
    );
  if (
    !["wood", "sandalwood", "unknown"].includes(b.material) ||
    !["plain", "painted", "inlay", "openwork"].includes(b.finish) ||
    !["street", "shop", "boutique"].includes(b.segment)
  )
    throw new HttpError(
      400,
      "Please confirm the product material, finish and market setting.",
    );
  if (
    typeof b.size_cm !== "number" ||
    !Number.isFinite(b.size_cm) ||
    b.size_cm < 2 ||
    b.size_cm > 30
  )
    throw new HttpError(400, "Height must be between 2 and 30 cm.");
  if (
    typeof b.price_inr !== "number" ||
    !Number.isFinite(b.price_inr) ||
    b.price_inr <= 0 ||
    b.price_inr > 100000 ||
    Math.abs(b.price_inr * 100 - Math.round(b.price_inr * 100)) > 0.00001
  )
    throw new HttpError(
      400,
      "Enter a valid rupee price with no more than two decimal places.",
    );
  if (
    !["asking", "paid", "observed"].includes(b.price_type) ||
    !["own_purchase", "seller_quote", "field_observation", "receipt"].includes(
      b.source_type,
    )
  )
    throw new HttpError(400, "Choose the observation source and price type.");
  if (
    b.kind === "purchase" &&
    (b.price_type !== "paid" || b.source_type !== "own_purchase")
  )
    throw new HttpError(
      400,
      "A purchase report must describe your own paid price.",
    );
  const d = new Date(b.observed_at + "T00:00:00Z"),
    today = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(now);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(b.observed_at) ||
    !Number.isFinite(d.getTime()) ||
    d.toISOString().slice(0, 10) !== b.observed_at ||
    b.observed_at < "2020-01-01" ||
    b.observed_at > today
  )
    throw new HttpError(
      400,
      "Choose a real observation date, no later than today.",
    );
  const locality = text(b.locality, 121);
  if (
    locality.length < 2 ||
    locality.length > 120 ||
    (typeof b.notes === "string" && b.notes.length > 2000)
  )
    throw new HttpError(
      400,
      "Provide a locality (2–120 characters) and notes under 2,000 characters.",
    );
  if (b.accurate !== true)
    throw new HttpError(400, "Confirm that this is an honest observation.");
  if ((b.product_image || b.evidence_image) && b.image_consent !== true)
    throw new HttpError(
      400,
      "Explicit consent is required before storing photographs.",
    );
  if (b.kind === "contributor" && !b.product_image)
    throw new HttpError(
      400,
      "Contributor observations require a product photograph.",
    );
  const product = b.product_image ? decodeImage(b.product_image) : null,
    evidence = b.evidence_image ? decodeImage(b.evidence_image) : null;
  return {
    record: {
      request_id: b.request_id,
      kind: b.kind,
      category_id: b.category_id,
      city: "Jaipur",
      locality,
      material: b.material,
      size_cm: b.size_cm,
      finish: b.finish,
      segment: b.segment,
      price_inr: b.price_inr,
      price_type: b.price_type,
      observed_at: b.observed_at,
      source_type: b.source_type,
      notes: text(b.notes, 2000),
      attributes: { decoration: text(b.decoration) },
      image_consent: b.image_consent === true,
      status: "pending",
    },
    product,
    evidence,
  };
}
