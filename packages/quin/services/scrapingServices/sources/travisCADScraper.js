/**
 * @purpose Travis County Appraisal District scraper implementation.
 * Scrapes property data from traviscad.org using session-based approach.
 */

const { BaseScraper } = require("../baseScraper");
const cheerio = require("cheerio");
const got = require("got");
const { normalizeAddress, normalizePrice } = require("../../../utils/dataNormalization");
const { validateLandParcelData } = require("../../../utils/dataValidation");

/**
 * @purpose Travis County CAD scraper for property tax data.
 */
class TravisCADScraper extends BaseScraper {
  constructor(options = {}) {
    super({
      maxRetries: 3,
      timeout: 30000,
      userAgent: "CentralTexas-Bot/1.0 (Property Research)",
      ...options,
    });

    this.baseUrl = "https://www.traviscad.org";
    this.searchUrl = `${this.baseUrl}/search/property-search/`;
    this.session = null;
    this.cookies = {};

    // HTTP client with cookie jar
    this.httpClient = got.extend({
      prefixUrl: this.baseUrl,
      timeout: 30000,
      retry: {
        limit: 3,
        methods: ["GET", "POST"],
      },
      hooks: {
        beforeRequest: [
          (options) => {
            // Add cookies to request
            if (Object.keys(this.cookies).length > 0) {
              options.headers.cookie = Object.entries(this.cookies)
                .map(([key, value]) => `${key}=${value}`)
                .join("; ");
            }
          },
        ],
        afterResponse: [
          (response) => {
            // Extract cookies from response
            const setCookies = response.headers["set-cookie"];
            if (setCookies) {
              setCookies.forEach((cookie) => {
                const [nameValue] = cookie.split(";");
                const [name, value] = nameValue.split("=");
                this.cookies[name] = value;
              });
            }
            return response;
          },
        ],
      },
    });
  }

