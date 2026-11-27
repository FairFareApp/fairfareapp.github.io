export const products = {
  wooden_elephant: {
    name: "Wooden elephant",
    sizeLabel: "Height (cm)",
    sizeHint: "Measure from the bottom of the elephant to its highest point.",
    min: 2,
    max: 30,
    sizes: [2, 4, 6, 8, 10, 13, 16, 20, 25, 30],
    materials: {
      wood: "Wood (type unknown)",
      sandalwood: "Sandalwood (only if confirmed)",
    },
    finishes: {
      plain: "Plain carved wood",
      painted: "Painted",
      inlay: "Decorated with pieces set into the wood",
      openwork: "Carved openings with an elephant inside",
    },
    finishLabel: "Decoration",
    tip: "Look for cracks or broken parts and check how finely the elephant is carved before you make an offer.",
  },
  bangles: {
    name: "Bangles",
    sizeLabel: "Width across the opening (cm)",
    sizeHint:
      "Measure straight across the widest part of the opening, from one inside edge to the other.",
    min: 4.5,
    max: 7.5,
    sizes: [4.5, 5, 5.5, 6, 6.5, 7, 7.5],
    materials: { lac: "Lac (lakh)", glass: "Glass", metal: "Metal used in costume jewellery" },
    finishes: {
      plain: "Plain",
      patterned: "Patterned",
      stonework: "Set with stones",
    },
    finishLabel: "Design",
    tip: "Try on a bangle if the seller lets you. Ask the seller how many bangles are included in the price.",
  },
};
export const packCounts = [1, 2, 4, 6, 12];
export const sellingPlaces = {
  shop: "Local craft shop",
  street: "Street or market stall",
  boutique: "Specialty shop or gallery",
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
