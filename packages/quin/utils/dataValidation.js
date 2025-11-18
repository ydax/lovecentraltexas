/**
 * @purpose Data validation utilities for property data.
 * Validates data before storage to ensure data quality.
 * Pure functions for easy testing.
 */

/**
 * @purpose Validate coordinates are within Central Texas bounds.
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {boolean} True if coordinates are valid
 */
const validateCoordinates = (lat, lng) => {
  if (typeof lat !== "number" || typeof lng !== "number") {
    return false;
  }

  if (isNaN(lat) || isNaN(lng)) {
    return false;
  }

  return lat >= 29.0 && lat <= 31.0 && lng >= -99.0 && lng <= -97.0;
};

/**
 * @purpose Validate price is a positive number.
 * @param {number} price - Price value
 * @returns {boolean} True if price is valid
 */
const validatePrice = (price) => {
  if (typeof price !== "number") {
    return false;
  }

  if (isNaN(price)) {
    return false;
  }

  return price > 0;
};

/**
 * @purpose Validate required fields are present in data object.
 * @param {Object} data - Data object to validate
 * @param {Array<string>} requiredFields - Array of required field paths
 * @returns {Object} Validation result with isValid and missingFields
 */
const validateRequiredFields = (data, requiredFields) => {
  const missingFields = [];

  for (const fieldPath of requiredFields) {
    const value = getNestedValue(data, fieldPath);
    if (value === undefined || value === null || value === "") {
      missingFields.push(fieldPath);
    }
  }

  return {
    isValid: missingFields.length === 0,
    missingFields,
  };
};

/**
 * @purpose Get nested value from object using dot notation path.
 * @param {Object} obj - Object to traverse
 * @param {string} path - Dot notation path (e.g., "address.county")
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
 * @purpose Validate property status is one of allowed values.
 * @param {string} status - Status value
 * @returns {boolean} True if status is valid
 */
const validateStatus = (status) => {
  const validStatuses = ["active", "pending", "sold", "off-market"];
  return typeof status === "string" && validStatuses.includes(status);
};

/**
 * @purpose Validate land parcel data structure.
 * @param {Object} parcelData - Land parcel data
 * @returns {Object} Validation result
 */
const validateLandParcelData = (parcelData) => {
  const requiredFields = [
    "source",
    "price",
    "status",
    "address.county",
  ];

  const fieldValidation = validateRequiredFields(parcelData, requiredFields);
  const priceValid = validatePrice(parcelData.price);
  const statusValid = validateStatus(parcelData.status);

  let coordinatesValid = true;
  if (parcelData.address?.coordinates) {
    coordinatesValid = validateCoordinates(
      parcelData.address.coordinates.latitude,
      parcelData.address.coordinates.longitude
    );
  }

  return {
    isValid:
      fieldValidation.isValid &&
      priceValid &&
      statusValid &&
      coordinatesValid,
    errors: {
      missingFields: fieldValidation.missingFields,
      invalidPrice: !priceValid,
      invalidStatus: !statusValid,
      invalidCoordinates: !coordinatesValid,
    },
  };
};

/**
 * @purpose Validate commercial property data structure.
 * @param {Object} propertyData - Commercial property data
 * @returns {Object} Validation result
 */
const validateCommercialPropertyData = (propertyData) => {
  const requiredFields = [
    "source",
    "price",
    "status",
    "address.county",
  ];

  const fieldValidation = validateRequiredFields(propertyData, requiredFields);
  const priceValid = validatePrice(propertyData.price);
  const statusValid = validateStatus(propertyData.status);

  let coordinatesValid = true;
  if (propertyData.address?.coordinates) {
    coordinatesValid = validateCoordinates(
      propertyData.address.coordinates.latitude,
      propertyData.address.coordinates.longitude
    );
  }

  return {
    isValid:
      fieldValidation.isValid &&
      priceValid &&
      statusValid &&
      coordinatesValid,
    errors: {
      missingFields: fieldValidation.missingFields,
      invalidPrice: !priceValid,
      invalidStatus: !statusValid,
      invalidCoordinates: !coordinatesValid,
    },
  };
};

/**
 * @purpose Validate residential luxury property data structure.
 * @param {Object} propertyData - Residential property data
 * @returns {Object} Validation result
 */
const validateResidentialPropertyData = (propertyData) => {
  const requiredFields = [
    "source",
    "price",
    "status",
    "address.county",
  ];

  const fieldValidation = validateRequiredFields(propertyData, requiredFields);
  const priceValid = validatePrice(propertyData.price);
  const statusValid = validateStatus(propertyData.status);

  let coordinatesValid = true;
  if (propertyData.address?.coordinates) {
    coordinatesValid = validateCoordinates(
      propertyData.address.coordinates.latitude,
      propertyData.address.coordinates.longitude
    );
  }

  return {
    isValid:
      fieldValidation.isValid &&
      priceValid &&
      statusValid &&
      coordinatesValid,
    errors: {
      missingFields: fieldValidation.missingFields,
      invalidPrice: !priceValid,
      invalidStatus: !statusValid,
      invalidCoordinates: !coordinatesValid,
    },
  };
};

module.exports = {
  getNestedValue,
  validateCommercialPropertyData,
  validateCoordinates,
  validateLandParcelData,
  validatePrice,
  validateRequiredFields,
  validateResidentialPropertyData,
  validateStatus,
};

