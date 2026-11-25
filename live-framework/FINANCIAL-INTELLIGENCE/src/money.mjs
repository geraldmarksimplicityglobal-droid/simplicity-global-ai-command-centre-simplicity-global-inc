const CURRENCY_EXPONENTS = Object.freeze({
  BIF: 0, CLP: 0, DJF: 0, GNF: 0, JPY: 0, KMF: 0, KRW: 0, PYG: 0,
  RWF: 0, UGX: 0, VND: 0, VUV: 0, XAF: 0, XOF: 0, XPF: 0,
  BHD: 3, IQD: 3, JOD: 3, KWD: 3, LYD: 3, OMR: 3, TND: 3
});

export function currencyExponent(currency) {
  if (typeof currency !== "string" || !/^[A-Z]{3}$/.test(currency)) {
    throw new TypeError("currency must be a three-letter uppercase ISO code");
  }
  return CURRENCY_EXPONENTS[currency] ?? 2;
}

export function toMinorUnits(amount, currency) {
  const exponent = currencyExponent(currency);
  const value = typeof amount === "number" ? String(amount) : amount;
  if (typeof value !== "string" || !/^-?(0|[1-9]\d*)(\.\d+)?$/.test(value)) {
    throw new TypeError("amount must be a plain decimal string or finite number");
  }
  const negative = value.startsWith("-");
  const unsigned = negative ? value.slice(1) : value;
  const [whole, fraction = ""] = unsigned.split(".");
  if (fraction.length > exponent && [...fraction.slice(exponent)].some(digit => digit !== "0")) {
    throw new RangeError("amount has more decimal places than the currency permits");
  }
  const scale = 10n ** BigInt(exponent);
  const padded = (fraction.slice(0, exponent) + "0".repeat(exponent)).slice(0, exponent);
  const minor = BigInt(whole) * scale + BigInt(padded || "0");
  return negative ? -minor : minor;
}

export function formatMinorUnits(minorUnits, currency) {
  const exponent = currencyExponent(currency);
  const value = typeof minorUnits === "bigint" ? minorUnits : BigInt(minorUnits);
  const negative = value < 0n;
  const absolute = negative ? -value : value;
  const scale = 10n ** BigInt(exponent);
  const whole = absolute / scale;
  const fraction = exponent ? "." + String(absolute % scale).padStart(exponent, "0") : "";
  return (negative ? "-" : "") + whole.toString() + fraction;
}
