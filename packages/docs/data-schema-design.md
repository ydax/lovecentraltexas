# Central Texas Data Schema Design

## Overview

This document defines the Firestore database schema for the Central Texas Infrastructure Engine. The schema is designed to support high-performance queries for programmatic SEO pages, lead generation, and market intelligence.

## Collection Structure

### 1. `landParcels` - Land Parcel Listings

**Purpose**: Store commercial and agricultural land parcels with detailed property characteristics.

**Document Structure**:
```typescript
{
  id: string,                    // Auto-generated document ID
  parcelId: string,              // Unique identifier from source system
  source: string,                // Source system (e.g., "hays-county-assessor", "mls")
  sourceUrl: string,             // Original listing URL
  
  // Location
  address: {
    street: string,
    city: string,
    county: string,              // e.g., "Hays", "Travis", "Williamson"
    state: string,               // "TX"
    zipCode: string,
    coordinates: {
      latitude: number,
      longitude: number
    }
  },
  
  // Property Details
  acreage: number,               // Total acres
  squareFeet: number,            // Total square feet (if applicable)
  price: number,                 // Asking price
  pricePerAcre: number,          // Calculated field
  pricePerSquareFoot: number,    // Calculated field
  
  // Zoning and Land Use
  zoning: string,                // e.g., "Agricultural", "Commercial", "Industrial"
  landUse: string,               // Current use classification
  zoningRestrictions: string[],  // Array of restrictions
  
  // Water and Utilities
  waterRights: {
    hasRights: boolean,
    type: string,                // e.g., "Groundwater", "Surface Water", "Municipal"
    details: string
  },
  utilities: {
    electricity: boolean,
    naturalGas: boolean,
    water: boolean,
    sewer: boolean,
    internet: boolean,
    notes: string
  },
  
  // Access and Infrastructure
  roadAccess: string,            // e.g., "Paved", "Gravel", "Dirt"
  proximityToHighway: {
    distance: number,           // Miles
    highway: string              // e.g., "I-35", "US-290"
  },
  
  // Additional Features
  features: string[],            // e.g., ["River Frontage", "Mature Trees", "Fenced"]
  improvements: string[],        // Existing structures
  
  // Market Data
  daysOnMarket: number,
  listingDate: timestamp,
  lastUpdated: timestamp,
  status: string,               // "active", "pending", "sold", "off-market"
  
  // SEO and Content
  seoSlug: string,               // URL-friendly identifier
  description: string,           // Generated property description
  keywords: string[],            // SEO keywords
  
  // Metadata
  createdAt: timestamp,
  updatedAt: timestamp,
  scrapedAt: timestamp,
  dataQuality: {
    completeness: number,        // 0-100 score
    lastValidated: timestamp
  }
}
```

**Indexes Required**:
- `county` (ascending) + `status` (ascending) + `price` (ascending)
- `zoning` (ascending) + `acreage` (ascending) + `price` (ascending)
- `coordinates` (geopoint) + `status` (ascending)
- `price` (ascending) + `acreage` (ascending)
- `status` (ascending) + `listingDate` (descending)

---

### 2. `commercialProperties` - Commercial Real Estate

**Purpose**: Store commercial properties including office buildings, retail spaces, warehouses, and mixed-use developments.

**Document Structure**:
```typescript
{
  id: string,
  propertyId: string,
  source: string,
  sourceUrl: string,
  
  // Location
  address: {
    street: string,
    city: string,
    county: string,
    state: string,
    zipCode: string,
    coordinates: {
      latitude: number,
      longitude: number
    }
  },
  
  // Property Details
  propertyType: string,         // "Office", "Retail", "Warehouse", "Mixed-Use", "Industrial"
  totalSquareFeet: number,
  lotSize: number,              // Square feet
  buildingSquareFeet: number,
  price: number,
  pricePerSquareFoot: number,   // Calculated
  
  // Zoning
  zoning: string,
  zoningType: string,           // More specific zoning code
  permittedUses: string[],
  
  // Infrastructure Proximity
  proximityToInfrastructure: {
    highway: {
      distance: number,
      highway: string
    },
    airport: {
      distance: number,
      airport: string
    },
    port: {
      distance: number,
      port: string
    },
    rail: {
      hasAccess: boolean,
      distance: number
    }
  },
  
  // Building Features
  yearBuilt: number,
  yearRenovated: number,
  floors: number,
  parkingSpaces: number,
  loadingDocks: number,
  ceilingHeight: number,        // Feet
  
  // Utilities and Systems
  utilities: {
    electricity: {
      capacity: string,         // e.g., "200A", "3-phase"
      provider: string
    },
    hvac: string,               // Type of HVAC system
    sprinkler: boolean,
    fireSuppression: boolean
  },
  
  // Financials
  capRate: number,              // If investment property
  noi: number,                  // Net Operating Income
  occupancyRate: number,
  
  // Market Data
  daysOnMarket: number,
  listingDate: timestamp,
  lastUpdated: timestamp,
  status: string,
  
  // SEO
  seoSlug: string,
  description: string,
  keywords: string[],
  
  // Metadata
  createdAt: timestamp,
  updatedAt: timestamp,
  scrapedAt: timestamp,
  dataQuality: {
    completeness: number,
    lastValidated: timestamp
  }
}
```

