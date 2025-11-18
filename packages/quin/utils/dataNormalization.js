/**
 * @purpose Data normalization utilities for property data.
 * Transforms data from various sources into a consistent schema.
 * Pure functions for easy testing.
 */

/**
 * @purpose Normalize address string to structured address object.
 * @param {string|Object} rawAddress - Raw address string or object
 * @returns {Object} Normalized address object
 */
const normalizeAddress = (rawAddress) => {
  console.log("[normalizeAddress] Normalizing address", { rawAddress });

  // If already an object, validate and return
  if (typeof rawAddress === "object" && rawAddress !== null) {
    return {
      street: rawAddress.street || "",
      city: rawAddress.city || "",
      county: rawAddress.county || "",
      state: rawAddress.state || "TX",
      zipCode: rawAddress.zipCode || "",
      coordinates: rawAddress.coordinates || null,
    };
  }

  // If string, attempt basic parsing (simplified - can be enhanced)
  if (typeof rawAddress === "string") {
    // Basic parsing - assumes format: "Street, City, County, TX ZIP"
    const parts = rawAddress.split(",").map((p) => p.trim());
    return {
      street: parts[0] || "",
      city: parts[1] || "",
      county: parts[2] || "",
      state: parts[3]?.split(" ")[0] || "TX",
      zipCode: parts[3]?.split(" ")[1] || "",
      coordinates: null,
    };
  }

  return {
    street: "",
    city: "",
    county: "",
    state: "TX",
    zipCode: "",
    coordinates: null,
  };
};

/**
 * @purpose Extract and normalize price from various formats.
 * @param {string|number} priceString - Price as string or number
 * @returns {number} Normalized price as number
 */
const normalizePrice = (priceString) => {
  if (typeof priceString === "number") {
    return priceString;
  }

  if (typeof priceString !== "string") {
    return 0;
  }

  // Remove currency symbols, commas, and whitespace
  const cleaned = priceString.replace(/[$,\s]/g, "");

  // Extract number
  const match = cleaned.match(/(\d+\.?\d*)/);
  if (match) {
    return parseFloat(match[1]);
  }

  return 0;
};

/**
 * @purpose Normalize coordinates to ensure valid format.
 * @param {number|string} lat - Latitude
 * @param {number|string} lng - Longitude
 * @returns {Object|null} Normalized coordinates or null if invalid
 */
const normalizeCoordinates = (lat, lng) => {
  const latitude = typeof lat === "string" ? parseFloat(lat) : lat;
  const longitude = typeof lng === "string" ? parseFloat(lng) : lng;

  if (
    isNaN(latitude) ||
    isNaN(longitude) ||
    latitude < 29.0 ||
    latitude > 31.0 ||
    longitude < -99.0 ||
    longitude > -97.0
  ) {
    return null;
  }

  return {
    latitude,
    longitude,
  };
};

/**
 * @purpose Extract acreage from various formats.
 * @param {string|number} acreageString - Acreage as string or number
 * @returns {number} Acreage as number
 */
const normalizeAcreage = (acreageString) => {
  if (typeof acreageString === "number") {
    return acreageString;
  }

  if (typeof acreageString !== "string") {
    return 0;
  }

  // Extract number from string (e.g., "10.5 acres" -> 10.5)
  const match = acreageString.match(/(\d+\.?\d*)/);
  if (match) {
    return parseFloat(match[1]);
  }

  return 0;
};

/**
 * @purpose Normalize zoning code to standard format.
 * @param {string} zoningString - Raw zoning string
 * @returns {string} Normalized zoning code
 */
const normalizeZoning = (zoningString) => {
  if (typeof zoningString !== "string") {
    return "";
  }

  // Convert to uppercase and remove extra whitespace
  return zoningString.trim().toUpperCase();
};

/**
 * @purpose Calculate derived fields (pricePerAcre, pricePerSquareFoot).
 * @param {Object} propertyData - Property data object
 * @returns {Object} Object with calculated fields
 */
const calculateDerivedFields = (propertyData) => {
  const calculated = {};

  if (propertyData.price && propertyData.acreage && propertyData.acreage > 0) {
    calculated.pricePerAcre = propertyData.price / propertyData.acreage;
  }

  if (
    propertyData.price &&
    propertyData.squareFeet &&
    propertyData.squareFeet > 0
  ) {
    calculated.pricePerSquareFoot = propertyData.price / propertyData.squareFeet;
  }

  if (
    propertyData.price &&
    propertyData.totalSquareFeet &&
    propertyData.totalSquareFeet > 0
  ) {
    calculated.pricePerSquareFoot =
      propertyData.price / propertyData.totalSquareFeet;
  }

  return calculated;
};

/**
 * @purpose Normalize property status to standard values.
 * @param {string} status - Raw status string
 * @returns {string} Normalized status
 */
const normalizeStatus = (status) => {
  if (typeof status !== "string") {
    return "active";
  }

  const normalized = status.toLowerCase().trim();

  const validStatuses = ["active", "pending", "sold", "off-market"];

  if (validStatuses.includes(normalized)) {
    return normalized;
  }

  // Map common variations
  const statusMap = {
    available: "active",
    listed: "active",
    under_contract: "pending",
    closed: "sold",
    withdrawn: "off-market",
    expired: "off-market",
  };

  return statusMap[normalized] || "active";
};

module.exports = {
  calculateDerivedFields,
  normalizeAcreage,
  normalizeAddress,
  normalizeCoordinates,
  normalizePrice,
  normalizeStatus,
  normalizeZoning,
};

