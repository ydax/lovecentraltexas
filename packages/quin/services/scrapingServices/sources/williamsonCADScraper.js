/**
 * @purpose Williamson County Central Appraisal District (WCAD) scraper.
 * Extracts property data including ownership, assessed values, deed history,
 * ownership chain, property characteristics (acreage, zoning, water), and tax information.
 * Uses session-based navigation with cookie management.
 */

const { BaseScraper } = require("../baseScraper");
const { getDomain, waitForRateLimit, recordRequest } = require("../rateLimiter");
const {
  normalizeAddress,
  normalizePrice,
  normalizeAcreage,
  calculateDerivedFields,
  normalizeStatus,
  normalizeZoning,
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
    // Look for common session cookies (ASP.NET_SessionId, JSESSIONID, etc.)
    const sessionMatch = cookie.match(/(ASP\.NET_SessionId|JSESSIONID|session_id|SessionId)=([^;]+)/i);
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
  const row = $(`td:contains("${labelText}"), th:contains("${labelText}")`).closest("tr");
  if (row.length) {
    return row.find("td").last().text().trim();
  }
  return "";
};

/**
 * @purpose Parse deed history from property detail page.
 * @param {Object} $ - Cheerio instance
 * @returns {Array} Array of deed history objects
 */
const parseDeedHistory = ($) => {
  const deedHistory = [];

  // Look for deed history or ownership history section
  $("table").each((i, table) => {
    const $table = $(table);
    const headerText = $table.find("th, thead").text().toLowerCase();

    if (
      headerText.includes("deed") ||
      headerText.includes("ownership") ||
      headerText.includes("transfer") ||
      headerText.includes("history")
    ) {
      $table.find("tbody tr").each((j, row) => {
        const $row = $(row);
        const cells = $row.find("td");

        if (cells.length >= 2) {
          const deedDate = cells.eq(0).text().trim();
          const grantor = cells.eq(1).text().trim();
          const grantee = cells.length > 2 ? cells.eq(2).text().trim() : "";
          const instrumentType = cells.length > 3 ? cells.eq(3).text().trim() : "";
          const bookPage = cells.length > 4 ? cells.eq(4).text().trim() : "";

          if (deedDate || grantor || grantee) {
            deedHistory.push({
              date: deedDate,
              grantor: grantor,
              grantee: grantee,
              instrumentType: instrumentType,
              bookPage: bookPage,
            });
          }
        }
      });
    }
  });

  return deedHistory;
};

/**
 * @purpose Parse ownership chain from deed history.
 * @param {Array} deedHistory - Array of deed history objects
 * @returns {Array} Array of ownership chain entries
 */
const parseOwnershipChain = (deedHistory) => {
  if (!deedHistory || deedHistory.length === 0) {
    return [];
  }

  // Sort by date (most recent first)
  const sorted = [...deedHistory].sort((a, b) => {
    const dateA = new Date(a.date);
    const dateB = new Date(b.date);
    return dateB - dateA;
  });

  // Build ownership chain
  const chain = [];
  for (const deed of sorted) {
    if (deed.grantee) {
      chain.push({
        owner: deed.grantee,
        acquiredDate: deed.date,
        instrumentType: deed.instrumentType,
        bookPage: deed.bookPage,
      });
    }
  }

  return chain;
};

/**
 * @purpose Parse water rights and water information.
 * @param {Object} $ - Cheerio instance
 * @returns {Object|null} Water rights object or null
 */
const parseWaterRights = ($) => {
  const waterText = extractTableValue($, "Water Rights");
  const waterSource = extractTableValue($, "Water Source");
  const wellPermit = extractTableValue($, "Well Permit");
  const waterDistrict = extractTableValue($, "Water District");

  if (!waterText && !waterSource && !wellPermit && !waterDistrict) {
    return null;
  }

  return {
    hasWaterRights: waterText.toLowerCase().includes("yes") || !!waterSource || !!wellPermit,
    waterSource: waterSource,
    wellPermit: wellPermit,
    waterDistrict: waterDistrict,
    description: waterText,
  };
};

