/**
 * @purpose Factory for creating source-specific scrapers.
 * Implements adapter pattern for different data sources.
 */

const { BaseScraper } = require("./baseScraper");
const TravisCADScraper = require("./sources/travisCADScraper");
const HaysCADScraper = require("./sources/haysCADScraper");
const MLSScraper = require("./sources/mlsScraper");
const ZoningScraper = require("./sources/zoningScraper");

/**
 * @purpose Map of available scraper implementations.
 */
const scraperRegistry = {
  traviscad: TravisCADScraper,
  hayscad: HaysCADScraper,
  mls: MLSScraper,
  zoning: ZoningScraper,
};

/**
 * @purpose Create appropriate scraper instance for source.
 * @param {string} source - Data source identifier
 * @param {Object} options - Scraper configuration options
 * @returns {BaseScraper} Scraper instance
 */
const createScraper = (source, options = {}) => {
  console.log("[createScraper] Creating scraper", { source, options });

  const ScraperClass = scraperRegistry[source.toLowerCase()];

  if (!ScraperClass) {
    const availableSources = Object.keys(scraperRegistry).join(", ");
    throw new Error(
      `Unknown scraper source: ${source}. Available sources: ${availableSources}`
    );
  }

  return new ScraperClass(options);
};

/**
 * @purpose Get list of available scraper sources.
 * @returns {Array<string>} Available source identifiers
 */
const getAvailableSources = () => {
  return Object.keys(scraperRegistry);
};

/**
 * @purpose Register new scraper implementation.
 * @param {string} source - Source identifier
 * @param {Class} ScraperClass - Scraper class extending BaseScraper
 */
const registerScraper = (source, ScraperClass) => {
  if (typeof source !== "string" || !source) {
    throw new Error("Source identifier must be a non-empty string");
  }

  if (!ScraperClass || !(ScraperClass.prototype instanceof BaseScraper)) {
    throw new Error("ScraperClass must extend BaseScraper");
  }

  console.log("[registerScraper] Registering new scraper", { source });
  scraperRegistry[source.toLowerCase()] = ScraperClass;
};

module.exports = {
  createScraper,
  getAvailableSources,
  registerScraper,
};
