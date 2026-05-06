/**
 * Real-time Government Schemes Fetcher
 * Fetches data from government APIs and official websites
 * Falls back to local database if real-time sources fail
 */

import axios from "axios";
import * as cheerio from "cheerio";

interface RealtimeScheme {
  id: string;
  name: string;
  description: string;
  category: string;
  eligibility: {
    minAge?: number;
    maxAge?: number;
    maxIncome?: number;
    occupations: string[];
    gender?: "any" | "male" | "female";
  };
  benefits: string;
  applicationUrl?: string;
  documents: string[];
  keywords: string[];
  state?: string;
  source: "api" | "scrape" | "local";
  lastUpdated?: string;
}

// Cache for API responses (10 minutes)
const CACHE_DURATION = 10 * 60 * 1000;
let schemeCache: { data: RealtimeScheme[]; timestamp: number } | null = null;

/**
 * Fetch schemes from government APIs
 */
async function fetchFromAPIs(): Promise<RealtimeScheme[]> {
  const schemes: RealtimeScheme[] = [];

  try {
    // List of government data APIs
    const apiEndpoints = [
      {
        url: "https://data.gov.in/api/datastore/sql?sql=SELECT%20*%20FROM%20%22e5e4e3c2-e4f9-4f6e-8e5e-4f6e3c2e4f6e%22",
        name: "data.gov.in",
      },
    ];

    for (const endpoint of apiEndpoints) {
      try {
        console.log(`Attempting to fetch from ${endpoint.name}...`);
        const response = await axios.get(endpoint.url, {
          timeout: 5000,
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          },
        });

        if (response.data && response.data.records) {
          console.log(
            `Successfully fetched ${response.data.records.length} records from ${endpoint.name}`
          );
          // Transform API response if needed
          response.data.records.forEach((record: any) => {
            schemes.push({
              id: record.id || `api_${Date.now()}_${Math.random()}`,
              name: record.name || record.title || "Unknown Scheme",
              description:
                record.description || record.overview || "No description",
              category: record.category || "general",
              eligibility: {
                occupations: record.occupations || [],
              },
              benefits: record.benefits || "Check official website",
              applicationUrl: record.url || record.application_url,
              documents: [],
              keywords: [record.name?.toLowerCase() || ""],
              source: "api",
              lastUpdated: new Date().toISOString(),
            });
          });
        }
      } catch (error) {
        console.log(`Failed to fetch from ${endpoint.name}:`, (error as any).message);
      }
    }
  } catch (error) {
    console.log("Error in API fetching:", (error as any).message);
  }

  return schemes;
}

/**
 * Fetch schemes through web scraping
 */
async function fetchFromWebScraping(): Promise<RealtimeScheme[]> {
  const schemes: RealtimeScheme[] = [];

  try {
    // Popular government scheme websites to scrape
    const websites = [
      {
        name: "PM-KISAN",
        url: "https://pmkisan.gov.in/",
        category: "agriculture",
      },
      {
        name: "PM-JAY (Ayushman)",
        url: "https://pmjay.gov.in/",
        category: "health",
      },
      {
        name: "PM-AWAS",
        url: "https://pmaymis.gov.in/",
        category: "housing",
      },
    ];

    for (const website of websites) {
      try {
        console.log(`Scraping ${website.name}...`);
        const response = await axios.get(website.url, {
          timeout: 5000,
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          },
        });

        const $ = cheerio.load(response.data);

        // Extract title and metadata
        const title = $("title").text() || website.name;
        const description =
          $('meta[name="description"]').attr("content") ||
          $("h1").first().text() ||
          "Government scheme";

        schemes.push({
          id: `scrape_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: website.name,
          description: description,
          category: website.category,
          eligibility: {
            occupations: [],
          },
          applicationUrl: website.url,
          documents: [],
          benefits:
            "Visit official website for complete details and benefits",
          keywords: [
            website.category,
            website.name.toLowerCase(),
            "government scheme",
          ],
          source: "scrape",
          lastUpdated: new Date().toISOString(),
        });

        console.log(`Successfully scraped ${website.name}`);
      } catch (error) {
        console.log(
          `Failed to scrape ${website.name}:`,
          (error as any).message
        );
      }
    }
  } catch (error) {
    console.log("Error in web scraping:", (error as any).message);
  }

  return schemes;
}

/**
 * Get real-time schemes with caching
 */
export async function getRealtimeSchemes(
  localSchemes: any[]
): Promise<RealtimeScheme[]> {
  // Check cache first
  if (schemeCache && Date.now() - schemeCache.timestamp < CACHE_DURATION) {
    console.log("Returning cached schemes");
    return schemeCache.data;
  }

  try {
    console.log("Fetching fresh scheme data...");

    // Try APIs first
    const apiSchemes = await fetchFromAPIs();
    if (apiSchemes.length > 0) {
      console.log(`Fetched ${apiSchemes.length} schemes from APIs`);
      schemeCache = { data: apiSchemes, timestamp: Date.now() };
      return apiSchemes;
    }

    // If APIs fail, try web scraping
    const scrapedSchemes = await fetchFromWebScraping();
    if (scrapedSchemes.length > 0) {
      console.log(
        `Fetched ${scrapedSchemes.length} schemes from web scraping`
      );
      schemeCache = { data: scrapedSchemes, timestamp: Date.now() };
      return scrapedSchemes;
    }

    // If both fail, use local schemes with metadata
    console.log("Using local schemes as fallback");
    const enrichedLocal = localSchemes.map((scheme) => ({
      ...scheme,
      source: "local" as const,
      lastUpdated: new Date().toISOString(),
    }));

    schemeCache = { data: enrichedLocal, timestamp: Date.now() };
    return enrichedLocal;
  } catch (error) {
    console.error("Error fetching real-time schemes:", error);

    // Fallback to local schemes
    return localSchemes.map((scheme) => ({
      ...scheme,
      source: "local" as const,
      lastUpdated: new Date().toISOString(),
    }));
  }
}

/**
 * Search real-time schemes by keywords
 */
export async function searchRealtimeSchemes(
  query: string,
  localSchemes: any[]
): Promise<RealtimeScheme[]> {
  const schemes = await getRealtimeSchemes(localSchemes);
  const lower = query.toLowerCase();

  return schemes.filter((scheme) => {
    const nameMatch = scheme.name?.toLowerCase().includes(lower);
    const descMatch = scheme.description?.toLowerCase().includes(lower);
    const keywordMatch = scheme.keywords?.some((kw: string) =>
      kw.toLowerCase().includes(lower)
    );

    return nameMatch || descMatch || keywordMatch;
  });
}

/**
 * Clear cache (useful for manual refresh)
 */
export function clearSchemeCache() {
  schemeCache = null;
  console.log("Scheme cache cleared");
}
