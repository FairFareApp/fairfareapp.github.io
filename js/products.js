export const products = {
  wooden_elephant: {
    name: "Wooden elephant",
    sizeLabel: "Height (cm)",
    sizeHint: "Measure from the base to the highest point.",
    min: 2,
    max: 30,
    materials: {
      wood: "Wood (type unknown)",
      sandalwood: "Sandalwood (if verified)",
    },
    finishes: {
      plain: "Plain carved wood",
      painted: "Painted",
      inlay: "Inlaid",
      openwork: "Carved openings with an elephant inside",
    },
    finishLabel: "Finish",
    tip: "Check the carving and condition before you make an offer.",
  },
  bangles: {
    name: "Bangles",
    sizeLabel: "Inner diameter (cm)",
    sizeHint:
      "Measure straight across the opening, from inner edge to inner edge.",
    min: 4.5,
    max: 7.5,
    materials: { lac: "Lac (lakh)", glass: "Glass", metal: "Fashion metal" },
    finishes: {
      plain: "Plain",
      patterned: "Patterned",
      stonework: "Set with stones",
    },
    finishLabel: "Design",
    tip: "Check the fit and count the bangles included in the price.",
  },
};
export const packCounts = [1, 2, 4, 6, 12];
export const sellingPlaces = {
  shop: "Local craft shop",
  street: "Street or market stall",
  boutique: "Boutique or gallery",
};
export const productFor = (category) =>
  Object.hasOwn(products, category) ? products[category] : null;
export const productName = (category) =>
  productFor(category)?.name || "This item is outside the demo";
export const sizeTolerance = (category, size) =>
  category === "bangles" ? 0.3 : Math.max(2, size * 0.2);
export const packLabel = (count) =>
  count === 1 ? "1 bangle" : `${count} bangles`;
export function changeProduct(attributes, previousCategory) {
  if (attributes.category_id === previousCategory) return attributes;
  return {
    ...attributes,
    size_cm: "",
    material: "unknown",
    finish: "unknown",
    pack_count: "",
    carving_detail: "unknown",
  };
}
