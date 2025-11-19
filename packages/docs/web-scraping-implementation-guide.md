# Web Scraping Engine - Detailed Implementation Guide

## Table of Contents
1. [Technology Stack & Libraries](#technology-stack--libraries)
2. [Database Architecture](#database-architecture)
3. [Scraping Strategies by Source Type](#scraping-strategies-by-source-type)
4. [Implementation Patterns](#implementation-patterns)
5. [Code Examples](#code-examples)
6. [Performance & Scaling Strategies](#performance--scaling-strategies)

## Technology Stack & Libraries

### Core Scraping Libraries

#### 1. **Cheerio** (Static HTML Parsing)
```json
"cheerio": "^1.0.0-rc.12"
```
**Use for:** Government sites with server-rendered HTML
**Pros:** Fast, lightweight, jQuery-like syntax
**Cons:** Can't handle JavaScript-rendered content

#### 2. **Puppeteer** (Headless Browser)
```json
"puppeteer": "^21.6.0"
```
**Use for:** JavaScript-heavy sites, sites requiring interaction
**Pros:** Full browser capabilities, screenshot capture
**Cons:** Heavy memory usage, slower than static parsing

#### 3. **Playwright** (Alternative to Puppeteer)
```json
"playwright": "^1.40.0"
```
**Use for:** Complex multi-page flows, better for CI/CD
**Pros:** Multi-browser support, better reliability
**Cons:** Larger package size

### HTTP & Request Management

#### 4. **Got** (HTTP Client)
```json
"got": "^11.8.6"
```
**Use for:** API calls, simple HTTP requests
**Pros:** Promise-based, built-in retry, streams
**Better than:** node-fetch, axios for our use case

#### 5. **P-Queue** (Queue Management)
```json
"p-queue": "^7.4.1"
```
**Use for:** Managing concurrent scraping operations
**Features:** Priority queuing, concurrency control

### Data Processing

#### 6. **PDF-Parse** (PDF Extraction)
```json
"pdf-parse": "^1.1.1"
```
**Use for:** Government PDF documents
**Alternative:** `pdfjs-dist` for more control

#### 7. **ExcelJS** (Spreadsheet Processing)
```json
"exceljs": "^4.4.0"
```
**Use for:** Tax assessor bulk data exports

### Proxy & Anti-Detection

#### 8. **Proxy-Chain** (Proxy Rotation)
```json
"proxy-chain": "^2.4.0"
```
**Use for:** Rotating proxies, avoiding blocks
**Integrate with:** Bright Data, ScraperAPI, or Oxylabs

#### 9. **User-Agents** (UA Rotation)
```json
"user-agents": "^1.1.0"
```
**Use for:** Realistic user agent generation

### Cloud Integration

#### 10. **Google Cloud Tasks**
```json
"@google-cloud/tasks": "^4.0.0"
```
**Use for:** Distributed scraping job management

#### 11. **Google Cloud Scheduler**
```json
"@google-cloud/scheduler": "^4.0.0"
```
**Use for:** Cron-like job scheduling

## Database Architecture

### Firestore Collection Structure

```javascript
// Main Collections
const collections = {
  // 1. Properties Collection
  'properties': {
    // Document ID: Generated UUID or parcel ID
    '{propertyId}': {
      // Core Fields
      id: 'uuid',
      parcelId: 'TC-2023-0001234', // County-specific
      propertyType: 'land|commercial|residential',
      status: 'active|pending|sold|off-market',
      
      // Location Data
      address: {
        street: '123 Main St',
        city: 'Austin',
        county: 'Travis',
        state: 'TX',
        zipCode: '78701',
        coordinates: {
          latitude: 30.2672,
          longitude: -97.7431,
          geohash: 'abcdef123' // For geo queries
        }
      },
      
      // Financial Data
      pricing: {
        listPrice: 500000,
        assessedValue: 450000,
        taxableValue: 425000,
        lastSalePrice: 400000,
        lastSaleDate: '2022-01-15',
        priceHistory: [
          { date: '2024-01-01', price: 500000, event: 'listed' }
        ]
      },
      
      // Property Details
      details: {
        acreage: 10.5,
        squareFeet: 0, // For buildings
        yearBuilt: null,
        zoning: 'AG',
        utilities: {
          water: 'well|municipal|none',
          sewer: 'septic|municipal|none',
          electric: 'available|on-site|none',
          gas: 'available|none'
        }
      },
      
      // Source Tracking
      sources: {
        taxAssessor: {
          lastScraped: '2024-01-15T10:00:00Z',
          url: 'https://traviscad.org/property/123',
          reliability: 0.95
        },
        mls: {
          lastScraped: '2024-01-15T12:00:00Z',
          listingId: 'MLS123456',
          reliability: 0.90
        }
      },
      
      // Metadata
      metadata: {
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-15T12:00:00Z',
        lastVerified: '2024-01-15T12:00:00Z',
        dataQualityScore: 0.92,
        flags: ['highValue', 'recentlyReduced']
      }
    }
  },
  
  // 2. Scraping Jobs Collection
  'scrapingJobs': {
    '{jobId}': {
      id: 'uuid',
      type: 'single|batch|enrichment',
      source: 'traviscad|hayscad|mls|zoning',
      status: 'pending|running|completed|failed',
      priority: 'high|normal|low',
      
      config: {
        targetUrl: 'https://...',
        selectors: {}, // Source-specific
        maxRetries: 3,
        timeout: 30000
      },
      
      execution: {
        startedAt: '2024-01-15T10:00:00Z',
        completedAt: '2024-01-15T10:05:00Z',
        duration: 300000, // ms
        attempts: 1,
        errors: []
      },
      
      results: {
        propertiesFound: 150,
        propertiesUpdated: 145,
        newProperties: 5,
        failures: 0
      }
    }
  },
  
  // 3. Data Quality Collection
  'dataQuality': {
    '{reportId}': {
      date: '2024-01-15',
      source: 'traviscad',
      metrics: {
        totalRecords: 1000,
        completeRecords: 950,
        partialRecords: 40,
        failedRecords: 10,
        averageCompleteness: 0.95,
        fieldCompleteness: {
          price: 0.98,
          address: 0.99,
          acreage: 0.90,
          zoning: 0.85
        }
      },
      anomalies: [
        {
          propertyId: 'abc123',
          field: 'price',
          issue: 'outlier',
          value: 50000000,
          expectedRange: [100000, 5000000]
        }
      ]
    }
  },
  
  // 4. Scraping State Collection
  'scrapingState': {
    'traviscad': {
      lastFullScrape: '2024-01-01T00:00:00Z',
      lastIncrementalScrape: '2024-01-15T10:00:00Z',
      totalProperties: 250000,
      scrapedProperties: 245000,
      currentPage: 2450,
      pagesPerBatch: 100,
      averageTimePerPage: 2000, // ms
      errors: {
        consecutive: 0,
        total: 15,
        lastError: null
      }
    }
  }
};

// Composite Indexes for Efficient Queries
const indexes = [
  // Property searches
  ['propertyType', 'status', 'pricing.listPrice'],
  ['address.county', 'propertyType', 'status'],
  ['address.coordinates.geohash', 'pricing.listPrice'],
  ['metadata.flags', 'status', 'metadata.updatedAt'],
  
  // Data quality monitoring
  ['sources.taxAssessor.lastScraped', 'metadata.dataQualityScore'],
  ['metadata.lastVerified', 'propertyType'],
  
  // Scraping job management
  ['status', 'priority', 'execution.startedAt'],
  ['source', 'status', 'execution.completedAt']
];
```

## Scraping Strategies by Source Type

### 1. County Tax Assessor Strategy

```javascript
const TaxAssessorStrategy = {
  // Travis County Example
  traviscad: {
    baseUrl: 'https://traviscad.org',
    searchEndpoint: '/property-search/search-by-address',
    
    approach: 'SESSION_BASED',
    // Most tax assessor sites use session cookies
    
    implementation: `
      1. Initial session establishment
         - GET homepage to obtain session cookie
         - Extract CSRF token if present
      
      2. Search execution
         - POST to search endpoint with form data
         - Handle pagination (usually 20-50 results/page)
         - Extract property detail URLs
      
      3. Detail page scraping
         - Visit each property URL
         - Parse structured data tables
         - Extract owner, value, tax history tabs
      
      4. Data extraction patterns
         - Look for <table> elements with consistent structure
         - Key-value pairs in <td> elements
         - Tab-based navigation for different data sections
    `,
    
    selectors: {
      searchForm: '#property-search-form',
      resultsTable: '.results-table tbody tr',
      propertyLink: 'a.property-link',
      ownerName: '#owner-information .owner-name',
      assessedValue: '#values .assessed-value',
      taxAmount: '#tax-information .total-tax'
    },
    
    challenges: [
      'Session timeout (usually 20 minutes)',
      'CAPTCHA on too many requests',
      'JavaScript-rendered search results'
    ],
    
    solutions: {
      sessionTimeout: 'Refresh session every 15 minutes',
      captcha: 'Implement 2captcha integration or reduce rate',
      jsRendering: 'Use Puppeteer for search, Cheerio for details'
    }
  }
};
```

### 2. MLS/Real Estate Listing Strategy

```javascript
const MLSStrategy = {
  // Public listing sites strategy
  approach: 'API_FIRST_FALLBACK_SCRAPE',
  
  sources: {
    'har.com': {
      type: 'AJAX_API',
      implementation: `
        1. Reverse engineer AJAX calls
           - Use browser DevTools Network tab
           - Find JSON API endpoints
           - Replicate with proper headers
        
        2. API endpoint patterns
           GET /api/v2/listings?
             type=commercial&
             minPrice=100000&
             maxPrice=5000000&
             page=1&
             limit=50
        
        3. Authentication
           - Usually requires API key in header
           - May need user agent spoofing
           - Session-based rate limiting
      `,
      
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
        'Accept': 'application/json',
        'Referer': 'https://www.har.com/'
      }
    },
    
    'loopnet.com': {
      type: 'PROGRESSIVE_ENHANCEMENT',
      implementation: `
        1. Initial HTML contains basic data
        2. JavaScript enhances with full details
        3. Strategy:
           - Scrape initial HTML for listings
           - Use Puppeteer for detailed pages
           - Cache property IDs to avoid re-scraping
      `
    }
  },
  
  dataMapping: {
    listingId: ['mlsNumber', 'listingId', 'id'],
    price: ['listPrice', 'askingPrice', 'price'],
    address: ['address', 'location.address'],
    photos: ['photos', 'images', 'media.photos']
  }
};
```

### 3. Zoning & Planning Data Strategy

```javascript
const ZoningStrategy = {
  approach: 'DOCUMENT_PARSING',
  
  implementation: `
    1. Municipal websites often have:
       - Interactive GIS maps (ArcGIS)
       - PDF zoning ordinances
       - Excel/CSV data downloads
    
    2. GIS API exploitation
       - Find ArcGIS REST endpoints
       - Query by coordinates or parcel
       - Extract zoning classifications
    
    3. PDF parsing strategy
       - Download zoning maps/ordinances
       - Extract text with pdf-parse
       - Use regex for zoning codes
       - OCR if needed (Tesseract.js)
  `,
  
  austinExample: {
    gisEndpoint: 'https://services.arcgis.com/[id]/arcgis/rest/services/Zoning/query',
    queryParams: {
      where: '1=1',
      outFields: '*',
      f: 'json',
      geometryType: 'esriGeometryPoint',
      spatialRel: 'esriSpatialRelIntersects'
    }
  }
};
```

### 4. Water Rights & Utility Strategy

```javascript
const UtilityStrategy = {
  approach: 'MULTI_SOURCE_AGGREGATION',
  
  sources: {
    lcra: {
      type: 'STRUCTURED_DATA',
      url: 'https://www.lcra.org/water/water-supply/water-availability',
      method: 'TABLE_PARSING'
    },
    
    groundwaterDistricts: {
      type: 'API_AND_DOCUMENTS',
      implementation: `
        1. Each district has different systems
        2. Common patterns:
           - Well permit databases (searchable)
           - PDF permit documents
           - GIS shape files for boundaries
        3. Aggregate from multiple districts
      `
    }
  }
};
```

## Implementation Patterns

### 1. Base Scraper Enhancement

```javascript
// Enhanced base scraper with specific strategies
const { BaseScraper } = require('./baseScraper');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer');
const got = require('got');
const pQueue = require('p-queue').default;

class EnhancedBaseScraper extends BaseScraper {
  constructor(options = {}) {
    super(options);
    
    // HTTP client with defaults
    this.httpClient = got.extend({
      timeout: 30000,
      retry: {
        limit: 3,
        methods: ['GET', 'POST'],
        statusCodes: [408, 413, 429, 500, 502, 503, 504]
      },
      hooks: {
        beforeRetry: [
          (options, error, retryCount) => {
            console.log(`[${this.constructor.name}] Retry ${retryCount} for ${options.url}`);
          }
        ]
      }
    });
    
    // Queue for managing concurrent operations
    this.queue = new pQueue({ 
      concurrency: options.concurrency || 2,
      interval: 1000,
      intervalCap: options.requestsPerSecond || 1
    });
    
    // Browser instance for JavaScript-heavy sites
    this.browser = null;
  }
  
  async initBrowser() {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-extensions'
        ]
      });
    }
    return this.browser;
  }
  
  async scrapeStatic(url, selectors) {
    const response = await this.httpClient(url);
    const $ = cheerio.load(response.body);
    
    const data = {};
    for (const [key, selector] of Object.entries(selectors)) {
      data[key] = $(selector).text().trim();
    }
    
    return data;
  }
  
  async scrapeDynamic(url, selectors, waitFor = null) {
    const browser = await this.initBrowser();
    const page = await browser.newPage();
    
    try {
      await page.goto(url, { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      });
      
      if (waitFor) {
        await page.waitForSelector(waitFor, { timeout: 10000 });
      }
      
      const data = await page.evaluate((selectors) => {
        const result = {};
        for (const [key, selector] of Object.entries(selectors)) {
          const element = document.querySelector(selector);
          result[key] = element ? element.textContent.trim() : null;
        }
        return result;
      }, selectors);
      
      return data;
    } finally {
      await page.close();
    }
  }
  
  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}
```

### 2. County-Specific Scraper Example

```javascript
class TravisCADScraper extends EnhancedBaseScraper {
  constructor() {
    super({
      concurrency: 1, // Respectful scraping
      requestsPerSecond: 0.5
    });
    
    this.baseUrl = 'https://traviscad.org';
    this.session = null;
  }
  
  async initSession() {
    // Get homepage for session cookie
    const response = await this.httpClient(`${this.baseUrl}/`);
    
    // Extract session from cookies
    const cookies = response.headers['set-cookie'];
    this.session = this.extractSessionCookie(cookies);
    
    console.log('[TravisCADScraper] Session initialized');
  }
  
  async searchByAddress(address) {
    if (!this.session) {
      await this.initSession();
    }
    
    const searchUrl = `${this.baseUrl}/property-search/search-by-address`;
    
    const response = await this.httpClient.post(searchUrl, {
      form: {
        'search[address]': address,
        'search[city]': '',
        'search[zip]': ''
      },
      headers: {
        'Cookie': `PHPSESSID=${this.session}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    
    const $ = cheerio.load(response.body);
    const results = [];
    
    $('.results-table tbody tr').each((i, elem) => {
      const $row = $(elem);
      results.push({
        propertyId: $row.find('.property-id').text().trim(),
        owner: $row.find('.owner-name').text().trim(),
        address: $row.find('.property-address').text().trim(),
        detailUrl: this.baseUrl + $row.find('a.details-link').attr('href')
      });
    });
    
    return results;
  }
  
  async getPropertyDetails(propertyId) {
    const detailUrl = `${this.baseUrl}/property-detail/${propertyId}`;
    
    // This page likely needs JavaScript
    const browser = await this.initBrowser();
    const page = await browser.newPage();
    
    try {
      if (this.session) {
        await page.setCookie({
          name: 'PHPSESSID',
          value: this.session,
          domain: 'traviscad.org'
        });
      }
      
      await page.goto(detailUrl, { waitUntil: 'networkidle2' });
      
      // Wait for data tables to load
      await page.waitForSelector('#property-details', { timeout: 10000 });
      
      const details = await page.evaluate(() => {
        const getText = (selector) => {
          const elem = document.querySelector(selector);
          return elem ? elem.textContent.trim() : null;
        };
        
        return {
          // Basic Information
          propertyId: getText('#property-id'),
          legalDescription: getText('#legal-description'),
          
          // Ownership
          ownerName: getText('#owner-name'),
          mailingAddress: getText('#mailing-address'),
          
          // Values
          landValue: getText('#land-value'),
          improvementValue: getText('#improvement-value'),
          marketValue: getText('#market-value'),
          assessedValue: getText('#assessed-value'),
          
          // Property Details
          acres: getText('#acres'),
          squareFeet: getText('#square-feet'),
          yearBuilt: getText('#year-built'),
          
          // Tax Information
          taxableValue: getText('#taxable-value'),
          taxes: getText('#total-taxes'),
          exemptions: Array.from(document.querySelectorAll('.exemption-row')).map(row => ({
            type: row.querySelector('.exemption-type')?.textContent.trim(),
            amount: row.querySelector('.exemption-amount')?.textContent.trim()
          }))
        };
      });
      
      return details;
    } finally {
      await page.close();
    }
  }
}
```

### 3. Task Queue Implementation

```javascript
const { CloudTasksClient } = require('@google-cloud/tasks');
const { v4: uuidv4 } = require('uuid');

class ScrapingTaskManager {
  constructor(projectId, location) {
    this.client = new CloudTasksClient();
    this.projectId = projectId;
    this.location = location;
    
    this.queues = {
      high: `projects/${projectId}/locations/${location}/queues/scraping-high-priority`,
      normal: `projects/${projectId}/locations/${location}/queues/scraping-normal`,
      low: `projects/${projectId}/locations/${location}/queues/scraping-low-priority`
    };
  }
  
  async createScrapingTask(taskData, priority = 'normal') {
    const parent = this.queues[priority];
    
    const task = {
      httpRequest: {
        httpMethod: 'POST',
        url: `https://${this.location}-${this.projectId}.cloudfunctions.net/quin/scrape`,
        headers: {
          'Content-Type': 'application/json',
        },
        body: Buffer.from(JSON.stringify({
          taskId: uuidv4(),
          ...taskData
        })).toString('base64'),
      },
      scheduleTime: {
        seconds: Date.now() / 1000 + (taskData.delay || 0),
      }
    };
    
    const request = {
      parent,
      task
    };
    
    const [response] = await this.client.createTask(request);
    console.log('[ScrapingTaskManager] Task created:', response.name);
    
    return response;
  }
  
  async createBatchScrape(source, options = {}) {
    const batchId = uuidv4();
    const tasks = [];
    
    // Example: Create tasks for each county
    const counties = ['Travis', 'Hays', 'Williamson', 'Comal', 'Bexar'];
    
    for (let i = 0; i < counties.length; i++) {
      const task = await this.createScrapingTask({
        type: 'county_scrape',
        source,
        county: counties[i],
        batchId,
        delay: i * 60, // Stagger by 1 minute
        ...options
      });
      
      tasks.push(task);
    }
    
    return { batchId, tasks };
  }
}
```

### 4. Data Quality Monitoring

```javascript
class DataQualityMonitor {
  constructor(db) {
    this.db = db;
  }
  
  async analyzePropertyData(property) {
    const issues = [];
    const scores = {};
    
    // Completeness check
    const requiredFields = [
      'parcelId', 'address.street', 'address.county',
      'pricing.assessedValue', 'details.acreage'
    ];
    
    let completeFields = 0;
    for (const field of requiredFields) {
      if (this.getNestedValue(property, field)) {
        completeFields++;
      } else {
        issues.push({
          type: 'missing_field',
          field,
          severity: 'medium'
        });
      }
    }
    
    scores.completeness = completeFields / requiredFields.length;
    
    // Price anomaly detection
    if (property.pricing?.assessedValue) {
      const value = property.pricing.assessedValue;
      const acreage = property.details?.acreage || 1;
      const pricePerAcre = value / acreage;
      
      // Simple outlier detection (customize based on market data)
      if (pricePerAcre < 1000 || pricePerAcre > 1000000) {
        issues.push({
          type: 'price_anomaly',
          field: 'pricing.assessedValue',
          value: value,
          pricePerAcre,
          severity: 'high'
        });
        scores.pricing = 0.5;
      } else {
        scores.pricing = 1.0;
      }
    }
    
    // Address validation
    if (property.address?.coordinates) {
      const { latitude, longitude } = property.address.coordinates;
      
      // Central Texas bounds check
      if (latitude < 29.0 || latitude > 31.0 || 
          longitude < -99.0 || longitude > -97.0) {
        issues.push({
          type: 'invalid_coordinates',
          field: 'address.coordinates',
          value: { latitude, longitude },
          severity: 'high'
        });
        scores.location = 0;
      } else {
        scores.location = 1.0;
      }
    }
    
    // Calculate overall quality score
    const overallScore = Object.values(scores).reduce((a, b) => a + b, 0) / 
                        Object.keys(scores).length;
    
    return {
      propertyId: property.id,
      score: overallScore,
      scores,
      issues,
      timestamp: new Date().toISOString()
    };
  }
  
  async generateDailyReport(source) {
    const today = new Date().toISOString().split('T')[0];
    
    // Query properties scraped today from this source
    const snapshot = await this.db
      .collection('properties')
      .where(`sources.${source}.lastScraped`, '>=', today)
      .get();
    
    const results = {
      date: today,
      source,
      totalProperties: snapshot.size,
      qualityScores: [],
      issues: {
        missing_field: 0,
        price_anomaly: 0,
        invalid_coordinates: 0
      }
    };
    
    for (const doc of snapshot.docs) {
      const analysis = await this.analyzePropertyData(doc.data());
      results.qualityScores.push(analysis.score);
      
      for (const issue of analysis.issues) {
        results.issues[issue.type]++;
      }
    }
    
    results.averageQualityScore = 
      results.qualityScores.reduce((a, b) => a + b, 0) / results.qualityScores.length;
    
    // Save report
    await this.db.collection('dataQuality').add(results);
    
    return results;
  }
  
  getNestedValue(obj, path) {
    return path.split('.').reduce((curr, part) => curr?.[part], obj);
  }
}
```

## Performance & Scaling Strategies

### 1. Function Memory & Timeout Optimization

```javascript
// In your function configuration
module.exports = {
  quin: functions
    .runWith({
      memory: '2GB', // Increase for Puppeteer
      timeoutSeconds: 540, // 9 minutes max
      maxInstances: 100 // Parallel execution
    })
    .https.onRequest(app)
};
```

### 2. Caching Strategy

```javascript
const NodeCache = require('node-cache');

class ScrapingCache {
  constructor() {
    // In-memory cache for function instance
    this.cache = new NodeCache({ 
      stdTTL: 3600, // 1 hour default
      checkperiod: 120 
    });
  }
  
  async getOrFetch(key, fetchFunction, ttl = 3600) {
    const cached = this.cache.get(key);
    if (cached) {
      console.log(`[Cache] Hit for ${key}`);
      return cached;
    }
    
    console.log(`[Cache] Miss for ${key}, fetching...`);
    const data = await fetchFunction();
    
    this.cache.set(key, data, ttl);
    return data;
  }
  
  // Use for session management
  async getSession(source) {
    return this.getOrFetch(
      `session_${source}`,
      async () => await this.initializeSession(source),
      900 // 15 minutes
    );
  }
}
```

### 3. Distributed Scraping Pattern

```javascript
class DistributedScraper {
  async scrapeCountyInBatches(county, batchSize = 100) {
    const totalProperties = await this.getPropertyCount(county);
    const batches = Math.ceil(totalProperties / batchSize);
    
    const tasks = [];
    
    for (let i = 0; i < batches; i++) {
      const task = {
        type: 'BATCH_SCRAPE',
        source: county,
        offset: i * batchSize,
        limit: batchSize,
        batchNumber: i + 1,
        totalBatches: batches
      };
      
      // Queue the task
      await this.taskManager.createScrapingTask(task, 'normal');
      tasks.push(task);
    }
    
    return {
      county,
      totalProperties,
      batches: tasks.length,
      estimatedTime: tasks.length * 2 // minutes
    };
  }
}
```

### 4. Error Recovery Pattern

```javascript
class ResilientScraper {
  async scrapeWithRecovery(url, options = {}) {
    const maxRetries = options.maxRetries || 3;
    const errors = [];
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Check circuit breaker
        if (await this.isCircuitOpen(url)) {
          throw new Error('Circuit breaker open for this source');
        }
        
        const result = await this.performScrape(url, options);
        
        // Reset circuit breaker on success
        await this.recordSuccess(url);
        
        return result;
      } catch (error) {
        errors.push({
          attempt,
          error: error.message,
          timestamp: new Date().toISOString()
        });
        
        await this.recordFailure(url, error);
        
        if (attempt < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
          console.log(`[ResilientScraper] Retry ${attempt} after ${delay}ms`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    // Save to dead letter queue
    await this.saveToDeadLetter({
      url,
      options,
      errors,
      timestamp: new Date().toISOString()
    });
    
    throw new Error(`Failed after ${maxRetries} attempts: ${errors[errors.length - 1].error}`);
  }
  
  async isCircuitOpen(source) {
    const state = await this.getCircuitState(source);
    return state.failures > 5 && Date.now() - state.lastFailure < 300000; // 5 minutes
  }
}
```

This comprehensive guide provides specific implementation details for building a production-grade web scraping engine integrated with your Quin infrastructure.
