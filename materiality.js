import React, { useState, useEffect } from "react";
import { api } from "../../api/client";
import {
  CloudUpload as UploadIcon,
  Delete as DeleteIcon,
  Calculate as CalculateIcon,
  Description as DescriptionIcon
} from "@mui/icons-material";
import { buildCacheKey, cacheGet, cacheSet, cacheDel } from "../../utils/excelCache";

const INDUSTRY_DATA = {
  "Banking / Financial Services": {
    benchmarks: {
      "Profit Before Tax (PBT)": { range_min: 0.5, range_max: 2.0, description: "0.5% – 2% of PBT" },
      "Total Assets": { range_min: 0.25, range_max: 0.5, description: "0.25% – 0.5% of Total Assets" }
    },
    performance_pct: 75,
    tolerable_pct: 5
  },
  Insurance: {
    benchmarks: {
      "Gross Written Premiums (GWP)": { range_min: 0.5, range_max: 1.0, description: "0.5% – 1% of GWP" },
      "Net Assets": { range_min: 0.5, range_max: 1.0, description: "0.5% – 1% of Net Assets" }
    },
    performance_pct: 70,
    tolerable_pct: 5
  },
  Manufacturing: {
    benchmarks: {
      Revenue: { range_min: 0.5, range_max: 1.0, description: "0.5% – 1% of Revenue" },
      "Profit Before Tax (PBT)": { range_min: 5.0, range_max: 5.0, description: "5% of PBT" }
    },
    performance_pct: 75,
    tolerable_pct: 5
  },
  "Retail / Consumer": {
    benchmarks: {
      Revenue: { range_min: 0.25, range_max: 0.5, description: "0.25% – 0.5% of Revenue" },
      "Gross Profit": { range_min: 5.0, range_max: 5.0, description: "5% of Gross Profit" }
    },
    performance_pct: 70,
    tolerable_pct: 5
  }
};

