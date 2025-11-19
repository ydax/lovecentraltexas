# Central Texas Infrastructure Engine - Build Plan

## Executive Summary

This build plan transforms CentralTexas.com from a low-margin community hub into a high-value Infrastructure & Asset Liquidity Engine. We'll leverage programmatic SEO and the domain's inherent authority to capture high-intent leads for commercial real estate, land acquisitions, and infrastructure investments in the booming Central Texas corridor.

## Strategic Objectives

- Generate immediate high-margin cash flow through referral fees on high-ticket transactions
- Build an automated lead generation monopoly for asset-value transactions in Central Texas
- Create a scalable, zero-inventory business model requiring minimal operational overhead
- Establish CentralTexas.com as the authoritative source for regional investment opportunities

## Phase 1: The Programmatic SEO Cannon (Weeks 1-4)

### 1.1 Data Infrastructure Setup

- [x] [Completed] [LLM] Design database schema for property and asset data
  - [x] Land parcels table (acreage, zoning, water rights, utilities)
  - [x] Commercial properties table (sq ft, zoning type, proximity to infrastructure)
  - [x] Residential luxury properties table (acreage, amenities, school districts)
  - [x] Geographic metadata (counties, cities, neighborhoods)
  - [x] Market trends and pricing data
- [x] [Completed] [Hybrid] Set up Firestore collections for scraped data
  - [x] Create indexed fields for high-performance queries
  - [x] Implement data validation rules
  - [x] Design for efficient pagination and filtering
- [x] [Completed] [LLM] Create data ingestion pipeline architecture
  - [x] Design modular scraping service structure
  - [x] Plan rate limiting and error handling
  - [x] Create data normalization functions

### 1.2 Web Scraping Engine

#### Overview

Build a robust, serverless web scraping infrastructure that respects rate limits, handles failures gracefully, and extracts high-quality property data from public sources. The engine leverages Firebase Cloud Functions v2 with Quin's tool architecture.

#### Architecture Design

- **Core Components**: Base scraper class, rate limiter, data validator, normalizer
- **Execution Model**: Distributed scraping via Cloud Tasks queue for parallelization
- **Storage**: Direct write to Firestore with deduplication
- **Monitoring**: Cloud Logging with structured logs and health metrics

#### Implementation Tasks

##### Core Infrastructure

- [ ] [Not Started] [Manual] Install scraping dependencies in Quin package

  - Run: `cd packages/quin && yarn add cheerio@^1.0.0-rc.12 puppeteer@^21.6.0 got@^11.8.6 p-queue@^7.4.1 pdf-parse@^1.1.1 exceljs@^4.4.0 node-cache@^5.1.2 user-agents@^1.1.0 @google-cloud/tasks@^4.0.0`
  - Verify installation: `yarn list --pattern "cheerio|puppeteer|got"`
  - Update `package.json` with correct versions
  - Run `yarn install` from workspace root

- [x] [Completed] [LLM] Create base scraper class with retry logic
  - [x] Implement exponential backoff with max 30-second delays
  - [x] Handle 4xx/5xx errors appropriately
  - [x] Add timeout handling (30-second default)
  - [x] Create response validation utilities
- [x] [Completed] [LLM] Build rate limiting system
  - [x] Per-domain rate limiting with configurable delays
  - [x] In-memory store for function instances
  - [x] Domain-specific configurations (0.5-1.0 requests/second)
  - [x] Request window tracking and enforcement
- [x] [Completed] [LLM] Create data validation pipeline
  - [x] Field presence validation with dot notation paths
  - [x] Price validation (positive numbers only)
  - [x] Coordinate validation (Central Texas bounds)
  - [x] Status validation (active/pending/sold/off-market)
  - [x] Property-type-specific validators
- [x] [Completed] [LLM] Build data normalization utilities
  - [x] Address parsing and structuring
  - [x] Price extraction from various formats
  - [x] Coordinate normalization
  - [x] Acreage/square footage parsing
  - [x] Derived field calculations (price per acre/sqft)

##### Source-Specific Scrapers

**County Tax Assessor Scrapers**

- [x] [Completed] [LLM] Build Travis County scraper (`services/scrapingServices/sources/travisCADScraper.js`)

  - Implement search by location/parcel ID with session management
  - Extract ownership info, assessed/market values, tax history, exemptions
  - Parse legal descriptions and land use classifications
  - Add property detail page navigation with table extraction
  - See implementation guide for session handling and selector patterns

