import {
  GoogleGenAI,
  HarmBlockThreshold,
  HarmCategory,
  Schema,
  Type,
} from "@google/genai";
import { ExtractionResult, Transaction } from "@/types";

// Using 1.5 Pro for massive context window and high reliability on full documents
const MODEL_NAME = "gemini-2.5-flash-lite";

// Schema for full extraction
const extractionSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    currency: {
      type: Type.STRING,
      description: "The main currency code (e.g. EUR, USD)",
    },
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
        required: ["date", "amount", "description"],
      },
    },
  },
  required: ["transactions", "currency"],
};

export const extractDataFromPDF = async (
  base64Data: string,
  mimeType: string,
): Promise<ExtractionResult> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key not found");

  const ai = new GoogleGenAI({ apiKey });

  try {
    // Single pass extraction using the high-context model
    const result = await extractAllTransactions(ai, base64Data, mimeType);

    const allTransactions: Transaction[] = result.transactions.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );

    // Filter duplicates (using ID or composite key) just in case, though less likely in single pass
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
      currency: result.currency || "EUR",
      documentDate: new Date().toISOString().split("T")[0],
    };
  } catch (error) {
    console.error("Extraction Workflow Failed:", error);
    throw error;
  }
};

async function extractAllTransactions(
  ai: GoogleGenAI,
  base64Data: string,
  mimeType: string,
): Promise<{ transactions: Transaction[]; currency: string }> {
  const prompt = `
    Extract ALL financial transactions from this document into a structured JSON format.
    
    Rules:
    1. Extract every single transaction row found in the tables. Do not summarize.
    2. Ensure the 'amount' is a number. Negative values (outflows) should be negative numbers.
    3. Convert dates to YYYY-MM-DD format.
    4. Identify the main currency of the document.
    5. If a transaction ID is present, include it.
    6. Ignore running balances or subtotal lines, only extract actual transaction rows.
  `;

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
        responseSchema: extractionSchema,
        temperature: 0.0, // Zero temperature for maximum determinism
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

    if (!response.text) return { transactions: [], currency: "EUR" };

    const data = JSON.parse(response.text);
    return {
      transactions: data.transactions || [],
      currency: data.currency || "EUR",
    };
  } catch (e) {
    console.error("Failed to extract data:", e);
    throw e;
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
