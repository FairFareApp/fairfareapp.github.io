const checked = "2026-11-19";
export const venues = [
  {
    id: "city-palace",
    title: "City Palace Museum",
    locality: "Old Jaipur",
    source_url: "https://citypalace.org/visit",
    ticket: "CITY PALACE MUSEUM, JAIPUR",
    adults: "Adult",
    students: "Youth Concession",
    note: "Museum admission covers courtyards and galleries. Royal tours and composite tickets are separate. Student rates use the venue’s youth concession.",
    snapshot: {
      indian: 400,
      foreign: 1200,
      student: 200,
      foreign_student: 600,
    },
  },
  {
    id: "jaigarh",
    title: "Jaigarh Fort",
    locality: "Amer",
    source_url: "https://www.jaigarh.co/visit",
    ticket: "ENTRY TO THE FORT",
    adults: "Adults",
    students: "Students (with valid ID)",
    note: "General entry includes the fort, museum, cannon viewing and Sculpture Park. Guides and some camera permits cost extra.",
    snapshot: { indian: 200, foreign: 700, student: 100, foreign_student: 350 },
  },
  {
    id: "jawahar-kala",
    title: "Jawahar Kala Kendra",
    locality: "JLN Marg",
    source_url:
      "https://www.incredibleindia.gov.in/en/rajasthan/jaipur/jawahar-kala-kendra",
    note: "Free general admission to the cultural centre. Check individual events separately.",
    snapshot: { indian: 0, foreign: 0, student: 0, foreign_student: 0 },
  },
];

function findTicket(value, title) {
  if (!value || typeof value !== "object") return null;
  if (Array.isArray(value.tickets) && Object.values(value).includes(title))
    return value.tickets;
  for (const child of Object.values(value)) {
    const match = findTicket(child, title);
    if (match) return match;
  }
  return null;
}

export function parseTicketPage(html, venue) {
  if (!venue.ticket) {
    if (!/<h4>\s*Admission:\s*<\/h4>\s*<p>\s*Free entry\s*<\/p>/i.test(html))
      throw Error("General admission text changed.");
    return { indian: 0, foreign: 0, student: 0, foreign_student: 0 };
  }
  // Parse the official page's embedded data as JSON. Never execute page scripts.
  for (const match of html.matchAll(
    /self\.__next_f\.push\((\[[^<]+?\])\)<\/script>/g,
  )) {
    let record;
    try {
      record = JSON.parse(match[1]);
    } catch {
      continue;
    }
    if (typeof record[1] !== "string") continue;
    for (const line of record[1].split("\n")) {
      let json;
      try {
        json = JSON.parse(line.slice(line.indexOf(":") + 1));
      } catch {
        continue;
      }
      const tickets = findTicket(json, venue.ticket);
      if (!tickets) continue;
      const read = (label, national) => {
        const ticket = tickets.find(
          (item) => item.ticketFor === label && item.isNational === national,
        );
        const value = ticket?.ticketPrice;
        if (
          !/^\d{1,5}(?:\.\d{1,2})?$/.test(String(value)) ||
          Number(value) <= 0
        )
          throw Error("Published ticket tier is missing or invalid.");
        return Number(value);
      };
      return {
        indian: read(venue.adults, true),
        foreign: read(venue.adults, false),
        student: read(venue.students, true),
        foreign_student: read(venue.students, false),
      };
    }
  }
  throw Error("Official ticket data unavailable.");
}

export async function collectTicketPrices(fetchPage = fetch) {
  return Promise.all(
    venues.map(async (venue) => {
      const { id, title, locality, source_url, note } = venue;
      const card = { id, title, source_url, content: { locality, note } };
      try {
        const response = await fetchPage(source_url, {
          signal: AbortSignal.timeout(6500),
          redirect: "error",
        });
        if (!response.ok) throw Error("Official source unavailable.");
        const prices = parseTicketPage(await response.text(), venue);
        return {
          ...card,
          prices,
          verification: "official",
          checked_at: new Date().toISOString().slice(0, 10),
        };
      } catch {
        return {
          ...card,
          prices: venue.snapshot,
          verification: "snapshot",
          checked_at: checked,
        };
      }
    }),
  );
}
