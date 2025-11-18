# Data Ingestion Pipeline Architecture

## Overview

This document defines the architecture for the data ingestion pipeline that scrapes, normalizes, validates, and stores property data from multiple sources into Firestore. The architecture follows modular design principles for testability and maintainability.

## Architecture Principles

1. **Single Responsibility**: Each module has one clear purpose
2. **Dependency Injection**: Services accept dependencies as parameters for testability
3. **Error Handling**: Robust error handling with structured logging
4. **Rate Limiting**: Respectful scraping with configurable rate limits
5. **Data Normalization**: Consistent data transformation across sources

## Directory Structure

```
packages/quin/
├── services/
│   ├── dbServices/
│   │   ├── landParcelsService.js      # Land parcel CRUD operations
│   │   ├── commercialPropertiesService.js  # Commercial property CRUD
│   │   ├── residentialPropertiesService.js # Residential property CRUD
│   │   ├── geographicMetadataService.js    # Geographic data CRUD
│   │   └── marketTrendsService.js          # Market trends CRUD
│   │
│   ├── scrapingServices/
│   │   ├── baseScraper.js              # Base scraper class with retry logic
│   │   ├── proxyRotationService.js     # Proxy rotation management
│   │   ├── rateLimiter.js              # Rate limiting service
│   │   ├── countyAssessorScraper.js    # County tax assessor scraper
│   │   ├── mlsScraper.js               # MLS data scraper
│   │   ├── zoningScraper.js            # Zoning commission scraper
│   │   └── waterDistrictScraper.js    # Water district scraper
│   │
│   └── taskServices/
│       ├── cloudTasksService.js        # Cloud Tasks integration
│       └── schedulerService.js         # Scheduled job management
│
├── utils/
│   ├── dataNormalization.js            # Data normalization functions
│   ├── dataValidation.js               # Data validation utilities
│   ├── dataQuality.js                  # Data quality scoring
│   ├── coordinateUtils.js              # Coordinate validation/transformation
│   └── seoUtils.js                     # SEO slug generation, keyword extraction
│
└── tools/
    └── scrapingTools.js                # Genkit tools for scraping operations
```

## Service Modules

### dbServices/

**Purpose**: Handle all Firestore database interactions. Each service is responsible for CRUD operations for a specific collection.

**Pattern**:
- Accept Firestore instance via dependency injection
- Pure functions where possible
- Structured logging with function names
- Error handling with context

**Example Structure**:
```javascript
/**
 * @purpose Service for land parcel database operations.
 * Handles CRUD operations for the landParcels collection.
 */
const createLandParcel = async (db, parcelData) => { ... }
const updateLandParcel = async (db, parcelId, updates) => { ... }
const getLandParcelById = async (db, parcelId) => { ... }
const queryLandParcels = async (db, filters) => { ... }
```

### scrapingServices/

**Purpose**: Handle web scraping operations from various data sources.

#### baseScraper.js

**Purpose**: Base class providing common scraping functionality.

**Features**:
- Retry logic with exponential backoff
- Error handling and logging
- Request timeout management
- User agent rotation
- Cookie/session management

**Methods**:
- `fetchWithRetry(url, options, maxRetries)` - Fetch with automatic retries
- `parseHtml(html)` - HTML parsing wrapper
- `extractData(html, selectors)` - Data extraction helpers
- `validateResponse(response)` - Response validation

#### proxyRotationService.js

**Purpose**: Manage proxy rotation for scraping operations.

**Features**:
- Proxy pool management
- Health checking
- Automatic rotation on failure
- Rate limit tracking per proxy

**Methods**:
- `getNextProxy()` - Get next available proxy
- `markProxyFailed(proxy)` - Mark proxy as failed
- `markProxySuccess(proxy)` - Mark proxy as successful
- `getProxyStats()` - Get proxy statistics

#### rateLimiter.js

**Purpose**: Enforce rate limits to respect target websites.

**Features**:
- Per-domain rate limiting
- Configurable delays
- Request queuing
- Respect robots.txt

**Methods**:
- `canMakeRequest(domain)` - Check if request is allowed
- `waitForRateLimit(domain)` - Wait until request is allowed
- `recordRequest(domain)` - Record request timestamp
- `getRemainingRequests(domain)` - Get remaining requests in window

#### Source-Specific Scrapers

Each scraper extends baseScraper and implements:
- `scrape()` - Main scraping method
- `parse()` - Parse scraped data
- `normalize()` - Normalize to common schema
- `validate()` - Validate scraped data

### taskServices/

**Purpose**: Handle asynchronous task management via Cloud Tasks.

#### cloudTasksService.js

**Purpose**: Create and manage Cloud Tasks for scraping jobs.

**Features**:
- Task creation with retry configuration
- Task status tracking
- Error handling

**Methods**:
- `createScrapingTask(source, params)` - Create scraping task
- `getTaskStatus(taskId)` - Get task status
- `cancelTask(taskId)` - Cancel pending task

#### schedulerService.js

**Purpose**: Manage scheduled scraping jobs.

**Features**:
- Daily/weekly/monthly job scheduling
- Job status tracking
- Failure recovery

**Methods**:
- `scheduleDailyScrape(source)` - Schedule daily scraping
- `scheduleWeeklyUpdate(source)` - Schedule weekly updates
- `getScheduledJobs()` - List scheduled jobs

## Utility Modules

### dataNormalization.js

**Purpose**: Normalize data from different sources to common schema.

