/**
 * Fractio Custom Plugin
 *
 * Custom ElizaOS actions for the Fractio Investor Intelligence Agent.
 * Provides on-chain property data, ROI calculations, and GCC market intelligence.
 *
 * Deployed on Nosana decentralized GPU network.
 * Platform: https://fractio.io | Blockchain: Solana
 */

import { type Plugin, type IAgentRuntime, type Memory, type State, type HandlerCallback } from "@elizaos/core";

// ---------------------------------------------------------------------------
// Property Registry — simulates on-chain property data from the Fractio
// smart contract (Property Registry module). In production this would
// call the Solana RPC to fetch live on-chain account data.
// ---------------------------------------------------------------------------

interface FractioProperty {
  id: string;
  name: string;
  location: string;
  country: "UAE" | "Bahrain" | "Saudi Arabia";
  totalValue: number;
  tokenPrice: number;
  totalTokens: number;
  availableTokens: number;
  annualYield: number;
  status: "Active" | "Pending" | "Funded";
  propertyType: string;
  occupancyRate: number;
}

const FRACTIO_PROPERTIES: FractioProperty[] = [
  {
    id: "prop-001",
    name: "Marina Heights Residence",
    location: "Dubai Marina, Dubai",
    country: "UAE",
    totalValue: 850000,
    tokenPrice: 100,
    totalTokens: 8500,
    availableTokens: 3200,
    annualYield: 7.2,
    status: "Active",
    propertyType: "Luxury Apartment",
    occupancyRate: 94,
  },
  {
    id: "prop-002",
    name: "Seef Boulevard Tower",
    location: "Seef District, Manama",
    country: "Bahrain",
    totalValue: 420000,
    tokenPrice: 100,
    totalTokens: 4200,
    availableTokens: 1800,
    annualYield: 8.1,
    status: "Active",
    propertyType: "Commercial Office",
    occupancyRate: 89,
  },
  {
    id: "prop-003",
    name: "Riyadh Business Quarter",
    location: "King Abdullah Financial District, Riyadh",
    country: "Saudi Arabia",
    totalValue: 1200000,
    tokenPrice: 100,
    totalTokens: 12000,
    availableTokens: 5600,
    annualYield: 6.8,
    status: "Active",
    propertyType: "Mixed-Use",
    occupancyRate: 91,
  },
  {
    id: "prop-004",
    name: "Yas Island Retreat",
    location: "Yas Island, Abu Dhabi",
    country: "UAE",
    totalValue: 650000,
    tokenPrice: 100,
    totalTokens: 6500,
    availableTokens: 0,
    annualYield: 7.8,
    status: "Funded",
    propertyType: "Holiday Villa",
    occupancyRate: 97,
  },
  {
    id: "prop-005",
    name: "Dilmunia Waterfront",
    location: "Dilmunia Island, Bahrain",
    country: "Bahrain",
    totalValue: 380000,
    tokenPrice: 100,
    totalTokens: 3800,
    availableTokens: 3800,
    annualYield: 8.5,
    status: "Pending",
    propertyType: "Beachfront Apartment",
    occupancyRate: 0,
  },
];

// ---------------------------------------------------------------------------
// Action: GET_PROPERTY_INFO
// Retrieves Fractio property details by name or country
// ---------------------------------------------------------------------------

