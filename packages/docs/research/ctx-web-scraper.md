

# **Production-Grade Serverless Web Scraping Architecture for CentralTexas.com**

## **1\. Executive Architectural Vision**

The objective of establishing a robust, scalable, and legally compliant web scraping engine for CentralTexas.com represents a sophisticated engineering challenge that sits at the intersection of distributed systems, data governance, and regional real estate intelligence. The mandate to ingest, normalize, and analyze over 100,000 property records from a fragmented landscape of Central Texas county tax assessors, municipal zoning boards, and infrastructure agencies requires a paradigm shift away from monolithic script execution toward a highly modular, event-driven serverless architecture. The technical environment, predicated on Firebase Cloud Functions v2 and the Google Genkit AI framework, offers a potent foundation for this undertaking, provided that the inherent statelessness and ephemeral nature of serverless compute are rigorously managed through architectural patterns designed for resilience and observability.

To achieve the requisite 99% uptime and data fidelity while adhering to a stringent operational budget of under $500 per month, the proposed system architecture abandons the traditional concept of a "long-running scraper" in favor of a high-concurrency "fan-out" pattern orchestrated via Google Cloud Tasks. This approach decouples the identification of work from the execution of extraction, allowing the system to respect the distinct rate limits and technical constraints of heterogeneous data sources—ranging from the Single Page Applications (SPAs) of Travis County’s True Prodigy system to the static bulk exports of Williamson County. Furthermore, the integration of Generative AI via Genkit and the Model Context Protocol (MCP) transforms the extraction pipeline from a brittle, selector-dependent process into a semantic understanding engine capable of structuring unstructured government documents, zoning meeting minutes, and complex legal descriptions with high precision.

The following comprehensive analysis delineates the optimal architectural strategies, tooling decisions, and operational protocols required to construct this engine. It prioritizes a "low-and-slow" extraction philosophy to maintain strict compliance with the Texas Public Information Act and the Texas Penal Code, safeguarding the long-term viability of the platform against IP blocking and legal exposure. By leveraging the specific capabilities of Node.js 20, Playwright, and Google Cloud’s observability stack, CentralTexas.com can establish a proprietary data moat that powers programmatic SEO and asset liquidity analysis with unparalleled depth and reliability.

---

## **2\. Serverless Architecture and Distributed Design Patterns**

The fundamental constraint of scraping at scale within a serverless environment is the limitation on execution duration and memory persistence. While Firebase Cloud Functions (2nd Gen) allow for extended timeouts up to 60 minutes 1, relying on long-running function invocations to process thousands of records sequentially is an architectural anti-pattern that introduces fragility, complicates error recovery, and increases the risk of memory leaks crashing the runtime. To scrape 100,000+ records reliably, the architecture must fundamentally separate the concern of *scheduling* from the concern of *extraction*.

### **2.1 The Orchestrator-Worker Pattern**

The optimal design for this workload utilizes a "Fan-Out" architecture, specifically the Orchestrator-Worker pattern, which leverages the asynchronous capabilities of Google Cloud Tasks to manage state and concurrency. In this model, a central "Orchestrator" function is triggered by Cloud Scheduler (e.g., nightly at 2:00 AM CST). This function does not perform any scraping itself. Instead, its sole responsibility is to determine the *scope* of the job—identifying which county subdivisions, property ID ranges, or map tiles require updates—and then dividing this scope into discrete, independent units of work.

For a target like the Travis Central Appraisal District (TCAD), the Orchestrator might generate 2,000 individual tasks, each containing a payload of 50 property IDs. these tasks are then enqueued into a specific Cloud Task queue configured with precise rate limits.2 This decoupling allows the "Worker" function to remain lightweight, stateless, and focused on a single responsibility: processing its assigned batch. If a Worker function fails due to a transient network error or a website timeout, the failure is isolated to that specific batch. Cloud Tasks automatically handles the retry logic with exponential backoff, ensuring that a single failure does not derail the entire scraping pipeline.2 This granularity is essential for maintaining the "exactly-once" processing semantic required to prevent database corruption or duplicate billing for proxy usage.

### **2.2 State Management in a Stateless Environment**

In a serverless environment where function instances are spun up and down on demand, maintaining a persistent view of the global scraping state is critical. The architecture cannot rely on in-memory variables to track which pages have been visited. Instead, Firestore must serve as the immutable source of truth for job status. The recommended approach involves a scraping\_jobs collection where each document represents a high-level job run (e.g., "Travis\_Daily\_Update\_2025-10-27").

Within this schema, the Orchestrator initializes the job document with a status of PENDING and a total task count. As Worker functions complete their batches, they update their specific task status in a sub-collection or a highly sharded counter. This creates a robust checkpointing mechanism. If the operation is interrupted or if a deployment forces a cold start, the Orchestrator can query Firestore to identify unprocessed ranges and resume operations without redundant scraping.4 Ideally, the Worker functions should be idempotent; processing the same property ID twice should result in the same database state, preventing data duplication in the event that a task is retried by Cloud Tasks after a successful write but a failed acknowledgement.4

