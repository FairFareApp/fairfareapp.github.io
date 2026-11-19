// The fixed four-asset import completed on 19 November 2026.
// Deliberately disabled: no secrets, imports, Storage access or maintenance capability.
Deno.serve(
  () =>
    new Response("Reference import completed.", {
      status: 410,
      headers: { "Cache-Control": "no-store" },
    }),
);