const getPropertyInfoAction = {
  name: "GET_PROPERTY_INFO",
  description:
    "Retrieves detailed information about Fractio investment properties. Use when the user asks about specific properties, available investments, or wants to browse the property portfolio.",
  similes: [
    "LIST_PROPERTIES",
    "SHOW_PROPERTIES",
    "PROPERTY_DETAILS",
    "AVAILABLE_INVESTMENTS",
    "BROWSE_PORTFOLIO",
    "WHAT_PROPERTIES",
  ],
  validate: async (_runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    const text = message.content.text?.toLowerCase() ?? "";
    const keywords = [
      "propert", "invest", "available", "portfolio", "listing",
      "dubai", "bahrain", "saudi", "riyadh", "manama", "abu dhabi",
      "apartment", "villa", "office", "buy token", "purchase",
    ];
    return keywords.some((kw) => text.includes(kw));
  },
  handler: async (
    _runtime: IAgentRuntime,
    message: Memory,
    _state: State,
    _options: Record<string, unknown>,
    callback: HandlerCallback
  ): Promise<boolean> => {
    const text = message.content.text?.toLowerCase() ?? "";

    // Filter by country if mentioned
    let filtered = FRACTIO_PROPERTIES;
    if (text.includes("dubai") || text.includes("uae") || text.includes("abu dhabi")) {
      filtered = FRACTIO_PROPERTIES.filter((p) => p.country === "UAE");
    } else if (text.includes("bahrain")) {
      filtered = FRACTIO_PROPERTIES.filter((p) => p.country === "Bahrain");
    } else if (text.includes("saudi") || text.includes("riyadh")) {
      filtered = FRACTIO_PROPERTIES.filter((p) => p.country === "Saudi Arabia");
    }

    // Only show active or funded unless specifically asked about pending
    const showActive = filtered.filter((p) => p.status === "Active" || p.status === "Funded");
    const target = showActive.length > 0 ? showActive : filtered;

    const lines = target.map((p) => {
      const availability =
        p.status === "Funded"
          ? "FULLY FUNDED"
          : p.status === "Pending"
          ? "LAUNCHING SOON"
          : `${p.availableTokens.toLocaleString()} tokens available`;

      return (
        `**${p.name}** | ${p.location}\n` +
        `  Type: ${p.propertyType} | Status: ${p.status}\n` +
        `  Total Value: $${p.totalValue.toLocaleString()} | Yield: ${p.annualYield}%/yr\n` +
        `  Occupancy: ${p.status !== "Pending" ? p.occupancyRate + "%" : "Pre-launch"} | ${availability}\n` +
        `  Min. Investment: $100 (1 token)`
      );
    });

    const response =
      `Here are Fractio's current investment properties:\n\n` +
      lines.join("\n\n") +
      `\n\nAll properties are tokenized on Solana. Rental income is distributed automatically via smart contract.\n` +
      `Want me to run an ROI calculation for any of these?`;

    callback({ text: response });
    return true;
  },
  examples: [
    [
      {
        user: "{{user1}}",
        content: { text: "What properties are available on Fractio?" },
      },
      {
        user: "Fractio",
        content: {
          text: "Here are Fractio's current investment properties...",
          action: "GET_PROPERTY_INFO",
        },
      },
    ],
  ],
};

// ---------------------------------------------------------------------------
// Action: CALCULATE_ROI
// Calculates investment return scenarios based on token amount and yield
// ---------------------------------------------------------------------------