### **2.3 Asynchronous Processing of Long-Running Jobs**

Certain data sources, specifically the bulk export files provided by Williamson Central Appraisal District (WCAD), present a different challenge: processing massive datasets that cannot be easily "fanned out" via HTTP requests. WCAD provides certified appraisal rolls in .txt or .mdb (Microsoft Access) formats that can exceed several hundred megabytes.5 Attempting to download and parse these files within a single function invocation risks exceeding the 1GiB memory limit of the standard Gen 2 function profile.

The solution lies in utilizing Google Cloud Storage (GCS) as an intermediate staging area. The ingestion function should perform a streaming download of the file directly to a private GCS bucket, bypassing the function's memory heap. Once the file is secured in storage, a GCS onFinalize trigger spawns a processing function. This processor utilizes Node.js streams (e.g., the stream module or csv-parser) to read the file chunk by chunk, transforming and writing records to Firestore in batches.1 This streaming architecture ensures that memory usage remains constant regardless of the input file size, adhering to the rigorous resource constraints of the serverless environment.

### **2.4 Architectural Component Summary**

The interaction between these components defines the system's resilience. The table below outlines the specific roles and configurations for each architectural element within the CentralTexas.com scraping engine.

| Component | Service | Configuration Strategy | Primary Responsibility |
| :---- | :---- | :---- | :---- |
| **Scheduler** | Cloud Scheduler | Cron syntax (e.g., 0 2 \* \* \*) | Triggers the Orchestrator function at defined intervals (Daily, Weekly, Monthly). |
| **Orchestrator** | Cloud Functions (Gen 2\) | Max Instances: 1, Timeout: 9m | Identifies scope, generates task payloads, and enqueues them into Cloud Tasks. |
| **Task Queue** | Cloud Tasks | Max Dispatches: 1-5/sec, Max Retries: 5 | Manages rate limiting, throttling, and retries for Worker functions. |
| **Worker** | Cloud Functions (Gen 2\) | Memory: 1GiB, Timeout: 60s | Executes the actual scraping logic (Playwright/Cheerio) for a small batch of records. |
| **Storage** | Cloud Storage (GCS) | Standard Class, Lifecycle Rules | Stores raw HTML/PDFs for debugging and bulk CSV/MDB files for processing. |
| **Database** | Firestore | Native Mode | Stores extracted property data, scraping job state, and configuration metadata. |
| **Proxy Manager** | Middleware | Rotation via Provider API | Injected service that rotates IPs per request to prevent blocking. |

---

## **3\. Scraping Techniques and Tooling Ecosystem**

The selection of the scraping runtime library is a critical decision that impacts cost, performance, and reliability. The Node.js ecosystem in 2024-2025 offers several powerful options, but the specific nature of Central Texas government websites—ranging from modern Single Page Applications to legacy ASP.NET portals—dictates a hybrid approach.

### **3.1 The Hybrid Scraping Strategy: Playwright and Cheerio**

While **Playwright** is widely regarded as the superior headless browser automation tool for modern web scraping due to its robust handling of dynamic content and shadow DOMs 6, it is resource-intensive. Launching a headless Chromium instance requires significant CPU and memory, which directly correlates to higher Cloud Function billing costs and slower cold starts.8 Conversely, **Cheerio** is a lightweight, fast HTML parser that runs directly in the Node.js process without a browser, but it cannot execute JavaScript or handle dynamic hydration of data.6

For CentralTexas.com, the recommended approach is a polymorphic ScraperAdapter that selects the appropriate tool based on the target source. For the **Travis Central Appraisal District (True Prodigy)** site, which relies heavily on client-side JavaScript to render property details and search results 10, Playwright is indispensable. It allows the scraper to wait for specific network conditions (networkidle) or DOM elements before extraction. However, for **Water District** sites or bulk data portals that serve static HTML or direct file links, the engine should default to Cheerio combined with a robust HTTP client like got-scraping or axios.7 This "Fast Path" optimization can reduce execution cost by an order of magnitude for simpler targets.

### **3.2 Intelligent Parsing with Genkit and MCP**

A persistent challenge in scraping public records is the brittleness of CSS selectors. Government software vendors frequently update their UI, breaking traditional scrapers that rely on rigid paths like div.content \> table:nth-child(3). To mitigate this, the architecture should leverage the existing "Quin" package and **Google Genkit** to implement semantic extraction.

