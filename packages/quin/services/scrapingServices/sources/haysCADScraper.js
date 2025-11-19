/**
 * @purpose Hays County Central Appraisal District (CAD) scraper.
 * Extracts property data including ownership, assessed values, agricultural exemptions,
 * wildlife management data, improvement details, and tax information.
 * Uses traditional HTML parsing for the BIS Consulting platform.
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
 * @purpose Extract value from definition list structure.
 * @param {Object} $ - Cheerio instance
 * @param {string} labelText - Text content of the dt label
 * @returns {string} Value or empty string
 */
const extractDefinitionValue = ($, labelText) => {
  const dt = $(`dt:contains("${labelText}")`);
  if (dt.length) {
    return dt.next("dd").text().trim();
  }
  return "";
};

/**
 * @purpose Parse agricultural exemptions from detail page.
 * @param {Object} $ - Cheerio instance
 * @returns {Array} Array of exemption objects
 */
const parseAgriculturalExemptions = ($) => {
  const exemptions = [];

  // Look for agricultural exemptions section
  $("table").each((i, table) => {
    const $table = $(table);
    const headerText = $table.find("th, thead").text().toLowerCase();

    if (headerText.includes("exemption") || headerText.includes("agriculture")) {
      $table.find("tbody tr").each((j, row) => {
        const $row = $(row);
        const exemptionType = $row.find("td").eq(0).text().trim();
        const exemptionValue = $row.find("td").eq(1).text().trim();

        if (exemptionType && exemptionValue) {
          exemptions.push({
            type: exemptionType,
            value: normalizePrice(exemptionValue),
          });
        }
      });
    }
  });

  return exemptions;
};

/**
 * @purpose Parse wildlife management data from detail page.
 * @param {Object} $ - Cheerio instance
 * @returns {Object|null} Wildlife management object or null
 */
const parseWildlifeManagement = ($) => {
  const wildlifeText = extractTableValue($, "Wildlife Management");
  const wildlifeAcres = extractTableValue($, "Wildlife Acres");
  const wildlifeValue = extractTableValue($, "Wildlife Value");

  if (!wildlifeText && !wildlifeAcres && !wildlifeValue) {
    return null;
  }

  return {
    hasWildlifeManagement: wildlifeText.toLowerCase().includes("yes") || !!wildlifeAcres,
    acres: normalizeAcreage(wildlifeAcres),
    value: normalizePrice(wildlifeValue),
    description: wildlifeText,
  };
};

/**
 * @purpose Parse improvement details from detail page.
 * @param {Object} $ - Cheerio instance
 * @returns {Array} Array of improvement objects
 */
const parseImprovements = ($) => {
  const improvements = [];

  // Look for improvements or buildings section
  $("table").each((i, table) => {
    const $table = $(table);
    const headerText = $table.find("th, thead").text().toLowerCase();

    if (
      headerText.includes("improvement") ||
      headerText.includes("building") ||
      headerText.includes("structure")
    ) {
      $table.find("tbody tr").each((j, row) => {
        const $row = $(row);
        const cells = $row.find("td");

        if (cells.length >= 2) {
          const improvementType = cells.eq(0).text().trim();
          const squareFeet = cells.eq(1).text().trim();
          const yearBuilt = cells.length > 2 ? cells.eq(2).text().trim() : "";
          const condition = cells.length > 3 ? cells.eq(3).text().trim() : "";

          if (improvementType) {
            improvements.push({
              type: improvementType,
              squareFeet: parseInt(squareFeet.replace(/[^\d]/g, "")) || 0,
              yearBuilt: parseInt(yearBuilt.replace(/[^\d]/g, "")) || null,
              condition: condition,
            });
          }
        }
      });
    }
  });

  return improvements;
};

/**
 * @purpose Calculate total square feet from improvements array.
 * @param {Array} improvements - Array of improvement objects
 * @returns {number} Total square feet
 */
const calculateTotalSquareFeet = (improvements) => {
  return improvements.reduce((total, improvement) => {
    return total + (improvement.squareFeet || 0);
  }, 0);
};

/**
 * @purpose Hays County CAD scraper class.
 * Handles search, pagination, and property detail extraction.
 */
class HaysCADScraper extends BaseScraper {
  constructor(options = {}) {
    super({
      maxRetries: options.maxRetries || 3,
      timeout: options.timeout || 30000,
      userAgent: options.userAgent || "CentralTexas-Scraper/1.0",
      ...options,
    });

    this.baseUrl = "https://esearch.hayscad.com";
    this.searchUrl = `${this.baseUrl}/Property/PropertySearch`;
    this.domain = getDomain(this.baseUrl);
  }

