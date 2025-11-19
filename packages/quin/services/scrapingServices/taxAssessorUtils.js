/**
 * @purpose Shared utilities for tax assessor scrapers across multiple counties.
 * Provides parcel ID normalization, owner name parsing, tax calculations,
 * and common HTML extraction patterns.
 */

/**
 * @purpose Normalize parcel ID to standard format: COUNTY-YEAR-NUMBER
 * @param {string} rawParcelId - Raw parcel ID from source
 * @param {string} county - County code (travis, hays, williamson, etc.)
 * @param {number|null} year - Optional tax year (defaults to current year)
 * @returns {string} Normalized parcel ID
 */
const normalizeParcelId = (rawParcelId, county, year = null) => {
  if (!rawParcelId || !county) {
    console.error("[taxAssessorUtils][normalizeParcelId] Missing required parameters", {
      rawParcelId,
      county,
    });
    return "";
  }

  // Clean the raw parcel ID (remove spaces, special chars except hyphens)
  const cleanedId = rawParcelId.toString().trim().replace(/[^\w-]/g, "");

  // Determine year (default to current year)
  const taxYear = year || new Date().getFullYear();

  // Map county names to standard codes
  const countyCodeMap = {
    travis: "TC",
    hays: "HC",
    williamson: "WC",
    bastrop: "BC",
    caldwell: "CC",
    comal: "CO",
    guadalupe: "GC",
  };

  const countyCode = countyCodeMap[county.toLowerCase()] || county.substring(0, 2).toUpperCase();

  // Format: COUNTYCODE-YEAR-PARCELID
  const normalized = `${countyCode}-${taxYear}-${cleanedId}`;

  return normalized;
};

/**
 * @purpose Parse owner name and identify owner type.
 * @param {string} rawOwnerName - Raw owner name from source
 * @returns {Object} Parsed owner information
 */
const parseOwnerName = (rawOwnerName) => {
  if (!rawOwnerName || typeof rawOwnerName !== "string") {
    return {
      raw: rawOwnerName || "",
      type: "unknown",
      name: "",
      firstName: null,
      lastName: null,
      entityName: null,
    };
  }

  const trimmedName = rawOwnerName.trim();

  // Detect LLC
  if (/\bLLC\b/i.test(trimmedName) || /\bL\.L\.C\b/i.test(trimmedName)) {
    return {
      raw: trimmedName,
      type: "llc",
      name: trimmedName,
      firstName: null,
      lastName: null,
      entityName: trimmedName,
    };
  }

  // Detect Corporation (Inc, Corp, Co, Ltd)
  if (
    /\bInc\.?\b/i.test(trimmedName) ||
    /\bCorp\.?\b/i.test(trimmedName) ||
    /\bCorporation\b/i.test(trimmedName) ||
    /\bLtd\.?\b/i.test(trimmedName) ||
    /\bCo\.?\b/i.test(trimmedName)
  ) {
    return {
      raw: trimmedName,
      type: "corporation",
      name: trimmedName,
      firstName: null,
      lastName: null,
      entityName: trimmedName,
    };
  }

  // Detect Trust
  if (/\bTrust\b/i.test(trimmedName) || /\bTrustee\b/i.test(trimmedName)) {
    // Try to extract beneficiary name (often before "Trust")
    const trustMatch = trimmedName.match(/^(.+?)\s+(?:Family\s+)?Trust/i);
    const beneficiaryName = trustMatch ? trustMatch[1].trim() : null;

    return {
      raw: trimmedName,
      type: "trust",
      name: trimmedName,
      firstName: null,
      lastName: null,
      entityName: trimmedName,
      beneficiaryName: beneficiaryName,
    };
  }

  // Detect Partnership (LP, LLP, GP)
  if (
    /\bLP\b/i.test(trimmedName) ||
    /\bLLP\b/i.test(trimmedName) ||
    /\bL\.P\b/i.test(trimmedName) ||
    /\bL\.L\.P\b/i.test(trimmedName) ||
    /\bPartnership\b/i.test(trimmedName)
  ) {
    return {
      raw: trimmedName,
      type: "partnership",
      name: trimmedName,
      firstName: null,
      lastName: null,
      entityName: trimmedName,
    };
  }

  // Detect Government Entity
  if (
    /\bCity of\b/i.test(trimmedName) ||
    /\bCounty of\b/i.test(trimmedName) ||
    /\bState of\b/i.test(trimmedName) ||
    /\bUSA\b/i.test(trimmedName) ||
    /\bUnited States\b/i.test(trimmedName)
  ) {
    return {
      raw: trimmedName,
      type: "government",
      name: trimmedName,
      firstName: null,
      lastName: null,
      entityName: trimmedName,
    };
  }

  // Assume Individual - try to parse first and last name
  // Common formats: "LAST, FIRST" or "FIRST LAST"
  let firstName = null;
  let lastName = null;

  if (trimmedName.includes(",")) {
    // Format: "LAST, FIRST MIDDLE"
    const parts = trimmedName.split(",").map((p) => p.trim());
    lastName = parts[0];
    if (parts[1]) {
      const firstParts = parts[1].split(/\s+/);
      firstName = firstParts[0];
    }
  } else {
    // Format: "FIRST MIDDLE LAST"
    const parts = trimmedName.split(/\s+/);
    if (parts.length >= 2) {
      firstName = parts[0];
      lastName = parts[parts.length - 1];
    } else if (parts.length === 1) {
      lastName = parts[0];
    }
  }

  return {
    raw: trimmedName,
    type: "individual",
    name: trimmedName,
    firstName: firstName,
    lastName: lastName,
    entityName: null,
  };
};