Instead of writing imperative code to traverse the DOM, the scraper can pass the raw HTML (cleaned of scripts and styles) to a multimodal model like **Gemini 2.0 Flash** via the Genkit SDK. By defining a Zod schema that represents the desired data structure (e.g., PropertySchema), the system can prompt the LLM to "Extract the zoning code, assessed value, and legal description from this HTML and format it according to the schema.".12 This approach is particularly transformative for unstructured data sources found in **City Planning documents** or **Zoning Commission minutes**, where data is often embedded in narrative text or non-standard tables. The use of Genkit enables the extraction of structured data from these "dark data" sources with a level of resilience that regex or Cheerio cannot match.14

### **3.3 Handling Documents and PDFs**

Infrastructure development plans and detailed zoning ordinances are frequently published as PDF documents by entities like **TxDOT** and the **City of Austin**. Standard HTML scrapers are blind to these assets. The engine must incorporate a specialized pipeline for document ingestion. When a Worker function encounters a PDF link, it should stream the document to memory or temporary storage and utilize a library like pdf-parse to extract the raw text layer.

For scanned documents or complex layouts, the text can be fed into Genkit. The integration of Genkit allows for sophisticated queries such as "Summarize the project timeline and budget allocation from this TxDOT project sheet." This capability is essential for the "Infrastructure & Asset Liquidity Engine" component of CentralTexas.com, as it turns static bureaucratic documents into queryable liquidity signals.13 The googleAI plugin within Genkit facilitates this interaction, abstracting the complexity of the Gemini API and allowing for strictly typed outputs via structured generation features.12

### **3.4 Tooling Recommendations and Versions**

To ensure long-term maintainability and compatibility with the Firebase v2 environment, strict adherence to specific library versions and configurations is necessary.

| Technology | Recommended Package/Version | Justification |
| :---- | :---- | :---- |
| **Runtime** | Node.js 20 (LTS) | Native fetch API support, improved performance, and standard Firebase runtime. |
| **Browser Automation** | playwright (v1.40+) | Superior to Puppeteer for modern web features; supports request interception. 6 |
| **HTML Parsing** | cheerio (v1.0.0-rc) | High-performance static parsing; essential for "Fast Path" extraction. 9 |
| **HTTP Client** | got-scraping (v4.0+) | Specialized client that mimics browser TLS fingerprints to avoid blocking. 6 |
| **AI Framework** | genkit (Beta/Latest) | Google's native framework for LLM integration; supports structured output via Zod. 15 |
| **Validation** | zod (v3.22+) | Runtime schema validation; integrates natively with Genkit for structured extraction. |
| **PDF Extraction** | pdf-parse | Lightweight text extraction from PDFs; cleaner than heavy OCR libraries. |

---

## **4\. Deep Dive: Central Texas Data Source Strategies**

The heterogeneity of the data landscape in Central Texas requires distinct strategies for each major data custodian. A monolithic approach will fail; instead, the system must employ bespoke adapters tailored to the specific technical architecture of each agency.

### **4.1 County Tax Assessor-Collectors (CADs)**

Travis Central Appraisal District (TCAD):  
TCAD utilizes software provided by True Prodigy, characterized by a modern, React-based Single Page Application interface (travis.prodigycad.com).10 This platform relies heavily on client-side rendering, meaning the initial HTML response contains little data. The data is populated asynchronously via internal API calls.

* **Strategy:** The most efficient extraction method involves **Reverse Engineering the Internal API**. By using Playwright's network interception capabilities (page.on('response')), the scraper can listen for the JSON payloads returned by the server (typically XHR/Fetch requests) that contain the structured property data.16 This bypasses the need to parse the DOM entirely, resulting in cleaner data and faster execution. If the API endpoints are secured with complex tokens, Playwright can simply render the page and Genkit can parse the visual state.

Williamson Central Appraisal District (WCAD):  
WCAD presents a significant opportunity for efficiency. Unlike Travis County, WCAD provides a Data Download portal that offers the entire certified appraisal roll in .mdb (Microsoft Access) and .txt formats.5

* **Strategy:** **Do not scrape individual property pages.** The Orchestrator should schedule a monthly job to download the full "Certified Appraisal Roll" and "Weekly Updates" files. These files should be processed using the streaming ingestion pattern described in Section 2.3. This approach yields 100% data completeness with near-zero risk of IP blocking or rate limiting.18

Hays, Comal, and Guadalupe Counties:  
These counties typically utilize BIS Consulting or Harris Govern (RealWare) platforms. These systems are often older, server-side rendered applications that use predictable URL parameters (e.g., esearch.hayscad.com/Property/View/12345).19

* **Strategy:** **Sequential ID Iteration.** These databases often use sequential integer IDs for properties. The Orchestrator can generate tasks to iterate through valid ID ranges. Since these are traditional HTML sites, the Cheerio "Fast Path" is the optimal tool, maximizing speed and minimizing cost. BIS sites may implement basic rate limiting, so strictly adhering to the Cloud Tasks rate limits is crucial here.22

### **4.2 MLS Data Feeds (ABoR / ACTRIS)**

