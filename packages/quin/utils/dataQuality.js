/**
 * @purpose Data quality scoring utilities.
 * Calculates completeness scores and identifies data quality issues.
 * Pure functions for easy testing.
 */

/**
 * @purpose Calculate completeness score for property data (0-100).
 * @param {Object} data - Property data object
 * @param {string} propertyType - Type of property ("land", "commercial", "residential")
 * @returns {number} Completeness score (0-100)
 */
const calculateCompletenessScore = (data, propertyType = "land") => {
  let score = 0;

  // Required fields present: 40 points
  const requiredFields = getRequiredFieldsForType(propertyType);
  const requiredPresent = requiredFields.filter((field) => {
    const value = getNestedValue(data, field);
    return value !== undefined && value !== null && value !== "";
  }).length;
  score += (requiredPresent / requiredFields.length) * 40;

  // Location data complete: 20 points
  const locationFields = [
    "address.street",
    "address.city",
    "address.county",
    "address.coordinates.latitude",
    "address.coordinates.longitude",
  ];
  const locationPresent = locationFields.filter((field) => {
    const value = getNestedValue(data, field);
    return value !== undefined && value !== null && value !== "";
  }).length;
  score += (locationPresent / locationFields.length) * 20;

  // Property details complete: 20 points
  const detailFields = getDetailFieldsForType(propertyType);
  const detailsPresent = detailFields.filter((field) => {
    const value = getNestedValue(data, field);
    return value !== undefined && value !== null && value !== "";
  }).length;
  score += (detailsPresent / detailFields.length) * 20;

  // Market data present: 10 points
  const marketFields = ["listingDate", "daysOnMarket", "status"];
  const marketPresent = marketFields.filter((field) => {
    const value = data[field];
    return value !== undefined && value !== null && value !== "";
  }).length;
  score += (marketPresent / marketFields.length) * 10;

  // SEO content generated: 10 points
  const seoFields = ["seoSlug", "description", "keywords"];
  const seoPresent = seoFields.filter((field) => {
    const value = data[field];
    return value !== undefined && value !== null && value !== "";
  }).length;
  score += (seoPresent / seoFields.length) * 10;

  return Math.round(score);
};

/**
 * @purpose Get required fields for property type.
 * @param {string} propertyType - Property type
 * @returns {Array<string>} Array of required field paths
 */
const getRequiredFieldsForType = (propertyType) => {
  const baseFields = ["source", "price", "status", "address.county"];

  if (propertyType === "land") {
    return [...baseFields, "acreage"];
  }

  if (propertyType === "commercial") {
    return [...baseFields, "propertyType", "totalSquareFeet"];
  }

  if (propertyType === "residential") {
    return [...baseFields, "bedrooms", "bathrooms", "squareFeet"];
  }

  return baseFields;
};

/**
 * @purpose Get detail fields for property type.
 * @param {string} propertyType - Property type
 * @returns {Array<string>} Array of detail field paths
 */
const getDetailFieldsForType = (propertyType) => {
  if (propertyType === "land") {
    return [
      "zoning",
      "waterRights.hasRights",
      "utilities.electricity",
      "roadAccess",
    ];
  }

  if (propertyType === "commercial") {
    return [
      "zoning",
      "yearBuilt",
      "parkingSpaces",
      "proximityToInfrastructure.highway.distance",
    ];
  }

  if (propertyType === "residential") {
    return [
      "yearBuilt",
      "lotSize",
      "amenities",
      "schoolDistricts.elementary",
    ];
  }

  return [];
};

/**
 * @purpose Get nested value from object using dot notation path.
 * @param {Object} obj - Object to traverse
 * @param {string} path - Dot notation path
 * @returns {*} Value at path or undefined
 */
const getNestedValue = (obj, path) => {
  const parts = path.split(".");
  let current = obj;

  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined;
    }
    current = current[part];
  }

  return current;
};

/**
 * @purpose Identify missing fields in property data.
 * @param {Object} data - Property data object
 * @param {string} propertyType - Type of property
 * @returns {Array<string>} Array of missing field paths
 */
const identifyMissingFields = (data, propertyType = "land") => {
  const allFields = [
    ...getRequiredFieldsForType(propertyType),
    ...getDetailFieldsForType(propertyType),
    "address.street",
    "address.city",
    "address.coordinates.latitude",
    "address.coordinates.longitude",
    "listingDate",
    "daysOnMarket",
    "seoSlug",
    "description",
  ];

  const missing = [];

  for (const field of allFields) {
    const value = getNestedValue(data, field);
    if (value === undefined || value === null || value === "") {
      missing.push(field);
    }
  }

  return missing;
};

/**
 * @purpose Suggest improvements for property data based on missing fields.
 * @param {Object} data - Property data object
 * @param {string} propertyType - Type of property
 * @returns {Array<string>} Array of improvement suggestions
 */
const suggestImprovements = (data, propertyType = "land") => {
  const missingFields = identifyMissingFields(data, propertyType);
  const suggestions = [];

  if (missingFields.includes("address.coordinates.latitude")) {
    suggestions.push("Add coordinates for map display and location-based search");
  }

  if (missingFields.includes("seoSlug")) {
    suggestions.push("Generate SEO-friendly URL slug");
  }

  if (missingFields.includes("description")) {
    suggestions.push("Generate property description for SEO");
  }

  if (propertyType === "land" && missingFields.includes("waterRights.hasRights")) {
    suggestions.push("Add water rights information (important for land value)");
  }

  if (propertyType === "commercial" && missingFields.includes("zoning")) {
    suggestions.push("Add zoning information (critical for commercial properties)");
  }

  if (propertyType === "residential" && missingFields.includes("schoolDistricts.elementary")) {
    suggestions.push("Add school district information (important for residential buyers)");
  }

  return suggestions;
};

/**
 * @purpose Determine quality level based on completeness score.
 * @param {number} score - Completeness score (0-100)
 * @returns {string} Quality level ("high", "medium", "low")
 */
const getQualityLevel = (score) => {
  if (score >= 80) {
    return "high";
  }
  if (score >= 60) {
    return "medium";
  }
  return "low";
};

module.exports = {
  calculateCompletenessScore,
  getQualityLevel,
  getRequiredFieldsForType,
  identifyMissingFields,
  suggestImprovements,
};