  /**
   * @purpose Search for properties by address.
   * @param {string} address - Street address to search
   * @param {number} pageNumber - Page number for pagination (default: 1)
   * @returns {Promise<Object>} Search results with properties and pagination info
   */
  async searchByAddress(address, pageNumber = 1) {
    console.log("[HaysCADScraper][searchByAddress] Searching by address", {
      address,
      pageNumber,
    });

    try {
      await waitForRateLimit(this.domain);

      const searchParams = new URLSearchParams({
        Address: address,
        Page: pageNumber.toString(),
      });

      const searchUrl = `${this.searchUrl}?${searchParams.toString()}`;

      const response = await fetch(searchUrl, {
        headers: {
          "User-Agent": this.options.userAgent,
        },
      });

      recordRequest(this.domain);

      if (!response.ok) {
        throw new Error(`Search failed: ${response.status}`);
      }

      const html = await response.text();
      const results = this.parseSearchResults(html);

      console.log("[HaysCADScraper][searchByAddress] Search completed", {
        resultsCount: results.properties.length,
        currentPage: results.currentPage,
        totalPages: results.totalPages,
      });

      return results;
    } catch (error) {
      console.error("[HaysCADScraper][searchByAddress] Error searching by address", {
        address,
        pageNumber,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * @purpose Search for property by parcel ID.
   * @param {string} parcelId - County parcel ID
   * @returns {Promise<Object>} Property detail URL or null
   */
  async searchByParcelId(parcelId) {
    console.log("[HaysCADScraper][searchByParcelId] Searching by parcel ID", { parcelId });

    try {
      await waitForRateLimit(this.domain);

      const searchParams = new URLSearchParams({
        ParcelID: parcelId,
      });

      const searchUrl = `${this.searchUrl}?${searchParams.toString()}`;

      const response = await fetch(searchUrl, {
        headers: {
          "User-Agent": this.options.userAgent,
        },
      });

      recordRequest(this.domain);

      if (!response.ok) {
        throw new Error(`Search failed: ${response.status}`);
      }

      const html = await response.text();
      const results = this.parseSearchResults(html);

      console.log("[HaysCADScraper][searchByParcelId] Search completed", {
        resultsCount: results.properties.length,
      });

      return results;
    } catch (error) {
      console.error("[HaysCADScraper][searchByParcelId] Error searching by parcel ID", {
        parcelId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * @purpose Search by sequential property ID for bulk scraping.
   * @param {number} propertyId - Sequential property ID
   * @returns {Promise<string|null>} Property detail URL or null if not found
   */
  async searchByPropertyId(propertyId) {
    console.log("[HaysCADScraper][searchByPropertyId] Searching by property ID", {
      propertyId,
    });

    try {
      // Construct direct property URL using sequential ID
      const propertyUrl = `${this.baseUrl}/Property/View/${propertyId}`;

      await waitForRateLimit(this.domain);

      const response = await fetch(propertyUrl, {
        headers: {
          "User-Agent": this.options.userAgent,
        },
        redirect: "manual", // Handle redirects manually
      });

      recordRequest(this.domain);

      // 404 means property ID doesn't exist
      if (response.status === 404) {
        console.log("[HaysCADScraper][searchByPropertyId] Property not found", {
          propertyId,
        });
        return null;
      }

      // 302/301 might indicate property doesn't exist or moved
      if (response.status === 301 || response.status === 302) {
        console.log("[HaysCADScraper][searchByPropertyId] Property redirected", {
          propertyId,
          status: response.status,
        });
        return null;
      }

      if (!response.ok) {
        throw new Error(`Property lookup failed: ${response.status}`);
      }

      console.log("[HaysCADScraper][searchByPropertyId] Property found", {
        propertyId,
      });

      return propertyUrl;
    } catch (error) {
      console.error("[HaysCADScraper][searchByPropertyId] Error searching by property ID", {
        propertyId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * @purpose Parse search results HTML into structured data.
   * @param {string} html - Search results HTML
   * @returns {Object} Object with properties array and pagination info
   */
  parseSearchResults(html) {
    console.log("[HaysCADScraper][parseSearchResults] Parsing search results");

    // Note: In production, this would use Cheerio to parse HTML
    // For now, returning placeholder structure
    // TODO: Implement actual HTML parsing when cheerio is installed

    const results = {
      properties: [],
      currentPage: 1,
      totalPages: 1,
      totalResults: 0,
    };

    // Placeholder: Extract property information from search results
    // This would be implemented with cheerio like:
    // const $ = cheerio.load(html);
    //
    // // Extract pagination info
    // const paginationText = $('.pagination-info').text();
    // const pageMatch = paginationText.match(/Page (\d+) of (\d+)/);
    // if (pageMatch) {
    //   results.currentPage = parseInt(pageMatch[1]);
    //   results.totalPages = parseInt(pageMatch[2]);
    // }
    //
    // // Parse property rows
    // $('.property-result-row').each((i, elem) => {
    //   const $row = $(elem);
    //   results.properties.push({
    //     propertyId: $row.find('.property-id').text().trim(),
    //     parcelId: $row.find('.parcel-id').text().trim(),
    //     address: $row.find('.property-address').text().trim(),
    //     owner: $row.find('.owner-name').text().trim(),
    //     detailUrl: this.baseUrl + $row.find('a.details-link').attr('href')
    //   });
    // });
    //
    // results.totalResults = results.properties.length;

    console.log("[HaysCADScraper][parseSearchResults] Parsed results", {
      count: results.properties.length,
      currentPage: results.currentPage,
      totalPages: results.totalPages,
    });

    return results;
  }

  /**
   * @purpose Get detailed property information.
   * @param {string} propertyIdOrUrl - Property ID or full URL
   * @returns {Promise<Object>} Property details
   */
  async getPropertyDetails(propertyIdOrUrl) {
    console.log("[HaysCADScraper][getPropertyDetails] Fetching property details", {
      propertyIdOrUrl,
    });

    try {
      await waitForRateLimit(this.domain);

      // Construct detail URL
      const detailUrl = propertyIdOrUrl.startsWith("http")
        ? propertyIdOrUrl
        : `${this.baseUrl}/Property/View/${propertyIdOrUrl}`;

      const response = await fetch(detailUrl, {
        headers: {
          "User-Agent": this.options.userAgent,
        },
      });

      recordRequest(this.domain);

      if (!response.ok) {
        throw new Error(`Failed to fetch property details: ${response.status}`);
      }

      const html = await response.text();
      const propertyData = this.parsePropertyDetails(html, detailUrl);

      console.log("[HaysCADScraper][getPropertyDetails] Property details fetched", {
        propertyIdOrUrl,
      });

      return propertyData;
    } catch (error) {
      console.error("[HaysCADScraper][getPropertyDetails] Error fetching property details", {
        propertyIdOrUrl,
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
    console.log("[HaysCADScraper][parsePropertyDetails] Parsing property details");

    // Note: In production, this would use Cheerio to parse HTML
    // For now, returning placeholder structure
    // TODO: Implement actual HTML parsing when cheerio is installed

    const rawData = {
      // Property identification
      parcelId: "",
      propertyId: "",
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
      landUse: "",

      // Tax information
      taxableValue: "",
      totalTaxes: "",

      // Agricultural exemptions
      agriculturalExemptions: [],
      
      // Wildlife management
      wildlifeManagement: null,

      // Improvements (buildings, structures)
      improvements: [],

      // Metadata
      sourceUrl: sourceUrl,
    };

    // Placeholder: Parse HTML using cheerio
    // const $ = cheerio.load(html);
    //
    // // Basic property information
    // rawData.parcelId = extractTableValue($, 'Parcel ID');
    // rawData.propertyId = extractTableValue($, 'Property ID');
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
    // // Property details
    // rawData.acreage = extractTableValue($, 'Acreage');
    // rawData.landUse = extractTableValue($, 'Land Use');
    // rawData.legalDescription = extractTableValue($, 'Legal Description');
    //
    // // Tax information
    // rawData.taxableValue = extractTableValue($, 'Taxable Value');
    // rawData.totalTaxes = extractTableValue($, 'Total Taxes');
    //
    // // Agricultural exemptions
    // rawData.agriculturalExemptions = parseAgriculturalExemptions($);
    //
    // // Wildlife management
    // rawData.wildlifeManagement = parseWildlifeManagement($);
    //
    // // Improvements
    // rawData.improvements = parseImprovements($);

    console.log("[HaysCADScraper][parsePropertyDetails] Parsing completed");

    return rawData;
  }

  /**
   * @purpose Normalize raw property data to standard schema.
   * @param {Object} rawData - Raw scraped data
   * @returns {Object} Normalized property data
   */
  normalize(rawData) {
    console.log("[HaysCADScraper][normalize] Normalizing property data");

    const totalSquareFeet = calculateTotalSquareFeet(rawData.improvements || []);

    const normalized = {
      // Source metadata
      source: "hayscad",
      parcelId: `HC-${rawData.parcelId}`,
      sourceUrl: rawData.sourceUrl,

      // Property type and status
      propertyType: "land", // Default, can be refined based on landUse and improvements
      status: normalizeStatus("active"),

      // Address
      address: normalizeAddress({
        street: rawData.propertyAddress,
        city: rawData.city || "San Marcos",
        county: "Hays",
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
      squareFeet: 0, // Main structure square feet
      totalSquareFeet: totalSquareFeet, // Total of all improvements
      yearBuilt: null, // Can be extracted from improvements if needed
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
        exemptions: rawData.agriculturalExemptions || [],
      },

      // Agricultural and wildlife data (specific to Hays County)
      agricultural: {
        hasExemptions: (rawData.agriculturalExemptions || []).length > 0,
        exemptions: rawData.agriculturalExemptions || [],
      },

      wildlifeManagement: rawData.wildlifeManagement,

      // Improvements (buildings, structures)
      improvements: rawData.improvements || [],

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

    // Set main structure square feet from first improvement if available
    if (normalized.improvements.length > 0) {
      normalized.squareFeet = normalized.improvements[0].squareFeet || 0;
      normalized.yearBuilt = normalized.improvements[0].yearBuilt || null;
    }

    // Refine property type based on improvements
    if (normalized.improvements.length > 0) {
      const hasResidential = normalized.improvements.some(
        (imp) => imp.type && imp.type.toLowerCase().includes("residential")
      );
      const hasCommercial = normalized.improvements.some(
        (imp) => imp.type && imp.type.toLowerCase().includes("commercial")
      );

      if (hasCommercial) {
        normalized.propertyType = "commercial";
      } else if (hasResidential && normalized.acreage > 5) {
        normalized.propertyType = "residential-luxury";
      } else if (hasResidential) {
        normalized.propertyType = "residential";
      } else if (normalized.acreage > 0) {
        normalized.propertyType = "land";
      }
    }

    // Calculate derived fields
    const derived = calculateDerivedFields(normalized);
    Object.assign(normalized, derived);

    console.log("[HaysCADScraper][normalize] Normalization completed");

    return normalized;
  }

  /**
   * @purpose Scrape and normalize property by parcel ID or property ID.
   * @param {string} identifier - Parcel ID or property ID
   * @returns {Promise<Object>} Normalized property data with validation
   */
  async scrapeProperty(identifier) {
    console.log("[HaysCADScraper][scrapeProperty] Scraping property", { identifier });

    try {
      // Get raw property details
      const rawData = await this.getPropertyDetails(identifier);

      // Normalize to standard schema
      const normalized = this.normalize(rawData);

      // Validate data quality
      const validation = validateLandParcelData(normalized);

      console.log("[HaysCADScraper][scrapeProperty] Scraping completed", {
        identifier,
        isValid: validation.isValid,
      });

      return {
        data: normalized,
        validation,
      };
    } catch (error) {
      console.error("[HaysCADScraper][scrapeProperty] Error scraping property", {
        identifier,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * @purpose Batch scrape properties by sequential IDs (for bulk operations).
   * @param {number} startId - Starting property ID
   * @param {number} endId - Ending property ID
   * @returns {Promise<Array>} Array of scrape results
   */
  async batchScrapeBySequentialIds(startId, endId) {
    console.log("[HaysCADScraper][batchScrapeBySequentialIds] Starting batch scrape", {
      startId,
      endId,
      count: endId - startId + 1,
    });

    const results = [];

    for (let propertyId = startId; propertyId <= endId; propertyId++) {
      try {
        // Check if property exists
        const propertyUrl = await this.searchByPropertyId(propertyId);

        if (!propertyUrl) {
          console.log("[HaysCADScraper][batchScrapeBySequentialIds] Property does not exist", {
            propertyId,
          });
          continue;
        }

        // Scrape the property
        const result = await this.scrapeProperty(propertyUrl);
        results.push({
          propertyId,
          success: true,
          data: result.data,
          validation: result.validation,
        });
      } catch (error) {
        console.error("[HaysCADScraper][batchScrapeBySequentialIds] Error scraping property", {
          propertyId,
          error: error.message,
        });
        results.push({
          propertyId,
          success: false,
          error: error.message,
        });
      }
    }

    console.log("[HaysCADScraper][batchScrapeBySequentialIds] Batch scrape completed", {
      startId,
      endId,
      total: endId - startId + 1,
      found: results.length,
      successful: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
    });

    return results;
  }

  /**
   * @purpose Batch scrape multiple properties by parcel IDs.
   * @param {Array<string>} parcelIds - Array of parcel IDs
   * @returns {Promise<Array>} Array of scrape results
   */
  async batchScrapeProperties(parcelIds) {
    console.log("[HaysCADScraper][batchScrapeProperties] Starting batch scrape", {
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
        console.error("[HaysCADScraper][batchScrapeProperties] Error scraping parcel", {
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

    console.log("[HaysCADScraper][batchScrapeProperties] Batch scrape completed", {
      total: parcelIds.length,
      successful: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
    });

    return results;
  }
}

module.exports = {
  HaysCADScraper,
  extractText,
  extractTableValue,
  extractDefinitionValue,
  parseAgriculturalExemptions,
  parseWildlifeManagement,
  parseImprovements,
  calculateTotalSquareFeet,
};