Scraping MLS data from public portals (like Zillow or Realtor.com) is fraught with legal peril and technical countermeasures. However, for a legitimate business entity like CentralTexas.com, the **Austin Board of Realtors (ABoR)** and **Unlock MLS** provide sanctioned data access pathways.

* **Strategy:** **Developer API Access.** The recommended approach is to register as a technology vendor or developer through **Bridge Interactive** or the **RESO Web API** provided by Unlock MLS.23 This grants access to a standardized, normalized JSON feed of listing data. This is not scraping in the traditional sense but is the only production-grade method to obtain real-time pricing and listing status without violating Terms of Service or battling sophisticated anti-bot systems.25

### **4.3 Water Districts and Infrastructure**

Lower Colorado River Authority (LCRA):  
The LCRA Hydromet system provides accessible data on lake levels and river flow rates.

* **Strategy:** **Direct CSV Retrieval.** The Hydromet portal exposes endpoints that return data in CSV format (e.g., Rainfall.csv, LakeLevel.csv).26 The scraper needs only to perform a standard HTTP GET request to these endpoints to retrieve the latest hydrological data, which can then be parsed and stored in Firestore.

Edwards Aquifer Authority (EAA):  
The EAA maintains a portal for well registration and groundwater levels.

* **Strategy:** **Geospatial Querying.** The EAA's data is often accessible via map interfaces that interact with backend GIS services. Inspection of the network traffic often reveals **ArcGIS REST API** endpoints or similar geospatial query services that return JSON data for registered wells and sensor readings.27

TxDOT Project Tracker:  
The Texas Department of Transportation provides a Project Tracker for infrastructure developments.

* **Strategy:** **ArcGIS Open Data.** TxDOT publishes this data on their GIS Open Data Portal. The most reliable ingestion method is to download the **File Geodatabase** or **CSV** exports of the "TxDOT DCIS Projects" dataset.29 This dataset contains rich metadata about project stages, budgets, and timelines, which can be spatially joined with property records in the database to generate value-add insights (e.g., "Property is within 1 mile of a funded highway expansion").

---

## **5\. Operational Resilience: Proxy and IP Management**

In a serverless environment, the scraper does not have a persistent IP address; however, repeated requests from the same Google Cloud IP range will inevitably trigger blocks from strict firewalls like those protecting the Travis CAD. A robust proxy management strategy is essential for the "Low-and-Slow" approach.

### **5.1 Proxy Service Selection**

The scraping workload requires a mix of **Datacenter** and **Residential** proxies to balance cost and efficacy.

* **Residential Proxies:** These are IPs assigned to real residential devices (ISPs). They are indistinguishable from normal user traffic and are required for strict targets like **Travis CAD** and **MLS** related sites (if scraping agent sites).  
* **Datacenter Proxies:** These are cheaper, faster IPs hosted in server farms. They are sufficient for lenient sources like **Water Districts**, **Open Data Portals**, and **TxDOT**.

The market analysis suggests **Smartproxy** as the optimal provider for the \<$500/month budget constraint.31 Smartproxy offers a robust pool of residential IPs and a competitive pricing model that fits the projected volume. While **Bright Data** is the industry leader with the largest IP pool, its enterprise pricing often exceeds the budget for early-stage startups unless specific, difficult blocking issues arise that necessitate their advanced "Web Unlocker" technology.33

### **5.2 Rotation Strategies in Node.js**

Since Cloud Functions cannot maintain a persistent connection pool, proxy rotation must be handled at the request level.

* **Session-per-Request:** For stateless scrapes (e.g., hitting a specific property detail URL), the scraper should configure the proxy middleware to rotate the IP on every request. This is typically achieved by randomizing the session ID in the proxy authentication string (e.g., user:pass:session-1234).  
* **Sticky Sessions:** For multi-step workflows (e.g., "Search" \-\> "Click Result" \-\> "Pagination"), the scraper must maintain a "Sticky IP." This is done by holding the same session ID for a duration (e.g., 10 minutes). In the Orchestrator-Worker pattern, the session ID can be generated by the Orchestrator and passed to the Worker in the task payload, ensuring that all requests for that specific batch utilize the same IP address, simulating a consistent user session.31

### **5.3 TLS Fingerprinting and Detection**

Sophisticated anti-bot systems do not just look at IPs; they analyze the **TLS Fingerprint** (JA3 signature) of the client. Standard Node.js HTTP clients have a distinct fingerprint that differs from a real Chrome browser. To avoid detection, the scraper should utilize **got-scraping** or configure **Playwright** to use standard browser headers. These tools are designed to mimic the TLS handshake of a legitimate browser, drastically reducing the likelihood of being flagged as a bot.6

---

## **6\. Data Quality, Validation, and Anomaly Detection**