  /**
   * @purpose Initialize session by visiting homepage.
   * @returns {Promise<void>}
   */
  async initializeSession() {
    console.log("[TravisCADScraper] Initializing session");

    try {
      const response = await this.httpClient.get("");
      const $ = cheerio.load(response.body);

      // Extract CSRF token if present
      const csrfToken = $('meta[name="csrf-token"]').attr("content") ||
                       $('input[name="_token"]').val();

      if (csrfToken) {
        this.csrfToken = csrfToken;
        console.log("[TravisCADScraper] CSRF token extracted");
      }

      console.log("[TravisCADScraper] Session initialized", {
        cookies: Object.keys(this.cookies).length,
      });
    } catch (error) {
      console.error("[TravisCADScraper] Session initialization failed", {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * @purpose Search for properties by address.
   * @param {string} address - Address to search
   * @returns {Promise<Array>} Search results
   */
  async searchByAddress(address) {
    console.log("[TravisCADScraper] Searching by address", { address });

    if (!this.cookies || Object.keys(this.cookies).length === 0) {
      await this.initializeSession();
    }

    try {
      const searchData = {
        search_type: "address",
        search_value: address,
        _token: this.csrfToken || "",
      };

      const response = await this.httpClient.post("search/results/", {
        form: searchData,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Referer": this.searchUrl,
        },
      });

      const $ = cheerio.load(response.body);
      const results = [];

      // Parse search results table
      $("table.property-list tbody tr").each((index, element) => {
        const $row = $(element);
        
        const propertyId = $row.find(".property-id a").text().trim();
        const ownerName = $row.find(".owner-name").text().trim();
        const propertyAddress = $row.find(".property-address").text().trim();
        const propertyType = $row.find(".property-type").text().trim();
        const taxYear = $row.find(".tax-year").text().trim();
        const marketValue = $row.find(".market-value").text().trim();

        if (propertyId) {
          results.push({
            propertyId,
            ownerName,
            address: propertyAddress,
            propertyType,
            taxYear,
            marketValue: normalizePrice(marketValue),
            detailUrl: `${this.baseUrl}/property/${propertyId}/`,
            source: "traviscad",
          });
        }
      });

      console.log("[TravisCADScraper] Search completed", {
        address,
        resultsFound: results.length,
      });

      return results;
    } catch (error) {
      console.error("[TravisCADScraper] Search failed", {
        address,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * @purpose Get detailed property information.
   * @param {string} propertyId - Property ID from Travis CAD
   * @returns {Promise<Object>} Property details
   */
  async getPropertyDetails(propertyId) {
    console.log("[TravisCADScraper] Getting property details", { propertyId });

    if (!this.cookies || Object.keys(this.cookies).length === 0) {
      await this.initializeSession();
    }

    try {
      const response = await this.httpClient.get(`property/${propertyId}/`);
      const $ = cheerio.load(response.body);

      // Extract property details from various sections
      const details = {
        // Basic Information
        propertyId,
        accountNumber: $("#account-number").text().trim(),
        legalDescription: $("#legal-description").text().trim(),
        mapId: $("#map-id").text().trim(),

        // Owner Information
        ownerName: $("#owner-name").text().trim(),
        mailingAddress: $("#mailing-address").text().trim().replace(/\s+/g, " "),

        // Property Address
        propertyAddress: $("#property-address").text().trim(),
        
        // Land Information
        landAcres: parseFloat($("#land-acres").text().trim()) || 0,
        landSquareFeet: parseInt($("#land-sqft").text().replace(/,/g, "")) || 0,
        landUse: $("#land-use").text().trim(),

        // Improvement Information
        improvements: [],
        
        // Values
        landValue: normalizePrice($("#land-value").text()),
        improvementValue: normalizePrice($("#improvement-value").text()),
        marketValue: normalizePrice($("#market-value").text()),
        appraisedValue: normalizePrice($("#appraised-value").text()),

        // Tax Information
        taxableValue: normalizePrice($("#taxable-value").text()),
        totalTax: normalizePrice($("#total-tax").text()),
        
        // Exemptions
        exemptions: [],

        // Tax Units
        taxUnits: [],

        // Historical Values
        valueHistory: [],
      };

      // Extract improvements
      $("#improvements-table tbody tr").each((index, element) => {
        const $row = $(element);
        details.improvements.push({
          description: $row.find(".improvement-desc").text().trim(),
          yearBuilt: parseInt($row.find(".year-built").text()) || null,
          squareFeet: parseInt($row.find(".square-feet").text().replace(/,/g, "")) || 0,
          value: normalizePrice($row.find(".improvement-value").text()),
        });
      });

      // Extract exemptions
      $("#exemptions-table tbody tr").each((index, element) => {
        const $row = $(element);
        details.exemptions.push({
          type: $row.find(".exemption-type").text().trim(),
          amount: normalizePrice($row.find(".exemption-amount").text()),
          taxUnit: $row.find(".tax-unit").text().trim(),
        });
      });

      // Extract tax units
      $("#tax-units-table tbody tr").each((index, element) => {
        const $row = $(element);
        details.taxUnits.push({
          name: $row.find(".unit-name").text().trim(),
          rate: parseFloat($row.find(".tax-rate").text()) || 0,
          levy: normalizePrice($row.find(".tax-levy").text()),
        });
      });

      // Extract value history (last 5 years)
      $("#value-history-table tbody tr").each((index, element) => {
        const $row = $(element);
        details.valueHistory.push({
          year: parseInt($row.find(".year").text()) || 0,
          landValue: normalizePrice($row.find(".land-value").text()),
          improvementValue: normalizePrice($row.find(".improvement-value").text()),
          marketValue: normalizePrice($row.find(".market-value").text()),
        });
      });

      console.log("[TravisCADScraper] Property details extracted", {
        propertyId,
        hasImprovements: details.improvements.length > 0,
        exemptionCount: details.exemptions.length,
      });

      return details;
    } catch (error) {
      console.error("[TravisCADScraper] Failed to get property details", {
        propertyId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * @purpose Normalize Travis CAD data to standard schema.
   * @param {Object} rawData - Raw scraped data
   * @returns {Object} Normalized property data
   */
  normalize(rawData) {
    console.log("[TravisCADScraper] Normalizing data", {
      propertyId: rawData.propertyId,
    });

    const normalized = {
      // Identifiers
      id: `traviscad-${rawData.propertyId}`,
      parcelId: rawData.propertyId,
      accountNumber: rawData.accountNumber,

      // Property Type
      propertyType: this.determinePropertyType(rawData),
      status: "active", // Tax records are always "active"

      // Location
      address: normalizeAddress(rawData.propertyAddress),

      // Pricing
      pricing: {
        listPrice: null, // Not available from tax records
        assessedValue: rawData.appraisedValue || 0,
        taxableValue: rawData.taxableValue || 0,
        lastSalePrice: null, // Would need deed records
        lastSaleDate: null,
        priceHistory: rawData.valueHistory?.map(vh => ({
          date: `${vh.year}-01-01`,
          price: vh.marketValue,
          event: "assessment",
        })) || [],
      },

      // Details
      details: {
        acreage: rawData.landAcres || 0,
        squareFeet: rawData.landSquareFeet || 0,
        yearBuilt: rawData.improvements?.[0]?.yearBuilt || null,
        zoning: rawData.landUse || "Unknown",
        utilities: {}, // Not available from tax records
        legalDescription: rawData.legalDescription,
        improvements: rawData.improvements || [],
      },

      // Owner
      owner: {
        name: rawData.ownerName,
        mailingAddress: rawData.mailingAddress,
      },

      // Tax Information
      tax: {
        totalTax: rawData.totalTax || 0,
        taxUnits: rawData.taxUnits || [],
        exemptions: rawData.exemptions || [],
      },

      // Source
      sources: {
        traviscad: {
          lastScraped: new Date().toISOString(),
          url: `${this.baseUrl}/property/${rawData.propertyId}/`,
          reliability: 0.95,
        },
      },

      // Metadata
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastVerified: new Date().toISOString(),
        dataQualityScore: null, // Will be calculated
        flags: [],
      },
    };

    // Add county to address
    normalized.address.county = "Travis";
    normalized.address.state = "TX";

    // Determine flags
    if (normalized.pricing.assessedValue > 1000000) {
      normalized.metadata.flags.push("highValue");
    }
    if (normalized.details.acreage > 10) {
      normalized.metadata.flags.push("largeLand");
    }

    return normalized;
  }

  /**
   * @purpose Determine property type from raw data.
   * @param {Object} rawData - Raw property data
   * @returns {string} Property type
   */
  determinePropertyType(rawData) {
    const landUse = (rawData.landUse || "").toLowerCase();
    const hasImprovements = rawData.improvements && rawData.improvements.length > 0;

    if (!hasImprovements && rawData.landAcres > 0) {
      return "land";
    }

    if (landUse.includes("commercial") || landUse.includes("industrial")) {
      return "commercial";
    }

    if (landUse.includes("residential") || landUse.includes("home")) {
      return "residential";
    }

    return rawData.landAcres > 5 ? "land" : "residential";
  }

  /**
   * @purpose Scrape property by address with full workflow.
   * @param {string} address - Property address
   * @returns {Promise<Object>} Complete property data
   */
  async scrape(address) {
    console.log("[TravisCADScraper] Starting scrape workflow", { address });

    try {
      // Search for property
      const searchResults = await this.searchByAddress(address);
      
      if (searchResults.length === 0) {
        throw new Error(`No properties found for address: ${address}`);
      }

      // Get details for first result (most relevant)
      const property = searchResults[0];
      const details = await this.getPropertyDetails(property.propertyId);

      // Normalize to standard schema
      const normalized = this.normalize(details);

      // Validate data
      const validation = validateLandParcelData(normalized);
      normalized.metadata.dataQualityScore = validation.isValid ? 0.9 : 0.5;

      console.log("[TravisCADScraper] Scrape workflow completed", {
        address,
        propertyId: property.propertyId,
        dataQuality: normalized.metadata.dataQualityScore,
      });

      return normalized;
    } catch (error) {
      console.error("[TravisCADScraper] Scrape workflow failed", {
        address,
        error: error.message,
      });
      throw error;
    }
  }
}

module.exports = TravisCADScraper;
