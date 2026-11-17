import test from "node:test";
import assert from "node:assert/strict";
import {
  buildVisionRequest,
  parseVisionResponse,
} from "../supabase/functions/_shared/vision.js";

const attributes = {
  category_id: "wooden_elephant",
  product_name: "Wooden elephant",
  material: "wood",
  finish: "plain",
  decoration: 'A carved "saddle" with {curved} motifs',
  shape: "Elephant figurine",
  colour_pattern: "Brown",
  decorative_style: "Carved",
  visible_characteristics: "Visible grooves",
  uncertainty: "Dimensions and wood species are unknown.",
};
const response = (content) => ({
  choices: [{ finish_reason: "stop", message: { content } }],
});

test("vision request reserves visible output and enforces the product schema", () => {
  const request = buildVisionRequest("configured-model", "test-image");
  assert.deepEqual(request.reasoning, { enabled: false });
  assert.equal(request.max_tokens, 2048);
  assert.equal(request.provider.require_parameters, true);
  assert.equal(request.response_format.type, "json_schema");
  assert.equal(request.response_format.json_schema.strict, true);
  assert.equal(
    request.response_format.json_schema.schema.additionalProperties,
    false,
  );
  assert.ok(
    !("price" in request.response_format.json_schema.schema.properties),
  );
  assert.ok(
    !("size_cm" in request.response_format.json_schema.schema.properties),
  );
  assert.equal(request.messages[1].content[1].image_url.url, "test-image");
});

test("accepts plain, fenced, prose-wrapped and typed-part JSON without inventing values", () => {
  const json = JSON.stringify(attributes);
  for (const content of [
    json,
    "\uFEFF" + json,
    "```JSON\n" + json + "\n```",
    "The depicted object is described below:\n" + json + "\nPlease confirm it.",
    [{ type: "text", text: json }],
  ]) {
    const result = parseVisionResponse(response(content));
    assert.equal(result.category_id, "wooden_elephant");
    assert.equal(result.decoration, attributes.decoration);
    assert.equal(result.size_cm, undefined);
  }
});

test("detects exhausted reasoning/output budgets before attempting JSON", () => {
  const diagnostics = [];
  for (const content of [
    null,
    '{"category_id":"wooden_elephant"',
    JSON.stringify(attributes),
  ]) {
    assert.throws(
      () =>
        parseVisionResponse(
          { choices: [{ finish_reason: "length", message: { content } }] },
          (d) => diagnostics.push(d),
        ),
      /stopped before completing/,
    );
  }
  assert.ok(diagnostics.every((d) => d.reason === "truncated"));
  assert.ok(!JSON.stringify(diagnostics).includes('"category_id"'));
});

test("does not salvage partial JSON, arrays, ambiguous objects or invalid attributes", () => {
  const json = JSON.stringify(attributes);
  for (const content of [
    json.slice(0, -2),
    json + "\n" + json,
    "[" + json + "]",
    "Not JSON",
    JSON.stringify({ ...attributes, material: "gold" }),
  ]) {
    assert.throws(() => parseVisionResponse(response(content)));
  }
});

test("does not parse reasoning as an answer or leak provider text into errors/logs", () => {
  const diagnostics = [];
  const payload = {
    choices: [
      {
        finish_reason: "stop",
        message: { content: null, reasoning: JSON.stringify(attributes) },
      },
    ],
  };
  assert.throws(
    () => parseVisionResponse(payload, (d) => diagnostics.push(d)),
    /did not return usable details/,
  );
  assert.deepEqual(
    Object.keys(diagnostics[0]).sort(),
    [
      "content_chars",
      "content_type",
      "event",
      "finish_reason",
      "reason",
    ].sort(),
  );
  assert.throws(
    () =>
      parseVisionResponse(
        { error: { message: "private provider details" } },
        (d) => diagnostics.push(d),
      ),
    /could not complete identification/,
  );
  assert.ok(!JSON.stringify(diagnostics).includes("private provider details"));
});

test("normalization still strips model prices and authenticity claims", () => {
  const result = parseVisionResponse(
    response(
      JSON.stringify({
        ...attributes,
        price: 500,
        size_cm: 10,
        authentic: true,
      }),
    ),
  );
  assert.equal(result.price, undefined);
  assert.equal(result.size_cm, undefined);
  assert.equal(result.authentic, undefined);
});
