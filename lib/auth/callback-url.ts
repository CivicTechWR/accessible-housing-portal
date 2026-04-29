const FALLBACK_REDIRECT_PATH = "/";

const DISALLOWED_CALLBACK_PREFIXES = ["/api", "/auth", "/sign-in"];

export function getSafeCallbackPath(
  callbackUrl: FormDataEntryValue | string | string[] | undefined | null,
): string {
  const candidate = Array.isArray(callbackUrl) ? callbackUrl[0] : callbackUrl;

  if (typeof candidate !== "string" || candidate.trim() === "") {
    return FALLBACK_REDIRECT_PATH;
  }

  try {
    const parsed = new URL(candidate, "http://localhost");

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return FALLBACK_REDIRECT_PATH;
    }

    if (
      DISALLOWED_CALLBACK_PREFIXES.some(
        (prefix) => parsed.pathname === prefix || parsed.pathname.startsWith(`${prefix}/`),
      )
    ) {
      return FALLBACK_REDIRECT_PATH;
    }

    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return FALLBACK_REDIRECT_PATH;
  }
}
