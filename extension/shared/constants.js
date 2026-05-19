export const SIZES = ["XS", "S", "M", "L", "XL", "XXL"];

export const SIZE_OPTIONS_HTML = SIZES.map(
  (s) => `<option value="${s}">${s}</option>`
).join("");
