/**
 * The one place the business's real details live.
 *
 * A placeholder support address shipped to production once and sat on the live
 * site collecting nothing — the form told customers to email an address that
 * did not exist. Keeping these in a single module means the policy pages, the
 * contact page, the quote form's error messages and the FAQ cannot drift apart
 * or quietly go stale.
 */
export const BUSINESS = {
  /** What customers see. */
  brand: "Digitizing Market",
  /** The registered entity behind it, which payment providers verify against. */
  legalName: "Digitizing Craft",
  email: "swayam.mozar@gmail.com",
  phone: "+91 8356876997",
  /** Tel: links must carry no spaces. */
  phoneHref: "+918356876997",
  city: "Mumbai",
  state: "Maharashtra",
  country: "India",
  domain: "digitizingmarket.com",
  site: "https://www.digitizingmarket.com",
} as const;

export const ADDRESS = `${BUSINESS.city}, ${BUSINESS.state}, ${BUSINESS.country}`;

/**
 * Payment providers and search engines both want a date on a policy, so it is
 * stated rather than left to the reader to guess how current it is.
 */
export const POLICY_UPDATED = "16 September 2026";
