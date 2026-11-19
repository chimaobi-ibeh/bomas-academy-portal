/** "NGN 10,000.00" from an amount in kobo. Safe for the browser and the server. */
export function formatMoney(kobo: number, currency = "NGN") {
  const value = (kobo / 100).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return currency === "NGN" ? `NGN ${value}` : `${currency} ${value}`;
}

/** "₦10,000" for on-screen display. */
export function formatNaira(kobo: number) {
  return `₦${(kobo / 100).toLocaleString("en-NG", { maximumFractionDigits: 2 })}`;
}
