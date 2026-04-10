const JSON_CONTENT_TYPE_TYPO = /\b(?:ap+lication|applacation|applicaiton|applicaton)\/json\b/i;

export function normalizeForwardedContentType(contentType: string | null): string | null {
  if (!contentType) {
    return null;
  }
  if (JSON_CONTENT_TYPE_TYPO.test(contentType)) {
    return contentType.replace(JSON_CONTENT_TYPE_TYPO, "application/json");
  }
  return contentType;
}
