import {
  GoogleGenAI,
  HarmBlockThreshold,
  HarmCategory,
  Schema,
  Type,
} from "@google/genai";
import { ExtractionResult, Transaction } from "@/types";

// Using Flash for better instruction following and reliability
const MODEL_NAME = "gemini-2.5-pro";

// Schema for the initial metadata scan
const metadataSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    startYear: {
      type: Type.INTEGER,
      description: "The year of the earliest transaction in the document",
    },
    endYear: {
      type: Type.INTEGER,
      description: "The year of the latest transaction in the document",
    },
    currency: {
      type: Type.STRING,
      description: "The main currency code (e.g. EUR, USD)",
    },
  },
  required: ["startYear", "endYear", "currency"],
};

// Schema for individual chunk extraction
const chunkSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    transactions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING, description: "Transaction ID if available" },
          date: { type: Type.STRING, description: "YYYY-MM-DD" },
          time: { type: Type.STRING, description: "HH:MM" },
          description: { type: Type.STRING },
          amount: { type: Type.NUMBER },
          currency: { type: Type.STRING },
        },
        required: ["date", "amount"],
      },
    },
  },
  required: ["transactions"],
};

interface DocMetadata {
  startYear: number;
  endYear: number;
  currency: string;
}

interface DateRange {
  startDate: string;
  endDate: string;
  year: number;
  quarter: number;
}

export const extractDataFromPDF = async (
  base64Data: string,
  mimeType: string,
): Promise<ExtractionResult> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key not found");

  const ai = new GoogleGenAI({ apiKey });

  try {
    // Step 1: Analyze Document Structure (Date Range)
    const metadata = await getDocumentMetadata(ai, base64Data, mimeType);
    console.log("Document Metadata:", metadata);

    const chunks: DateRange[] = [];

    if (metadata.startYear && metadata.endYear) {
      // Split each year into Quarters to drastically reduce output token size per request
      for (let y = metadata.startYear; y <= metadata.endYear; y++) {
        chunks.push(
          {
            year: y,
            quarter: 1,
            startDate: `${y}-01-01`,
            endDate: `${y}-03-31`,
          },
          {
            year: y,
            quarter: 2,
            startDate: `${y}-04-01`,
            endDate: `${y}-06-30`,
          },
          {
            year: y,
            quarter: 3,
            startDate: `${y}-07-01`,
            endDate: `${y}-09-30`,
          },
          {
            year: y,
            quarter: 4,
            startDate: `${y}-10-01`,
            endDate: `${y}-12-31`,
          },
        );
      }
    } else {
      // Fallback: Use a generic request if metadata extraction fails
      chunks.push({ year: 0, quarter: 0, startDate: "", endDate: "" });
    }

    // Step 2: Parallel Extraction by Quarter
    // 2.5 Flash has high rate limits, so parallel requests are efficient.
    const chunkPromises = chunks.map((chunk) =>
      extractTransactionsForChunk(ai, base64Data, mimeType, chunk),
    );

    const results = await Promise.all(chunkPromises);

    // Step 3: Merge and Aggregate
    const allTransactions: Transaction[] = results
      .flat()
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Filter duplicates (using ID or composite key)
    const uniqueTransactions = Array.from(
      new Map(
        allTransactions.map((item) => {
          const key =
            item.id && item.id.length > 2
              ? item.id
              : `${item.date}-${item.amount}-${item.description?.substring(
                  0,
                  10,
                )}`;
          return [key, item];
        }),
      ).values(),
    );

    const totalAmount = uniqueTransactions.reduce(
      (sum, t) => sum + (t.amount || 0),
      0,
    );

    return {
      transactions: uniqueTransactions,
      totalAmount: totalAmount,
      currency: metadata.currency || "EUR",
      documentDate: new Date().toISOString().split("T")[0],
    };
  } catch (error) {
    console.error("Extraction Workflow Failed:", error);
    throw error;
  }
};

async function getDocumentMetadata(
  ai: GoogleGenAI,
  base64Data: string,
  mimeType: string,
): Promise<DocMetadata> {
  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: [
          { inlineData: { mimeType, data: base64Data } },
          {
            text: "Analyze this document. Identify the start year and end year of the transactions listed. Also identify the currency. Return JSON.",
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: metadataSchema,
        temperature: 0.1,
      },
    });

    return JSON.parse(response.text || "{}") as DocMetadata;
  } catch (e) {
    console.warn("Metadata extraction failed, defaulting to single pass.", e);
    return { startYear: 0, endYear: 0, currency: "EUR" };
  }
}

async function extractTransactionsForChunk(
  ai: GoogleGenAI,
  base64Data: string,
  mimeType: string,
  range: DateRange,
): Promise<Transaction[]> {
  const isGeneric = range.year === 0;

  const prompt = isGeneric
    ? "Extract ALL financial transactions from this document. Return JSON."
    : `Extract only the financial transactions that occurred between ${range.startDate} and ${range.endDate} (inclusive). Return JSON.`;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: [
          { inlineData: { mimeType, data: base64Data } },
          { text: prompt },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: chunkSchema,
        temperature: 0.1,
        // @ts-ignore
        maxOutputTokens: 8192,
        safetySettings: [
          {
            category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
            threshold: HarmBlockThreshold.BLOCK_NONE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
            threshold: HarmBlockThreshold.BLOCK_NONE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_HARASSMENT,
            threshold: HarmBlockThreshold.BLOCK_NONE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
            threshold: HarmBlockThreshold.BLOCK_NONE,
          },
        ],
      },
    });

    if (!response.text) return [];

    const data = JSON.parse(response.text);
    return data.transactions || [];
  } catch (e) {
    console.error(
      `Failed to extract data for ${range.year} Q${range.quarter}:`,
      e,
    );
    return [];
  }
}

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      if (typeof reader.result === "string") {
        const base64String = reader.result.split(",")[1];
        resolve(base64String);
      } else {
        reject(new Error("Failed to convert file to base64"));
      }
    };
    reader.onerror = (error) => reject(error);
  });
};