**Indexes Required**:
- `county` (ascending) + `propertyType` (ascending) + `price` (ascending)
- `zoning` (ascending) + `totalSquareFeet` (ascending) + `price` (ascending)
- `coordinates` (geopoint) + `status` (ascending)
- `propertyType` (ascending) + `price` (ascending) + `listingDate` (descending)
- `status` (ascending) + `listingDate` (descending)

---

### 3. `residentialLuxuryProperties` - Luxury Residential Properties

**Purpose**: Store high-end residential properties targeting affluent buyers.

**Document Structure**:
```typescript
{
  id: string,
  propertyId: string,
  source: string,
  sourceUrl: string,
  
  // Location
  address: {
    street: string,
    city: string,
    county: string,
    state: string,
    zipCode: string,
    neighborhood: string,       // e.g., "Westlake", "Lakeway"
    coordinates: {
      latitude: number,
      longitude: number
    }
  },
  
  // Property Details
  propertyType: string,         // "Single Family", "Estate", "Ranch", "Waterfront"
  bedrooms: number,
  bathrooms: number,
  squareFeet: number,
  lotSize: number,              // Acres
  yearBuilt: number,
  price: number,
  pricePerSquareFoot: number,
  
  // Amenities
  amenities: string[],         // e.g., ["Pool", "Guest House", "Wine Cellar", "Home Theater"]
  outdoorFeatures: string[],   // e.g., ["Pool", "Tennis Court", "Stable", "Boat Dock"]
  interiorFeatures: string[],  // e.g., ["Hardwood Floors", "Granite Countertops", "Smart Home"]
  
  // School Districts
  schoolDistricts: {
    elementary: string,
    middle: string,
    high: string,
    ratings: {
      elementary: number,      // 1-10 rating
      middle: number,
      high: number
    }
  },
  
  // Water and Land Features
  waterFeatures: {
    hasWaterfront: boolean,
    type: string,              // "Lake", "River", "Creek", "Pond"
    frontage: number            // Linear feet
  },
  views: string[],             // e.g., ["Hill Country", "Lake", "City Skyline"]
  
  // Market Data
  daysOnMarket: number,
  listingDate: timestamp,
  lastUpdated: timestamp,
  status: string,
  priceHistory: Array<{        // Price change tracking
    date: timestamp,
    price: number,
    event: string               // "Listed", "Price Reduced", "Price Increased"
  }>,
  
  // SEO
  seoSlug: string,
  description: string,
  keywords: string[],
  
  // Metadata
  createdAt: timestamp,
  updatedAt: timestamp,
  scrapedAt: timestamp,
  dataQuality: {
    completeness: number,
    lastValidated: timestamp
  }
}
```

**Indexes Required**:
- `county` (ascending) + `price` (ascending) + `lotSize` (ascending)
- `neighborhood` (ascending) + `price` (ascending) + `listingDate` (descending)
- `coordinates` (geopoint) + `status` (ascending)
- `bedrooms` (ascending) + `bathrooms` (ascending) + `price` (ascending)
- `status` (ascending) + `listingDate` (descending)

---

### 4. `geographicMetadata` - Geographic Reference Data

**Purpose**: Store normalized geographic data for counties, cities, neighborhoods, and landmarks.

**Document Structure**:
```typescript
{
  id: string,                  // e.g., "hays-county" or "austin-city"
  type: string,                // "county", "city", "neighborhood", "landmark"
  name: string,
  
  // Hierarchy
  parentId: string,            // Reference to parent (e.g., city -> county)
  path: string[],              // Full path: ["Texas", "Hays County", "Austin"]
  
  // Location
  coordinates: {
    latitude: number,
    longitude: number
  },
  boundingBox: {
    northeast: { lat: number, lng: number },
    southwest: { lat: number, lng: number }
  },
  
  // Demographics (for counties/cities)
  demographics: {
    population: number,
    medianIncome: number,
    growthRate: number,        // Annual percentage
    medianAge: number
  },
  
  // Market Statistics
  marketStats: {
    averagePrice: number,
    medianPrice: number,
    pricePerSquareFoot: number,
    inventoryCount: number,
    daysOnMarket: number,
    lastUpdated: timestamp
  },
  
  // SEO
  seoSlug: string,
  description: string,
  keywords: string[],
  
  // Metadata
  createdAt: timestamp,
  updatedAt: timestamp
}
```

**Indexes Required**:
- `type` (ascending) + `name` (ascending)
- `parentId` (ascending) + `type` (ascending)
- `coordinates` (geopoint)