- [ ] [Not Started] [LLM] Build Hays County scraper (`services/scrapingServices/sources/haysCADScraper.js`)

  - Implement search interface navigation with form handling
  - Extract agricultural exemptions and wildlife management data
  - Parse improvement details (buildings, structures, sq ft)
  - Handle multi-page results with pagination logic

- [ ] [Not Started] [LLM] Build Williamson County scraper (`services/scrapingServices/sources/williamsonCADScraper.js`)

  - Handle session-based navigation with cookie management
  - Extract deed history and ownership chain
  - Parse property characteristics (acreage, zoning, water)
  - Implement retry logic for session expiration

- [ ] [Not Started] [LLM] Create shared tax assessor utilities (`services/scrapingServices/taxAssessorUtils.js`)
  - Build parcel ID normalization (format: COUNTY-YEAR-NUMBER)
  - Create owner name parsing (handle trusts, LLCs, individuals)
  - Implement tax amount calculations (total from multiple tax units)
  - Add common selector extraction patterns

**MLS & Real Estate Listing Scrapers**

- [ ] [Not Started] [Manual] Research MLS data sources and API endpoints

  - Inspect HAR.com network requests to find JSON API endpoints
  - Document Realtor.com API rate limits and authentication
  - Evaluate Zillow public data availability and ToS
  - Create source comparison matrix (cost, coverage, reliability)

- [ ] [Not Started] [LLM] Build HAR.com scraper (`services/scrapingServices/sources/harScraper.js`)

  - Reverse-engineer API endpoints for commercial/land listings
  - Implement search filters (type, price range, location, size)
  - Extract photo URLs and property descriptions
  - Parse agent contact information and listing metadata

- [ ] [Not Started] [LLM] Implement anti-scraping measures (`services/scrapingServices/antiDetection.js`)
  - Create user-agent rotation pool (20+ realistic agents)
  - Add request timing randomization (1-5 second delays)
  - Implement session management with cookie persistence
  - Add proxy rotation integration (ScraperAPI or Bright Data)

**Zoning & Planning Data Scrapers**

- [ ] [Not Started] [LLM] Build Austin zoning scraper (`services/scrapingServices/sources/austinZoningScraper.js`)

  - Integrate with ArcGIS REST API for zoning boundaries
  - Parse zoning district codes and extract permitted uses
  - Extract development bonus information (FAR, height)
  - Create coordinate-to-zoning lookup function

- [ ] [Not Started] [LLM] Build San Antonio planning scraper (`services/scrapingServices/sources/sanAntonioPlanningScraper.js`)

  - Parse future land use maps from GIS portal
  - Extract corridor plan documents and boundaries
  - Identify TIF/TIRZ districts with tax implications
  - Parse development incentive programs

- [ ] [Not Started] [LLM] Build county zoning scrapers (`services/scrapingServices/sources/countyZoningScraper.js`)
  - Parse unincorporated area zoning regulations
  - Extract ETJ (extraterritorial jurisdiction) boundaries
  - Document development agreement locations
  - Handle PDF-based zoning ordinances with pdf-parse

**Water & Utility Infrastructure Scrapers**

- [ ] [Not Started] [LLM] Build LCRA water scraper (`services/scrapingServices/sources/lcraWaterScraper.js`)

  - Parse service area maps from LCRA website
  - Extract water rights database information
  - Monitor drought contingency status and restrictions
  - Create water availability lookup by property coordinates

- [ ] [Not Started] [LLM] Build groundwater district aggregator (`services/scrapingServices/sources/groundwaterScraper.js`)

  - Aggregate well permit data from multiple districts
  - Extract pumping limits and production amounts
  - Parse water quality reports and testing results
  - Map district boundaries to property locations

- [ ] [Not Started] [LLM] Build MUD scraper (`services/scrapingServices/sources/mudScraper.js`)
  - Extract municipal utility district bond information
  - Parse MUD tax rates by district
  - Map service area boundaries to addresses
  - Identify connection fees and capacity limits

**Infrastructure Development Intelligence**

- [ ] [Not Started] [LLM] Build TxDOT project scraper (`services/scrapingServices/sources/txdotScraper.js`)

  - Monitor highway expansion project tracker
  - Extract new interchange locations and timelines
  - Parse right-of-way acquisition notices
  - Calculate proximity impact to properties