export default function Materiality() {
  const [industry, setIndustry] = useState("Banking / Financial Services");
  const [benchmark, setBenchmark] = useState("Profit Before Tax (PBT)");
  const [overallPct, setOverallPct] = useState(1.0);
  const [performancePct, setPerformancePct] = useState(
    INDUSTRY_DATA["Banking / Financial Services"].performance_pct
  );
  const [tolerablePct, setTolerablePct] = useState(
    INDUSTRY_DATA["Banking / Financial Services"].tolerable_pct
  );

  const [pdfFile, setPdfFile] = useState(null);
  const [extracting, setExtracting] = useState(false);
  const [extractedData, setExtractedData] = useState(null);
  const [fromCache, setFromCache] = useState(false);

  const [useManual, setUseManual] = useState(false);
  const [manualValue, setManualValue] = useState("");
  const [manualUnit, setManualUnit] = useState("Millions");

  const [calcResults, setCalcResults] = useState(null);
  const [analysis, setAnalysis] = useState("");
  const [generating, setGenerating] = useState(false);

  const industryConfig = INDUSTRY_DATA[industry];
  const benchmarkOptions = Object.keys(industryConfig.benchmarks);

  const unitMultiplier = { Units: 1, Thousands: 1000, Millions: 1000000, Billions: 1000000000 };

  const formatCurrency = (value, currency = "£") => {
    if (!value) return `${currency}0`;
    if (value >= 1_000_000_000) return `${currency}${(value / 1_000_000_000).toFixed(2)}B`;
    if (value >= 1_000_000) return `${currency}${(value / 1_000_000).toFixed(2)}M`;
    if (value >= 1000) return `${currency}${(value / 1000).toFixed(2)}K`;
    return `${currency}${Number(value).toLocaleString()}`;
  };

  // When a new PDF is selected, try to restore from cache
  const handleFileChange = (file) => {
    setPdfFile(file);
    setExtractedData(null);
    setFromCache(false);
    setCalcResults(null);
    setAnalysis("");

    if (!file) return;

    const key = buildCacheKey(file, "materiality-extract");
    const cached = cacheGet(key);
    if (cached) {
      setExtractedData(cached);
      setFromCache(true);
    }
  };

  const handleExtract = async () => {
    if (!pdfFile) return;

    const key = buildCacheKey(pdfFile, "materiality-extract");

    // Check cache first — skip API if hit
    const cached = cacheGet(key);
    if (cached) {
      setExtractedData(cached);
      setFromCache(true);
      alert("Loaded from cache ⚡");
      return;
    }

    setExtracting(true);
    setFromCache(false);

    try {
      const result = await api.extractMateriality(pdfFile);
      setExtractedData(result);
      cacheSet(key, result);
      alert("PDF extraction completed");
    } catch (error) {
      alert("Extraction failed: " + error.message);
    }

    setExtracting(false);
  };

  const handleCalculate = () => {
    let benchmarkValue = 0;

    if (useManual) {
      benchmarkValue = Number(manualValue || 0) * unitMultiplier[manualUnit];
    } else {
      if (!extractedData?.figures?.length) {
        alert("No figures extracted from PDF");
        return;
      }

      const matchedFigure = extractedData.figures.find((item) =>
        item.label?.toLowerCase().includes(benchmark.toLowerCase().split("(")[0].trim())
      );

      benchmarkValue =
        matchedFigure?.value_float || extractedData.figures[0]?.value_float || 0;
    }

    if (!benchmarkValue) {
      alert("Please upload PDF or enter manual value");
      return;
    }

    const overall = benchmarkValue * (overallPct / 100);
    const performance = overall * (performancePct / 100);
    const tolerable = overall * (tolerablePct / 100);

    setCalcResults({ benchmarkValue, overall, performance, tolerable });
  };

  const handleGenerateAnalysis = () => {
    if (!calcResults) return;

    setGenerating(true);

    setTimeout(() => {
      setAnalysis(`
Benchmark Selected: ${benchmark}

Industry: ${industry}

Overall Materiality (${overallPct}%):
${formatCurrency(calcResults.overall)}

Performance Materiality (${performancePct}%):
${formatCurrency(calcResults.performance)}

Tolerable Misstatement (${tolerablePct}%):
${formatCurrency(calcResults.tolerable)}

This materiality threshold aligns with ISA 320 planning standards and is suitable for audit planning purposes.
      `);

      setGenerating(false);
    }, 1000);
  };

  const handleReset = () => {
    if (pdfFile) {
      cacheDel(buildCacheKey(pdfFile, "materiality-extract"));
    }
    setPdfFile(null);
    setExtractedData(null);
    setManualValue("");
    setCalcResults(null);
    setAnalysis("");
    setFromCache(false);
  };

  return (
    <div style={{ display: "flex", minHeight: "calc(100vh - 57px)" }}>
      {/* SIDEBAR */}
      <div className="sidebar">
        <div style={{ fontSize: "24px", fontWeight: 400, color: "#1a73e8", marginBottom: "8px" }}>
          📊 Materiality
        </div>

        <p style={{ fontSize: "13px", color: "#5f6368", marginBottom: "24px" }}>
          Audit Planning Threshold Calculator
        </p>

        <hr />

        <div className="section-label">Industry</div>
        <select
          className="input"
          value={industry}
          onChange={(e) => {
            const selected = e.target.value;
            setIndustry(selected);
            const config = INDUSTRY_DATA[selected];
            setBenchmark(Object.keys(config.benchmarks)[0]);
            setPerformancePct(config.performance_pct);
            setTolerablePct(config.tolerable_pct);
          }}
        >
          {Object.keys(INDUSTRY_DATA).map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>

        <div className="section-label">Benchmark</div>
        <select
          className="input"
          value={benchmark}
          onChange={(e) => setBenchmark(e.target.value)}
        >
          {benchmarkOptions.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>

        <div className="section-label">Performance Materiality %</div>
        <input
          className="input"
          type="number"
          min="0"
          max="100"
          value={performancePct}
          onChange={(e) => setPerformancePct(Number(e.target.value))}
        />

        <div className="section-label">Tolerable Misstatement %</div>
        <input
          className="input"
          type="number"
          min="0"
          max="100"
          value={tolerablePct}
          onChange={(e) => setTolerablePct(Number(e.target.value))}
        />

        <hr />

        <button
          className="btn btn-outlined"
          onClick={handleReset}
          style={{ width: "100%" }}
        >
          <DeleteIcon sx={{ fontSize: 18, marginRight: "8px" }} />
          Reset
        </button>
      </div>

      {/* MAIN */}
      <div className="main-with-sidebar">
        <h1>Audit Materiality Calculator</h1>

        <p style={{ marginBottom: "32px" }}>
          Calculate overall materiality, performance materiality, and tolerable
          misstatement thresholds for audit planning.
        </p>

        <div className="metric-card">
          <div className="section-label">Upload Financial Statements (PDF)</div>

          <input
            type="file"
            accept=".pdf,.xlsx,.xls"
            onChange={(e) => handleFileChange(e.target.files[0])}
          />

          {pdfFile && (
            <p style={{ marginTop: 12 }}>
              ✓ {pdfFile.name}
              {fromCache && (
                <span
                  style={{
                    marginLeft: 10,
                    background: "#e8f0fe",
                    color: "#1a73e8",
                    padding: "2px 10px",
                    borderRadius: 12,
                    fontSize: 11,
                    fontWeight: 600
                  }}
                >
                  ⚡ FROM CACHE
                </span>
              )}
            </p>
          )}

          <button
            className="btn"
            onClick={handleExtract}
            disabled={!pdfFile || extracting}
            style={{ marginTop: 16 }}
          >
            <UploadIcon sx={{ fontSize: 18, marginRight: "8px" }} />
            {extracting ? "Extracting..." : fromCache ? "⚡ Re-use Cached" : "Extract Figures"}
          </button>

          {fromCache && (
            <button
              className="btn btn-outlined"
              onClick={async () => {
                if (!pdfFile) return;
                cacheDel(buildCacheKey(pdfFile, "materiality-extract"));
                setFromCache(false);
                setExtractedData(null);
                await handleExtract();
              }}
              style={{ marginTop: 8, marginLeft: 8 }}
            >
              🔄 Re-process
            </button>
          )}
        </div>

        <div className="metric-card" style={{ marginTop: 24 }}>
          <div className="section-label">Manual Override</div>

          <label>
            <input
              type="checkbox"
              checked={useManual}
              onChange={(e) => setUseManual(e.target.checked)}
            />{" "}
            Use Manual Entry
          </label>

          {useManual && (
            <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
              <input
                className="input"
                type="number"
                placeholder="Enter value"
                value={manualValue}
                onChange={(e) => setManualValue(e.target.value)}
              />
              <select
                className="input"
                value={manualUnit}
                onChange={(e) => setManualUnit(e.target.value)}
              >
                <option>Units</option>
                <option>Thousands</option>
                <option>Millions</option>
                <option>Billions</option>
              </select>
            </div>
          )}
        </div>

        <button className="btn" onClick={handleCalculate} style={{ marginTop: 24 }}>
          <CalculateIcon sx={{ fontSize: 18, marginRight: "8px" }} />
          Calculate Materiality
        </button>

        {calcResults && (
          <>
            <div
              style={{
                marginTop: 32,
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 16
              }}
            >
              <div className="metric-card">
                <div className="metric-label">Overall Materiality</div>
                <div className="metric-value">{formatCurrency(calcResults.overall)}</div>
              </div>
              <div className="metric-card">
                <div className="metric-label">Performance Materiality</div>
                <div className="metric-value">{formatCurrency(calcResults.performance)}</div>
              </div>
              <div className="metric-card">
                <div className="metric-label">Tolerable Misstatement</div>
                <div className="metric-value">{formatCurrency(calcResults.tolerable)}</div>
              </div>
            </div>

            <button
              className="btn"
              style={{ marginTop: 24 }}
              onClick={handleGenerateAnalysis}
              disabled={generating}
            >
              <DescriptionIcon sx={{ fontSize: 18, marginRight: "8px" }} />
              {generating ? "Generating..." : "Generate Analysis"}
            </button>
          </>
        )}

        {analysis && (
          <div className="answer-box" style={{ marginTop: 24, whiteSpace: "pre-wrap" }}>
            {analysis}
          </div>
        )}
      </div>
    </div>
  );
}
