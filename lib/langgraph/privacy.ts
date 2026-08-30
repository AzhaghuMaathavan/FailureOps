import 'server-only';

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const URL_SECRET_RE = /(postgresql|mysql|mongodb|redis):\/\/[^\s]+/gi;
const BEARER_RE = /(api[_-]?key|secret|token|password|authorization)["'\s:=]+["']?[^\s"'&]+/gi;
const LONG_ID_RE = /\b\d{10,}\b/g;

/**
 * Redact company identifiers and secrets from UI-facing strings.
 * Stored evidence/signal packets are never mutated — only display text.
 */
export function redactForDisplay(value: string, extraTerms: string[] = []): string {
  let next = value
    .replace(URL_SECRET_RE, '[redacted-store]')
    .replace(BEARER_RE, '$1=[redacted]')
    .replace(EMAIL_RE, '[redacted-email]')
    .replace(LONG_ID_RE, '[redacted-id]');

  for (const term of extraTerms) {
    const trimmed = term.trim();
    if (trimmed.length < 3) continue;
    next = next.replace(new RegExp(escapeRegExp(trimmed), 'gi'), '[organization]');
  }
  return next;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