- [ ] [Not Started] [LLM] Build Capital Metro expansion scraper (`services/scrapingServices/sources/capMetroScraper.js`)

  - Track rail corridor expansion plans
  - Extract transit center locations (current and planned)
  - Parse park & ride facility locations
  - Map transit proximity to properties

- [ ] [Not Started] [LLM] Build economic development scraper (`services/scrapingServices/sources/economicDevScraper.js`)
  - Identify opportunity zone boundaries
  - Extract tax incentive area designations
  - Monitor major employer announcements and locations
  - Track economic development projects by county

##### Scraper Tools for Quin

- [ ] [Not Started] [LLM] Create `scrapePropertyByAddress` tool (`tools/scrapingTools.js`)

  - Define Genkit tool with Zod schema (input: address, propertyType, enrichment flag)
  - Orchestrate multiple scrapers (tax assessor → MLS → zoning → water)
  - Aggregate and merge data from all sources with conflict resolution
  - Return consolidated property object with data quality score
  - Add timeout handling (max 60 seconds for Cloud Functions)

- [ ] [Not Started] [LLM] Create `batchScrapeCounty` tool (`tools/scrapingTools.js`)

  - Define tool for bulk county scraping with filters (minAcreage, maxPrice, zoning types)
  - Create Cloud Tasks for distributed processing (100 properties per task)
  - Implement pagination logic for large result sets
  - Return job ID and estimated completion time
  - Store progress in Firestore `scrapingJobs` collection

- [ ] [Not Started] [LLM] Create `enrichPropertyData` tool (`tools/scrapingTools.js`)

  - Define tool to enrich existing property records with missing data
  - Query Firestore for properties with low data quality scores
  - Fetch missing fields from appropriate sources (zoning, utilities, tax)
  - Update property documents with batch writes
  - Return enrichment statistics (fields added, quality improvement)

- [ ] [Not Started] [LLM] Create `monitorPriceChanges` tool (`tools/scrapingTools.js`)
  - Define tool to track price changes for watchlist properties
  - Compare current prices with historical data in Firestore
  - Generate price change alerts (>5% change triggers notification)
  - Store price history with timestamps
  - Return list of properties with significant changes

##### Cloud Task Queue Implementation

- [ ] [Not Started] [Manual] Create Cloud Tasks queues via gcloud CLI

  - Run: `gcloud tasks queues create scraping-immediate --max-dispatches-per-second=10`
  - Run: `gcloud tasks queues create scraping-high --max-dispatches-per-second=5`
  - Run: `gcloud tasks queues create scraping-normal --max-dispatches-per-second=2`
  - Run: `gcloud tasks queues create scraping-low --max-dispatches-per-second=0.5`
  - Verify queues: `gcloud tasks queues list --location=us-central1`

- [ ] [Not Started] [LLM] Build task manager service (`services/taskServices/scrapingTaskManager.js`)

  - Create `ScrapingTaskManager` class with queue operations
  - Implement `createTask()` method with priority routing
  - Add `createBatchTasks()` for bulk operations with staggering
  - Build task payload builder with validation
  - Add task scheduling with delay parameter

- [ ] [Not Started] [LLM] Implement task handlers (`handlers/taskHandlers.js`)

  - Create `handleSinglePropertyScrape` function
  - Create `handleBatchCountyScrape` function with progress tracking
  - Create `handleDataEnrichment` function
  - Add error handling with automatic retry logic
  - Store task results in Firestore

- [ ] [Not Started] [LLM] Add task deduplication logic (`services/taskServices/deduplication.js`)
  - Check Firestore for recent scrape timestamp (property-level)
  - Skip if data fresh (<24 hours unless force refresh)
  - Implement force refresh flag override
  - Create dedupe cache with TTL (in-memory for function instance)
  - Log skipped tasks for monitoring

##### Scheduling System

- [ ] [Not Started] [Manual] Create daily new listings scheduler job

  - Run: `gcloud scheduler jobs create http daily-new-listings --schedule="0 6 * * *" --time-zone="America/Chicago" --uri="https://us-central1-lovecentraltexas.cloudfunctions.net/quin/schedule/daily-listings" --http-method=POST`
  - Configure to target MLS/realtor sites only
  - Queue 'high' priority tasks for new finds
  - Set max concurrent scrapes to 5

- [ ] [Not Started] [LLM] Build daily listings handler (`handlers/scheduleHandlers.js`)

  - Create `handleDailyListings` function
  - Query MLS for new listings (last 24 hours)
  - Queue property enrichment tasks for each new listing
  - Log discovery count to Cloud Monitoring

