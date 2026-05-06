import { Router } from "express";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";
import { getRealtimeSchemes, searchRealtimeSchemes } from "./realtime-schemes.js";

const router = Router();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const schemesPath = process.env.SCHEMES_PATH || path.resolve(__dirname, "schemes.json");

interface EligibilityCriteria {
  minAge?: number;
  maxAge?: number;
  maxIncome?: number;
  occupations: string[];
  gender?: "any" | "male" | "female";
}

interface Scheme {
  id: string;
  name: string;
  description: string;
  category: string;
  eligibility: EligibilityCriteria;
  benefits: string;
  applicationUrl?: string;
  documents: string[];
  keywords: string[];
  state?: string; // Optional: if present, it's a state scheme; otherwise central
}

interface UserProfile {
  name?: string;
  age?: number;
  income?: number;
  occupation?: string;
  state?: string;
}

function loadSchemes(): Scheme[] {
  try {
    const data = readFileSync(schemesPath, "utf-8");
    return JSON.parse(data) as Scheme[];
  } catch {
    return [];
  }
}

function detectIntent(message: string): string {
  const lower = message.toLowerCase();
  const keywordMap: Record<string, string[]> = {
    farmer: ["farmer", "kisan", "farming", "agriculture", "crop", "farm", "cultivate"],
    health: ["health", "hospital", "medical", "sick", "doctor", "disease", "treatment", "medicine", "ayushman"],
    housing: ["house", "home", "shelter", "loan", "housing", "accommodation", "awas", "construction", "flat"],
    employment: ["job", "work", "employment", "labour", "labor", "nrega", "mgnrega", "unemployed", "wage"],
    education: ["education", "study", "student", "scholarship", "school", "college", "fee", "degree"],
    business: ["business", "shop", "entrepreneur", "mudra", "startup", "self employed"],
    financial: ["bank", "account", "savings", "jan dhan", "insurance", "debit"],
    gas: ["gas", "lpg", "cooking", "cylinder", "ujjwala"],
  };

  for (const [intent, words] of Object.entries(keywordMap)) {
    if (words.some((w) => lower.includes(w))) {
      return intent;
    }
  }

  return "general";
}

function matchSchemes(
  schemes: Scheme[],
  message: string,
  userProfile?: UserProfile
): Scheme[] {
  const lower = message.toLowerCase();
  const intent = detectIntent(message);

  return schemes.filter((scheme) => {
    // Check if scheme is applicable based on state
    const stateMatch = !userProfile?.state || !scheme.state || scheme.state.toLowerCase() === userProfile.state.toLowerCase();

    const keywordMatch = scheme.keywords.some((kw) => lower.includes(kw.toLowerCase()));
    const intentMatch = intent !== "general" ? 
      (scheme.category === intent || scheme.keywords.some((kw) => kw.toLowerCase().includes(intent))) : 
      false;

    let profileMatch = true;
    if (userProfile) {
      const { age, income, occupation } = userProfile;
      const { minAge, maxAge, maxIncome, occupations } = scheme.eligibility;

      if (age !== undefined && minAge !== undefined && age < minAge) profileMatch = false;
      if (age !== undefined && maxAge !== undefined && age > maxAge) profileMatch = false;
      if (income !== undefined && maxIncome !== undefined && income > maxIncome) profileMatch = false;
      if (
        occupation !== undefined &&
        occupations.length > 0 &&
        !occupations.some(
          (o) =>
            occupation.toLowerCase().includes(o.toLowerCase()) ||
            o.toLowerCase().includes(occupation.toLowerCase())
        )
      ) {
        if (!keywordMatch) profileMatch = false;
      }
    }

    return stateMatch && profileMatch && (keywordMatch || intentMatch);
  });
}

function buildReply(
  matched: Scheme[],
  message: string,
  intent: string,
  userName?: string
): string {
  const greeting = userName ? `Hello ${userName}! ` : "";

  if (matched.length === 0) {
    const lower = message.toLowerCase();
    if (
      lower.includes("hello") ||
      lower.includes("hi") ||
      lower.includes("namaste")
    ) {
      return `${greeting}Namaste! I'm GovAssist AI, your guide to Indian government schemes. Tell me about yourself — your age, income, and occupation — and I'll help you find schemes you're eligible for. You can also ask about specific topics like farming, health, housing, loans, or education.`;
    }
    return `${greeting}I couldn't find specific schemes matching your query. Please try providing more details like your age, income, or occupation. You can ask about topics like:\n- Farming / Agriculture\n- Health & Medical\n- Housing & Home Loans\n- Employment & Jobs\n- Education & Scholarships\n- Business Loans`;
  }

  let reply = `${greeting}Based on your query, here are ${matched.length} government scheme${matched.length > 1 ? "s" : ""} you may be eligible for:\n\n`;

  matched.forEach((scheme, i) => {
    reply += `${i + 1}. ${scheme.name}\n${scheme.description.slice(0, 120)}...\n\n`;
  });

  reply += "See the scheme cards below for full details, eligibility, and how to apply.";

  return reply;
}

router.post("/", async (req, res) => {
  const body = req.body as { message?: unknown; userProfile?: unknown };

  if (!body.message || typeof body.message !== "string" || body.message.trim().length === 0) {
    res.status(400).json({ error: "Invalid request: message is required" });
    return;
  }

  const message = body.message.trim();

  let userProfile: UserProfile | undefined;
  if (body.userProfile && typeof body.userProfile === "object") {
    const raw = body.userProfile as Record<string, unknown>;
    userProfile = {
      name: typeof raw.name === "string" ? raw.name : undefined,
      age: typeof raw.age === "number" ? raw.age : undefined,
      income: typeof raw.income === "number" ? raw.income : undefined,
      occupation: typeof raw.occupation === "string" ? raw.occupation : undefined,
      state: typeof raw.state === "string" ? raw.state : undefined,
    };
  }

  const localSchemes = loadSchemes();
  
  // Fetch real-time schemes while keeping local as fallback
  const realtimeSchemes = await getRealtimeSchemes(localSchemes);
  
  const intent = detectIntent(message);
  const matched = matchSchemes(realtimeSchemes, message, userProfile);
  const reply = buildReply(matched, message, intent, userProfile?.name);

  res.json({
    reply,
    matchedSchemes: matched,
    intent,
    dataSource: matched.length > 0 ? realtimeSchemes[0]?.source || "local" : "local",
  });
});

// Endpoint to search real-time schemes by keyword
router.get("/search/:keyword", async (req, res) => {
  try {
    const keyword = req.params.keyword;
    if (!keyword || keyword.trim().length === 0) {
      res.status(400).json({ error: "Keyword is required" });
      return;
    }

    const localSchemes = loadSchemes();
    const results = await searchRealtimeSchemes(keyword, localSchemes);

    res.json({
      keyword,
      results,
      count: results.length,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to search schemes" });
  }
});

export default router;