Ingesting data from the web is inherently messy. A robust validation pipeline is the only defense against polluting the Firestore database with corrupt or inaccurate records.

### **6.1 Schema Validation with Zod**

The integration of **Zod** is central to the data quality strategy. Every data source must have a corresponding Zod schema that defines the expected shape, type, and constraints of the data.

TypeScript

const PropertySchema \= z.object({  
  property\_id: z.string(),  
  assessed\_value: z.number().positive(),  
  zoning\_code: z.string().optional(),  
  last\_sale\_date: z.date().nullable(),  
});

When Genkit extracts data, it should be forced to conform to this schema. If the extracted data fails validation, the record should not be discarded silently. Instead, it should be flagged with a validation\_status: 'REVIEW\_NEEDED' and stored in a separate quarantine collection. This allows developers to inspect the failure—often an indicator that the source website's layout has changed—without halting the pipeline.

### **6.2 Statistical Anomaly Detection**

Real estate data is prone to "fat-finger" errors (e.g., a $500,000 home listed as $500). To detect these, the system should employ statistical anomaly detection algorithms. The **Interquartile Range (IQR)** method is highly effective and computationally inexpensive for this use case.36

* **Mechanism:** A weekly scheduled job calculates the pricing distribution (Price per Square Foot) for each Zip Code. It determines the Q1 (25th percentile), Q3 (75th percentile), and the IQR.  
* **Detection:** When a new property record is scraped, its price is compared against the cached statistics for its Zip Code. If the price falls below Q1 \- 1.5 \* IQR or above Q3 \+ 1.5 \* IQR, it is flagged as a potential anomaly.  
* **Action:** Anomalous records are not published to the frontend but are routed to a manual review queue or a secondary verification task.38

### **6.3 Completeness Monitoring**

Beyond accuracy, **Completeness** is a vital metric. The system should track the "Fill Rate" of critical fields (e.g., "98% of records have a Zoning Code"). A sudden drop in the fill rate for a specific field is a leading indicator that the CSS selector for that field has broken or the source website has altered its template. Cloud Monitoring alerts should be configured to trigger if the fill rate drops below a defined threshold (e.g., 90%) after a daily run.

---

## **7\. Scheduling, Orchestration, and Scalability**

The temporal organization of scraping jobs is as important as the spatial organization. The "Infrastructure & Asset Liquidity Engine" requires different data freshness for different data points.

### **7.1 The Hierarchical Schedule**

The scheduling logic should be implemented using **Google Cloud Scheduler** to trigger the Orchestrator functions.

| Job Type | Frequency | Scope | Priority |
| :---- | :---- | :---- | :---- |
| **Daily Delta** | Daily (02:00 CST) | "New Listings", "Recent Sales", "Permit Updates" | High |
| **Weekly Trends** | Weekly (Sun 03:00 CST) | Re-verification of pricing for active inventory. | Medium |
| **Monthly Refresh** | Monthly (1st) | Full bulk download (WCAD), deep scrape of static fields. | Low |

### **7.2 Priority Queues and Concurrency**

To prevent the massive Monthly Refresh job from clogging the pipeline and delaying critical Daily Deltas, the architecture should leverage **Cloud Tasks Priority Queues**.

* **daily-critical-queue:** Configured with higher dispatch rates.  
* **monthly-backfill-queue:** Configured with lower priority and stricter rate limits to run in the background.

This setup ensures that even if the system is processing 50,000 records for a monthly update, a new listing detected in the daily run will jump to the front of the line and be processed immediately.2

### **7.3 Job Locking and Idempotency**

To handle overlapping jobs (e.g., a daily run starting while a monthly run is still finishing), the Orchestrator must check a **Job Lock** in Firestore. A global lock system\_state/scraping\_active can prevent detrimental overlaps. However, a better approach with the Fan-Out pattern is to allow overlap but rely on **Idempotency**. If both jobs attempt to scrape Property ID 12345, the system processes it twice. While slightly inefficient, this is safer than complex locking mechanisms that might freeze the system if a job crashes without releasing the lock. The database write operation should use merge: true to ensure that the latest data always wins.4

---

## **8\. Legal Considerations and Compliance**

Operating a scraping engine in Texas requires strict adherence to legal frameworks, specifically the **Texas Public Information Act (TPIA)** and **Texas Penal Code 33.02**.

### **8.1 TPIA and Public Access**

The TPIA guarantees access to public information, but it does not guarantee the *method* of access. Governmental bodies are not required to facilitate high-volume automated scraping if it disrupts their operations.39 Therefore, the scraper must act as a "polite citizen."

### **8.2 Breach of Computer Security (Penal Code 33.02)**

Texas law criminalizes accessing a computer system "without the effective consent of the owner".40

