/**
 * @purpose Travis County Central Appraisal District (CAD) scraper.
 * Extracts property data including ownership, assessed values, tax history, and exemptions.
 * Uses session management for reliable scraping.
 */

const { BaseScraper } = require("../baseScraper");
const { getDomain, waitForRateLimit, recordRequest } = require("../rateLimiter");
const {
  normalizeAddress,
  normalizePrice,
  normalizeAcreage,
  calculateDerivedFields,
  normalizeStatus,
} = require("../../../utils/dataNormalization");
const {
  validateLandParcelData,
} = require("../../../utils/dataValidation");

/**
 * @purpose Extract session cookie from response headers.
 * @param {Array<string>} cookies - Set-Cookie headers
 * @returns {string|null} Session ID or null if not found
 */
const extractSessionCookie = (cookies) => {
  if (!cookies || !Array.isArray(cookies)) {
    return null;
  }

  for (const cookie of cookies) {
    // Look for PHPSESSID, JSESSIONID, or similar session cookies
    const sessionMatch = cookie.match(/(PHPSESSID|JSESSIONID|session_id)=([^;]+)/i);
    if (sessionMatch) {
      return sessionMatch[2];
    }
  }

  return null;
};

/**
 * @purpose Extract text content from HTML element safely.
 * @param {Object} $ - Cheerio instance
 * @param {string} selector - CSS selector
 * @returns {string} Trimmed text content or empty string
 */
const extractText = ($, selector) => {
  const element = $(selector);
  return element.length ? element.text().trim() : "";
};

/**
 * @purpose Extract value from key-value table structure.
 * @param {Object} $ - Cheerio instance
 * @param {string} labelText - Text content of the label
 * @returns {string} Value or empty string
 */
const extractTableValue = ($, labelText) => {
  const row = $(`td:contains("${labelText}")`).closest("tr");
  if (row.length) {
    return row.find("td").last().text().trim();
  }
  return "";
};

/**
 * @purpose Travis County CAD scraper class.
 * Handles session management, search, and property detail extraction.
 */
class TravisCADScraper extends BaseScraper {
  constructor(options = {}) {
    super({
      maxRetries: options.maxRetries || 3,
      timeout: options.timeout || 30000,
      userAgent: options.userAgent || "CentralTexas-Scraper/1.0",
      ...options,
    });

    this.baseUrl = "https://stage.traviscad.org";
    this.searchUrl = `${this.baseUrl}/property-search`;
    this.session = null;
    this.sessionExpiry = null;
    this.domain = getDomain(this.baseUrl);
  }

