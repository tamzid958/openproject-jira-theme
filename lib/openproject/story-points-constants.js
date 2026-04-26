// Client-safe constants for t-shirt sizing. The server-only resolver lives
// in story-points.js and must NOT be imported by client components.

export const T_SHIRT_TO_POINTS = {
  XS: 1,
  S: 2,
  M: 3,
  L: 5,
  XL: 8,
  XXL: 13,
};

export const T_SHIRT_ORDER = ["XS", "S", "M", "L", "XL", "XXL"];