- [ ] [Not Started] [Manual] Create weekly price monitoring scheduler job

  - Run: `gcloud scheduler jobs create http weekly-price-monitor --schedule="0 2 * * 0" --time-zone="America/Chicago" --uri="https://us-central1-lovecentraltexas.cloudfunctions.net/quin/schedule/weekly-prices" --http-method=POST`
  - Configure to check all active listings
  - Generate price change report after completion

- [ ] [Not Started] [LLM] Build price monitoring handler (`handlers/scheduleHandlers.js`)

  - Create `handleWeeklyPriceMonitor` function
  - Query all properties with status='active'
  - Re-scrape current prices and compare to stored values
  - Generate report with price changes >5%
  - Email report to admin (or store in Firestore)

- [ ] [Not Started] [Manual] Create monthly full refresh scheduler job

  - Run: `gcloud scheduler jobs create http monthly-refresh --schedule="0 1 1 * *" --time-zone="America/Chicago" --uri="https://us-central1-lovecentraltexas.cloudfunctions.net/quin/schedule/monthly-refresh" --http-method=POST`
  - Configure to process all properties in batches
  - Set estimated duration: 24-48 hours

- [ ] [Not Started] [LLM] Build monthly refresh handler (`handlers/scheduleHandlers.js`)

  - Create `handleMonthlyRefresh` function
  - Query all properties in Firestore (paginated)
  - Queue 'low' priority tasks for full re-scrape
  - Update tax assessments from county records
  - Verify property status (active/sold/off-market)
  - Generate completion report with data quality metrics

- [ ] [Not Started] [Manual] Create hourly hot property checker job (optional)

  - Run: `gcloud scheduler jobs create http hourly-hot-check --schedule="0 * * * *" --time-zone="America/Chicago" --uri="https://us-central1-lovecentraltexas.cloudfunctions.net/quin/schedule/hot-properties" --http-method=POST`
  - Limit to properties with flag='highValue' or price >$2M
  - Set max properties: 1000

- [ ] [Not Started] [LLM] Build hot property handler (`handlers/scheduleHandlers.js`)
  - Create `handleHotPropertyCheck` function
  - Query high-value properties (flags include 'highValue')
  - Check for status changes (active → pending/sold)
  - Send immediate alerts on status changes
  - Update Firestore with latest status

##### Data Quality & Monitoring