const calculateRoiAction = {
  name: "CALCULATE_ROI",
  description:
    "Calculates investment return scenarios for Fractio property tokens. Use when the user mentions a specific dollar amount, number of tokens, or asks about earnings/returns/income.",
  similes: [
    "INVESTMENT_CALCULATOR",
    "CALCULATE_RETURNS",
    "HOW_MUCH_EARN",
    "ROI",
    "EXPECTED_INCOME",
    "RENTAL_INCOME",
    "EARNINGS_ESTIMATE",
  ],
  validate: async (_runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    const text = message.content.text?.toLowerCase() ?? "";
    const hasAmount = /\$[\d,]+|\d+\s*(dollar|token|usd|invest)/i.test(message.content.text ?? "");
    const hasEarningKeyword = ["earn", "return", "yield", "income", "profit", "roi", "how much", "calculate"].some(
      (kw) => text.includes(kw)
    );
    return hasAmount || hasEarningKeyword;
  },
  handler: async (
    _runtime: IAgentRuntime,
    message: Memory,
    _state: State,
    _options: Record<string, unknown>,
    callback: HandlerCallback
  ): Promise<boolean> => {
    const text = message.content.text ?? "";

    // Extract dollar amount from message
    const amountMatch = text.match(/\$?([\d,]+)/);
    let investmentUsd = amountMatch ? parseInt(amountMatch[1].replace(/,/g, "")) : 1000;

    // Clamp to minimum
    if (investmentUsd < 100) investmentUsd = 100;

    const tokens = Math.floor(investmentUsd / 100);
    const actualInvestment = tokens * 100;

    // Calculate across yield scenarios
    const scenarios = [
      { label: "Conservative", yield: 5.0 },
      { label: "Moderate", yield: 7.0 },
      { label: "Strong (GCC avg)", yield: 8.5 },
    ];

    const scenarioLines = scenarios.map((s) => {
      const annual = (actualInvestment * s.yield) / 100;
      const monthly = annual / 12;
      return (
        `${s.label} (${s.yield}%/yr): $${annual.toFixed(0)}/yr → $${monthly.toFixed(2)}/month`
      );
    });

    // 5-year projection at moderate yield
    const moderate5yr = (actualInvestment * 0.07 * 5).toFixed(0);

    const response =
      `Investment Scenario: $${actualInvestment.toLocaleString()} (${tokens} token${tokens !== 1 ? "s" : ""})\n\n` +
      `Annual Return Estimates:\n` +
      scenarioLines.join("\n") +
      `\n\n5-Year Total Income (Moderate): ~$${moderate5yr}\n\n` +
      `Rental income is paid directly to your Solana wallet — no fund manager, no delays.\n` +
      `All income is claimable on-demand; no lockup periods.\n\n` +
      `Want me to compare this against a specific Fractio property's actual yield?`;

    callback({ text: response });
    return true;
  },
  examples: [
    [
      {
        user: "{{user1}}",
        content: { text: "How much will I earn if I invest $2000?" },
      },
      {
        user: "Fractio",
        content: {
          text: "Investment Scenario: $2,000 (20 tokens)...",
          action: "CALCULATE_ROI",
        },
      },
    ],
  ],
};

// ---------------------------------------------------------------------------
// Action: GCC_MARKET_INTEL
// Provides current GCC real estate market intelligence
// ---------------------------------------------------------------------------

const gccMarketIntelAction = {
  name: "GCC_MARKET_INTEL",
  description:
    "Provides GCC real estate market intelligence — trends, regulations, and investment outlook for UAE, Bahrain, and Saudi Arabia. Use when the user asks about the market, countries, or investment climate.",
  similes: [
    "MARKET_UPDATE",
    "GCC_MARKET",
    "MARKET_TRENDS",
    "REAL_ESTATE_NEWS",
    "INVESTMENT_CLIMATE",
    "MARKET_OUTLOOK",
  ],
  validate: async (_runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    const text = message.content.text?.toLowerCase() ?? "";
    const keywords = [
      "market", "trend", "gcc", "middle east", "outlook", "climate",
      "vision 2030", "neom", "expo", "regulations", "freehold",
      "why gcc", "why invest", "which country",
    ];
    return keywords.some((kw) => text.includes(kw));
  },
  handler: async (
    _runtime: IAgentRuntime,
    _message: Memory,
    _state: State,
    _options: Record<string, unknown>,
    callback: HandlerCallback
  ): Promise<boolean> => {
    const response = `GCC Real Estate Market Intelligence (Q1 2026)\n\n` +
      `UAE (Dubai & Abu Dhabi)\n` +
      `- Dubai: 17%+ price growth in 2024, sustained demand from global expat influx\n` +
      `- Abu Dhabi: Yas Island and Saadiyat seeing record luxury demand\n` +
      `- Average rental yield: 6.5–8% in prime districts\n` +
      `- Freehold zones open to all nationalities\n\n` +
      `Saudi Arabia\n` +
      `- Vision 2030: $1T+ in planned real estate projects (NEOM, Red Sea, Diriyah)\n` +
      `- Riyadh office vacancy rates at decade-low — corporate expansion driving demand\n` +
      `- Tourism sector growing 150%+ since 2019, fueling hospitality real estate\n` +
      `- New freehold regulations for foreign investors in designated zones\n\n` +
      `Bahrain\n` +
      `- Most investor-friendly freehold laws in the GCC — full ownership rights\n` +
      `- Rental yields: 7–9% — strongest in the region for residential\n` +
      `- Lower entry price points vs UAE makes it ideal for fractional investment\n` +
      `- Dilmunia and Seef District are prime growth corridors\n\n` +
      `Why GCC vs Western Markets?\n` +
      `- No capital gains tax in UAE or Bahrain\n` +
      `- No income tax on rental earnings in most GCC states\n` +
      `- Yields 2–3x higher than London or New York\n` +
      `- Strong USD-pegged currencies — no FX risk for USD investors\n\n` +
      `Fractio gives you access to all three markets starting at $100. Want to explore a specific property?`;

    callback({ text: response });
    return true;
  },
  examples: [
    [
      {
        user: "{{user1}}",
        content: { text: "How is the GCC real estate market doing?" },
      },
      {
        user: "Fractio",
        content: {
          text: "GCC Real Estate Market Intelligence (Q1 2026)...",
          action: "GCC_MARKET_INTEL",
        },
      },
    ],
  ],
};