/**
 * @purpose Parse property characteristics (acreage, zoning, water).
 * @param {Object} $ - Cheerio instance
 * @returns {Object} Property characteristics object
 */
const parsePropertyCharacteristics = ($) => {
  return {
    acreage: extractTableValue($, "Acreage") || extractTableValue($, "Acres"),
    zoning: extractTableValue($, "Zoning") || extractTableValue($, "Zoning District"),
    landUse: extractTableValue($, "Land Use") || extractTableValue($, "Use Code"),
    waterRights: parseWaterRights($),
  };
};

/**
 * @purpose Williamson County CAD scraper class.
 * Handles session management, search, property detail extraction,
 * deed history, and ownership chain parsing.
 */
class WilliamsonCADScraper extends BaseScraper {
  constructor(options = {}) {
    super({
      maxRetries: options.maxRetries || 3,
      timeout: options.timeout || 30000,
      userAgent: options.userAgent || "CentralTexas-Scraper/1.0",
      ...options,
    });

    this.baseUrl = "https://www.wcad.org";
    this.searchUrl = `${this.baseUrl}/property-search`;
    this.session = null;
    this.sessionExpiry = null;
    this.domain = getDomain(this.baseUrl);
  }

  /**
   * @purpose Initialize session with Williamson CAD website.
   * @returns {Promise<void>}
   */
  async initSession() {
    console.log("[WilliamsonCADScraper][initSession] Initializing session");

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
        console.log("[WilliamsonCADScraper][initSession] Session initialized successfully");
      } else {
        console.log("[WilliamsonCADScraper][initSession] No session cookie found, proceeding without session");
      }
    } catch (error) {
      console.error("[WilliamsonCADScraper][initSession] Error initializing session", {
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
      console.log("[WilliamsonCADScraper][ensureValidSession] Session expired or missing, refreshing");
      await this.initSession();
    }
  }

  /**
   * @purpose Search for properties by address.
   * @param {string} address - Street address to search
   * @returns {Promise<Array>} Array of property search results
   */
  async searchByAddress(address) {
    console.log("[WilliamsonCADScraper][searchByAddress] Searching by address", { address });

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
          ...(this.session && { Cookie: `ASP.NET_SessionId=${this.session}` }),
        },
      });

      recordRequest(this.domain);

      if (!response.ok) {
        // If session expired, retry once
        if (response.status === 401 || response.status === 403) {
          console.log("[WilliamsonCADScraper][searchByAddress] Session may have expired, retrying");
          this.session = null;
          await this.ensureValidSession();
          return this.searchByAddress(address);
        }
        throw new Error(`Search failed: ${response.status}`);
      }

      const html = await response.text();
      const results = this.parseSearchResults(html);

      console.log("[WilliamsonCADScraper][searchByAddress] Search completed", {
        resultsCount: results.length,
      });

      return results;
    } catch (error) {
      console.error("[WilliamsonCADScraper][searchByAddress] Error searching by address", {
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
    console.log("[WilliamsonCADScraper][searchByParcelId] Searching by parcel ID", { parcelId });

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
          ...(this.session && { Cookie: `ASP.NET_SessionId=${this.session}` }),
        },
      });

      recordRequest(this.domain);

      if (!response.ok) {
        // If session expired, retry once
        if (response.status === 401 || response.status === 403) {
          console.log("[WilliamsonCADScraper][searchByParcelId] Session may have expired, retrying");
          this.session = null;
          await this.ensureValidSession();
          return this.searchByParcelId(parcelId);
        }
        throw new Error(`Search failed: ${response.status}`);
      }

      const html = await response.text();
      const results = this.parseSearchResults(html);

      console.log("[WilliamsonCADScraper][searchByParcelId] Search completed", {
        resultsCount: results.length,
      });

      return results;
    } catch (error) {
      console.error("[WilliamsonCADScraper][searchByParcelId] Error searching by parcel ID", {
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
    console.log("[WilliamsonCADScraper][parseSearchResults] Parsing search results");

    // Note: In production, this would use Cheerio to parse HTML
    // For now, returning placeholder structure
    // TODO: Implement actual HTML parsing when cheerio is installed

    const results = [];

    // Placeholder: Extract property IDs, addresses, and detail URLs from HTML
    // This would be implemented with cheerio like:
    // const $ = cheerio.load(html);
    // $('.property-row').each((i, elem) => {
    //   const $row = $(elem);
    //   results.push({
    //     propertyId: $row.find('.property-id').text().trim(),
    //     parcelId: $row.find('.parcel-id').text().trim(),
    //     address: $row.find('.property-address').text().trim(),
    //     owner: $row.find('.owner-name').text().trim(),
    //     detailUrl: this.baseUrl + $row.find('a.details-link').attr('href')
    //   });
    // });

    console.log("[WilliamsonCADScraper][parseSearchResults] Parsed results", {
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
    console.log("[WilliamsonCADScraper][getPropertyDetails] Fetching property details", {
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
          ...(this.session && { Cookie: `ASP.NET_SessionId=${this.session}` }),
        },
      });

      recordRequest(this.domain);

      if (!response.ok) {
        // If session expired, retry once
        if (response.status === 401 || response.status === 403) {
          console.log("[WilliamsonCADScraper][getPropertyDetails] Session may have expired, retrying");
          this.session = null;
          await this.ensureValidSession();
          return this.getPropertyDetails(propertyId);
        }
        throw new Error(`Failed to fetch property details: ${response.status}`);
      }

      const html = await response.text();
      const propertyData = this.parsePropertyDetails(html, detailUrl);

      console.log("[WilliamsonCADScraper][getPropertyDetails] Property details fetched", {
        propertyId,
      });

      return propertyData;
    } catch (error) {
      console.error("[WilliamsonCADScraper][getPropertyDetails] Error fetching property details", {
        propertyId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * @purpose Parse property detail page HTML into structured data.
   * @param {string} html - Property detail HTML
   * @param {string} sourceUrl - Source URL for reference
   * @returns {Object} Parsed property data
   */
  parsePropertyDetails(html, sourceUrl) {
    console.log("[WilliamsonCADScraper][parsePropertyDetails] Parsing property details");

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
      appraisedValue: "",

      // Property characteristics
      acreage: "",
      squareFeet: "",
      yearBuilt: "",
      landUse: "",
      zoning: "",

      // Tax information
      taxableValue: "",
      totalTaxes: "",
      exemptions: [],

      // Deed history and ownership chain
      deedHistory: [],
      ownershipChain: [],

      // Water rights
      waterRights: null,

      // Metadata
      sourceUrl: sourceUrl,
    };

    // Placeholder: Parse HTML using cheerio
    // const $ = cheerio.load(html);
    //
    // // Basic property information
    // rawData.parcelId = extractTableValue($, 'Parcel ID');
    // rawData.ownerName = extractTableValue($, 'Owner');
    // rawData.ownerAddress = extractTableValue($, 'Owner Address');
    //
    // // Address
    // rawData.propertyAddress = extractTableValue($, 'Property Address');
    // rawData.city = extractTableValue($, 'City');
    // rawData.zipCode = extractTableValue($, 'Zip Code');
    //
    // // Values
    // rawData.landValue = extractTableValue($, 'Land Value');
    // rawData.improvementValue = extractTableValue($, 'Improvement Value');
    // rawData.marketValue = extractTableValue($, 'Market Value');
    // rawData.appraisedValue = extractTableValue($, 'Appraised Value');
    //
    // // Property characteristics
    // const characteristics = parsePropertyCharacteristics($);
    // rawData.acreage = characteristics.acreage;
    // rawData.zoning = characteristics.zoning;
    // rawData.landUse = characteristics.landUse;
    // rawData.waterRights = characteristics.waterRights;
    //
    // // Deed history
    // rawData.deedHistory = parseDeedHistory($);
    // rawData.ownershipChain = parseOwnershipChain(rawData.deedHistory);
    //
    // // Tax information
    // rawData.taxableValue = extractTableValue($, 'Taxable Value');
    // rawData.totalTaxes = extractTableValue($, 'Total Taxes');

    console.log("[WilliamsonCADScraper][parsePropertyDetails] Parsing completed");

    return rawData;
  }

  /**
   * @purpose Normalize raw property data to standard schema.
   * @param {Object} rawData - Raw scraped data
   * @returns {Object} Normalized property data
   */
  normalize(rawData) {
    console.log("[WilliamsonCADScraper][normalize] Normalizing property data");

    const normalized = {
      // Source metadata
      source: "williamsoncad",
      parcelId: `WC-${rawData.parcelId}`,
      sourceUrl: rawData.sourceUrl,

      // Property type and status
      propertyType: "land", // Default, can be refined based on landUse
      status: normalizeStatus("active"),

      // Address
      address: normalizeAddress({
        street: rawData.propertyAddress,
        city: rawData.city || "Georgetown",
        county: "Williamson",
        state: "TX",
        zipCode: rawData.zipCode,
        coordinates: null, // Would be geocoded separately
      }),

      // Pricing
      price: normalizePrice(rawData.marketValue || rawData.appraisedValue),
      assessedValue: normalizePrice(rawData.assessedValue || rawData.appraisedValue),
      taxableValue: normalizePrice(rawData.taxableValue),
      landValue: normalizePrice(rawData.landValue),
      improvementValue: normalizePrice(rawData.improvementValue),

      // Property details
      acreage: normalizeAcreage(rawData.acreage),
      squareFeet: parseInt(rawData.squareFeet) || 0,
      yearBuilt: parseInt(rawData.yearBuilt) || null,
      landUse: rawData.landUse,
      zoning: normalizeZoning(rawData.zoning),

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

      // Deed history and ownership chain (specific to Williamson County)
      deedHistory: rawData.deedHistory || [],
      ownershipChain: rawData.ownershipChain || [],

      // Water rights (specific to Williamson County)
      waterRights: rawData.waterRights,

      // Utilities (placeholder - would need additional data sources)
      utilities: {
        water: rawData.waterRights?.hasWaterRights ? "yes" : "unknown",
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

    console.log("[WilliamsonCADScraper][normalize] Normalization completed");

    return normalized;
  }

  /**
   * @purpose Scrape and normalize property by parcel ID.
   * @param {string} parcelId - County parcel ID
   * @returns {Promise<Object>} Normalized property data with validation
   */
  async scrapeProperty(parcelId) {
    console.log("[WilliamsonCADScraper][scrapeProperty] Scraping property", { parcelId });

    try {
      // Get raw property details
      const rawData = await this.getPropertyDetails(parcelId);

      // Normalize to standard schema
      const normalized = this.normalize(rawData);

      // Validate data quality
      const validation = validateLandParcelData(normalized);

      console.log("[WilliamsonCADScraper][scrapeProperty] Scraping completed", {
        parcelId,
        isValid: validation.isValid,
      });

      return {
        data: normalized,
        validation,
      };
    } catch (error) {
      console.error("[WilliamsonCADScraper][scrapeProperty] Error scraping property", {
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
    console.log("[WilliamsonCADScraper][batchScrapeProperties] Starting batch scrape", {
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
        console.error("[WilliamsonCADScraper][batchScrapeProperties] Error scraping parcel", {
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

    console.log("[WilliamsonCADScraper][batchScrapeProperties] Batch scrape completed", {
      total: parcelIds.length,
      successful: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
    });

    return results;
  }
}

module.exports = {
  WilliamsonCADScraper,
  extractSessionCookie,
  extractText,
  extractTableValue,
  parseDeedHistory,
  parseOwnershipChain,
  parseWaterRights,
  parsePropertyCharacteristics,
};

