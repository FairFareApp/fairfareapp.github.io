import { escapeHTML as h, icon } from "./ui.js";
import { packLabel } from "./products.js";

// Public landmarks for the demo distance and map pin.
// Jaipur Junction: https://www.openstreetmap.org/node/2669084994
// Hawa Mahal: https://www.google.com/maps?cid=9659760862336692748
const station = { latitude: 26.92079, longitude: 75.78665 };
const demoPin = { latitude: 26.923936, longitude: 75.826744 };
const mapUrl = new URL("https://www.google.com/maps/search/");
mapUrl.searchParams.set("api", "1");
mapUrl.searchParams.set("query", `${demoPin.latitude},${demoPin.longitude}`);

const rupees = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
  minimumFractionDigits: 0,
});
const kilometres = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 1 });

function distanceFrom(origin, label) {
  const radians = Math.PI / 180;
  const deltaLatitude = (demoPin.latitude - origin.latitude) * radians;
  const deltaLongitude = (demoPin.longitude - origin.longitude) * radians;
  const halfChordSquared =
    Math.sin(deltaLatitude / 2) ** 2 +
    Math.cos(origin.latitude * radians) *
      Math.cos(demoPin.latitude * radians) *
      Math.sin(deltaLongitude / 2) ** 2;
  const km = 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(halfChordSquared)));
  const distance = km < 0.1 ? "Under 100 m" : `About ${kilometres.format(km)} km`;
  return `${distance} from ${label} in a straight line.`;
}

function cheaperExample(matches, sellerPrice) {
  let cheapest = null;
  for (const row of matches) {
    if (row.provenance !== "synthetic") continue;
    const price = Math.round(Number(row.price_inr) * 100) / 100;
    if (!Number.isFinite(price) || price <= 0 || price >= sellerPrice) continue;
    if (!cheapest || price < cheapest.price) cheapest = { row, price };
  }
  return cheapest;
}

export function sellerQuoteMarkup() {
  return `<section class="quote-panel" aria-labelledby="quote-title">
    <h2 id="quote-title">Compare the seller’s price</h2>
    <form id="quote-form">
      <label for="quoted-price">Price the seller asks for (₹)</label>
      <div class="input-action">
        <input type="number" id="quoted-price" name="quote" min="1" max="100000" step="0.01" required inputmode="decimal" enterkeyhint="go" placeholder="e.g. 600">
        <button class="button primary" type="submit">Compare</button>
      </div>
    </form>
    <p id="quote-context" class="quote-context" role="status"></p>
    <article id="artisan-offer" class="artisan-offer" aria-labelledby="artisan-offer-title" hidden>
      <h3 id="artisan-offer-title">Demo artisan offer</h3>
      <p class="artisan-price"><strong id="artisan-saving"></strong><span id="artisan-example-price"></span></p>
      <p id="artisan-example-item"></p>
      <p class="artisan-demo-note">This is a fictional offer. The pin shows a sample location at Hawa Mahal, Jaipur.</p>
      <p id="artisan-distance" aria-live="polite">${distanceFrom(station, "Jaipur Junction")}</p>
      <div class="artisan-actions">
        <a class="text-link" href="${h(mapUrl.href)}" target="_blank" rel="noopener noreferrer">${icon("location-dot")} View sample pin</a>
        <button class="text-link" type="button" id="artisan-locate">Use my location</button>
      </div>
      <p id="artisan-location-status" class="artisan-demo-note" role="status"></p>
    </article>
  </section>`;
}

export function bindSellerQuote(root, result, attributes, signal) {
  const form = root.querySelector("#quote-form");
  if (!form) return;
  const input = form.elements.quote;
  const status = root.querySelector("#quote-context");
  const offer = root.querySelector("#artisan-offer");
  const distance = root.querySelector("#artisan-distance");
  const locate = root.querySelector("#artisan-locate");
  const locationStatus = root.querySelector("#artisan-location-status");
  locate.hidden = !navigator.geolocation;

  form.oninput = () => {
    status.textContent = "";
    offer.hidden = true;
  };
  form.onsubmit = (event) => {
    event.preventDefault();
    const price = input.valueAsNumber;
    const position = price < result.low ? "below" : price > result.high ? "above" : "within";
    const comparison = `The price the seller asks for is ${position} the ${result.synthetic ? "example price" : "comparison"} range.`;
    const example = cheaperExample(result.matches, price);
    offer.hidden = !example;
    if (!example) {
      status.textContent = `${comparison} FairFare found no cheaper demo offer for this item.`;
      status.scrollIntoView({ block: "nearest" });
      return;
    }
    const savings = rupees.format(Math.round((price - example.price) * 100) / 100);
    status.textContent = comparison;
    const announcement = document.createElement("span");
    announcement.className = "sr-only";
    announcement.textContent = ` The demo offer is ${savings} less.`;
    status.append(announcement);
    root.querySelector("#artisan-saving").textContent = `${savings} less`;
    root.querySelector("#artisan-example-price").textContent = `${rupees.format(example.price)} example price`;
    const size = example.row.size_cm;
    const quantity = Number(attributes.pack_count);
    const bangle = quantity > 1 ? `set of ${packLabel(quantity)}` : "bangle";
    root.querySelector("#artisan-example-item").textContent =
      attributes.category_id === "bangles"
        ? `Similar ${bangle}, ${size} cm across the opening.`
        : `Similar wooden elephant, ${size} cm high.`;
    offer.scrollIntoView({ block: "nearest" });
  };

  locate.onclick = () => {
    locate.disabled = true;
    locationStatus.textContent = "Getting your location…";
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        if (signal.aborted) return;
        distance.textContent = distanceFrom(coords, "your location");
        locationStatus.textContent = "";
        locate.disabled = false;
      },
      () => {
        if (signal.aborted) return;
        distance.textContent = distanceFrom(station, "Jaipur Junction");
        locationStatus.textContent = "Your location is unavailable. Distance is shown from Jaipur Junction.";
        locate.disabled = false;
      },
      { timeout: 8000 },
    );
  };
}
