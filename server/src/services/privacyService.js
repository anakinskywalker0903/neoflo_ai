// Privacy and Security Service for Visual AI Agent

const DEFAULT_SENSITIVE_DOMAINS = [
  'bank',
  'paypal.com',
  'stripe.com',
  'chase.com',
  'wellsfargo.com',
  '1password.com',
  'bitwarden.com',
  'lastpass.com',
  'dashlane.com',
  'accounts.google.com',
  'login',
  'auth'
];

/**
 * Check if a domain/url is blacklisted for privacy
 */
export function isDomainSensitive(url = '') {
  const lowerUrl = url.toLowerCase();
  return DEFAULT_SENSITIVE_DOMAINS.some(sensitive => lowerUrl.includes(sensitive));
}

/**
 * Sanitize text to remove potential credentials or sensitive tokens
 */
export function sanitizeText(text = '') {
  if (!text) return '';
  return text
    .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, '[REDACTED_EMAIL]')
    .replace(/\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/g, '[REDACTED_CARD]')
    .replace(/\bsk_(?:live|test)_[0-9a-zA-Z]{20,}\b/g, '[REDACTED_API_KEY]')
    .replace(/bearer\s+[A-Za-z0-9\-\._~\+\/]+=*/gi, 'Bearer [REDACTED_TOKEN]');
}

/**
 * Process activity payload for privacy safety before storage
 */
export function processPrivacySafety(activityPayload) {
  const isSensitive = activityPayload.sensitive_content || isDomainSensitive(activityPayload.website);
  
  return {
    ...activityPayload,
    activity: sanitizeText(activityPayload.activity),
    summary: sanitizeText(activityPayload.summary),
    sensitive_content: isSensitive ? 1 : 0,
    // Omit image if sensitive content is flagged
    image_url: isSensitive ? null : (activityPayload.image_url || null)
  };
}
