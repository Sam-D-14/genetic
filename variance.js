import React, { useState } from 'react';
import { api } from '../../api/client';
import {
  CloudUpload as UploadIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon
} from '@mui/icons-material';
import { buildCacheKey, cacheGet, cacheSet, cacheDel } from '../../utils/excelCache';

export default function ReportingVariance() {
  const [activeTab, setActiveTab] = useState('pipeline');

  // Input files
  const [cyFile, setCyFile] = useState(null);
  const [pyFile, setPyFile] = useState(null);
  const [matFile, setMatFile] = useState(null);

  // Materiality
  const [matSource, setMatSource] = useState('excel');
  const [matOverall, setMatOverall] = useState(0);
  const [matPerformance, setMatPerformance] = useState(0);
  const [matTolerable, setMatTolerable] = useState(0);
  const [matUnit, setMatUnit] = useState('Millions');

  // Results + cache state
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [fromCache, setFromCache] = useState(false);

  // Build the variance cache key from both files + materiality values
  const getVarianceCacheKey = (cy, py, overall, perf, tol) => {
    if (!cy || !py) return null;
    return buildCacheKey(cy, py, String(overall), String(perf), String(tol), 'variance');
  };

  // When files change, auto-restore cached results if available
  const tryRestoreCache = (cy, py, overall, perf, tol) => {
    const key = getVarianceCacheKey(cy, py, overall, perf, tol);
    if (!key) return;
    const cached = cacheGet(key);
    if (cached) {
      setResults(cached);
      setFromCache(true);
      setActiveTab('table');
    }
  };

  const handleMatFileUpload = async (file) => {
    setMatFile(file);
    // Demo values - in production, parse the Excel file
    setMatOverall(2500000);
    setMatPerformance(1875000);
    setMatTolerable(125000);
  };

  const handleDownloadReport = async () => {
    try {
      const blob = await api.exportVarianceReport(
        cyFile,
        pyFile,
        matOverall,
        matPerformance,
        matTolerable
      );

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'variance_analysis_report.xlsx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      alert('Download failed');
      console.error(error);
    }
  };

  const handleRunPipeline = async () => {
    if (!cyFile || !pyFile) {
      alert('Please upload both CY and PY PDF files');
      return;
    }
    if (matOverall === 0) {
      alert('Please set materiality levels');
      return;
    }

    const mult = { Thousands: 1000, Millions: 1000000, Billions: 1000000000 };
    const overallFinal = matOverall * (matSource === 'manual' ? mult[matUnit] : 1);
    const perfFinal = matPerformance * (matSource === 'manual' ? mult[matUnit] : 1);
    const tolFinal = matTolerable * (matSource === 'manual' ? mult[matUnit] : 1);

    const key = getVarianceCacheKey(cyFile, pyFile, overallFinal, perfFinal, tolFinal);

    // Check cache first
    if (key) {
      const cached = cacheGet(key);
      if (cached) {
        setResults(cached);
        setFromCache(true);
        setActiveTab('table');
        return;
      }
    }

    setProcessing(true);
    setError(null);
    setFromCache(false);

    try {
      const result = await api.analyzeVariance(
        cyFile,
        pyFile,
        overallFinal,
        perfFinal,
        tolFinal
      );

      setResults(result);
      if (key) cacheSet(key, result);
      setActiveTab('table');
    } catch (error) {
      console.error('Pipeline error:', error);
      setError(error.message || 'Pipeline failed');
      alert('Pipeline failed: ' + (error.message || 'Unknown error'));
    } finally {
      setProcessing(false);
    }
  };

  const handleReprocess = () => {
    if (!cyFile || !pyFile) return;
    const mult = { Thousands: 1000, Millions: 1000000, Billions: 1000000000 };
    const overallFinal = matOverall * (matSource === 'manual' ? mult[matUnit] : 1);
    const perfFinal = matPerformance * (matSource === 'manual' ? mult[matUnit] : 1);
    const tolFinal = matTolerable * (matSource === 'manual' ? mult[matUnit] : 1);
    const key = getVarianceCacheKey(cyFile, pyFile, overallFinal, perfFinal, tolFinal);
    if (key) cacheDel(key);
    setFromCache(false);
    setResults(null);
    setActiveTab('pipeline');
    // Trigger after state update
    setTimeout(handleRunPipeline, 100);
  };

  const formatValue = (value, currency = '£') => {
    const absVal = Math.abs(value);
    const sign = value < 0 ? '-' : '';
    if (absVal >= 1e9) return `${sign}${currency}${(absVal / 1e9).toFixed(2)}bn`;
    if (absVal >= 1e6) return `${sign}${currency}${(absVal / 1e6).toFixed(2)}m`;
    if (absVal >= 1e3) return `${sign}${currency}${(absVal / 1e3).toFixed(1)}k`;
    return `${sign}${currency}${absVal.toLocaleString()}`;
  };

  const getVarianceColor = (variance) => {
    if (variance > 0) return '#1e8e3e';
    if (variance < 0) return '#d93025';
    return '#5f6368';
  };

  return (
    <div style={{ display: 'flex', minHeight: 'calc(100vh - 57px)' }}>
      {/* SIDEBAR */}
      <div className="sidebar">
        <div style={{ fontSize: '24px', fontWeight: 400, color: '#1a73e8', marginBottom: '8px' }}>
          Variance Analysis
        </div>

        <p style={{ fontSize: '13px', color: '#5f6368', marginBottom: '24px' }}>
          Audit Analytical Procedures
        </p>

        <hr />

        {/* CY FILE */}
        <div className="section-label">Current Year (CY) PDF</div>
        <div className="file-upload" style={{ padding: '20px', marginBottom: '16px' }}>
          <input
            type="file"
            accept=".pdf"
            onChange={(e) => {
              const f = e.target.files[0];
              setCyFile(f);
              setResults(null);
              setFromCache(false);
            }}
            style={{ display: 'none' }}
            id="cy-upload"
          />
          <label htmlFor="cy-upload" style={{ cursor: 'pointer', display: 'block' }}>
            <UploadIcon sx={{ fontSize: 28, color: '#5f6368', marginBottom: '8px' }} />
            <div style={{ fontSize: '13px', color: '#5f6368' }}>
              {cyFile ? `✓ ${cyFile.name}` : 'Upload CY Financial Statements'}
            </div>
          </label>
        </div>

        {/* PY FILE */}
        <div className="section-label">Prior Year (PY) PDF</div>
        <div className="file-upload" style={{ padding: '20px', marginBottom: '16px' }}>
          <input
            type="file"
            accept=".pdf"
            onChange={(e) => {
              const f = e.target.files[0];
              setPyFile(f);
              setResults(null);
              setFromCache(false);
            }}
            style={{ display: 'none' }}
            id="py-upload"
          />
          <label htmlFor="py-upload" style={{ cursor: 'pointer', display: 'block' }}>
            <UploadIcon sx={{ fontSize: 28, color: '#5f6368', marginBottom: '8px' }} />
            <div style={{ fontSize: '13px', color: '#5f6368' }}>
              {pyFile ? `✓ ${pyFile.name}` : 'Upload PY Financial Statements'}
            </div>
          </label>
        </div>

        <hr />

        {/* MATERIALITY */}
        <div className="section-label">Materiality Levels</div>

        <label style={{ display: 'block', fontSize: '13px', color: '#5f6368', marginBottom: '8px' }}>
          <input
            type="radio"
            value="excel"
            checked={matSource === 'excel'}
            onChange={(e) => setMatSource(e.target.value)}
          />{' '}
          Upload Excel (Materiality App)
        </label>

        <label style={{ display: 'block', fontSize: '13px', color: '#5f6368', marginBottom: '16px' }}>
          <input
            type="radio"
            value="manual"
            checked={matSource === 'manual'}
            onChange={(e) => setMatSource(e.target.value)}
          />{' '}
          Enter Manually
        </label>

        {matSource === 'excel' ? (
          <>
            <div className="file-upload" style={{ padding: '20px', marginBottom: '12px' }}>
              <input
                type="file"
                accept=".xlsx"
                onChange={(e) => handleMatFileUpload(e.target.files[0])}
                style={{ display: 'none' }}
                id="mat-upload"
              />
              <label htmlFor="mat-upload" style={{ cursor: 'pointer', display: 'block' }}>
                <UploadIcon sx={{ fontSize: 28, color: '#5f6368', marginBottom: '8px' }} />
                <div style={{ fontSize: '13px', color: '#5f6368' }}>
                  {matFile ? `✓ ${matFile.name}` : 'Upload Materiality Excel'}
                </div>
              </label>
            </div>

            {matFile && (
              <div className="answer-box" style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '8px' }}>
                  Loaded Thresholds:
                </div>
                Overall: {formatValue(matOverall)}
                <br />
                Performance: {formatValue(matPerformance)}
                <br />
                Tolerable: {formatValue(matTolerable)}
              </div>
            )}
          </>
        ) : (
          <>
            <select
              className="input"
              value={matUnit}
              onChange={(e) => setMatUnit(e.target.value)}
              style={{ marginBottom: '12px' }}
            >
              <option>Thousands</option>
              <option>Millions</option>
              <option>Billions</option>
            </select>

            <input
              className="input"
              type="number"
              placeholder="Overall Materiality"
              value={matOverall}
              onChange={(e) => setMatOverall(parseFloat(e.target.value) || 0)}
              style={{ marginBottom: '8px' }}
            />

            <input
              className="input"
              type="number"
              placeholder="Performance Materiality"
              value={matPerformance}
              onChange={(e) => setMatPerformance(parseFloat(e.target.value) || 0)}
              style={{ marginBottom: '8px' }}
            />

            <input
              className="input"
              type="number"
              placeholder="Tolerable Misstatement"
              value={matTolerable}
              onChange={(e) => setMatTolerable(parseFloat(e.target.value) || 0)}
            />
          </>
        )}

        <hr />

        <button
          className="btn btn-outlined"
          onClick={() => {
            setCyFile(null);
            setPyFile(null);
            setMatFile(null);
            setResults(null);
            setMatOverall(0);
            setMatPerformance(0);
            setMatTolerable(0);
            setError(null);
            setFromCache(false);
          }}
          style={{ width: '100%' }}
        >
          <DeleteIcon sx={{ fontSize: 18, marginRight: '8px' }} />
          Reset All
        </button>
      </div>

      {/* MAIN CONTENT */}
      <div className="main-with-sidebar">
        <h1>Audit Variance Analysis Report</h1>

        <p style={{ marginBottom: '32px' }}>
          Extract FSLIs from CY/PY statements, compute variances, flag significant
          movements, and generate audit narratives.
        </p>

        {error && (
          <div className="alert error" style={{ marginBottom: '24px' }}>
            <span style={{ fontSize: '20px' }}>❌</span>
            <div>
              <strong>Error:</strong> {error}
            </div>
          </div>
        )}

        {/* Cache badge + re-process */}
        {fromCache && results && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              marginBottom: 16,
              padding: '10px 16px',
              background: '#e8f0fe',
              borderRadius: 8,
              fontSize: 13
            }}
          >
            <span style={{ color: '#1a73e8', fontWeight: 600 }}>⚡ Results loaded from session cache</span>
            <button
              className="btn btn-outlined"
              onClick={handleReprocess}
              style={{ padding: '4px 14px', fontSize: 12 }}
            >
              🔄 Re-process
            </button>
          </div>
        )}

        {/* TABS */}
        <div className="tabs-container">
          <button
            className={`tab-btn ${activeTab === 'pipeline' ? 'active' : ''}`}
            onClick={() => setActiveTab('pipeline')}
          >
            Run Pipeline
          </button>

          <button
            className={`tab-btn ${activeTab === 'table' ? 'active' : ''}`}
            onClick={() => setActiveTab('table')}
            disabled={!results}
          >
            Variance Table
          </button>

          <button
            className={`tab-btn ${activeTab === 'report' ? 'active' : ''}`}
            onClick={() => setActiveTab('report')}
            disabled={!results}
          >
            Report & Export
          </button>
        </div>

        {/* PIPELINE TAB */}
        {activeTab === 'pipeline' && (
          <div>
            <div className="section-label">Pre-flight Checklist</div>

            {[
              { label: 'CY Financial Statements PDF', ok: !!cyFile },
              { label: 'PY Financial Statements PDF', ok: !!pyFile },
              { label: 'Materiality Levels', ok: matOverall > 0 }
            ].map((item) => (
              <div
                key={item.label}
                style={{
                  fontSize: '14px',
                  color: item.ok ? '#1e8e3e' : '#d93025',
                  padding: '6px 0',
                  fontWeight: 500
                }}
              >
                {item.ok ? '✓' : '✗'} {item.label}
              </div>
            ))}

            {matOverall > 0 && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '16px',
                  marginTop: '24px'
                }}
              >
                {[
                  { label: 'Overall Materiality', val: matOverall, color: '#202124' },
                  { label: 'Performance Materiality', val: matPerformance, color: '#1e8e3e' },
                  { label: 'Tolerable Misstatement', val: matTolerable, color: '#ea8600' }
                ].map(({ label, val, color }) => {
                  const mult = { Thousands: 1000, Millions: 1000000, Billions: 1000000000 };
                  const final = val * (matSource === 'manual' ? mult[matUnit] : 1);
                  return (
                    <div className="metric-card" key={label}>
                      <div className="metric-label">{label}</div>
                      <div className="metric-value" style={{ fontSize: '28px', color }}>
                        {formatValue(final)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <button
              className="btn"
              onClick={handleRunPipeline}
              disabled={!cyFile || !pyFile || matOverall === 0 || processing}
              style={{ marginTop: '24px', width: '100%' }}
            >
              {processing ? 'Processing Pipeline...' : 'Run Full Variance Analysis'}
            </button>

            {processing && (
              <div style={{ marginTop: '24px', textAlign: 'center' }}>
                <div className="spinner"></div>
                <p style={{ marginTop: '16px', color: '#5f6368' }}>
                  Extracting figures, computing variances, generating narratives...
                </p>
              </div>
            )}
          </div>
        )}

        {/* TABLE TAB */}
        {activeTab === 'table' && results && (
          <div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '16px',
                marginBottom: '32px'
              }}
            >
              <div className="metric-card">
                <div className="metric-label">Company</div>
                <div className="metric-value" style={{ fontSize: '16px', lineHeight: 1.3 }}>
                  {results.company_name}
                </div>
              </div>
              <div className="metric-card">
                <div className="metric-label">FSLIs Analyzed</div>
                <div className="metric-value" style={{ fontSize: '32px' }}>
                  {results.variance_table.length}
                </div>
              </div>
              <div className="metric-card">
                <div className="metric-label">Significant ⚠</div>
                <div className="metric-value" style={{ fontSize: '32px', color: '#d93025' }}>
                  {results.variance_table.filter((r) => r.significant).length}
                </div>
              </div>
              <div className="metric-card">
                <div className="metric-label">Immaterial ✓</div>
                <div className="metric-value" style={{ fontSize: '32px', color: '#1e8e3e' }}>
                  {results.variance_table.filter((r) => !r.significant).length}
                </div>
              </div>
            </div>

            <table className="data-table">
              <thead>
                <tr>
                  <th>FSLI</th>
                  <th style={{ textAlign: 'right' }}>CY {results.cy_year}</th>
                  <th style={{ textAlign: 'right' }}>PY {results.py_year}</th>
                  <th style={{ textAlign: 'right' }}>Variance ({results.currency})</th>
                  <th style={{ textAlign: 'center' }}>Var %</th>
                  <th style={{ textAlign: 'center' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {results.variance_table.map((row, i) => (
                  <tr
                    key={i}
                    style={{ background: row.significant ? '#fef7e0' : 'transparent' }}
                  >
                    <td style={{ fontWeight: row.significant ? 600 : 400 }}>{row.fsli}</td>
                    <td style={{ textAlign: 'right' }}>
                      {formatValue(row.cy_value, results.currency)}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {formatValue(row.py_value, results.currency)}
                    </td>
                    <td
                      style={{
                        textAlign: 'right',
                        color: getVarianceColor(row.variance_abs),
                        fontWeight: row.significant ? 600 : 400
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'flex-end',
                          gap: '4px'
                        }}
                      >
                        {row.variance_abs > 0 ? (
                          <TrendingUpIcon sx={{ fontSize: 16 }} />
                        ) : row.variance_abs < 0 ? (
                          <TrendingDownIcon sx={{ fontSize: 16 }} />
                        ) : null}
                        {formatValue(row.variance_abs, results.currency)}
                      </div>
                    </td>
                    <td
                      style={{
                        textAlign: 'center',
                        color: getVarianceColor(row.variance_abs)
                      }}
                    >
                      {row.variance_pct > 0 ? '+' : ''}
                      {row.variance_pct.toFixed(1)}%
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {row.significant ? (
                        <span
                          style={{
                            background: '#fce8e6',
                            color: '#d93025',
                            padding: '4px 12px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: 600
                          }}
                        >
                          ⚠ SIGNIFICANT
                        </span>
                      ) : (
                        <span style={{ color: '#80868b', fontSize: '12px' }}>—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* REPORT TAB */}
        {activeTab === 'report' && results && (
          <div>
            <div className="section-label">Executive Summary</div>
            <div className="answer-box" style={{ marginBottom: '32px' }}>
              {results.exec_summary}
            </div>

            <hr />

            <div className="section-label">Significant Variance Narratives</div>

            {results.variance_table
              .filter((row) => row.significant)
              .map((row, i) => (
                <div key={i} style={{ marginBottom: '24px' }}>
                  <div
                    style={{
                      background: '#fef7e0',
                      border: '1px solid #ea8600',
                      borderLeft: '4px solid #ea8600',
                      borderRadius: '8px',
                      padding: '12px 16px',
                      marginBottom: '8px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div style={{ fontWeight: 600, color: '#202124' }}>{row.fsli}</div>
                    <div style={{ fontSize: '13px', color: '#5f6368' }}>
                      CY: {formatValue(row.cy_value, results.currency)} | PY:{' '}
                      {formatValue(row.py_value, results.currency)} | Var:{' '}
                      <span
                        style={{
                          color: getVarianceColor(row.variance_abs),
                          fontWeight: 600
                        }}
                      >
                        {formatValue(row.variance_abs, results.currency)} (
                        {row.variance_pct > 0 ? '+' : ''}
                        {row.variance_pct.toFixed(1)}%)
                      </span>
                    </div>
                  </div>

                  <div className="answer-box">
                    {results.narratives[row.fsli] || 'Narrative pending generation...'}
                  </div>
                </div>
              ))}

            <hr />

            <button
              className="btn btn-success"
              onClick={handleDownloadReport}
              style={{ width: '100%' }}
            >
              <DownloadIcon sx={{ fontSize: 18, marginRight: '8px' }} />
              Download Variance Analysis Working Paper (.xlsx)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
