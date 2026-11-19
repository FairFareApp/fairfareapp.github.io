import test from "node:test";
import assert from "node:assert/strict";
import {
  parseTicketPage,
  collectTicketPrices,
  venues,
} from "../supabase/functions/_shared/tickets.js";

test("reads the named official ticket and separates resident and international tiers", () => {
  const venue = venues[0];
  const tickets = [
    ["Adult", true, "425"],
    ["Adult", false, "1250"],
    ["Youth Concession", true, "210"],
    ["Youth Concession", false, "625"],
  ].map(([ticketFor, isNational, ticketPrice]) => ({
    ticketFor,
    isNational,
    ticketPrice,
  }));
  const data = [
    "visit",
    {
      cards: [
        { title: "COMPOSITE", tickets: [] },
        { title: venue.ticket, tickets },
      ],
    },
  ];
  const html = `<script>self.__next_f.push(${JSON.stringify([1, "a:" + JSON.stringify(data) + "\n"])})</script>`;
  assert.deepEqual(parseTicketPage(html, venue), {
    indian: 425,
    foreign: 1250,
    student: 210,
    foreign_student: 625,
  });
  assert.throws(() =>
    parseTicketPage(html.replace("1250", "unavailable"), venue),
  );
});

test("free entry needs explicit admission text and failures retain the last verified date", async () => {
  assert.equal(
    parseTicketPage("<h4>Admission:</h4>\n<p>Free entry</p>", venues[2]).indian,
    0,
  );
  assert.throws(() => parseTicketPage("<h4>Free events</h4>", venues[2]));
  const cards = await collectTicketPrices(
    async () => new Response("Unavailable", { status: 503 }),
  );
  assert.ok(
    cards.every(
      (card) =>
        card.verification === "snapshot" &&
        /^\d{4}-\d{2}-\d{2}$/.test(card.checked_at),
    ),
  );
});
