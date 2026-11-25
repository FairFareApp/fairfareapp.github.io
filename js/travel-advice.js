const bargaining = {
  street: {
    low: 10,
    high: 20,
    tip: "Ask two sellers what they charge for the same item. If you want to bargain, tell the seller what you would pay for everything you plan to buy.",
  },
  shop: {
    low: 5,
    high: 10,
    tip: "Ask the shopkeeper whether you can bargain over the price on the tag. If you are buying several items, ask what they will all cost together.",
  },
  boutique: {
    low: 0,
    high: 5,
    tip: "If the shopkeeper says the price is fixed, ask what is included or whether there is a discount for buying several items.",
  },
};
export const bargainingFor = (setting) =>
  Object.hasOwn(bargaining, setting) ? bargaining[setting] : null;

export const routeTip =
  "Follow the trip on Google Maps or another map app. If your driver takes a different road, you can ask the driver, “Is there a reason we’re going this way? Will it cost more?”";
export const meterTip =
  "Ask the driver to turn on the meter before you leave. If there is no working meter, agree on the full fare with the driver before the ride starts.";
export const cardTip =
  "If your card is from another country, ask your bank whether you can use the card in India.";

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