// ---------------------------------------------------------------------------
// Action: HOW_IT_WORKS
// Explains the Fractio investment process end-to-end
// ---------------------------------------------------------------------------

const howItWorksAction = {
  name: "HOW_IT_WORKS",
  description:
    "Explains how investing on Fractio works — from wallet setup to token purchase to receiving rental income. Use for onboarding questions or when users ask how to get started.",
  similes: [
    "GET_STARTED",
    "ONBOARDING",
    "HOW_TO_INVEST",
    "EXPLAIN_PROCESS",
    "HOW_DOES_IT_WORK",
    "START_INVESTING",
  ],
  validate: async (_runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    const text = message.content.text?.toLowerCase() ?? "";
    const keywords = [
      "how does", "how do i", "how to", "get started", "begin", "start",
      "explain", "process", "step", "wallet", "what do i need", "first time",
    ];
    return keywords.some((kw) => text.includes(kw));
  },
  handler: async (
    _runtime: IAgentRuntime,
    _message: Memory,
    _state: State,
    _options: Record<string, unknown>,
    callback: HandlerCallback
  ): Promise<boolean> => {
    const response =
      `How to Invest on Fractio — Step by Step\n\n` +
      `Step 1: Set up a Solana wallet\n` +
      `Download Phantom or Backpack wallet. This is where your tokens and rental income will live. You control the keys — Fractio never holds your funds.\n\n` +
      `Step 2: Complete KYC verification\n` +
      `Identity verification is required by GCC regulations. Once approved, your wallet is whitelisted by our Compliance Guard smart contract. This is a one-time process.\n\n` +
      `Step 3: Browse properties and buy tokens\n` +
      `Choose a property, decide how many tokens to buy ($100 minimum per token), and confirm the transaction. Solana fees are under $0.001.\n\n` +
      `Step 4: Receive rental income automatically\n` +
      `As the property generates rental income, your share is distributed directly to your wallet via smart contract — proportional to your token holdings. No action required.\n\n` +
      `Step 5: Claim anytime\n` +
      `Your rental income accumulates in the smart contract and is claimable whenever you want. No lockup periods.\n\n` +
      `That's it. No banks. No fund managers. No paperwork beyond the initial KYC.\n\n` +
      `Want to see which properties are currently open for investment?`;

    callback({ text: response });
    return true;
  },
  examples: [
    [
      {
        user: "{{user1}}",
        content: { text: "How do I get started with Fractio?" },
      },
      {
        user: "Fractio",
        content: {
          text: "How to Invest on Fractio — Step by Step...",
          action: "HOW_IT_WORKS",
        },
      },
    ],
  ],
};

// ---------------------------------------------------------------------------
// Fractio Custom Plugin — registers all actions
// ---------------------------------------------------------------------------

export const customPlugin: Plugin = {
  name: "custom-plugin",
  description:
    "Fractio platform actions — property listings, ROI calculations, GCC market intelligence, and investor onboarding",
  actions: [
    getPropertyInfoAction,
    calculateRoiAction,
    gccMarketIntelAction,
    howItWorksAction,
  ],
  providers: [],
  evaluators: [],
};

export default customPlugin;
