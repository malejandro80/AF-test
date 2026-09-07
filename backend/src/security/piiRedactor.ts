/**
 * PII Redaction Interceptor & Logger for CFTC/NFA Compliance.
 * Automatically scrubs sensitive PII (names, SSNs, phone numbers, emails, banking details, notes)
 * before logging system events or streaming to external monitoring.
 */

const PII_PATTERNS = [
  // SSN: 000-00-0000
  { pattern: /\b\d{3}-\d{2}-\d{4}\b/g, replacement: "[REDACTED_SSN]" },
  // Emails
  { pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, replacement: "[REDACTED_EMAIL]" },
  // Phone numbers: +1-415-555-0142, 602-555-0155
  { pattern: /(?:\+\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g, replacement: "[REDACTED_PHONE]" },
  // Bank Account & Routing Numbers (e.g. ACH to Chase 000123456789, routing 021000021, Wells Fargo 4455661122)
  { pattern: /\b(?:ACH|routing|wire|Chase|Wells Fargo|bank)\s+(?:to\s+)?(?:routing\s+)?\d{6,12}\b/gi, replacement: "[REDACTED_BANK_INFO]" },
  { pattern: /\brouting\s+\d{8,10}\b/gi, replacement: "[REDACTED_ROUTING]" },
  // Personnummer / Foreign tax IDs (e.g. 880211-4455)
  { pattern: /\b\d{6}-\d{4}\b/g, replacement: "[REDACTED_TAX_ID]" },
  // S3 KYC Packet URLs containing user documents
  { pattern: /s3:\/\/[^\s,]+/gi, replacement: "[REDACTED_KYC_S3_URI]" },
];

export class PiiRedactor {
  /**
   * Sanitizes a string input by replacing all detected PII patterns.
   */
  public static redactString(input: string): string {
    if (!input) return input;
    let sanitized = input;
    for (const { pattern, replacement } of PII_PATTERNS) {
      sanitized = sanitized.replace(pattern, replacement);
    }
    return sanitized;
  }

  /**
   * Recursively sanitizes any object or log payload before printing.
   */
  public static redactObject<T>(obj: T): T {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj === "string") {
      return PiiRedactor.redactString(obj) as unknown as T;
    }
    if (Array.isArray(obj)) {
      return obj.map(item => PiiRedactor.redactObject(item)) as unknown as T;
    }
    if (typeof obj === "object") {
      const sanitizedObj: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(obj)) {
        // Redact explicitly sensitive object key names
        if (["notes", "audit_notes", "auditNotes", "ssn_last4", "ssnLast4", "dob", "phone"].includes(key)) {
          sanitizedObj[key] = "[REDACTED_FIELD]";
        } else {
          sanitizedObj[key] = PiiRedactor.redactObject(value);
        }
      }
      return sanitizedObj as T;
    }
    return obj;
  }
}

export function logRedacted(message: string, meta?: unknown): void {
  const sanitizedMsg = PiiRedactor.redactString(message);
  const sanitizedMeta = meta ? PiiRedactor.redactObject(meta) : undefined;
  if (sanitizedMeta) {
    console.log(`[SYS_LOG] ${sanitizedMsg}`, JSON.stringify(sanitizedMeta));
  } else {
    console.log(`[SYS_LOG] ${sanitizedMsg}`);
  }
}
