import React, { useState, useCallback } from "react";
import { extractDataFromPDF, fileToBase64 } from "./services/geminiService";
import { Transaction, ExtractionResult, AppState } from "./types";
import { SummaryCard } from "./components/SummaryCard";
import { TransactionsTable } from "./components/TransactionsTable";
import { Charts } from "./components/Charts";

// Icons
const UploadIcon = () => (
  <svg
    className="w-10 h-10 text-[#FF5C5C]"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
    />
  </svg>
);

const EuroIcon = () => (
  <svg
    className="w-6 h-6"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M14.121 15.536c-1.171 1.952-3.07 1.952-4.242 0-1.172-1.953-1.172-5.119 0-7.072 1.171-1.952 3.07-1.952 4.242 0M8 10.5h4m-4 3h4"
    />
  </svg>
);

const ChartIcon = () => (
  <svg
    className="w-6 h-6"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
    />
  </svg>
);

const ReceiptIcon = () => (
  <svg
    className="w-6 h-6"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
    />
  </svg>
);

function App() {
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<{
    total: number;
    currency: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      // Basic validation
      if (file.type !== "application/pdf") {
        setError("Please upload a valid PDF file.");
        return;
      }

      setAppState(AppState.ANALYZING);
      setError(null);

      try {
        const base64Data = await fileToBase64(file);
        const result: ExtractionResult = await extractDataFromPDF(
          base64Data,
          file.type,
        );

        setTransactions(result.transactions);
        setSummary({
          total: result.totalAmount,
          currency: result.currency || "€",
        });
        setAppState(AppState.SUCCESS);
      } catch (err) {
        console.error(err);
        setError(
          "Failed to process document. Please try again or ensure the API key is valid.",
        );
        setAppState(AppState.ERROR);
      }
    },
    [],
  );

  const reset = () => {
    setAppState(AppState.IDLE);
    setTransactions([]);
    setSummary(null);
    setError(null);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#1A1A1A] text-[#FFFFFF] selection:bg-[#FF5C5C]/30">
      {/* Header */}
      <header className="border-b border-[#4A4A4A] bg-[#1A1A1A]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex justify-between items-center">
          <div
            className="flex items-center space-x-3 cursor-pointer group"
            onClick={reset}
          >
            <div className="bg-[#2C2C2C] border border-[#4A4A4A] p-2 rounded-[8px] group-hover:border-[#FF5C5C] transition-colors duration-300 text-[#FF5C5C]">
              <ReceiptIcon />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-[#FFFFFF]">
              DocuLytics <span className="text-[#FF5C5C]">AI</span>
            </h1>
          </div>
          <div className="flex items-center space-x-4">
            <div className="hidden sm:block text-xs font-medium px-3 py-1 rounded-full bg-[#2C2C2C] border border-[#4A4A4A] text-[#A0A0A0]">
              Powered by Gemini 2.5
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow p-4 sm:p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Hero / Upload Section */}
          {appState === AppState.IDLE && (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-8 animate-fade-in-up">
              <div className="space-y-4 max-w-2xl">
                <h2 className="text-[48px] font-bold tracking-tight text-[#FFFFFF] leading-tight">
                  Turn your Vinted reports into{" "}
                  <span className="text-[#FF5C5C]">Actionable Data</span>
                </h2>
                <p className="text-[18px] text-[#A0A0A0] leading-relaxed">
                  Upload your transaction logs. <br /> Our AI extracts every
                  detail instantly for analysis.
                </p>
              </div>

              <div className="w-full max-w-xl group">
                <label className="relative flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-[#4A4A4A] rounded-[24px] cursor-pointer bg-[#2C2C2C] hover:bg-[#333333] hover:border-[#FF5C5C] transition-all duration-300 overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-[#FF5C5C]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="flex flex-col items-center justify-center pt-5 pb-6 z-10">
                    <div className="p-4 bg-[#1A1A1A] rounded-full mb-4 group-hover:scale-110 transition-transform duration-300 shadow-xl border border-[#4A4A4A] flex flex-col items-center justify-center">
                      <UploadIcon />
                    </div>
                    <p className="mb-2 text-sm text-[#A0A0A0] font-medium">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-xs text-[#666666]">
                      Supported Format: PDF (MAX. 10MB)
                    </p>
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    accept="application/pdf"
                    onChange={handleFileUpload}
                  />
                </label>
              </div>
            </div>
          )}

          {/* Loading State */}
          {appState === AppState.ANALYZING && (
            <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-8 animate-fade-in">
              <style>{`
                @keyframes scan {
                  0%, 100% { top: 0%; opacity: 0; }
                  10% { opacity: 1; }
                  90% { opacity: 1; }
                  100% { top: 100%; opacity: 0; }
                }
                .scan-line {
                  animation: scan 2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
                }
              `}</style>
              <div className="relative w-32 h-40 bg-[#2C2C2C] border-2 border-[#4A4A4A] rounded-[16px] overflow-hidden shadow-2xl flex flex-col p-4 space-y-3">
                {/* Document Lines */}
                <div className="w-3/4 h-2 bg-[#4A4A4A] rounded-full opacity-50"></div>
                <div className="w-full h-2 bg-[#4A4A4A] rounded-full opacity-30"></div>
                <div className="w-5/6 h-2 bg-[#4A4A4A] rounded-full opacity-30"></div>
                <div className="w-full h-2 bg-[#4A4A4A] rounded-full opacity-30"></div>
                <div className="w-4/5 h-2 bg-[#4A4A4A] rounded-full opacity-30"></div>
                <div className="w-full h-2 bg-[#4A4A4A] rounded-full opacity-30"></div>

                {/* Scan Line */}
                <div className="absolute left-0 w-full h-12 bg-gradient-to-b from-[#FF5C5C]/5 to-[#FF5C5C]/40 border-b-2 border-[#FF5C5C] scan-line blur-[1px]"></div>
              </div>

              <div className="text-center space-y-2">
                <h3 className="text-[18px] font-semibold text-[#FFFFFF]">
                  Analyzing Document...
                </h3>
                <p className="text-[#A0A0A0]">
                  Extracting financial data powered by Gemini 2.5
                </p>
              </div>
            </div>
          )}

          {/* Error State */}
          {appState === AppState.ERROR && (
            <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-6">
              <div className="bg-[#FF5C5C]/10 text-[#FF5C5C] p-6 rounded-full border border-[#FF5C5C]/20">
                <svg
                  className="w-12 h-12"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-[24px] font-bold text-[#FFFFFF]">
                  Analysis Failed
                </h3>
                <p className="text-[#A0A0A0] max-w-md">{error}</p>
              </div>
              <button
                onClick={reset}
                className="mt-4 px-8 py-3 bg-[#FF5C5C] text-[#FFFFFF] font-semibold rounded-[8px] hover:bg-[#ff7676] transition-all shadow-lg hover:shadow-[#FF5C5C]/20"
              >
                Try Another File
              </button>
            </div>
          )}

          {/* Results Dashboard */}
          {appState === AppState.SUCCESS && summary && (
            <div className="space-y-8 animate-fade-in pb-12">
              <div className="flex justify-between items-center border-b border-[#4A4A4A] pb-6">
                <div>
                  <h2 className="text-[24px] font-bold text-[#FFFFFF]">
                    Analysis Report
                  </h2>
                  <p className="text-sm text-[#A0A0A0] mt-1">
                    Overview of extracted financial data
                  </p>
                </div>
                <button
                  onClick={reset}
                  className="px-4 py-2 text-sm font-medium text-[#A0A0A0] bg-[#2C2C2C] border border-[#4A4A4A] rounded-[8px] hover:bg-[#333333] hover:text-[#FFFFFF] transition-colors"
                >
                  Upload New File
                </button>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <SummaryCard
                  title="Total Value"
                  value={`${summary.currency} ${summary.total.toFixed(2)}`}
                  colorClass=""
                  icon={<EuroIcon />}
                  trend="Extracted Total"
                />
                <SummaryCard
                  title="Transactions"
                  value={transactions.length}
                  colorClass=""
                  icon={<ReceiptIcon />}
                />
                <SummaryCard
                  title="Average Value"
                  value={`${summary.currency} ${(summary.total / transactions.length).toFixed(2)}`}
                  colorClass=""
                  icon={<ChartIcon />}
                />
              </div>

              {/* Visualizations */}
              <Charts transactions={transactions} />

              {/* Detailed Data */}
              <div className="h-[600px]">
                <TransactionsTable transactions={transactions} />
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