- [ ] [Not Started] [LLM] Build pre-storage validation service (`services/dataQuality/preStorageValidator.js`)

  - Create `validateBeforeStorage()` function
  - Check required field presence (address, price, county)
  - Validate data types (price is number, coordinates are valid)
  - Check reasonable value ranges (price >$0, acreage >0)
  - Return validation result with specific error messages
  - Reject invalid data (don't store) and log rejection

- [ ] [Not Started] [LLM] Build post-storage analysis service (`services/dataQuality/postStorageAnalyzer.js`)

  - Create `analyzePropertyData()` function (uses existing dataValidation utils)
  - Implement price anomaly detection (IQR method, flag outliers)
  - Calculate completeness score (% of fields populated)
  - Track source reliability (success rate per source over 7 days)
  - Store analysis results in `dataQuality` collection

- [ ] [Not Started] [LLM] Create quality dashboard service (`services/dataQuality/dashboardGenerator.js`)

  - Build `generateDailyQualityReport()` function
  - Calculate success rate by source (successful scrapes / total attempts)
  - Calculate data completeness metrics (avg completeness by property type)
  - Categorize errors by type (network, parsing, validation)
  - Store daily reports in Firestore for visualization

- [ ] [Not Started] [LLM] Enhance structured logging (`services/logging/scrapingLogger.js`)

  - Create `logScrapeStart()` and `logScrapeComplete()` functions
  - Add scrape duration calculation and logging
  - Log data quality scores with each property save
  - Track and log retry attempts per scrape
  - Use consistent log format: `[source][function] message {context}`

- [ ] [Not Started] [Manual] Set up Cloud Monitoring custom metrics

  - Define custom metric: `scraping.requests.total` (counter by source)
  - Define custom metric: `scraping.requests.duration` (histogram in ms)
  - Define custom metric: `scraping.errors.rate` (rate per minute)
  - Define custom metric: `scraping.data_quality.score` (gauge 0-1)
  - Implement metric recording in scraper code

- [ ] [Not Started] [Manual] Create Cloud Monitoring alert policies

  - Alert: Error rate >10% over 10 minutes
  - Alert: No successful scrapes in 2 hours (per source)
  - Alert: Queue depth >1000 tasks
  - Alert: Data quality score <0.7 for 24 hours
  - Configure notification channels (email/SMS)

- [ ] [Not Started] [LLM] Build health check endpoint (`handlers/api.js`)
  - Add `GET /health` route
  - Query last successful scrape timestamp per source
  - Get current queue depths from Cloud Tasks API
  - Calculate data freshness (time since last update by source)
  - Return JSON health status with all metrics

##### Error Handling & Recovery

- [ ] [Not Started] [LLM] Implement source-specific error handlers (`services/scrapingServices/errorHandlers.js`)

  - Create `handleSessionExpiration()` - refresh session and retry
  - Create `detectCAPTCHA()` - check for CAPTCHA in response, pause source
  - Create `handleRateLimit()` - implement exponential backoff (2^attempt seconds)
  - Add error type detection from HTTP status codes and response content
  - Log all errors with source and error type for monitoring

- [ ] [Not Started] [LLM] Build circuit breaker service (`services/scrapingServices/circuitBreaker.js`)

  - Create `CircuitBreaker` class tracking failure counts per source
  - Implement state machine: CLOSED → OPEN (>5 failures) → HALF_OPEN
  - Disable failing sources for 30 minutes when circuit opens
  - Gradual recovery: allow 1 test request in HALF_OPEN state
  - Admin override: `forceClose(source)` method to manually enable
  - Store circuit state in Firestore for persistence across functions

- [ ] [Not Started] [LLM] Implement failed scrape recovery (`services/scrapingServices/failureRecovery.js`)

  - Create `retryScrape()` with exponential backoff (1s, 2s, 4s, 8s, 16s max)
  - After max retries, move to dead letter queue
  - Store failed scrapes in Firestore `deadLetterQueue` collection
  - Include error details, retry count, and original request
  - Create retry scheduler for failed tasks (retry after 1 hour)

- [ ] [Not Started] [LLM] Build manual intervention system (`services/scrapingServices/interventionAlerts.js`)
  - Create `sendInterventionAlert()` for critical failures
  - Alert when source has been down >4 hours
  - Alert when dead letter queue >100 items
  - Alert when circuit breaker opens
  - Send alerts via email or Cloud Logging with severity:ERROR

##### Testing Strategy

- [ ] [Not Started] [LLM] Write unit tests for utilities (`__tests__/utils/`)

  - Test `normalizeAddress()`, `normalizePrice()`, `normalizeAcreage()` functions
  - Test `validateLandParcelData()`, `validateCoordinates()`, `validatePrice()`
  - Test `RateLimiter` class methods (canMakeRequest, waitForRateLimit)
  - Use Jest with coverage target >80%
  - Mock external dependencies (Firestore, HTTP)

- [ ] [Not Started] [LLM] Write integration tests with mock responses (`__tests__/integration/`)

  - Create mock HTTP responses for each source (Travis CAD, HAR, etc.)
  - Test end-to-end scraping flow (search → details → normalize → validate)
  - Test error handling (404, timeout, invalid HTML)
  - Test queue task handling with Cloud Tasks emulator
  - Verify Firestore writes with emulator

- [ ] [Not Started] [LLM] Implement load tests (`__tests__/load/`)
  - Test concurrent scraping limits (10, 50, 100 parallel requests)
  - Verify rate limiter effectiveness under load
  - Monitor memory usage patterns with different scrapers
  - Test Firestore batch write performance (100, 500, 1000 docs)
  - Use Artillery or k6 for load testing framework

#### Technical Implementation Details

##### Dependencies to Add

```json
{
  "dependencies": {
    "cheerio": "^1.0.0-rc.12", // HTML parsing
    "puppeteer": "^21.0.0", // JavaScript-heavy sites
    "p-queue": "^7.4.1", // Queue management
    "zod": "^3.22.0", // Already included
    "@google-cloud/tasks": "^3.0.0", // Cloud Tasks
    "node-fetch": "^2.7.0" // HTTP requests (if needed)
  }
}
```

##### Key Design Patterns

1. **Adapter Pattern**: Each source gets its own scraper adapter implementing common interface
2. **Queue-based Distribution**: Cloud Tasks for reliable, distributed execution
3. **Circuit Breaker**: Prevent cascading failures from problematic sources
4. **Repository Pattern**: Clean separation between scraping and data storage
5. **Strategy Pattern**: Different parsing strategies for different source types

##### Performance Targets

- Scrape 1,000 properties/hour per source
- <5% error rate average
- <2 minute latency for high-priority scrapes
- 99.9% data validation accuracy
- <$0.01 cost per property scraped

This detailed implementation plan provides a clear roadmap for building a production-grade scraping engine that integrates seamlessly with the existing Quin infrastructure.

#### Detailed Implementation Guide

For comprehensive implementation details including:

- Complete dependency list with versions and use cases
- Firestore database schema with indexes
- Scraping strategies by source type (Static HTML, JavaScript SPAs, APIs)
- Source-specific implementation examples
- Genkit tool definitions
- Cloud infrastructure setup commands
- Cost optimization strategies
- Performance metrics and monitoring
- Testing strategies

**See: [`packages/docs/web-scraping-implementation-guide.md`](./web-scraping-implementation-guide.md)**

This guide contains:

1. **Technology Stack & Libraries** - Detailed library recommendations with pros/cons
2. **Database Architecture** - Complete Firestore schema with collections and indexes
3. **Scraping Strategies** - Specific approaches for each data source type
4. **Implementation Patterns** - Enhanced base scraper, county-specific examples
5. **Code Examples** - Production-ready code snippets
6. **Performance & Scaling** - Memory optimization, caching, distributed patterns

### 1.3 Programmatic Page Generation Engine

- [ ] [Not Started] [LLM] Design dynamic page template system
  - [ ] Create master template for property pages
  - [ ] Build component library for data visualization
  - [ ] Design responsive, high-converting layouts
- [ ] [Not Started] [LLM] Implement SEO-optimized content generation
  - [ ] Create LLM prompts for unique property descriptions
  - [ ] Build dynamic title and meta description generator
  - [ ] Implement schema.org structured data
- [ ] [Not Started] [LLM] Build URL routing system
  - [ ] Create SEO-friendly URL structure
  - [ ] Implement dynamic sitemap generation
  - [ ] Set up proper canonicalization
- [ ] [Not Started] [LLM] Develop page variants for search intent
  - [ ] "Industrial land near [landmark]" pages
  - [ ] "Commercial property with [feature]" pages
  - [ ] "Investment opportunities in [county]" pages
  - [ ] Comparison pages for similar properties
- [ ] [Not Started] [LLM] Configure Firebase Hosting for programmatic pages
  - [ ] Set up Next.js dynamic routes for property pages
  - [ ] Configure Firebase Hosting rewrites for SSR/SSG
  - [ ] Implement incremental static regeneration (ISR) strategy
  - [ ] Set up automatic sitemap.xml generation and hosting
  - [ ] Configure robots.txt for optimal crawling
  - [ ] Implement proper cache headers for SEO

### 1.4 Search and Discovery Features

- [ ] [Not Started] [LLM] Build advanced filtering system
  - [ ] Multi-parameter search (size, price, location, features)
  - [ ] Map-based search interface
  - [ ] Saved search functionality
- [ ] [Not Started] [LLM] Create AI-powered property matching
  - [ ] Implement semantic search using Gemini
  - [ ] Build "similar properties" recommendation engine
  - [ ] Create intent detection for vague queries
- [ ] [Not Started] [LLM] Develop market insights dashboard
  - [ ] Price trend visualizations
  - [ ] Investment opportunity heat maps
  - [ ] Comparative market analysis tools

## Phase 2: The High-Ticket Arbitrage System (Weeks 5-8)

### 2.1 Lead Capture Infrastructure

- [ ] [Not Started] [LLM] Design high-converting lead capture forms
  - [ ] Create "Priority Access" form with progressive disclosure
  - [ ] Build multi-step qualification flow
  - [ ] Implement form abandonment recovery
- [ ] [Not Started] [LLM] Develop lead scoring algorithm
  - [ ] Create point system based on intent signals
  - [ ] Implement machine learning for score refinement
  - [ ] Build real-time scoring API
- [ ] [Not Started] [LLM] Build CRM integration system
  - [ ] Create Firestore collections for lead management
  - [ ] Design lead status workflow
  - [ ] Implement automated follow-up sequences

### 2.2 Broker Network Management

- [ ] [Not Started] [Manual] Research and vet top commercial brokers
  - [ ] Identify top 10 commercial real estate brokers
  - [ ] Research luxury residential specialists
  - [ ] Document commission structures and specialties
- [ ] [Not Started] [Manual] Negotiate referral agreements
  - [ ] Draft standard referral agreement template
  - [ ] Set 25-30% commission structure
  - [ ] Establish performance benchmarks
- [ ] [Not Started] [LLM] Build broker portal
  - [ ] Create secure login system
  - [ ] Design lead distribution dashboard
  - [ ] Implement performance tracking
  - [ ] Build commission calculation system

### 2.3 Lead Routing Automation

- [ ] [Not Started] [LLM] Develop intelligent lead routing algorithm
  - [ ] Match leads to broker specialties
  - [ ] Implement round-robin for equal distribution
  - [ ] Create override rules for high-value leads
- [ ] [Not Started] [LLM] Build automated lead qualification
  - [ ] Create Gemini-powered chat qualification
  - [ ] Implement email verification
  - [ ] Build phone number validation
  - [ ] Design budget verification flow
- [ ] [Not Started] [LLM] Create lead handoff system
  - [ ] Build automated email introductions
  - [ ] Create SMS notification system
  - [ ] Implement lead acceptance workflow
  - [ ] Design fallback routing for declined leads

### 2.4 Revenue Tracking and Optimization

- [ ] [Not Started] [LLM] Build commission tracking system
  - [ ] Create deal pipeline in Firestore
  - [ ] Implement stage tracking
  - [ ] Build automated invoicing
  - [ ] Design payment reconciliation
- [ ] [Not Started] [LLM] Develop analytics dashboard
  - [ ] Lead-to-close conversion metrics
  - [ ] Broker performance rankings
  - [ ] Revenue forecasting models
  - [ ] ROI by traffic source
- [ ] [Not Started] [LLM] Create A/B testing framework
  - [ ] Test lead capture forms
  - [ ] Optimize page layouts
  - [ ] Experiment with qualification flows
  - [ ] Measure broker matching algorithms

## Phase 3: Vertical Expansion (Month 3+)

### 3.1 Solar/Energy Vertical

- [ ] [Not Started] [LLM] Build solar installation calculator
  - [ ] Create roof size estimation tool
  - [ ] Implement savings calculator
  - [ ] Design incentive/rebate database
- [ ] [Not Started] [LLM] Develop installer network
  - [ ] Vet commercial solar installers
  - [ ] Negotiate referral agreements
  - [ ] Create installer portal
- [ ] [Not Started] [LLM] Create programmatic solar content
  - [ ] Generate location-specific solar pages
  - [ ] Build commercial vs residential variants
  - [ ] Implement case study templates

### 3.2 High-Ticket Home Services

- [ ] [Not Started] [LLM] Identify high-value service categories
  - [ ] Foundation repair content and leads
  - [ ] Pool installation opportunities
  - [ ] Complete home renovations
  - [ ] Custom home builders
- [ ] [Not Started] [LLM] Build service provider vetting system
  - [ ] Create quality scoring algorithm
  - [ ] Implement review aggregation
  - [ ] Design provider onboarding flow
- [ ] [Not Started] [LLM] Develop service-specific landing pages
  - [ ] Create cost estimation tools
  - [ ] Build project galleries
  - [ ] Implement instant quote systems

### 3.3 Infrastructure Development Intelligence

- [ ] [Not Started] [LLM] Create development tracking system
  - [ ] Monitor city planning documents
  - [ ] Track major infrastructure projects
  - [ ] Identify investment opportunities
- [ ] [Not Started] [LLM] Build predictive analytics
  - [ ] Property value impact modeling
  - [ ] Development timeline predictions
  - [ ] Investment opportunity scoring
- [ ] [Not Started] [LLM] Develop premium intelligence reports
  - [ ] Create automated report generation
  - [ ] Design subscription model
  - [ ] Build delivery system

## Technical Architecture Considerations

### 4.1 Firebase Hosting Configuration

- [ ] [Not Started] [LLM] Configure Firebase Hosting for scale
  - [ ] Set up custom domain (CentralTexas.com) in Firebase Hosting
  - [ ] Configure SSL certificates for custom domain
  - [ ] Set up proper redirects and rewrites in firebase.json
  - [ ] Configure headers for SEO (canonical, hreflang, etc.)
  - [ ] Set up proper 404 handling for dynamic routes
- [ ] [Not Started] [LLM] Optimize Next.js build for Firebase Hosting
  - [ ] Configure static export where possible for performance
  - [ ] Implement ISR (Incremental Static Regeneration) for property pages
  - [ ] Set up proper build output directory structure
  - [ ] Configure image optimization for Firebase Hosting CDN
- [ ] [Not Started] [LLM] Implement hosting deployment pipeline
  - [ ] Integrate hosting deployment into CI/CD workflow
  - [ ] Set up preview channels for staging deployments
  - [ ] Configure rollback capabilities
  - [ ] Implement deployment health checks

### 4.2 Performance Optimization

- [ ] [Not Started] [LLM] Leverage Firebase Hosting CDN capabilities
  - [ ] Utilize Firebase Hosting's global CDN for static assets
  - [ ] Configure cache headers for optimal performance
  - [ ] Implement edge caching for frequently accessed pages
  - [ ] Set up proper cache invalidation strategy
- [ ] [Not Started] [LLM] Optimize for Core Web Vitals
  - [ ] Implement lazy loading for images and components
  - [ ] Optimize image delivery through Firebase Hosting CDN
  - [ ] Minimize JavaScript bundles with code splitting
  - [ ] Implement resource hints (preconnect, prefetch)
- [ ] [Not Started] [LLM] Build scalable infrastructure
  - [ ] Design for 100k+ pages using Next.js ISR
  - [ ] Implement database sharding for Firestore queries
  - [ ] Create microservices architecture with Quin tools
  - [ ] Plan for horizontal scaling of Firebase Functions

### 4.3 Monitoring and Maintenance

- [ ] [Not Started] [LLM] Set up comprehensive monitoring
  - [ ] Implement error tracking
  - [ ] Create performance monitoring
  - [ ] Build uptime monitoring
- [ ] [Not Started] [LLM] Develop automated testing suite
  - [ ] Unit tests for Quin tools
  - [ ] Integration tests for scrapers
  - [ ] E2E tests for critical flows
- [ ] [Not Started] [LLM] Create operational dashboards
  - [ ] Real-time system health
  - [ ] Scraping success rates
  - [ ] Lead flow metrics

## Success Metrics

### Key Performance Indicators

- **Month 1**: 10,000+ indexed pages, 1,000+ organic visitors
- **Month 2**: First closed deal, $25k+ in referral revenue
- **Month 3**: 50,000+ pages, 10,000+ monthly visitors, $100k+ pipeline
- **Month 6**: $500k+ annual run rate, 3+ verticals active

### Critical Milestones

- [ ] [Not Started] First 1,000 programmatic pages live
- [ ] [Not Started] First qualified lead generated
- [ ] [Not Started] First referral commission earned
- [ ] [Not Started] Break-even on operational costs
- [ ] [Not Started] First vertical expansion launched

## Risk Mitigation

### Technical Risks

- **Scraping Blocks**: Implement rotating proxies, respect robots.txt, use headless browsers
- **SEO Penalties**: Focus on unique, valuable content; avoid duplicate content
- **Scaling Issues**: Design for horizontal scaling from day one

### Business Risks

- **Broker Relationships**: Start with multiple brokers to avoid dependency
- **Legal Compliance**: Ensure proper licensing for referral fees
- **Market Downturn**: Diversify across commercial, residential, and services

## Resource Requirements

### Technical Resources

- **Hosting**: Firebase Hosting with custom domain (CentralTexas.com)
  - Global CDN for static assets and pages
  - SSL certificates and custom domain support
  - Preview channels for staging deployments
- **Compute**: Firebase Functions with increased memory/timeout limits
- **Storage**: Firestore with proper indexing strategy
- **AI/ML**: Gemini API for content generation and lead qualification
- **Monitoring**: Google Cloud Monitoring and custom dashboards

### Financial Resources

- **Month 1**: ~$200 (Firebase Hosting, Functions, scraping proxies)
- **Month 2**: ~$500 (increased hosting usage, API costs, Firestore queries)
- **Month 3+**: Self-funding from referral revenues

**Note**: Firebase Hosting offers generous free tier (10GB storage, 360MB/day transfer) with pay-as-you-go pricing. For 100k+ pages, expect ~$50-100/month in hosting costs initially, scaling with traffic.

This build plan leverages your coding expertise to create a high-margin, scalable business that exploits the CentralTexas.com domain authority. The focus on programmatic SEO and automated lead generation creates a defensible moat while requiring minimal operational overhead.