  /**
   * @purpose Initialize session with Travis CAD website.
   * @returns {Promise<void>}
   */
  async initSession() {
    console.log("[TravisCADScraper][initSession] Initializing session");

    try {
      await waitForRateLimit(this.domain);

      const response = await fetch(this.baseUrl, {
        headers: {
          "User-Agent": this.options.userAgent,
        },
      });

      recordRequest(this.domain);

      if (!response.ok) {
        throw new Error(`Failed to initialize session: ${response.status}`);
      }

      const cookies = response.headers.get("set-cookie");
      if (cookies) {
        this.session = extractSessionCookie([cookies]);
        this.sessionExpiry = Date.now() + 15 * 60 * 1000; // 15 minutes
        console.log("[TravisCADScraper][initSession] Session initialized successfully");
      } else {
        console.log("[TravisCADScraper][initSession] No session cookie found, proceeding without session");
      }
    } catch (error) {
      console.error("[TravisCADScraper][initSession] Error initializing session", {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * @purpose Check if session is valid and refresh if needed.
   * @returns {Promise<void>}
   */
  async ensureValidSession() {
    if (!this.session || Date.now() >= this.sessionExpiry) {
      console.log("[TravisCADScraper][ensureValidSession] Session expired or missing, refreshing");
      await this.initSession();
    }
  }

  /**
   * @purpose Search for properties by address.
   * @param {string} address - Street address to search
   * @returns {Promise<Array>} Array of property search results
   */
  async searchByAddress(address) {
    console.log("[TravisCADScraper][searchByAddress] Searching by address", { address });

    await this.ensureValidSession();

    try {
      await waitForRateLimit(this.domain);

      const searchParams = new URLSearchParams({
        address: address,
      });

      const searchUrl = `${this.searchUrl}?${searchParams.toString()}`;

      const response = await fetch(searchUrl, {
        headers: {
          "User-Agent": this.options.userAgent,
          ...(this.session && { Cookie: `PHPSESSID=${this.session}` }),
        },
      });

      recordRequest(this.domain);

      if (!response.ok) {
        throw new Error(`Search failed: ${response.status}`);
      }

      const html = await response.text();
      const results = this.parseSearchResults(html);

      console.log("[TravisCADScraper][searchByAddress] Search completed", {
        resultsCount: results.length,
      });

      return results;
    } catch (error) {
      console.error("[TravisCADScraper][searchByAddress] Error searching by address", {
        address,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * @purpose Search for property by parcel ID.
   * @param {string} parcelId - County parcel ID
   * @returns {Promise<Array>} Array of property search results
   */
  async searchByParcelId(parcelId) {
    console.log("[TravisCADScraper][searchByParcelId] Searching by parcel ID", { parcelId });

    await this.ensureValidSession();

    try {
      await waitForRateLimit(this.domain);

      const searchParams = new URLSearchParams({
        parcel: parcelId,
      });

      const searchUrl = `${this.searchUrl}?${searchParams.toString()}`;

      const response = await fetch(searchUrl, {
        headers: {
          "User-Agent": this.options.userAgent,
          ...(this.session && { Cookie: `PHPSESSID=${this.session}` }),
        },
      });

      recordRequest(this.domain);

      if (!response.ok) {
        throw new Error(`Search failed: ${response.status}`);
      }

      const html = await response.text();
      const results = this.parseSearchResults(html);

      console.log("[TravisCADScraper][searchByParcelId] Search completed", {
        resultsCount: results.length,
      });

      return results;
    } catch (error) {
      console.error("[TravisCADScraper][searchByParcelId] Error searching by parcel ID", {
        parcelId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * @purpose Parse search results HTML into structured data.
   * @param {string} html - Search results HTML
   * @returns {Array} Array of property objects
   */
  parseSearchResults(html) {
    console.log("[TravisCADScraper][parseSearchResults] Parsing search results");

    // Note: In production, this would use Cheerio to parse HTML
    // For now, returning placeholder structure
    // TODO: Implement actual HTML parsing when cheerio is installed

    const results = [];

    // Placeholder: Extract property IDs, addresses, and detail URLs from HTML
    // This would be implemented with cheerio like:
    // const $ = cheerio.load(html);
    // $('.property-row').each((i, elem) => { ... })

    console.log("[TravisCADScraper][parseSearchResults] Parsed results", {
      count: results.length,
    });

    return results;
  }

  /**
   * @purpose Get detailed property information.
   * @param {string} propertyId - Property ID or URL
   * @returns {Promise<Object>} Property details
   */
  async getPropertyDetails(propertyId) {
    console.log("[TravisCADScraper][getPropertyDetails] Fetching property details", {
      propertyId,
    });

    await this.ensureValidSession();

    try {
      await waitForRateLimit(this.domain);

      // Construct detail URL
      const detailUrl = propertyId.startsWith("http")
        ? propertyId
        : `${this.baseUrl}/property/${propertyId}`;

      const response = await fetch(detailUrl, {
        headers: {
          "User-Agent": this.options.userAgent,
          ...(this.session && { Cookie: `PHPSESSID=${this.session}` }),
        },
      });

      recordRequest(this.domain);

      if (!response.ok) {
        throw new Error(`Failed to fetch property details: ${response.status}`);
      }

      const html = await response.text();
      const propertyData = this.parsePropertyDetails(html);

      console.log("[TravisCADScraper][getPropertyDetails] Property details fetched", {
        propertyId,
      });

      return propertyData;
    } catch (error) {
      console.error("[TravisCADScraper][getPropertyDetails] Error fetching property details", {
        propertyId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * @purpose Parse property detail page HTML into structured data.
   * @param {string} html - Property detail HTML
   * @returns {Object} Parsed property data
   */
  parsePropertyDetails(html) {
    console.log("[TravisCADScraper][parsePropertyDetails] Parsing property details");

    // Note: In production, this would use Cheerio to parse HTML
    // For now, returning placeholder structure
    // TODO: Implement actual HTML parsing when cheerio is installed

    const rawData = {
      // Property identification
      parcelId: "",
      legalDescription: "",

      // Ownership information
      ownerName: "",
      ownerAddress: "",

      // Address information
      propertyAddress: "",
      city: "",
      zipCode: "",

      // Value information
      landValue: "",
      improvementValue: "",
      marketValue: "",
      assessedValue: "",

      // Property characteristics
      acreage: "",
      squareFeet: "",
      yearBuilt: "",
      landUse: "",

      // Tax information
      taxableValue: "",
      totalTaxes: "",
      exemptions: [],

      // Metadata
      sourceUrl: "",
    };

    // Placeholder: Parse HTML using cheerio
    // const $ = cheerio.load(html);
    // rawData.parcelId = extractTableValue($, 'Parcel ID');
    // rawData.ownerName = extractTableValue($, 'Owner');
    // etc.

    console.log("[TravisCADScraper][parsePropertyDetails] Parsing completed");

    return rawData;
  }

  /**
   * @purpose Normalize raw property data to standard schema.
   * @param {Object} rawData - Raw scraped data
   * @returns {Object} Normalized property data
   */
  normalize(rawData) {
    console.log("[TravisCADScraper][normalize] Normalizing property data");

    const normalized = {
      // Source metadata
      source: "traviscad",
      parcelId: `TC-${rawData.parcelId}`,
      sourceUrl: rawData.sourceUrl,

      // Property type and status
      propertyType: "land", // Default, can be refined based on landUse
      status: normalizeStatus("active"),

      // Address
      address: normalizeAddress({
        street: rawData.propertyAddress,
        city: rawData.city || "Austin",
        county: "Travis",
        state: "TX",
        zipCode: rawData.zipCode,
        coordinates: null, // Would be geocoded separately
      }),

      // Pricing
      price: normalizePrice(rawData.marketValue),
      assessedValue: normalizePrice(rawData.assessedValue),
      taxableValue: normalizePrice(rawData.taxableValue),
      landValue: normalizePrice(rawData.landValue),
      improvementValue: normalizePrice(rawData.improvementValue),

      // Property details
      acreage: normalizeAcreage(rawData.acreage),
      squareFeet: parseInt(rawData.squareFeet) || 0,
      yearBuilt: parseInt(rawData.yearBuilt) || null,
      landUse: rawData.landUse,
      zoning: "", // Would need separate zoning data source

      // Ownership
      owner: {
        name: rawData.ownerName,
        address: rawData.ownerAddress,
      },

      // Legal
      legalDescription: rawData.legalDescription,

      // Tax information
      taxes: {
        annual: normalizePrice(rawData.totalTaxes),
        exemptions: rawData.exemptions || [],
      },

      // Utilities (placeholder - would need additional data sources)
      waterRights: null,
      utilities: {
        water: "unknown",
        sewer: "unknown",
        electric: "unknown",
        gas: "unknown",
      },

      // Timestamps
      listingDate: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
    };

    // Calculate derived fields
    const derived = calculateDerivedFields(normalized);
    Object.assign(normalized, derived);

    console.log("[TravisCADScraper][normalize] Normalization completed");

    return normalized;
  }

  /**
   * @purpose Scrape and normalize property by parcel ID.
   * @param {string} parcelId - County parcel ID
   * @returns {Promise<Object>} Normalized property data with validation
   */
  async scrapeProperty(parcelId) {
    console.log("[TravisCADScraper][scrapeProperty] Scraping property", { parcelId });

    try {
      // Get raw property details
      const rawData = await this.getPropertyDetails(parcelId);

      // Normalize to standard schema
      const normalized = this.normalize(rawData);

      // Validate data quality
      const validation = validateLandParcelData(normalized);

      console.log("[TravisCADScraper][scrapeProperty] Scraping completed", {
        parcelId,
        isValid: validation.isValid,
      });

      return {
        data: normalized,
        validation,
      };
    } catch (error) {
      console.error("[TravisCADScraper][scrapeProperty] Error scraping property", {
        parcelId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * @purpose Batch scrape multiple properties by parcel IDs.
   * @param {Array<string>} parcelIds - Array of parcel IDs
   * @returns {Promise<Array>} Array of scrape results
   */
  async batchScrapeProperties(parcelIds) {
    console.log("[TravisCADScraper][batchScrapeProperties] Starting batch scrape", {
      count: parcelIds.length,
    });

    const results = [];

    for (const parcelId of parcelIds) {
      try {
        const result = await this.scrapeProperty(parcelId);
        results.push({
          parcelId,
          success: true,
          data: result.data,
          validation: result.validation,
        });
      } catch (error) {
        console.error("[TravisCADScraper][batchScrapeProperties] Error scraping parcel", {
          parcelId,
          error: error.message,
        });
        results.push({
          parcelId,
          success: false,
          error: error.message,
        });
      }
    }

    console.log("[TravisCADScraper][batchScrapeProperties] Batch scrape completed", {
      total: parcelIds.length,
      successful: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
    });

    return results;
  }
}

module.exports = {
  TravisCADScraper,
  extractSessionCookie,
  extractText,
  extractTableValue,
};