**Functions**:
- `normalizeAddress(rawAddress)` - Normalize address format
- `normalizePrice(priceString)` - Extract and normalize price
- `normalizeCoordinates(lat, lng)` - Validate and normalize coordinates
- `normalizeAcreage(acreageString)` - Extract acreage as number
- `normalizeZoning(zoningString)` - Standardize zoning codes
- `calculateDerivedFields(propertyData)` - Calculate pricePerAcre, etc.

### dataValidation.js

**Purpose**: Validate property data before storage.

**Functions**:
- `validatePropertyData(data, schema)` - Validate against schema
- `validateCoordinates(lat, lng)` - Validate Central Texas bounds
- `validatePrice(price)` - Validate price is positive
- `validateRequiredFields(data, requiredFields)` - Check required fields

### dataQuality.js

**Purpose**: Calculate data quality scores and completeness metrics.

**Functions**:
- `calculateCompletenessScore(data)` - Calculate 0-100 completeness score
- `identifyMissingFields(data)` - List missing fields
- `suggestImprovements(data)` - Suggest data improvements

### coordinateUtils.js

**Purpose**: Coordinate-related utilities.

**Functions**:
- `isInCentralTexas(lat, lng)` - Check if coordinates are in region
- `calculateDistance(lat1, lng1, lat2, lng2)` - Calculate distance in miles
- `geocodeAddress(address)` - Geocode address to coordinates (via API)

### seoUtils.js

**Purpose**: SEO-related utilities.

**Functions**:
- `generateSeoSlug(propertyData)` - Generate URL-friendly slug
- `extractKeywords(propertyData)` - Extract SEO keywords
- `generateMetaDescription(propertyData)` - Generate meta description

## Data Flow

### Scraping Flow

```
1. Scheduler triggers scraping job
   ↓
2. Cloud Task created for scraping operation
   ↓
3. Scraper service initialized with dependencies
   ↓
4. Rate limiter checks if request allowed
   ↓
5. Proxy rotation service provides proxy (if needed)
   ↓
6. Base scraper fetches data with retry logic
   ↓
7. Source-specific scraper parses HTML/data
   ↓
8. Data normalization transforms to common schema
   ↓
9. Data validation checks data quality
   ↓
10. Data quality scoring calculates completeness
    ↓
11. Database service stores in Firestore
    ↓
12. Success/failure logged and metrics recorded
```

### Error Handling Flow

```
1. Error occurs during scraping
   ↓
2. Base scraper catches error
   ↓
3. Retry logic attempts retry (if applicable)
   ↓
4. If retries exhausted:
   - Log error with context
   - Mark proxy as failed (if proxy used)
   - Create alert/notification
   - Store error in error collection
```

## Rate Limiting Strategy

### Per-Domain Limits

- **County Assessor Sites**: 1 request per 2 seconds
- **MLS Feeds**: Respect API rate limits (varies by provider)
- **Zoning Commissions**: 1 request per 3 seconds
- **Water Districts**: 1 request per 2 seconds

### Implementation

- Use in-memory cache (Redis-like) for rate limit tracking
- Store request timestamps per domain
- Calculate time until next request allowed
- Queue requests if rate limit exceeded

## Retry Strategy

### Exponential Backoff

- Initial delay: 1 second
- Max retries: 3
- Backoff multiplier: 2
- Max delay: 30 seconds

### Retry Conditions

- Network errors (timeout, connection refused)
- HTTP 5xx errors
- HTTP 429 (rate limit) - with longer backoff

### No Retry

- HTTP 4xx errors (except 429)
- Invalid data format
- Authentication failures

## Data Quality Monitoring

### Completeness Scoring

Score calculated based on:
- Required fields present: 40 points
- Location data complete: 20 points
- Property details complete: 20 points
- Market data present: 10 points
- SEO content generated: 10 points

### Quality Thresholds

- **High Quality**: >= 80 points - Ready for publication
- **Medium Quality**: 60-79 points - Needs review
- **Low Quality**: < 60 points - Needs significant improvement

### Anomaly Detection

- Price anomalies: Price significantly different from similar properties
- Coordinate anomalies: Coordinates outside Central Texas bounds
- Completeness anomalies: Sudden drop in data completeness

## Testing Strategy

### Unit Tests

- Test each service module in isolation
- Mock dependencies (Firestore, HTTP clients)
- Test error handling paths
- Test data normalization functions

### Integration Tests

- Test scraper → normalization → database flow
- Test rate limiting behavior
- Test retry logic
- Test error recovery

### E2E Tests

- Test full scraping pipeline
- Test scheduled job execution
- Test data quality monitoring

## Monitoring and Alerting

### Metrics to Track

- Scraping success rate per source
- Average scraping duration
- Data quality scores
- Rate limit hits
- Retry counts
- Database write errors

### Alerts

- Scraping failure rate > 10%
- Data quality score drops below threshold
- Rate limit violations
- Database write failures

## Configuration

### Environment Variables

- `SCRAPING_RATE_LIMIT_ENABLED` - Enable/disable rate limiting
- `SCRAPING_MAX_RETRIES` - Maximum retry attempts
- `SCRAPING_TIMEOUT_MS` - Request timeout in milliseconds
- `PROXY_ENABLED` - Enable proxy rotation
- `DATA_QUALITY_THRESHOLD` - Minimum quality score for storage

### Configuration Files

- `scraping-config.json` - Per-source scraping configuration
- `rate-limits.json` - Rate limit configuration per domain
- `proxy-pool.json` - Proxy pool configuration

## Future Enhancements

1. **Distributed Scraping**: Use Cloud Functions for parallel scraping
2. **Caching Layer**: Cache frequently accessed data
3. **Machine Learning**: Use ML for data extraction from unstructured sources
4. **Real-time Updates**: WebSocket-based real-time data updates
5. **Data Enrichment**: Enrich scraped data with external APIs

