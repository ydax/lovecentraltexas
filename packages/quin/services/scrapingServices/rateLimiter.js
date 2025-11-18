/**
 * @purpose Rate limiting service to respect target websites.
 * Implements per-domain rate limiting with configurable delays.
 */

// In-memory store for rate limit tracking
// In production, would use Redis or similar distributed cache
const rateLimitStore = new Map();

/**
 * @purpose Get domain from URL.
 * @param {string} url - Full URL
 * @returns {string} Domain name
 */
const getDomain = (url) => {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch (error) {
    console.error("[getDomain] Invalid URL", { url, error: error.message });
    return "unknown";
  }
};

/**
 * @purpose Get rate limit configuration for domain.
 * @param {string} domain - Domain name
 * @returns {Object} Rate limit config
 */
const getRateLimitConfig = (domain) => {
  // Default rate limits (requests per second)
  const defaultConfig = {
    requestsPerSecond: 0.5, // 1 request per 2 seconds
    windowMs: 2000,
  };

  // Domain-specific overrides
  const domainConfigs = {
    "hayscad.org": { requestsPerSecond: 0.5, windowMs: 2000 },
    "traviscad.org": { requestsPerSecond: 0.5, windowMs: 2000 },
    "mls.com": { requestsPerSecond: 1.0, windowMs: 1000 },
  };

  return domainConfigs[domain] || defaultConfig;
};

/**
 * @purpose Check if request is allowed for domain.
 * @param {string} domain - Domain name
 * @returns {boolean} True if request is allowed
 */
const canMakeRequest = (domain) => {
  const config = getRateLimitConfig(domain);
  const now = Date.now();

  if (!rateLimitStore.has(domain)) {
    rateLimitStore.set(domain, {
      requests: [],
      config,
    });
    return true;
  }

  const domainData = rateLimitStore.get(domain);
  const windowStart = now - config.windowMs;

  // Remove old requests outside the window
  domainData.requests = domainData.requests.filter(
    (timestamp) => timestamp > windowStart
  );

  // Check if we're under the limit
  const maxRequests = Math.ceil(
    (config.requestsPerSecond * config.windowMs) / 1000
  );
  const canRequest = domainData.requests.length < maxRequests;

  console.log("[canMakeRequest] Rate limit check", {
    domain,
    requestsInWindow: domainData.requests.length,
    maxRequests,
    canRequest,
  });

  return canRequest;
};

/**
 * @purpose Wait until request is allowed for domain.
 * @param {string} domain - Domain name
 * @returns {Promise<void>}
 */
const waitForRateLimit = async (domain) => {
  const config = getRateLimitConfig(domain);

  while (!canMakeRequest(domain)) {
    const waitTime = config.windowMs;
    console.log("[waitForRateLimit] Waiting for rate limit", {
      domain,
      waitTime,
    });
    await new Promise((resolve) => setTimeout(resolve, waitTime));
  }
};

/**
 * @purpose Record request timestamp for domain.
 * @param {string} domain - Domain name
 * @returns {void}
 */
const recordRequest = (domain) => {
  const now = Date.now();

  if (!rateLimitStore.has(domain)) {
    rateLimitStore.set(domain, {
      requests: [],
      config: getRateLimitConfig(domain),
    });
  }

  const domainData = rateLimitStore.get(domain);
  domainData.requests.push(now);

  console.log("[recordRequest] Request recorded", {
    domain,
    totalRequests: domainData.requests.length,
  });
};

/**
 * @purpose Get remaining requests allowed in current window.
 * @param {string} domain - Domain name
 * @returns {number} Number of remaining requests
 */
const getRemainingRequests = (domain) => {
  const config = getRateLimitConfig(domain);
  const now = Date.now();

  if (!rateLimitStore.has(domain)) {
    return Math.ceil((config.requestsPerSecond * config.windowMs) / 1000);
  }

  const domainData = rateLimitStore.get(domain);
  const windowStart = now - config.windowMs;

  // Remove old requests
  domainData.requests = domainData.requests.filter(
    (timestamp) => timestamp > windowStart
  );

  const maxRequests = Math.ceil(
    (config.requestsPerSecond * config.windowMs) / 1000
  );
  return Math.max(0, maxRequests - domainData.requests.length);
};

/**
 * @purpose Clear rate limit data for domain (useful for testing).
 * @param {string} domain - Domain name
 * @returns {void}
 */
const clearRateLimit = (domain) => {
  if (domain) {
    rateLimitStore.delete(domain);
  } else {
    rateLimitStore.clear();
  }
};

module.exports = {
  canMakeRequest,
  getDomain,
  getRemainingRequests,
  recordRequest,
  waitForRateLimit,
  clearRateLimit, // For testing
};