/**
 * @purpose Calculate total tax amount from multiple tax units.
 * @param {Array<Object>} taxUnits - Array of tax unit objects with amount field
 * @returns {number} Total tax amount
 */
const calculateTotalTaxes = (taxUnits) => {
  if (!Array.isArray(taxUnits) || taxUnits.length === 0) {
    return 0;
  }

  const total = taxUnits.reduce((sum, unit) => {
    // Try different field names for tax amount
    const amount =
      unit.amount || unit.tax || unit.taxAmount || unit.totalTax || unit.value || 0;

    // Parse amount if it's a string
    let numericAmount = 0;
    if (typeof amount === "string") {
      numericAmount = parseFloat(amount.replace(/[^0-9.-]/g, "")) || 0;
    } else if (typeof amount === "number") {
      numericAmount = amount;
    }

    return sum + numericAmount;
  }, 0);

  return Math.round(total * 100) / 100; // Round to 2 decimal places
};

/**
 * @purpose Parse tax units from tax detail section.
 * @param {Array<Object>} rawTaxUnits - Raw tax unit data (e.g., from table rows)
 * @returns {Array<Object>} Parsed tax units with normalized data
 */
const parseTaxUnits = (rawTaxUnits) => {
  if (!Array.isArray(rawTaxUnits)) {
    return [];
  }

  return rawTaxUnits.map((unit) => {
    const amount = parseFloat(
      (unit.amount || unit.tax || "0").toString().replace(/[^0-9.-]/g, "")
    );

    return {
      name: unit.name || unit.taxingEntity || unit.unit || "Unknown",
      rate: unit.rate ? parseFloat(unit.rate.toString().replace(/[^0-9.-]/g, "")) : null,
      amount: amount,
      taxableValue: unit.taxableValue
        ? parseFloat(unit.taxableValue.toString().replace(/[^0-9.-]/g, ""))
        : null,
    };
  });
};

/**
 * @purpose Extract text content from HTML element safely (Cheerio).
 * @param {Object} $ - Cheerio instance
 * @param {string} selector - CSS selector
 * @returns {string} Trimmed text content or empty string
 */
const extractText = ($, selector) => {
  if (!$ || !selector) {
    return "";
  }

  const element = $(selector);
  return element.length ? element.text().trim() : "";
};

