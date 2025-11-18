/**
 * @purpose Base scraper class providing common scraping functionality.
 * Implements retry logic, error handling, and request management.
 * Designed for extension by source-specific scrapers.
 */

/**
 * @purpose Fetch URL with automatic retry logic and exponential backoff.
 * @param {string} url - URL to fetch
 * @param {Object} options - Fetch options
 * @param {number} maxRetries - Maximum number of retry attempts (default: 3)
 * @returns {Promise<Response>} Fetch response
 */
const fetchWithRetry = async (url, options = {}, maxRetries = 3) => {
  console.log("[fetchWithRetry] Fetching URL", { url, maxRetries });

  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        ...options,
        timeout: options.timeout || 30000, // 30 second default timeout
      });

      if (response.ok) {
        console.log("[fetchWithRetry] Fetch successful", {
          url,
          attempt: attempt + 1,
        });
        return response;
      }

      // Don't retry on 4xx errors (except 429)
      if (response.status >= 400 && response.status < 500 && response.status !== 429) {
        console.log("[fetchWithRetry] Client error, not retrying", {
          url,
          status: response.status,
        });
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Retry on 5xx errors and 429
      if (attempt < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 30000); // Max 30 seconds
        console.log("[fetchWithRetry] Retrying after delay", {
          url,
          attempt: attempt + 1,
          delay,
        });
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    } catch (error) {
      lastError = error;

      // Don't retry on certain errors
      if (error.name === "AbortError" || error.message.includes("timeout")) {
        if (attempt < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
          console.log("[fetchWithRetry] Retrying after timeout", {
            url,
            attempt: attempt + 1,
            delay,
          });
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
      }

      if (attempt === maxRetries) {
        console.error("[fetchWithRetry] Max retries exceeded", {
          url,
          error: error.message,
        });
        throw error;
      }

      const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
      console.log("[fetchWithRetry] Retrying after error", {
        url,
        attempt: attempt + 1,
        delay,
        error: error.message,
      });
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError || new Error("Unknown error in fetchWithRetry");
};

/**
 * @purpose Validate HTTP response.
 * @param {Response} response - Fetch response object
 * @returns {boolean} True if response is valid
 */
const validateResponse = (response) => {
  if (!response || !response.ok) {
    return false;
  }

  const contentType = response.headers.get("content-type");
  if (!contentType) {
    return false;
  }

  // Check for HTML or JSON content
  return (
    contentType.includes("text/html") ||
    contentType.includes("application/json") ||
    contentType.includes("text/xml")
  );
};

/**
 * @purpose Parse HTML content (placeholder - would use cheerio or similar).
 * @param {string} html - HTML content
 * @returns {Object} Parsed document object
 */
const parseHtml = (html) => {
  // Placeholder - in production would use cheerio or jsdom
  // For now, return raw HTML
  console.log("[parseHtml] Parsing HTML", { length: html.length });
  return { html };
};

/**
 * @purpose Extract data from HTML using CSS selectors (placeholder).
 * @param {Object} document - Parsed document object
 * @param {Object} selectors - Object mapping field names to CSS selectors
 * @returns {Object} Extracted data object
 */
const extractData = (document, selectors) => {
  // Placeholder - in production would use cheerio selectors
  console.log("[extractData] Extracting data", { selectors });
  return {};
};

/**
 * @purpose Base scraper class (to be extended by specific scrapers).
 */
class BaseScraper {
  constructor(options = {}) {
    this.options = {
      maxRetries: options.maxRetries || 3,
      timeout: options.timeout || 30000,
      userAgent: options.userAgent || "CentralTexas-Scraper/1.0",
      ...options,
    };
  }

  /**
   * @purpose Fetch and parse data from URL.
   * @param {string} url - URL to scrape
   * @returns {Promise<Object>} Scraped data
   */
  async scrape(url) {
    console.log("[BaseScraper] Starting scrape", { url });

    try {
      const response = await fetchWithRetry(url, {
        headers: {
          "User-Agent": this.options.userAgent,
        },
        timeout: this.options.timeout,
      });

      if (!validateResponse(response)) {
        throw new Error("Invalid response from server");
      }

      const html = await response.text();
      const document = parseHtml(html);
      const data = this.parse(document);

      console.log("[BaseScraper] Scrape completed", { url });
      return data;
    } catch (error) {
      console.error("[BaseScraper] Scrape failed", {
        url,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * @purpose Parse scraped content (to be implemented by subclasses).
   * @param {Object} document - Parsed document
   * @returns {Object} Parsed data
   */
  parse(document) {
    throw new Error("parse() must be implemented by subclass");
  }

  /**
   * @purpose Normalize scraped data to common schema (to be implemented by subclasses).
   * @param {Object} rawData - Raw scraped data
   * @returns {Object} Normalized data
   */
  normalize(rawData) {
    throw new Error("normalize() must be implemented by subclass");
  }
}

module.exports = {
  BaseScraper,
  extractData,
  fetchWithRetry,
  parseHtml,
  validateResponse,
};

