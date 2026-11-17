import { validateSubmission } from "../_shared/validation.js";
import {
  readBody,
  reply,
  quota,
  admin,
  handleError,
} from "../_shared/runtime.js";

Deno.serve(async (req) => {
  const uploaded = [];
  let requestId = null,
    submissionId = null;
  try {
    if (req.method === "OPTIONS") return reply(req, {});
    const body = await readBody(req);
    const { record, product, evidence } = validateSubmission(body);
    requestId = record.request_id;
    await quota(req, "submit");
    const existing = await admin(
      "/rest/v1/ff_submissions?request_id=eq." +
        record.request_id +
        "&select=id,status",
    );
    if (existing?.length)
      return reply(req, { id: existing[0].id, status: "pending" });
    const id = crypto.randomUUID();
    submissionId = id;
    const metadata = [];
    for (const [purpose, image] of [
      ["product", product],
      ["evidence", evidence],
    ]) {
      if (!image) continue;
      const path = id + "/" + crypto.randomUUID() + "." + image.extension;
      await admin("/storage/v1/object/fairfare-evidence/" + path, {
        method: "POST",
        raw: image.data,
        contentType: image.mime,
      });
      uploaded.push(path);
      metadata.push({
        submission_id: id,
        object_path: path,
        purpose,
        mime_type: image.mime,
        byte_size: image.data.length,
      });
    }
    // One RPC inserts the pending record and evidence metadata atomically.
    await admin("/rest/v1/rpc/ff_insert_submission", {
      method: "POST",
      body: { p_record: { id, ...record }, p_evidence: metadata },
    });
    return reply(req, { id, status: "pending" }, 201);
  } catch (error) {
    // Resolve uncertain commits before deleting uploads. A timed-out transaction may have committed.
    if (requestId && submissionId) {
      try {
        const saved = await admin(
          "/rest/v1/ff_submissions?request_id=eq." + requestId + "&select=id",
        );
        if (saved?.length) {
          if (saved[0].id !== submissionId && uploaded.length)
            await admin("/storage/v1/object/fairfare-evidence", {
              method: "DELETE",
              body: { prefixes: uploaded },
            });
          return reply(req, { id: saved[0].id, status: "pending" });
        }
      } catch {
        return handleError(req, error);
      }
    }
    if (uploaded.length) {
      try {
        await admin("/storage/v1/object/fairfare-evidence", {
          method: "DELETE",
          body: { prefixes: uploaded },
        });
      } catch {
        /* Operator can sweep orphan paths using documented maintenance. */
      }
    }
    return handleError(req, error);
  }
});