---

### 5. `marketTrends` - Market Trends and Pricing Data

**Purpose**: Store historical market trends, pricing data, and analytics.

**Document Structure**:
```typescript
{
  id: string,
  geographicScope: {
    type: string,              // "county", "city", "neighborhood", "region"
    identifier: string,        // Reference to geographicMetadata
    name: string
  },
  propertyType: string,        // "land", "commercial", "residential"
  
  // Time Period
  period: {
    startDate: timestamp,
    endDate: timestamp,
    type: string               // "daily", "weekly", "monthly", "quarterly", "yearly"
  },
  
  // Pricing Trends
  pricing: {
    averagePrice: number,
    medianPrice: number,
    minPrice: number,
    maxPrice: number,
    pricePerSquareFoot: number,
    priceChange: number,       // Percentage change from previous period
    priceChangeAmount: number
  },
  
  // Market Activity
  activity: {
    newListings: number,
    soldProperties: number,
    pendingSales: number,
    expiredListings: number,
    inventoryCount: number,
    daysOnMarket: number
  },
  
  // Volume Metrics
  volume: {
    totalSalesVolume: number,
    averageSalePrice: number,
    medianSalePrice: number
  },
  
  // Calculated Metrics
  metrics: {
    absorptionRate: number,    // Months of inventory
    saleToListRatio: number,   // Percentage
    priceAppreciation: number  // Year-over-year percentage
  },
  
  // Metadata
  createdAt: timestamp,
  updatedAt: timestamp,
  dataSource: string
}
```

**Indexes Required**:
- `geographicScope.identifier` (ascending) + `propertyType` (ascending) + `period.endDate` (descending)
- `propertyType` (ascending) + `period.endDate` (descending)
- `period.type` (ascending) + `period.endDate` (descending)

---

## Data Relationships

### Referential Integrity

- `landParcels.address.county` → `geographicMetadata` (where type="county")
- `commercialProperties.address.county` → `geographicMetadata` (where type="county")
- `residentialLuxuryProperties.address.county` → `geographicMetadata` (where type="county")
- `marketTrends.geographicScope.identifier` → `geographicMetadata.id`

### Denormalization Strategy

For performance, we denormalize frequently accessed data:
- County names stored directly in property documents (avoid joins)
- Calculated fields (pricePerAcre, pricePerSquareFoot) stored to avoid runtime calculations
- Market statistics cached in `geographicMetadata` for quick access

---

## Data Quality and Validation

### Required Fields

Each property document must have:
- `id`, `source`, `address.county`, `price`, `status`, `createdAt`, `updatedAt`

### Validation Rules

- `price` must be > 0
- `coordinates.latitude` must be between 29.0 and 31.0 (Central Texas bounds)
- `coordinates.longitude` must be between -99.0 and -97.0
- `status` must be one of: "active", "pending", "sold", "off-market"
- `dataQuality.completeness` must be between 0 and 100

### Data Quality Scoring

Completeness score calculation:
- Required fields present: 40 points
- Location data complete: 20 points
- Property details complete: 20 points
- Market data present: 10 points
- SEO content generated: 10 points

---

## Query Patterns

### Common Queries

1. **Find land parcels by county and price range**:
   ```
   landParcels
     .where('address.county', '==', 'Hays')
     .where('status', '==', 'active')
     .where('price', '>=', minPrice)
     .where('price', '<=', maxPrice)
     .orderBy('price', 'asc')
   ```

2. **Find commercial properties near coordinates**:
   ```
   commercialProperties
     .where('coordinates', '>=', southwestBound)
     .where('coordinates', '<=', northeastBound)
     .where('status', '==', 'active')
   ```

3. **Get market trends for a county**:
   ```
   marketTrends
     .where('geographicScope.identifier', '==', 'hays-county')
     .where('propertyType', '==', 'land')
     .orderBy('period.endDate', 'desc')
     .limit(12)
   ```

---

## Migration and Versioning

### Schema Versioning

Each document includes a `schemaVersion` field to support future migrations:
- Current version: `1.0`
- Migration scripts will update documents to new versions

### Data Retention

- Active listings: Keep indefinitely
- Sold/Off-market: Archive after 2 years
- Market trends: Keep all historical data

---

## Performance Considerations

### Indexing Strategy

- Composite indexes for common query patterns
- Single-field indexes for frequently filtered fields
- Geospatial indexes for location-based queries

### Pagination

- Use cursor-based pagination with `startAfter()` for large result sets
- Default page size: 20 documents
- Maximum page size: 100 documents

### Caching

- Geographic metadata cached in memory (rarely changes)
- Market trends cached for 1 hour
- Property listings cached for 5 minutes

---

## Security Rules

See `firestore.rules` for detailed security rules. General principles:
- Property data: Read-only for public, write-only for authenticated scrapers
- Geographic metadata: Public read, admin write
- Market trends: Public read, admin write