/**
 * @purpose Extract value from key-value table structure (Cheerio).
 * @param {Object} $ - Cheerio instance
 * @param {string} labelText - Text content of the label
 * @param {string} containerSelector - Optional container selector to narrow search
 * @returns {string} Value or empty string
 */
const extractTableValue = ($, labelText, containerSelector = null) => {
  if (!$ || !labelText) {
    return "";
  }

  const searchContext = containerSelector ? $(containerSelector) : $;

  // Try multiple strategies to find the label
  let row;

  // Strategy 1: Look for td or th containing exact text
  row = searchContext
    .find(`td:contains("${labelText}"), th:contains("${labelText}")`)
    .closest("tr");

  if (row.length) {
    return row.find("td").last().text().trim();
  }

  // Strategy 2: Look for label element
  const label = searchContext.find(`label:contains("${labelText}")`);
  if (label.length) {
    // Check for associated input or span
    const forAttr = label.attr("for");
    if (forAttr) {
      const input = searchContext.find(`#${forAttr}`);
      if (input.length) {
        return input.val() || input.text().trim();
      }
    }
    // Check for sibling or next element
    const next = label.next();
    if (next.length) {
      return next.text().trim();
    }
  }

  // Strategy 3: Look for dt/dd structure (definition list)
  const dt = searchContext.find(`dt:contains("${labelText}")`);
  if (dt.length) {
    return dt.next("dd").text().trim();
  }

  return "";
};

/**
 * @purpose Extract multiple values from a table row by column index.
 * @param {Object} $row - Cheerio row element
 * @param {Array<number>} columnIndices - Array of column indices to extract
 * @returns {Array<string>} Array of extracted values
 */
const extractRowValues = ($row, columnIndices) => {
  if (!$row || !Array.isArray(columnIndices)) {
    return [];
  }

  const cells = $row.find("td, th");
  return columnIndices.map((index) => {
    const cell = cells.eq(index);
    return cell.length ? cell.text().trim() : "";
  });
};

/**
 * @purpose Extract session cookie from response headers.
 * @param {Array<string>|string} cookies - Set-Cookie headers (array or single string)
 * @param {Array<string>} cookieNames - Cookie names to search for (default: common session cookies)
 * @returns {string|null} Session ID or null if not found
 */
const extractSessionCookie = (
  cookies,
  cookieNames = ["PHPSESSID", "JSESSIONID", "ASP.NET_SessionId", "session_id", "SessionId"]
) => {
  if (!cookies) {
    return null;
  }

  // Normalize to array
  const cookieArray = Array.isArray(cookies) ? cookies : [cookies];

  for (const cookie of cookieArray) {
    if (typeof cookie !== "string") {
      continue;
    }

    // Try each cookie name pattern
    for (const cookieName of cookieNames) {
      // Escape special characters in cookie name for regex
      const escapedName = cookieName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const pattern = new RegExp(`${escapedName}=([^;]+)`, "i");
      const match = cookie.match(pattern);

      if (match) {
        return match[1];
      }
    }
  }

  return null;
};

/**
 * @purpose Parse exemptions from tax detail section.
 * @param {Array<Object>} rawExemptions - Raw exemption data
 * @returns {Array<Object>} Parsed exemptions with normalized data
 */
const parseExemptions = (rawExemptions) => {
  if (!Array.isArray(rawExemptions)) {
    return [];
  }

  return rawExemptions
    .map((exemption) => {
      const value = parseFloat(
        (exemption.value || exemption.amount || "0").toString().replace(/[^0-9.-]/g, "")
      );

      // Skip if no valid value
      if (value === 0 && !exemption.type && !exemption.name) {
        return null;
      }

      return {
        type: exemption.type || exemption.name || exemption.exemptionType || "Unknown",
        value: value,
        description: exemption.description || "",
      };
    })
    .filter((exemption) => exemption !== null);
};

/**
 * @purpose Parse address components from various formats.
 * @param {string} rawAddress - Raw address string
 * @returns {Object} Parsed address components
 */