* **Effective Consent:** This is the critical legal concept. If a website has a robots.txt file disallowing bots, or a Terms of Service explicitly banning scraping, proceeding to scrape could be argued as accessing without effective consent.  
* **Critical Infrastructure:** The statute has enhanced penalties if the computer system is owned by the government or "critical infrastructure." This explicitly includes water districts and potentially CADs.

### **8.3 Compliance Strategy**

To mitigate legal risk, the architecture must enforce the following protocols:

1. **Respect Robots.txt:** The Orchestrator should programmatically check robots.txt for target domains. If a path is disallowed, it should be excluded from the scrape.  
2. **User-Agent Identification:** The scraper must never masquerade as a generic browser without identification. The User-Agent string should explicitly identify the bot: CentralTexasBot/1.0 (+https://centraltexas.com/bot-info). This provides transparency and a contact method for system administrators.  
3. **Rate Limiting:** The system must strictly adhere to "polite" concurrency levels (e.g., 1 request per second per domain) to ensure it never degrades the performance of the public server, which could be construed as a denial-of-service attack or "harm" under the Penal Code.40  
4. **Attribution:** When displaying data, the system must maintain a source\_provenance field and attribute the data to the originating agency (e.g., "Source: Travis Central Appraisal District"), as required by many Open Data licenses.

---

## **9\. Monitoring, Logging, and Recovery**

Observability is the only way to distinguish between a network blip and a systemic failure.

### **9.1 Structured Logging and Metrics**

The engine should utilize **Google Cloud Logging** with structured JSON payloads. Every log entry from a Worker function should include context: scraper\_type, target\_url, duration\_ms, proxy\_used, and status\_code. This allows for powerful querying in the Logs Explorer (e.g., "Show me all failures for Travis CAD where duration \> 5000ms").43

Additionally, the system should emit **Log-Based Metrics** to Cloud Monitoring. Key metrics include:

* scrape\_success\_rate: The percentage of tasks returning 200 OK.  
* captcha\_challenge\_count: The frequency of CAPTCHA blocks.  
* proxy\_failure\_count: The number of times a proxy connection failed.

### **9.2 Alerting and Circuit Breakers**

**Cloud Monitoring Alerts** should be configured to notify the engineering team (via Slack or Email) if the scrape\_failure\_rate exceeds 10% over a 5-minute window.

Furthermore, the architecture should implement a **Circuit Breaker** pattern. If a specific domain (e.g., traviscad.org) returns errors for 20 consecutive tasks, the Orchestrator should "trip the breaker" by setting a flag in Firestore. This pauses all pending and future tasks for that domain for a set period (e.g., 4 hours). This prevents the system from burning through proxy bandwidth on a broken scraper and prevents the bot from hammering a struggling server, aligning with the "politeness" requirements of the compliance strategy.

---

## **Conclusion**

Building a production-grade scraping engine for CentralTexas.com is not merely about writing code to download HTML; it is about engineering a distributed system that manages state, concurrency, and failure in a hostile environment. By adopting the **Orchestrator-Worker pattern on Cloud Functions**, the system achieves the necessary isolation and scalability to handle 100,000+ records. The integration of **Playwright** for dynamic targets and **Genkit** for semantic parsing ensures that the engine can adapt to the technological diversity of Central Texas government sites.

Crucially, the "Low-and-Slow" operational philosophy, enforced by **Cloud Tasks** rate limiting and **Smartproxy** rotation, ensures that the platform remains a good digital citizen, compliant with Texas law and resilient against blocking. By prioritizing direct data downloads (such as WCAD's bulk exports) and developer APIs (Unlock MLS) over brute-force scraping where possible, the architecture optimizes for both cost efficiency (\<$500/month) and data reliability (99%+ availability), creating a sustainable foundation for the CentralTexas.com Infrastructure & Asset Liquidity Engine.

#### **Works cited**

1. Are cloud functions an appropriate solution for running a long webscraping job? \[closed\], accessed November 18, 2025, [https://stackoverflow.com/questions/78855172/are-cloud-functions-an-appropriate-solution-for-running-a-long-webscraping-job](https://stackoverflow.com/questions/78855172/are-cloud-functions-an-appropriate-solution-for-running-a-long-webscraping-job)  
2. Enqueue functions with Cloud Tasks \- Firebase \- Google, accessed November 18, 2025, [https://firebase.google.com/docs/functions/task-functions](https://firebase.google.com/docs/functions/task-functions)  
3. Execute long running tasks with progress sent to the client with cloud functions? \- Reddit, accessed November 18, 2025, [https://www.reddit.com/r/Firebase/comments/cjf4wo/execute\_long\_running\_tasks\_with\_progress\_sent\_to/](https://www.reddit.com/r/Firebase/comments/cjf4wo/execute_long_running_tasks_with_progress_sent_to/)  
4. Tips & tricks | Cloud Functions for Firebase \- Google, accessed November 18, 2025, [https://firebase.google.com/docs/functions/tips](https://firebase.google.com/docs/functions/tips)  
5. Historical Data \- Williamson CAD, accessed November 18, 2025, [https://www.wcad.org/historical-data/](https://www.wcad.org/historical-data/)  
6. 5 best JavaScript web scraping libraries in 2025 \- Apify Blog, accessed November 18, 2025, [https://blog.apify.com/best-javascript-web-scraping-libraries/](https://blog.apify.com/best-javascript-web-scraping-libraries/)  
7. Top 6 JavaScript Web Scraping Libraries \- Bright Data, accessed November 18, 2025, [https://brightdata.com/blog/web-data/js-web-scraping-libraries](https://brightdata.com/blog/web-data/js-web-scraping-libraries)  
8. Puppeteer slow execution on Cloud Functions · Issue \#3120 \- GitHub, accessed November 18, 2025, [https://github.com/puppeteer/puppeteer/issues/3120](https://github.com/puppeteer/puppeteer/issues/3120)  
9. The Best JavaScript Web Scraping Libraries | ScrapingBee, accessed November 18, 2025, [https://www.scrapingbee.com/blog/best-javascript-web-scraping-libraries/](https://www.scrapingbee.com/blog/best-javascript-web-scraping-libraries/)  
10. Travis Central Appraisal District Property Search, accessed November 18, 2025, [https://travis.prodigycad.com/property-search](https://travis.prodigycad.com/property-search)  
11. 6 Best Node.js Libraries for Web Scraping in 2025 \- Proxyway, accessed November 18, 2025, [https://proxyway.com/guides/the-best-node-js-libraries-for-web-scraping](https://proxyway.com/guides/the-best-node-js-libraries-for-web-scraping)  
12. Structured Outputs | Gemini API \- Google AI for Developers, accessed November 18, 2025, [https://ai.google.dev/gemini-api/docs/structured-output](https://ai.google.dev/gemini-api/docs/structured-output)  
13. Extracting structured data from PDFs using Gemini 2.0 and Genkit \- Peter Friese, accessed November 18, 2025, [https://peterfriese.dev/blog/2025/gemini-genkit-pdf-structured-data/](https://peterfriese.dev/blog/2025/gemini-genkit-pdf-structured-data/)  
14. Integrate AI Models with Genkit and Node.js \- DEV Community, accessed November 18, 2025, [https://dev.to/maikelev/how-to-integrate-ai-models-with-nodejs-using-genkit-5807](https://dev.to/maikelev/how-to-integrate-ai-models-with-nodejs-using-genkit-5807)  
15. Generating content with AI models | Genkit \- Firebase, accessed November 18, 2025, [https://firebase.google.com/docs/genkit/models](https://firebase.google.com/docs/genkit/models)  
16. Open APIs are Essential to Appraisal Districts and Tax Offices \- True Prodigy Tech Solutions, accessed November 18, 2025, [https://trueprodigy.com/open-apis-are-essential-to-appraisal-districts-and-tax-offices/](https://trueprodigy.com/open-apis-are-essential-to-appraisal-districts-and-tax-offices/)  
17. How we Reverse Engineer APIs with no Documentation for Clients \- ThatAPICompany.com, accessed November 18, 2025, [https://thatapicompany.com/how-we-reverse-engineer-apis-with-no-documentation-for-clients/](https://thatapicompany.com/how-we-reverse-engineer-apis-with-no-documentation-for-clients/)  
18. Data Downloads and Documentation \- Williamson CAD, accessed November 18, 2025, [https://www.wcad.org/data-downloads/](https://www.wcad.org/data-downloads/)  
19. Hays CAD Property Search, accessed November 18, 2025, [https://esearch.hayscad.com/](https://esearch.hayscad.com/)  
20. Comal AD Property Search, accessed November 18, 2025, [https://esearch.comalad.org/](https://esearch.comalad.org/)  
21. Guadalupe AD Property Search, accessed November 18, 2025, [https://esearch.guadalupead.org/](https://esearch.guadalupead.org/)  
22. entelecheia/bis-fetcher: A Python library that scrapes the BIS website to download and extract text from central bank speeches \- GitHub, accessed November 18, 2025, [https://github.com/entelecheia/bis-fetcher](https://github.com/entelecheia/bis-fetcher)  
23. Austin Board of Realtors and ACTRIS \- MLS RESO Web API Import Solutions for WordPress, accessed November 18, 2025, [https://mlsimport.com/austin-board-of-realtors-and-actris/](https://mlsimport.com/austin-board-of-realtors-and-actris/)  
24. Data Licensing \- Unlock MLS, accessed November 18, 2025, [https://www.unlockmls.com/data-licensing](https://www.unlockmls.com/data-licensing)  
25. Web API Developer Reference Server | RESO \- Real Estate Standards Organization, accessed November 18, 2025, [https://www.reso.org/web-api-developer-reference-server/](https://www.reso.org/web-api-developer-reference-server/)  
26. Media Files \- LCRA Hydromet \- Lower Colorado River Authority, accessed November 18, 2025, [https://hydromet.lcra.org/media](https://hydromet.lcra.org/media)  
27. Environmental Data Portal \- Edwards Aquifer Authority, accessed November 18, 2025, [https://data.edwardsaquifer.org/](https://data.edwardsaquifer.org/)  
28. Download Data \- Water Data For Texas, accessed November 18, 2025, [https://waterdatafortexas.org/groundwater/download](https://waterdatafortexas.org/groundwater/download)  
29. Project Tracker \- TxDOT Open Data Portal, accessed November 18, 2025, [https://gis-txdot.opendata.arcgis.com/search?tags=txdot%20projects](https://gis-txdot.opendata.arcgis.com/search?tags=txdot+projects)  
30. Texas Department of Transportation \- TxDOT Open Data Portal, accessed November 18, 2025, [https://gis-txdot.opendata.arcgis.com/search?collection=dataset\&tags=Projects](https://gis-txdot.opendata.arcgis.com/search?collection=dataset&tags=Projects)  
31. Bright Data vs. Smartproxy | Proxy Provider Comparison \- DICloak, accessed November 18, 2025, [https://dicloak.com/blog-detail/bright-data-vs-smartproxy--proxy-provider-comparison](https://dicloak.com/blog-detail/bright-data-vs-smartproxy--proxy-provider-comparison)  
32. Smartproxy vs. Bright Data: A Comparison \- Proxyway, accessed November 18, 2025, [https://proxyway.com/comparisons/smartproxy-vs-luminati-performance-feature-comparison](https://proxyway.com/comparisons/smartproxy-vs-luminati-performance-feature-comparison)  
33. When Do You Really Need Proxies? Bright Data Vs Smartproxy Explained \- Ebharat.com, accessed November 18, 2025, [https://ebharat.com/bright-data-vs-smartproxy-2025/](https://ebharat.com/bright-data-vs-smartproxy-2025/)  
34. Smartproxy vs Bright Data – Residential Proxy Providers Compared, accessed November 18, 2025, [https://brightdata.com/blog/comparison/smartproxy-vs-bright-data](https://brightdata.com/blog/comparison/smartproxy-vs-bright-data)  
35. NodeJS: How to Use & Rotate Proxies \- ScrapeOps, accessed November 18, 2025, [https://scrapeops.io/nodejs-web-scraping-playbook/nodejs-proxy-rotation/](https://scrapeops.io/nodejs-web-scraping-playbook/nodejs-proxy-rotation/)  
36. Spotting the Exception: Classical Methods for Outlier Detection in Data Science \- MachineLearningMastery.com, accessed November 18, 2025, [https://machinelearningmastery.com/spotting-the-exception-classical-methods-for-outlier-detection-in-data-science/](https://machinelearningmastery.com/spotting-the-exception-classical-methods-for-outlier-detection-in-data-science/)  
37. 5 Ways to Find Outliers in Your Data \- Statistics By Jim, accessed November 18, 2025, [https://statisticsbyjim.com/basics/outliers/](https://statisticsbyjim.com/basics/outliers/)  
38. Anomaly Monitor \- Datadog Docs, accessed November 18, 2025, [https://docs.datadoghq.com/monitors/types/anomaly/](https://docs.datadoghq.com/monitors/types/anomaly/)  
39. TEXAS PUBLIC INFORMATION ACT LAWS MADE EASY, accessed November 18, 2025, [https://www.tml.org/DocumentCenter/View/430/Texas-Public-Information-Act-Laws-Made-Easy---2018-PDF](https://www.tml.org/DocumentCenter/View/430/Texas-Public-Information-Act-Laws-Made-Easy---2018-PDF)  
40. Breach of Computer Security | Denton Criminal Defense Attorney \- Law Offices of Tim Powers, accessed November 18, 2025, [https://www.timpowers.com/texas-penal-code/breach-of-computer-security/](https://www.timpowers.com/texas-penal-code/breach-of-computer-security/)  
41. The Texas Breach of Computer Security Law | Penal Code §33.02 \- Saputo Toufexis, accessed November 18, 2025, [https://saputo.law/criminal-law/texas/breach-of-computer-security/](https://saputo.law/criminal-law/texas/breach-of-computer-security/)  
42. Texas Penal Code Section 33.02 (2024) \- Breach of Computer Security \- Justia Law, accessed November 18, 2025, [https://law.justia.com/codes/texas/penal-code/title-7/chapter-33/section-33-02/](https://law.justia.com/codes/texas/penal-code/title-7/chapter-33/section-33-02/)  
43. Cloud Logging | Google Cloud, accessed November 18, 2025, [https://cloud.google.com/logging](https://cloud.google.com/logging)