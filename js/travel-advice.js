const bargaining = {
  street: {
    setting: "Market stall",
    scope: "More room to ask",
    low: 10,
    high: 20,
    tip: "Ask two stalls about the same item. Make one polite counteroffer for the whole purchase.",
  },
  shop: {
    setting: "Local craft shop",
    scope: "Some room to ask",
    low: 5,
    high: 10,
    tip: "Ask if the tag is fixed. If buying several pieces, ask for a total that includes any extras.",
  },
  boutique: {
    setting: "Boutique or gallery",
    scope: "Limited room to ask",
    low: 0,
    high: 5,
    tip: "Respect fixed prices. Ask about bundle offers or what the price includes.",
  },
};
export const bargainingFor = (setting) =>
  Object.hasOwn(bargaining, setting) ? bargaining[setting] : null;

export const routeTip =
  "Keep Google Maps or another route app open. Ask about a longer detour before it adds time or cost.";
export const meterTip =
  "Meters aren’t always used or reliable. If the meter is off, missing or looks faulty, agree a total before leaving.";
export const cardTip =
  "Visiting from abroad? Check with your card issuer that international transactions in India are enabled.";

export const fareSources = {
  auto: "https://transport.rajasthan.gov.in/content/dam/transport/transport-dept/pdf/Fares/O_15.07.2013.pdf",
  taxi: "https://transport.rajasthan.gov.in/content/dam/transport/transport-dept/pdf/Fares/O_05.04.2013.pdf",
  index:
    "https://transport.rajasthan.gov.in/content/transportportal/en/transport/farefeesandtax/vehicleFareRateList.html",
  autoProvider:
    "https://www.uber.com/global/en/r/routes/jai-to-jaipur-rajasthan-in/",
  taxiProvider: "https://www.pinkcitytours.com/taxi-service-in-jaipur/",
  exchange: "https://www.rbi.org.in/scripts/FS_FAQs.aspx?Id=54&fn=5",
};

// Scheduled distance bands from Rajasthan's prepaid taxi booth order, 5 April 2013.
const taxiBands = [
  [2, 100, 150],
  [4, 130, 190],
  [6, 160, 230],
  [8, 190, 270],
  [10, 220, 310],
  [12, 250, 350],
  [14, 280, 390],
  [16, 310, 430],
  [20, 370, 510],
];
export function historicalFare(vehicle, distance) {
  if (!Number.isFinite(distance) || distance < 0.1 || distance > 50)
    return null;
  if (vehicle === "auto") {
    // Distance-only estimate from the 15 July 2013 auto order.
    return 15 + Math.max(0, distance - 1) * 9;
  }
  if (vehicle !== "taxi-small" && vehicle !== "taxi-large") return null;
  const band = taxiBands.find(([upTo]) => distance <= upTo);
  return band ? band[vehicle === "taxi-small" ? 1 : 2] : null;
}