const parseAddressComponents = (rawAddress) => {
  if (!rawAddress || typeof rawAddress !== "string") {
    return {
      street: "",
      city: "",
      state: "",
      zipCode: "",
    };
  }

  const trimmedAddress = rawAddress.trim();

  // Try to parse: "STREET, CITY, STATE ZIP"
  const parts = trimmedAddress.split(",").map((p) => p.trim());

  const result = {
    street: "",
    city: "",
    state: "",
    zipCode: "",
  };

  if (parts.length >= 1) {
    result.street = parts[0];
  }

  if (parts.length >= 2) {
    result.city = parts[1];
  }

  if (parts.length >= 3) {
    // Last part should be "STATE ZIP"
    const stateZipMatch = parts[2].match(/^([A-Z]{2})\s+(\d{5}(?:-\d{4})?)$/);
    if (stateZipMatch) {
      result.state = stateZipMatch[1];
      result.zipCode = stateZipMatch[2];
    } else {
      // If no match, assume it's all state
      result.state = parts[2];
    }
  }

  return result;
};

/**
 * @purpose Extract numeric value from text (handles currency, percentages, etc.).
 * @param {string} text - Text containing numeric value
 * @param {string} type - Type of value ('currency', 'percentage', 'decimal', 'integer')
 * @returns {number|null} Extracted numeric value or null
 */
const extractNumericValue = (text, type = "decimal") => {
  if (!text || typeof text !== "string") {
    return null;
  }

  // Remove common non-numeric characters except decimal point and negative sign
  const cleaned = text.replace(/[$,%\s]/g, "").trim();

  if (cleaned === "" || cleaned === "-") {
    return null;
  }

  const value = parseFloat(cleaned);

  if (isNaN(value)) {
    return null;
  }

  // Handle percentage (convert to decimal if type is percentage)
  if (type === "percentage" && text.includes("%")) {
    return value / 100;
  }

  // Handle integer
  if (type === "integer") {
    return Math.round(value);
  }

  // Default: return as decimal
  return value;
};

/**
 * @purpose Validate and sanitize parcel data before normalization.
 * @param {Object} rawData - Raw scraped data
 * @returns {Object} Sanitized data with validation flags
 */
const sanitizeRawData = (rawData) => {
  if (!rawData || typeof rawData !== "object") {
    return {
      data: {},
      warnings: ["Invalid raw data provided"],
      isValid: false,
    };
  }

  const warnings = [];
  const sanitized = { ...rawData };

  // Ensure required fields are strings
  const stringFields = [
    "parcelId",
    "ownerName",
    "propertyAddress",
    "city",
    "zipCode",
    "legalDescription",
  ];

  for (const field of stringFields) {
    if (sanitized[field] && typeof sanitized[field] !== "string") {
      sanitized[field] = String(sanitized[field]);
      warnings.push(`Field '${field}' was converted to string`);
    }
  }

  // Validate numeric fields
  const numericFields = [
    "landValue",
    "improvementValue",
    "marketValue",
    "assessedValue",
    "taxableValue",
    "totalTaxes",
    "acreage",
    "squareFeet",
    "yearBuilt",
  ];

  for (const field of numericFields) {
    if (sanitized[field]) {
      const numValue = extractNumericValue(String(sanitized[field]));
      if (numValue === null) {
        warnings.push(`Field '${field}' could not be parsed as numeric value`);
        sanitized[field] = "";
      }
    }
  }

  // Validate arrays
  const arrayFields = ["exemptions", "improvements", "deedHistory"];
  for (const field of arrayFields) {
    if (sanitized[field] && !Array.isArray(sanitized[field])) {
      warnings.push(`Field '${field}' is not an array, converting`);
      sanitized[field] = [];
    }
  }

  return {
    data: sanitized,
    warnings: warnings,
    isValid: warnings.length === 0,
  };
};

module.exports = {
  normalizeParcelId,
  parseOwnerName,
  calculateTotalTaxes,
  parseTaxUnits,
  extractText,
  extractTableValue,
  extractRowValues,
  extractSessionCookie,
  parseExemptions,
  parseAddressComponents,
  extractNumericValue,
  sanitizeRawData,
};

