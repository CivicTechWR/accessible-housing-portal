/**
 * Removes leading zeros a user typed in front of other digits ("02" -> "2", "00" -> "0"),
 * while keeping a lone "0" and decimals such as "0.5".
 */
export function stripLeadingZeros(text: string): string {
  return text.replace(/^(-?)0+(?=\d)/, "$1");
}

/**
 * Turns the text of a number input into the form value: empty text is `null`
 * (so required fields still fail validation), anything else is the number times `scale`.
 * Not `undefined`: react-hook-form shows the loaded value again for an undefined field.
 */
export function parseNumberInput(text: string, scale = 1): number | null {
  if (text.trim() === "") {
    return null;
  }

  return Number(text) * scale;
}

/** Shows a form value in a number input: no value means an empty field. */
export function formatNumberInput(value: unknown, scale = 1): number | "" {
  return typeof value === "number" && Number.isFinite(value) ? value / scale : "";
}
