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

- [ ] [Not Started] [LLM] County Tax Assessor Scrapers

  - [ ] Travis County (traviscad.org)
    - [ ] Search by location/parcel ID
    - [ ] Extract ownership, value, tax history
    - [ ] Parse legal descriptions
  - [ ] Hays County (hayscad.com)
    - [ ] Implement search interface navigation
    - [ ] Extract agricultural exemptions
    - [ ] Parse improvement details
  - [ ] Williamson County (wcad.org)
    - [ ] Handle session-based navigation
    - [ ] Extract deed history
    - [ ] Parse property characteristics
  - [ ] Create shared tax assessor utilities
    - [ ] Parcel ID normalization
    - [ ] Owner name parsing
    - [ ] Tax amount calculations

- [ ] [Not Started] [LLM] MLS Data Aggregation

  - [ ] Research public MLS data sources
    - [ ] HAR.com public listings
    - [ ] Realtor.com API limits
    - [ ] Zillow public data (if available)
  - [ ] Implement listing scraper
    - [ ] Search filters (commercial, land, luxury)
    - [ ] Photo URL extraction
    - [ ] Agent information parsing
  - [ ] Handle anti-scraping measures
    - [ ] User-agent rotation
    - [ ] Request timing randomization
    - [ ] Session management

- [ ] [Not Started] [LLM] Zoning & Planning Data

  - [ ] Austin zoning (austintexas.gov)
    - [ ] Parse zoning maps
    - [ ] Extract permitted uses
    - [ ] Development bonus information
  - [ ] San Antonio planning (sanantonio.gov)
    - [ ] Future land use maps
    - [ ] Corridor plans
    - [ ] TIF/TIRZ districts
  - [ ] County-level zoning
    - [ ] Unincorporated area regulations
    - [ ] ETJ boundaries
    - [ ] Development agreements

- [ ] [Not Started] [LLM] Water & Utility Infrastructure

  - [ ] LCRA water availability
    - [ ] Service area maps
    - [ ] Water rights database
    - [ ] Drought contingency status
  - [ ] Groundwater conservation districts
    - [ ] Well permit data
    - [ ] Pumping limits
    - [ ] Water quality reports
  - [ ] Municipal utility districts
    - [ ] Bond information
    - [ ] Tax rates
    - [ ] Service boundaries

- [ ] [Not Started] [LLM] Infrastructure Development Intel
  - [ ] TxDOT project tracker
    - [ ] Highway expansions
    - [ ] New interchanges
    - [ ] ROW acquisitions
  - [ ] Capital Metro expansion
    - [ ] Rail corridors
    - [ ] Transit centers
    - [ ] Park & ride locations
  - [ ] Economic development
    - [ ] Opportunity zones
    - [ ] Tax incentive areas
    - [ ] Major employer announcements

##### Scraper Tools for Quin

- [ ] [Not Started] [LLM] Create Genkit tools for scraping operations
  - [ ] `scrapePropertyByAddress` tool
    - [ ] Input: address, property type
    - [ ] Output: consolidated property data
    - [ ] Orchestrates multiple scrapers
  - [ ] `scrapeCountyParcels` tool
    - [ ] Input: county, filters (size, zoning)
    - [ ] Output: parcel list with basic info
    - [ ] Implements pagination
  - [ ] `enrichPropertyData` tool
    - [ ] Input: basic property info
    - [ ] Output: enriched data from all sources
    - [ ] Aggregates zoning, utilities, tax data
  - [ ] `monitorPriceChanges` tool
    - [ ] Input: property IDs to monitor
    - [ ] Output: price change alerts
    - [ ] Compares with historical data

##### Cloud Task Queue Implementation

- [ ] [Not Started] [LLM] Design task queue architecture
  - [ ] Create Cloud Tasks queues
    - [ ] `scraping-high-priority` (1 req/sec)
    - [ ] `scraping-low-priority` (0.5 req/sec)
    - [ ] `scraping-enrichment` (2 req/sec)
  - [ ] Implement task handlers
    - [ ] Single property scrape
    - [ ] Batch county scrape
    - [ ] Data enrichment task
  - [ ] Add task deduplication
    - [ ] Check if property recently scraped
    - [ ] Skip if data fresh (<24 hours)
    - [ ] Force refresh option

##### Scheduling System

- [ ] [Not Started] [LLM] Create Cloud Scheduler jobs
  - [ ] Daily new listing discovery
    - [ ] 6 AM CST execution
    - [ ] Focus on MLS/realtor sites
    - [ ] Queue enrichment for new finds
  - [ ] Weekly price monitoring
    - [ ] Sunday 2 AM CST
    - [ ] All active listings
    - [ ] Generate price change report
  - [ ] Monthly full refresh
    - [ ] 1st of month, 1 AM CST
    - [ ] All properties in database
    - [ ] Update tax assessments
    - [ ] Verify property status
  - [ ] Hourly hot property check
    - [ ] High-value properties only
    - [ ] Immediate alert on status change
    - [ ] <1000 properties in rotation

##### Data Quality & Monitoring

- [ ] [Not Started] [LLM] Implement quality checks

  - [ ] Pre-storage validation
    - [ ] Required field presence
    - [ ] Data type correctness
    - [ ] Reasonable value ranges
  - [ ] Post-storage analysis
    - [ ] Anomaly detection (price outliers)
    - [ ] Completeness scoring
    - [ ] Source reliability tracking
  - [ ] Create quality dashboard
    - [ ] Success rate by source
    - [ ] Data completeness metrics
    - [ ] Error categorization

- [ ] [Not Started] [LLM] Build monitoring system
  - [ ] Structured logging enhancements
    - [ ] Add scrape duration
    - [ ] Log data quality scores
    - [ ] Track retry attempts
  - [ ] Cloud Monitoring setup
    - [ ] Custom metrics (scrapes/minute)
    - [ ] Error rate tracking
    - [ ] Latency percentiles
  - [ ] Alert policies
    - [ ] > 10% error rate
    - [ ] No successful scrapes in 2 hours
    - [ ] Queue depth >1000 tasks
  - [ ] Health check endpoint
    - [ ] Last successful scrape by source
    - [ ] Current queue depths
    - [ ] Data freshness metrics

##### Error Handling & Recovery

- [ ] [Not Started] [LLM] Implement robust error handling
  - [ ] Source-specific error handling
    - [ ] Session expiration recovery
    - [ ] CAPTCHA detection
    - [ ] Rate limit backoff
  - [ ] Circuit breaker pattern
    - [ ] Disable failing sources
    - [ ] Gradual recovery testing
    - [ ] Admin override capability
  - [ ] Failed scrape recovery
    - [ ] Exponential backoff retries
    - [ ] Dead letter queue
    - [ ] Manual intervention alerts

##### Testing Strategy

- [ ] [Not Started] [LLM] Create comprehensive test suite
  - [ ] Unit tests
    - [ ] Data normalization functions
    - [ ] Validation logic
    - [ ] Rate limiter behavior
  - [ ] Integration tests
    - [ ] Mock HTTP responses
    - [ ] End-to-end scraping flow
    - [ ] Queue task handling
  - [ ] Load tests
    - [ ] Concurrent scraping limits
    - [ ] Rate limiter effectiveness
    - [ ] Memory usage patterns

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
