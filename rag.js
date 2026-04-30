// import React, { useState, useEffect } from 'react';
// import { api } from '../../api/client';

// export default function PlanningRag() {
//   const [kbStatus, setKbStatus] = useState({
//     ready: false,
//     chunk_count: 0,
//     doc_count: 0
//   });

//   const [files, setFiles] = useState([]);
//   const [building, setBuilding] = useState(false);
//   const [activeTab, setActiveTab] = useState('query');
//   const [query, setQuery] = useState('');
//   const [history, setHistory] = useState([]);
//   const [loading, setLoading] = useState(false);
//   const [topK, setTopK] = useState(4);
//   const [showEvidence, setShowEvidence] = useState(true);
//   const [excelFile, setExcelFile] = useState(null);
//   const [processing, setProcessing] = useState(false);

//   useEffect(() => {
//     loadKBStatus();
//   }, []);

//   const loadKBStatus = async () => {
//     const status = await api.getKBStatus();
//     setKbStatus(status);
//   };

//   const handleBuildKB = async () => {
//     if (files.length === 0) return;

//     setBuilding(true);
//     try {
//       const result = await api.buildKB(files);
//       setKbStatus({
//         ready: true,
//         chunk_count: result.chunk_count,
//         doc_count: result.doc_count
//       });
//       setFiles([]);
//     } catch (error) {
//       alert("Failed to build KB: " + error.message);
//     } finally {
//       setBuilding(false);
//     }
//   };

//   const handleQuery = async () => {
//     if (!query.trim() || !kbStatus.ready) return;

//     setLoading(true);
//     try {
//       const result = await api.ragQuery(query, topK);
//       setHistory([
//         {
//           query,
//           answer: result.answer,
//           evidence: result.evidence
//         },
//         ...history
//       ]);
//       setQuery('');
//     } catch (error) {
//       alert("Query failed: " + error.message);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleExcelProcess = async () => {
//     if (!excelFile) return;

//     setProcessing(true);
//     try {
//       await api.processExcel(excelFile, topK);
//       alert("Excel processing complete!");
//       setExcelFile(null);
//     } catch (error) {
//       alert("Processing failed: " + error.message);
//     } finally {
//       setProcessing(false);
//     }
//   };

//   return (
//     <div style={{ display: "flex" }}>
//       {/* SIDEBAR */}
//       <div className="sidebar">
//         <div style={{
//           fontFamily: "IBM Plex Mono, monospace",
//           fontSize: "16px",
//           fontWeight: 700,
//           color: "#58a6ff",
//           marginBottom: "4px"
//         }}>
//           🔍 Audit RAG
//         </div>

//         <div style={{
//           fontSize: "12px",
//           color: "#8b949e",
//           marginBottom: "16px"
//         }}>
//           Knowledge Base Manager
//         </div>

//         <hr />

//         <div className="section-label">Knowledge Base Status</div>

//         <div style={{
//           fontSize: "13px",
//           color: kbStatus.ready ? "#3fb950" : "#f85149",
//           marginBottom: "16px"
//         }}>
//           {kbStatus.ready ? "✓ Ready" : "✗ Not Built"}
//         </div>

//         {kbStatus.ready && (
//           <div style={{
//             display: "grid",
//             gridTemplateColumns: "1fr 1fr",
//             gap: "12px",
//             marginBottom: "20px"
//           }}>
//             <div className="metric-card">
//               <div className="metric-label">DOCS</div>
//               <div className="metric-value">{kbStatus.doc_count}</div>
//             </div>

//             <div className="metric-card">
//               <div className="metric-label">CHUNKS</div>
//               <div className="metric-value">{kbStatus.chunk_count}</div>
//             </div>
//           </div>
//         )}

//         <hr />

//         <div className="section-label">Upload Documents</div>

//         <input
//           type="file"
//           multiple
//           accept=".pdf,.docx"
//           onChange={(e) => setFiles(Array.from(e.target.files))}
//           style={{ marginBottom: "16px" }}
//         />

//         {files.length > 0 && (
//           <div style={{
//             fontSize: "12px",
//             color: "#8b949e",
//             marginBottom: "16px"
//           }}>
//             ✓ {files.length} file(s) selected
//           </div>
//         )}

//         <button
//           className="btn"
//           onClick={handleBuildKB}
//           disabled={files.length === 0 || building}
//           style={{ width: "100%" }}
//         >
//           {building ? "Building..." : "⚙ Build Knowledge Base"}
//         </button>

//         <hr />

//         <div className="section-label">Settings</div>

//         <label style={{
//           display: "block",
//           fontSize: "12px",
//           color: "#8b949e",
//           marginBottom: "8px"
//         }}>
//           Evidence Chunks (k): {topK}
//         </label>

//         <input
//           type="range"
//           min="2"
//           max="8"
//           value={topK}
//           onChange={(e) => setTopK(parseInt(e.target.value))}
//           style={{
//             width: "100%",
//             marginBottom: "16px"
//           }}
//         />

//         <label style={{
//           fontSize: "12px",
//           color: "#8b949e"
//         }}>
//           <input
//             type="checkbox"
//             checked={showEvidence}
//             onChange={(e) => setShowEvidence(e.target.checked)}
//           />
//           {" "}Show Evidence
//         </label>

//         <hr />

//         <button
//           className="btn"
//           onClick={() => setHistory([])}
//           style={{ width: "100%" }}
//         >
//           🗑 Clear History
//         </button>
//       </div>

//       {/* MAIN CONTENT */}
//       <div className="main-with-sidebar">
//         <h1>🔍 AI Audit RAG Assistant</h1>

//         <div style={{
//           fontSize: "13px",
//           color: "#8b949e",
//           marginBottom: "20px"
//         }}>
//           Retrieve-Augmented audit analysis grounded strictly
//           in uploaded audit documents.
//         </div>

//         {/* TABS */}
//         <div style={{
//           display: "flex",
//           gap: "8px",
//           borderBottom: "1px solid #30363d",
//           marginBottom: "24px"
//         }}>
//           {["query", "excel"].map(tab => (
//             <button
//               key={tab}
//               onClick={() => setActiveTab(tab)}
//               style={{
//                 background: activeTab === tab ? "#0d1117" : "transparent",
//                 color: activeTab === tab ? "#58a6ff" : "#8b949e",
//                 border: "none",
//                 borderBottom:
//                   activeTab === tab
//                     ? "2px solid #58a6ff"
//                     : "none",
//                 padding: "10px 20px",
//                 cursor: "pointer",
//                 fontFamily: "IBM Plex Mono, monospace",
//                 fontSize: "13px",
//                 fontWeight: 600,
//                 textTransform: "uppercase"
//               }}
//             >
//               {tab === "query" && "💬 RAG Query"}
//               {tab === "excel" && "📊 Excel Batch"}
//             </button>
//           ))}
//         </div>

//         {/* QUERY TAB */}
//         {activeTab === "query" && (
//           <>
//             <div style={{
//               display: "flex",
//               gap: "12px",
//               marginBottom: "24px"
//             }}>
//               <input
//                 className="input"
//                 value={query}
//                 onChange={(e) => setQuery(e.target.value)}
//                 placeholder="Ask audit question..."
//                 style={{ flex: 1 }}
//               />

//               <button
//                 className="btn"
//                 onClick={handleQuery}
//                 disabled={!kbStatus.ready || loading}
//               >
//                 {loading ? "Analyzing..." : "Analyze"}
//               </button>
//             </div>

//             {history.map((item, idx) => (
//               <div key={idx} style={{ marginBottom: "24px" }}>
//                 <div className="section-label">Question</div>
//                 <h3>{item.query}</h3>

//                 <div className="section-label">Answer</div>

//                 <div style={{
//                   background: "#0d1f3c",
//                   border: "1px solid #1f6feb",
//                   borderLeft: "3px solid #58a6ff",
//                   borderRadius: "8px",
//                   padding: "20px",
//                   color: "#c9d1d9",
//                   lineHeight: 1.8
//                 }}>
//                   {item.answer}
//                 </div>
//               </div>
//             ))}
//           </>
//         )}

//         {/* EXCEL TAB */}
//         {activeTab === "excel" && (
//           <>
//             <div className="section-label">
//               Upload Excel Batch File
//             </div>

//             <input
//               type="file"
//               accept=".xlsx"
//               onChange={(e) => setExcelFile(e.target.files[0])}
//               style={{ marginBottom: "20px" }}
//             />

//             <button
//               className="btn"
//               onClick={handleExcelProcess}
//               disabled={!excelFile || processing}
//             >
//               {processing
//                 ? "Processing..."
//                 : "▶ Run Batch Processing"}
//             </button>
//           </>
//         )}
//       </div>
//     </div>
//   );
// }













// import React, { useState } from 'react';
// import { api } from '../../api/client';

// export default function ReportingVariance() {
//   const [activeTab, setActiveTab] = useState('pipeline');
  
//   // Input files
//   const [cyFile, setCyFile] = useState(null);
//   const [pyFile, setPyFile] = useState(null);
//   const [matFile, setMatFile] = useState(null);
  
//   // Materiality (manual or from file)
//   const [matSource, setMatSource] = useState('excel');
//   const [matOverall, setMatOverall] = useState(0);
//   const [matPerformance, setMatPerformance] = useState(0);
//   const [matTolerable, setMatTolerable] = useState(0);
//   const [matUnit, setMatUnit] = useState('Millions');
  
//   // Results
//   const [processing, setProcessing] = useState(false);
//   const [results, setResults] = useState(null);

//   const handleMatFileUpload = async (file) => {
//     setMatFile(file);
//     // Simulate reading materiality from Excel
//     // In real implementation, would parse the Excel file
//     setMatOverall(2500000);
//     setMatPerformance(1875000);
//     setMatTolerable(125000);
//   };

//   const handleRunPipeline = async () => {
//     if (!cyFile || !pyFile) {
//       alert('Please upload both CY and PY PDF files');
//       return;
//     }
    
//     if (matOverall === 0) {
//       alert('Please set materiality levels');
//       return;
//     }
    
//     setProcessing(true);
//     try {
//       const mult = {
//         'Thousands': 1_000,
//         'Millions': 1_000_000,
//         'Billions': 1_000_000_000
//       };
      
//       const result = await api.analyzeVariance(
//         cyFile,
//         pyFile,
//         matOverall * (matSource === 'manual' ? mult[matUnit] : 1),
//         matPerformance * (matSource === 'manual' ? mult[matUnit] : 1),
//         matTolerable * (matSource === 'manual' ? mult[matUnit] : 1)
//       );
      
//       setResults(result);
//       setActiveTab('table');
//     } catch (error) {
//       alert('Pipeline failed: ' + error.message);
//     } finally {
//       setProcessing(false);
//     }
//   };

//   const formatValue = (value, currency = '£') => {
//     const absVal = Math.abs(value);
//     const sign = value < 0 ? '-' : '';
//     if (absVal >= 1e9) return `${sign}${currency}${(absVal / 1e9).toFixed(3)}bn`;
//     if (absVal >= 1e6) return `${sign}${currency}${(absVal / 1e6).toFixed(3)}m`;
//     if (absVal >= 1e3) return `${sign}${currency}${(absVal / 1e3).toFixed(1)}k`;
//     return `${sign}${currency}${absVal.toLocaleString()}`;
//   };

//   return (
//     <div style={{ display: 'flex' }}>
//       {/* SIDEBAR */}
//       <div className="sidebar">
//         <div style={{ 
//           fontFamily: 'IBM Plex Mono, monospace',
//           fontSize: '16px',
//           fontWeight: 700,
//           color: '#58a6ff',
//           marginBottom: '4px'
//         }}>
//           📋 Variance Report
//         </div>
//         <div style={{ fontSize: '12px', color: '#8b949e', marginBottom: '16px' }}>
//           Audit Analytical Procedures
//         </div>
//         <hr />

//         <div className="section-label">Current Year (CY) PDF</div>
//         <input
//           type="file"
//           accept=".pdf"
//           onChange={(e) => setCyFile(e.target.files[0])}
//           style={{ marginBottom: '16px' }}
//         />

//         <div className="section-label">Prior Year (PY) PDF</div>
//         <input
//           type="file"
//           accept=".pdf"
//           onChange={(e) => setPyFile(e.target.files[0])}
//           style={{ marginBottom: '16px' }}
//         />

//         <hr />

//         <div className="section-label">Materiality Levels</div>
//         <div style={{ marginBottom: '12px' }}>
//           <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', color: '#8b949e' }}>
//             <input
//               type="radio"
//               name="matSource"
//               value="excel"
//               checked={matSource === 'excel'}
//               onChange={(e) => setMatSource(e.target.value)}
//             />
//             {' '}Upload Excel (Materiality App)
//           </label>
//           <label style={{ display: 'block', fontSize: '12px', color: '#8b949e' }}>
//             <input
//               type="radio"
//               name="matSource"
//               value="manual"
//               checked={matSource === 'manual'}
//               onChange={(e) => setMatSource(e.target.value)}
//             />
//             {' '}Enter Manually
//           </label>
//         </div>

//         {matSource === 'excel' ? (
//           <>
//             <input
//               type="file"
//               accept=".xlsx"
//               onChange={(e) => handleMatFileUpload(e.target.files[0])}
//               style={{ marginBottom: '12px' }}
//             />
//             {matFile && (
//               <div style={{
//                 background: '#161b22',
//                 border: '1px solid #30363d',
//                 borderLeft: '3px solid #58a6ff',
//                 borderRadius: '6px',
//                 padding: '12px 16px',
//                 fontSize: '12px',
//                 color: '#c9d1d9'
//               }}>
//                 ✓ Overall: <strong style={{ color: '#58a6ff' }}>{formatValue(matOverall)}</strong><br />
//                 ✓ Performance: <strong style={{ color: '#3fb950' }}>{formatValue(matPerformance)}</strong><br />
//                 ✓ Tolerable: <strong style={{ color: '#d29922' }}>{formatValue(matTolerable)}</strong>
//               </div>
//             )}
//           </>
//         ) : (
//           <>
//             <select
//               className="input"
//               value={matUnit}
//               onChange={(e) => setMatUnit(e.target.value)}
//               style={{ marginBottom: '8px' }}
//             >
//               <option>Thousands</option>
//               <option>Millions</option>
//               <option>Billions</option>
//             </select>
            
//             <input
//               type="number"
//               className="input"
//               placeholder="Overall Materiality"
//               value={matOverall}
//               onChange={(e) => setMatOverall(parseFloat(e.target.value) || 0)}
//               style={{ marginBottom: '8px' }}
//             />
            
//             <input
//               type="number"
//               className="input"
//               placeholder="Performance Materiality"
//               value={matPerformance}
//               onChange={(e) => setMatPerformance(parseFloat(e.target.value) || 0)}
//               style={{ marginBottom: '8px' }}
//             />
            
//             <input
//               type="number"
//               className="input"
//               placeholder="Tolerable Misstatement"
//               value={matTolerable}
//               onChange={(e) => setMatTolerable(parseFloat(e.target.value) || 0)}
//             />
//           </>
//         )}

//         <hr />
//         <button
//           className="btn"
//           onClick={() => {
//             setCyFile(null);
//             setPyFile(null);
//             setMatFile(null);
//             setResults(null);
//             setMatOverall(0);
//             setMatPerformance(0);
//             setMatTolerable(0);
//           }}
//           style={{ width: '100%' }}
//         >
//           🔄 Reset All
//         </button>
//       </div>

//       {/* MAIN CONTENT */}
//       <div className="main-with-sidebar">
//         <h1>📋 Audit Variance Analysis Report</h1>
//         <div style={{ fontSize: '13px', color: '#8b949e', marginBottom: '20px' }}>
//           Analytical procedures: extract FSLIs from CY and PY financial statements, 
//           compute variances, flag significant movements, generate audit narratives.
//         </div>

//         {/* TABS */}
//         <div style={{ 
//           display: 'flex', 
//           gap: '8px', 
//           borderBottom: '1px solid #30363d', 
//           marginBottom: '24px' 
//         }}>
//           {['pipeline', 'table', 'report'].map(tab => (
//             <button
//               key={tab}
//               onClick={() => setActiveTab(tab)}
//               style={{
//                 background: activeTab === tab ? '#0d1117' : 'transparent',
//                 color: activeTab === tab ? '#58a6ff' : '#8b949e',
//                 border: 'none',
//                 borderBottom: activeTab === tab ? '2px solid #58a6ff' : 'none',
//                 padding: '10px 20px',
//                 cursor: 'pointer',
//                 fontFamily: 'IBM Plex Mono, monospace',
//                 fontSize: '13px',
//                 fontWeight: 600,
//                 textTransform: 'uppercase'
//               }}
//             >
//               {tab === 'pipeline' && '⚙️ Run Pipeline'}
//               {tab === 'table' && '📊 Variance Table'}
//               {tab === 'report' && '📝 Report & Export'}
//             </button>
//           ))}
//         </div>

//         {/* TAB 1: PIPELINE */}
//         {activeTab === 'pipeline' && (
//           <div>
//             <div className="section-label">Pre-flight Checklist</div>
//             {[
//               { label: 'CY Financial Statements PDF', ok: cyFile !== null },
//               { label: 'PY Financial Statements PDF', ok: pyFile !== null },
//               { label: 'Materiality Levels', ok: matOverall > 0 }
//             ].map(({ label, ok }) => (
//               <div
//                 key={label}
//                 style={{
//                   fontFamily: 'IBM Plex Mono, monospace',
//                   fontSize: '13px',
//                   color: ok ? '#3fb950' : '#f85149',
//                   padding: '4px 0'
//                 }}
//               >
//                 {ok ? '✓' : '✗'} {label}
//               </div>
//             ))}

//             {matOverall > 0 && (
//               <div style={{ 
//                 display: 'grid', 
//                 gridTemplateColumns: 'repeat(3, 1fr)', 
//                 gap: '16px',
//                 marginTop: '24px'
//               }}>
//                 <div className="metric-card">
//                   <div className="metric-label">Overall Materiality</div>
//                   <div className="metric-value">
//                     {formatValue(matOverall * (matSource === 'manual' ? { Thousands: 1000, Millions: 1000000, Billions: 1000000000 }[matUnit] : 1))}
//                   </div>
//                 </div>
//                 <div className="metric-card">
//                   <div className="metric-label">Performance Materiality</div>
//                   <div className="metric-value" style={{ color: '#3fb950' }}>
//                     {formatValue(matPerformance * (matSource === 'manual' ? { Thousands: 1000, Millions: 1000000, Billions: 1000000000 }[matUnit] : 1))}
//                   </div>
//                 </div>
//                 <div className="metric-card">
//                   <div className="metric-label">Tolerable Misstatement</div>
//                   <div className="metric-value" style={{ color: '#d29922' }}>
//                     {formatValue(matTolerable * (matSource === 'manual' ? { Thousands: 1000, Millions: 1000000, Billions: 1000000000 }[matUnit] : 1))}
//                   </div>
//                 </div>
//               </div>
//             )}

//             <hr />

//             <button
//               className="btn"
//               onClick={handleRunPipeline}
//               disabled={!cyFile || !pyFile || matOverall === 0 || processing}
//               style={{ width: '100%', marginTop: '20px' }}
//             >
//               {processing ? 'Processing Pipeline...' : '🚀 Run Full Variance Analysis Pipeline'}
//             </button>

//             {processing && (
//               <div style={{ marginTop: '20px' }}>
//                 <div className="spinner"></div>
//                 <div style={{ textAlign: 'center', fontSize: '13px', color: '#8b949e', marginTop: '12px' }}>
//                   Extracting figures, computing variances, generating narratives...
//                 </div>
//               </div>
//             )}
//           </div>
//         )}

//         {/* TAB 2: VARIANCE TABLE */}
//         {activeTab === 'table' && results && (
//           <div>
//             <div style={{ 
//               display: 'grid', 
//               gridTemplateColumns: 'repeat(3, 1fr)', 
//               gap: '16px',
//               marginBottom: '24px'
//             }}>
//               <div className="metric-card">
//                 <div className="metric-label">FSLIs Analysed</div>
//                 <div className="metric-value">{results.variance_table.length}</div>
//               </div>
//               <div className="metric-card">
//                 <div className="metric-label">Significant ⚠</div>
//                 <div className="metric-value" style={{ color: '#f85149' }}>
//                   {results.variance_table.filter(r => r.significant).length}
//                 </div>
//               </div>
//               <div className="metric-card">
//                 <div className="metric-label">Immaterial</div>
//                 <div className="metric-value" style={{ color: '#3fb950' }}>
//                   {results.variance_table.filter(r => !r.significant).length}
//                 </div>
//               </div>
//             </div>

//             <table style={{ 
//               width: '100%', 
//               borderCollapse: 'collapse',
//               background: '#161b22',
//               border: '1px solid #30363d',
//               borderRadius: '6px',
//               overflow: 'hidden'
//             }}>
//               <thead>
//                 <tr style={{ background: '#0d1117' }}>
//                   <th style={{ padding: '12px', textAlign: 'left', color: '#58a6ff', fontSize: '11px' }}>FSLI</th>
//                   <th style={{ padding: '12px', textAlign: 'right', color: '#58a6ff', fontSize: '11px' }}>CY Value</th>
//                   <th style={{ padding: '12px', textAlign: 'right', color: '#58a6ff', fontSize: '11px' }}>PY Value</th>
//                   <th style={{ padding: '12px', textAlign: 'right', color: '#58a6ff', fontSize: '11px' }}>Variance (£)</th>
//                   <th style={{ padding: '12px', textAlign: 'center', color: '#58a6ff', fontSize: '11px' }}>Var %</th>
//                   <th style={{ padding: '12px', textAlign: 'center', color: '#58a6ff', fontSize: '11px' }}>Significant</th>
//                 </tr>
//               </thead>
//               <tbody>
//                 {results.variance_table.map((row, i) => (
//                   <tr key={i} style={{ 
//                     borderTop: '1px solid #30363d',
//                     background: row.significant ? '#2d0000' : 'transparent'
//                   }}>
//                     <td style={{ 
//                       padding: '12px', 
//                       fontSize: '13px', 
//                       color: row.significant ? '#f85149' : '#e6edf3',
//                       fontWeight: row.significant ? 'bold' : 'normal'
//                     }}>
//                       {row.fsli}
//                     </td>
//                     <td style={{ padding: '12px', fontSize: '13px', color: '#c9d1d9', textAlign: 'right' }}>
//                       {formatValue(row.cy_value)}
//                     </td>
//                     <td style={{ padding: '12px', fontSize: '13px', color: '#c9d1d9', textAlign: 'right' }}>
//                       {formatValue(row.py_value)}
//                     </td>
//                     <td style={{ 
//                       padding: '12px', 
//                       fontSize: '13px', 
//                       color: row.significant ? '#f85149' : '#c9d1d9', 
//                       textAlign: 'right',
//                       fontWeight: row.significant ? 'bold' : 'normal'
//                     }}>
//                       {formatValue(row.variance_abs)}
//                     </td>
//                     <td style={{ 
//                       padding: '12px', 
//                       fontSize: '13px', 
//                       color: row.significant ? '#f85149' : '#c9d1d9', 
//                       textAlign: 'center' 
//                     }}>
//                       {row.variance_pct > 0 ? '+' : ''}{row.variance_pct.toFixed(1)}%
//                     </td>
//                     <td style={{ padding: '12px', fontSize: '13px', textAlign: 'center' }}>
//                       {row.significant ? (
//                         <span style={{ color: '#f85149', fontWeight: 'bold' }}>⚠ YES</span>
//                       ) : (
//                         <span style={{ color: '#8b949e' }}>—</span>
//                       )}
//                     </td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>
//         )}

//         {/* TAB 3: REPORT & EXPORT */}
//         {activeTab === 'report' && results && (
//           <div>
//             <div className="section-label">Executive Summary</div>
//             <div style={{
//               background: '#0d1f3c',
//               border: '1px solid #1f6feb',
//               borderLeft: '3px solid #58a6ff',
//               borderRadius: '8px',
//               padding: '20px 24px',
//               margin: '16px 0',
//               fontSize: '14px',
//               color: '#c9d1d9',
//               lineHeight: 1.8,
//               whiteSpace: 'pre-wrap'
//             }}>
//               {results.exec_summary}
//             </div>

//             <hr />

//             <div className="section-label">FSLI Variance Detail</div>
//             {results.variance_table
//               .filter(row => row.significant)
//               .map((row, i) => (
//                 <div key={i}>
//                   <div style={{
//                     background: '#161b22',
//                     border: '1px solid #30363d',
//                     borderLeft: '4px solid #f85149',
//                     borderRadius: '6px',
//                     padding: '10px 16px',
//                     margin: '16px 0 6px 0',
//                     fontFamily: 'IBM Plex Mono, monospace',
//                     fontSize: '13px',
//                     fontWeight: 600,
//                     color: '#f85149'
//                   }}>
//                     {row.fsli} ⚠ SIGNIFICANT
//                     <span style={{ float: 'right', color: '#8b949e' }}>
//                       CY: {formatValue(row.cy_value)} | PY: {formatValue(row.py_value)} | 
//                       Var: {formatValue(row.variance_abs)} ({row.variance_pct > 0 ? '+' : ''}{row.variance_pct.toFixed(1)}%)
//                     </span>
//                   </div>
//                   <div style={{
//                     background: '#0d1f3c',
//                     border: '1px solid #1f6feb',
//                     borderRadius: '6px',
//                     padding: '14px 18px',
//                     margin: '4px 0 12px 0',
//                     fontSize: '13px',
//                     color: '#c9d1d9',
//                     lineHeight: 1.8
//                   }}>
//                     {results.narratives[row.fsli] || 'Narrative pending generation...'}
//                   </div>
//                 </div>
//               ))}

//             <hr />

//             <button
//               className="btn btn-success"
//               onClick={() => alert('Excel download would trigger here')}
//             >
//               ⬇ Download Variance Analysis Report (.xlsx)
//             </button>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }



// import React, { useState } from 'react';
// import { api } from '../../api/client';
// import {
//   CloudUpload as UploadIcon,
//   Search as SearchIcon,
//   Delete as DeleteIcon,
//   ExpandMore as ExpandMoreIcon
// } from '@mui/icons-material';

// export default function ReportingVariance() {
//   const [activeTab, setActiveTab] = useState('pipeline');

//   // Input files
//   const [cyFile, setCyFile] = useState(null);
//   const [pyFile, setPyFile] = useState(null);
//   const [matFile, setMatFile] = useState(null);

//   // Materiality
//   const [matSource, setMatSource] = useState('excel');
//   const [matOverall, setMatOverall] = useState(0);
//   const [matPerformance, setMatPerformance] = useState(0);
//   const [matTolerable, setMatTolerable] = useState(0);
//   const [matUnit, setMatUnit] = useState('Millions');

//   // Results
//   const [processing, setProcessing] = useState(false);
//   const [results, setResults] = useState(null);

//   const handleMatFileUpload = async (file) => {
//     setMatFile(file);

//     // demo values
//     setMatOverall(2500000);
//     setMatPerformance(1875000);
//     setMatTolerable(125000);
//   };

//   const handleRunPipeline = async () => {
//     if (!cyFile || !pyFile) {
//       alert('Please upload both CY and PY PDF files');
//       return;
//     }

//     if (matOverall === 0) {
//       alert('Please set materiality levels');
//       return;
//     }

//     setProcessing(true);

//     try {
//       const mult = {
//         Thousands: 1000,
//         Millions: 1000000,
//         Billions: 1000000000
//       };

//       const result = await api.analyzeVariance(
//         cyFile,
//         pyFile,
//         matOverall * (matSource === 'manual' ? mult[matUnit] : 1),
//         matPerformance * (matSource === 'manual' ? mult[matUnit] : 1),
//         matTolerable * (matSource === 'manual' ? mult[matUnit] : 1)
//       );

//       setResults(result);
//       setActiveTab('table');
//     } catch (error) {
//       alert('Pipeline failed: ' + error.message);
//     } finally {
//       setProcessing(false);
//     }
//   };

//   const formatValue = (value, currency = '£') => {
//     const absVal = Math.abs(value);
//     const sign = value < 0 ? '-' : '';

//     if (absVal >= 1e9)
//       return `${sign}${currency}${(absVal / 1e9).toFixed(3)}bn`;
//     if (absVal >= 1e6)
//       return `${sign}${currency}${(absVal / 1e6).toFixed(3)}m`;
//     if (absVal >= 1e3)
//       return `${sign}${currency}${(absVal / 1e3).toFixed(1)}k`;

//     return `${sign}${currency}${absVal.toLocaleString()}`;
//   };

//   return (
//     <div style={{ display: 'flex', minHeight: 'calc(100vh - 57px)' }}>
//       {/* SIDEBAR */}
//       <div className="sidebar">
//         <div
//           style={{
//             fontSize: '24px',
//             fontWeight: 400,
//             color: '#1a73e8',
//             marginBottom: '8px'
//           }}
//         >
//           📋 Variance Analysis
//         </div>

//         <p
//           style={{
//             fontSize: '13px',
//             color: '#5f6368',
//             marginBottom: '24px'
//           }}
//         >
//           Audit Analytical Procedures
//         </p>

//         <hr />

//         {/* CY FILE */}
//         <div className="section-label">Current Year (CY) PDF/Excel</div>

//         <div
//           className="file-upload"
//           style={{
//             padding: '20px',
//             marginBottom: '16px'
//           }}
//         >
//           <input
//             type="file"
//             accept=".pdf,.xlsx,.xls"
//             onChange={(e) => setCyFile(e.target.files[0])}
//             style={{ display: 'none' }}
//             id="cy-upload"
//           />

//           <label
//             htmlFor="cy-upload"
//             style={{
//               cursor: 'pointer',
//               display: 'block'
//             }}
//           >
//             <UploadIcon
//               sx={{
//                 fontSize: 28,
//                 color: '#5f6368',
//                 marginBottom: '8px'
//               }}
//             />

//             <div
//               style={{
//                 fontSize: '13px',
//                 color: '#5f6368'
//               }}
//             >
//               {cyFile ? `✓ ${cyFile.name}` : 'Upload CY Financial Statements'}
//             </div>
//           </label>
//         </div>

//         {/* PY FILE */}
//         <div className="section-label">Prior Year (PY) PDF/Excel</div>

//         <div
//           className="file-upload"
//           style={{
//             padding: '20px',
//             marginBottom: '16px'
//           }}
//         >
//           <input
//             type="file"
//             accept=".pdf,.xlsx,.xls"
//             onChange={(e) => setPyFile(e.target.files[0])}
//             style={{ display: 'none' }}
//             id="py-upload"
//           />

//           <label
//             htmlFor="py-upload"
//             style={{
//               cursor: 'pointer',
//               display: 'block'
//             }}
//           >
//             <UploadIcon
//               sx={{
//                 fontSize: 28,
//                 color: '#5f6368',
//                 marginBottom: '8px'
//               }}
//             />

//             <div
//               style={{
//                 fontSize: '13px',
//                 color: '#5f6368'
//               }}
//             >
//               {pyFile ? `✓ ${pyFile.name}` : 'Upload PY Financial Statements'}
//             </div>
//           </label>
//         </div>

//         <hr />

//         {/* MATERIALITY */}
//         <div className="section-label">Materiality Levels</div>

//         <label
//           style={{
//             display: 'block',
//             fontSize: '13px',
//             color: '#5f6368',
//             marginBottom: '8px'
//           }}
//         >
//           <input
//             type="radio"
//             value="excel"
//             checked={matSource === 'excel'}
//             onChange={(e) => setMatSource(e.target.value)}
//           />
//           {' '}Upload Excel (Materiality App)
//         </label>

//         <label
//           style={{
//             display: 'block',
//             fontSize: '13px',
//             color: '#5f6368',
//             marginBottom: '16px'
//           }}
//         >
//           <input
//             type="radio"
//             value="manual"
//             checked={matSource === 'manual'}
//             onChange={(e) => setMatSource(e.target.value)}
//           />
//           {' '}Enter Manually
//         </label>

//         {matSource === 'excel' ? (
//           <>
//             <div
//               className="file-upload"
//               style={{
//                 padding: '20px',
//                 marginBottom: '12px'
//               }}
//             >
//               <input
//                 type="file"
//                 accept=".xlsx"
//                 onChange={(e) => handleMatFileUpload(e.target.files[0])}
//                 style={{ display: 'none' }}
//                 id="mat-upload"
//               />

//               <label
//                 htmlFor="mat-upload"
//                 style={{
//                   cursor: 'pointer',
//                   display: 'block'
//                 }}
//               >
//                 <UploadIcon
//                   sx={{
//                     fontSize: 28,
//                     color: '#5f6368',
//                     marginBottom: '8px'
//                   }}
//                 />

//                 <div
//                   style={{
//                     fontSize: '13px',
//                     color: '#5f6368'
//                   }}
//                 >
//                   {matFile ? `✓ ${matFile.name}` : 'Upload Materiality Excel'}
//                 </div>
//               </label>
//             </div>

//             {matFile && (
//               <div className="answer-box" style={{ marginBottom: '16px' }}>
//                 Overall: {formatValue(matOverall)}
//                 <br />
//                 Performance: {formatValue(matPerformance)}
//                 <br />
//                 Tolerable: {formatValue(matTolerable)}
//               </div>
//             )}
//           </>
//         ) : (
//           <>
//             <select
//               className="input"
//               value={matUnit}
//               onChange={(e) => setMatUnit(e.target.value)}
//               style={{ marginBottom: '12px' }}
//             >
//               <option>Thousands</option>
//               <option>Millions</option>
//               <option>Billions</option>
//             </select>

//             <input
//               className="input"
//               type="number"
//               placeholder="Overall Materiality"
//               value={matOverall}
//               onChange={(e) =>
//                 setMatOverall(parseFloat(e.target.value) || 0)
//               }
//               style={{ marginBottom: '8px' }}
//             />

//             <input
//               className="input"
//               type="number"
//               placeholder="Performance Materiality"
//               value={matPerformance}
//               onChange={(e) =>
//                 setMatPerformance(parseFloat(e.target.value) || 0)
//               }
//               style={{ marginBottom: '8px' }}
//             />

//             <input
//               className="input"
//               type="number"
//               placeholder="Tolerable Misstatement"
//               value={matTolerable}
//               onChange={(e) =>
//                 setMatTolerable(parseFloat(e.target.value) || 0)
//               }
//             />
//           </>
//         )}

//         <hr />

//         <button
//           className="btn btn-outlined"
//           onClick={() => {
//             setCyFile(null);
//             setPyFile(null);
//             setMatFile(null);
//             setResults(null);
//             setMatOverall(0);
//             setMatPerformance(0);
//             setMatTolerable(0);
//           }}
//           style={{ width: '100%' }}
//         >
//           <DeleteIcon
//             sx={{
//               fontSize: 18,
//               marginRight: '8px'
//             }}
//           />
//           Reset All
//         </button>
//       </div>

//       {/* MAIN CONTENT */}
//       <div className="main-with-sidebar">
//         <h1>📊 Audit Variance Analysis Report</h1>

//         <p style={{ marginBottom: '32px' }}>
//           Extract FSLIs from CY/PY statements, compute variances, flag
//           significant movements, and generate audit narratives.
//         </p>

//         {/* TABS */}
//         <div className="tabs-container">
//           <button
//             className={`tab-btn ${activeTab === 'pipeline' ? 'active' : ''}`}
//             onClick={() => setActiveTab('pipeline')}
//           >
//             ⚙ Run Pipeline
//           </button>

//           <button
//             className={`tab-btn ${activeTab === 'table' ? 'active' : ''}`}
//             onClick={() => setActiveTab('table')}
//           >
//             📊 Variance Table
//           </button>

//           <button
//             className={`tab-btn ${activeTab === 'report' ? 'active' : ''}`}
//             onClick={() => setActiveTab('report')}
//           >
//             📝 Report
//           </button>
//         </div>

//         {/* PIPELINE TAB */}
//         {activeTab === 'pipeline' && (
//           <div>
//             <div className="section-label">Pre-flight Checklist</div>

//             {[
//               { label: 'CY Financial Statements PDF', ok: !!cyFile },
//               { label: 'PY Financial Statements PDF', ok: !!pyFile },
//               { label: 'Materiality Levels', ok: matOverall > 0 }
//             ].map((item) => (
//               <div
//                 key={item.label}
//                 style={{
//                   fontSize: '14px',
//                   color: item.ok ? '#34a853' : '#d93025',
//                   padding: '6px 0'
//                 }}
//               >
//                 {item.ok ? '✓' : '✗'} {item.label}
//               </div>
//             ))}

//             <button
//               className="btn"
//               onClick={handleRunPipeline}
//               disabled={!cyFile || !pyFile || matOverall === 0 || processing}
//               style={{
//                 marginTop: '24px'
//               }}
//             >
//               {processing
//                 ? 'Processing...'
//                 : '🚀 Run Full Variance Analysis'}
//             </button>
//           </div>
//         )}

//         {/* TABLE TAB */}
//         {activeTab === 'table' && results && (
//           <div className="answer-box">
//             Variance table results render here from backend.
//           </div>
//         )}

//         {/* REPORT TAB */}
//         {activeTab === 'report' && results && (
//           <div className="answer-box">
//             Executive summary + narratives render here.
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }





import React, { useState } from 'react';
import { api } from '../../api/client';
import {
  CloudUpload as UploadIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon
} from '@mui/icons-material';

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

  // Results
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

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

    const a = document.createElement("a");
    a.href = url;
    a.download = "variance_analysis_report.xlsx";
    document.body.appendChild(a);
    a.click();
    a.remove();

    window.URL.revokeObjectURL(url);
  } catch (error) {
    alert("Download failed");
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

    setProcessing(true);
    setError(null);

    try {
      const mult = {
        Thousands: 1000,
        Millions: 1000000,
        Billions: 1000000000
      };

      const result = await api.analyzeVariance(
        cyFile,
        pyFile,
        matOverall * (matSource === 'manual' ? mult[matUnit] : 1),
        matPerformance * (matSource === 'manual' ? mult[matUnit] : 1),
        matTolerable * (matSource === 'manual' ? mult[matUnit] : 1)
      );

      setResults(result);
      setActiveTab('table');
    } catch (error) {
      console.error('Pipeline error:', error);
      setError(error.message || 'Pipeline failed');
      alert('Pipeline failed: ' + (error.message || 'Unknown error'));
    } finally {
      setProcessing(false);
    }
  };

  const formatValue = (value, currency = '£') => {
    const absVal = Math.abs(value);
    const sign = value < 0 ? '-' : '';

    if (absVal >= 1e9)
      return `${sign}${currency}${(absVal / 1e9).toFixed(2)}bn`;
    if (absVal >= 1e6)
      return `${sign}${currency}${(absVal / 1e6).toFixed(2)}m`;
    if (absVal >= 1e3)
      return `${sign}${currency}${(absVal / 1e3).toFixed(1)}k`;

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
        <div
          style={{
            fontSize: '24px',
            fontWeight: 400,
            color: '#1a73e8',
            marginBottom: '8px'
          }}
        >
          Variance Analysis
        </div>

        <p
          style={{
            fontSize: '13px',
            color: '#5f6368',
            marginBottom: '24px'
          }}
        >
          Audit Analytical Procedures
        </p>

        <hr />

        {/* CY FILE */}
        <div className="section-label">Current Year (CY) PDF</div>

        <div
          className="file-upload"
          style={{
            padding: '20px',
            marginBottom: '16px'
          }}
        >
          <input
            type="file"
            accept=".pdf"
            onChange={(e) => setCyFile(e.target.files[0])}
            style={{ display: 'none' }}
            id="cy-upload"
          />

          <label
            htmlFor="cy-upload"
            style={{
              cursor: 'pointer',
              display: 'block'
            }}
          >
            <UploadIcon
              sx={{
                fontSize: 28,
                color: '#5f6368',
                marginBottom: '8px'
              }}
            />

            <div
              style={{
                fontSize: '13px',
                color: '#5f6368'
              }}
            >
              {cyFile ? `✓ ${cyFile.name}` : 'Upload CY Financial Statements'}
            </div>
          </label>
        </div>

        {/* PY FILE */}
        <div className="section-label">Prior Year (PY) PDF</div>

        <div
          className="file-upload"
          style={{
            padding: '20px',
            marginBottom: '16px'
          }}
        >
          <input
            type="file"
            accept=".pdf"
            onChange={(e) => setPyFile(e.target.files[0])}
            style={{ display: 'none' }}
            id="py-upload"
          />

          <label
            htmlFor="py-upload"
            style={{
              cursor: 'pointer',
              display: 'block'
            }}
          >
            <UploadIcon
              sx={{
                fontSize: 28,
                color: '#5f6368',
                marginBottom: '8px'
              }}
            />

            <div
              style={{
                fontSize: '13px',
                color: '#5f6368'
              }}
            >
              {pyFile ? `✓ ${pyFile.name}` : 'Upload PY Financial Statements'}
            </div>
          </label>
        </div>

        <hr />

        {/* MATERIALITY */}
        <div className="section-label">Materiality Levels</div>

        <label
          style={{
            display: 'block',
            fontSize: '13px',
            color: '#5f6368',
            marginBottom: '8px'
          }}
        >
          <input
            type="radio"
            value="excel"
            checked={matSource === 'excel'}
            onChange={(e) => setMatSource(e.target.value)}
          />
          {' '}Upload Excel (Materiality App)
        </label>

        <label
          style={{
            display: 'block',
            fontSize: '13px',
            color: '#5f6368',
            marginBottom: '16px'
          }}
        >
          <input
            type="radio"
            value="manual"
            checked={matSource === 'manual'}
            onChange={(e) => setMatSource(e.target.value)}
          />
          {' '}Enter Manually
        </label>

        {matSource === 'excel' ? (
          <>
            <div
              className="file-upload"
              style={{
                padding: '20px',
                marginBottom: '12px'
              }}
            >
              <input
                type="file"
                accept=".xlsx"
                onChange={(e) => handleMatFileUpload(e.target.files[0])}
                style={{ display: 'none' }}
                id="mat-upload"
              />

              <label
                htmlFor="mat-upload"
                style={{
                  cursor: 'pointer',
                  display: 'block'
                }}
              >
                <UploadIcon
                  sx={{
                    fontSize: 28,
                    color: '#5f6368',
                    marginBottom: '8px'
                  }}
                />

                <div
                  style={{
                    fontSize: '13px',
                    color: '#5f6368'
                  }}
                >
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
              onChange={(e) =>
                setMatOverall(parseFloat(e.target.value) || 0)
              }
              style={{ marginBottom: '8px' }}
            />

            <input
              className="input"
              type="number"
              placeholder="Performance Materiality"
              value={matPerformance}
              onChange={(e) =>
                setMatPerformance(parseFloat(e.target.value) || 0)
              }
              style={{ marginBottom: '8px' }}
            />

            <input
              className="input"
              type="number"
              placeholder="Tolerable Misstatement"
              value={matTolerable}
              onChange={(e) =>
                setMatTolerable(parseFloat(e.target.value) || 0)
              }
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
          }}
          style={{ width: '100%' }}
        >
          <DeleteIcon
            sx={{
              fontSize: 18,
              marginRight: '8px'
            }}
          />
          Reset All
        </button>
      </div>

      {/* MAIN CONTENT */}
      <div className="main-with-sidebar">
        <h1> Audit Variance Analysis Report</h1>

        <p style={{ marginBottom: '32px' }}>
          Extract FSLIs from CY/PY statements, compute variances, flag
          significant movements, and generate audit narratives.
        </p>

        {error && (
          <div className="alert error" style={{ marginBottom: '24px' }}>
            <span style={{ fontSize: '20px' }}>❌</span>
            <div>
              <strong>Error:</strong> {error}
            </div>
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
                <div className="metric-card">
                  <div className="metric-label">Overall Materiality</div>
                  <div className="metric-value" style={{ fontSize: '28px' }}>
                    {formatValue(matOverall * (matSource === 'manual' ? { Thousands: 1000, Millions: 1000000, Billions: 1000000000 }[matUnit] : 1))}
                  </div>
                </div>

                <div className="metric-card">
                  <div className="metric-label">Performance Materiality</div>
                  <div className="metric-value" style={{ fontSize: '28px', color: '#1e8e3e' }}>
                    {formatValue(matPerformance * (matSource === 'manual' ? { Thousands: 1000, Millions: 1000000, Billions: 1000000000 }[matUnit] : 1))}
                  </div>
                </div>

                <div className="metric-card">
                  <div className="metric-label">Tolerable Misstatement</div>
                  <div className="metric-value" style={{ fontSize: '28px', color: '#ea8600' }}>
                    {formatValue(matTolerable * (matSource === 'manual' ? { Thousands: 1000, Millions: 1000000, Billions: 1000000000 }[matUnit] : 1))}
                  </div>
                </div>
              </div>
            )}

            <button
              className="btn"
              onClick={handleRunPipeline}
              disabled={!cyFile || !pyFile || matOverall === 0 || processing}
              style={{
                marginTop: '24px',
                width: '100%'
              }}
            >
              {processing
                ? 'Processing Pipeline...'
                : 'Run Full Variance Analysis'}
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
            {/* Summary Cards */}
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
                  {results.variance_table.filter(r => r.significant).length}
                </div>
              </div>

              <div className="metric-card">
                <div className="metric-label">Immaterial ✓</div>
                <div className="metric-value" style={{ fontSize: '32px', color: '#1e8e3e' }}>
                  {results.variance_table.filter(r => !r.significant).length}
                </div>
              </div>
            </div>

            {/* Variance Table */}
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
                    style={{
                      background: row.significant ? '#fef7e0' : 'transparent'
                    }}
                  >
                    <td style={{ fontWeight: row.significant ? 600 : 400 }}>
                      {row.fsli}
                    </td>
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
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
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
                      {row.variance_pct > 0 ? '+' : ''}{row.variance_pct.toFixed(1)}%
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
            {/* Executive Summary */}
            <div className="section-label">Executive Summary</div>
            <div className="answer-box" style={{ marginBottom: '32px' }}>
              {results.exec_summary}
            </div>

            <hr />

            {/* Significant Variances Detail */}
            <div className="section-label">Significant Variance Narratives</div>

            {results.variance_table
              .filter(row => row.significant)
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
                    <div style={{ fontWeight: 600, color: '#202124' }}>
                      {row.fsli}
                    </div>
                    <div style={{ fontSize: '13px', color: '#5f6368' }}>
                      CY: {formatValue(row.cy_value, results.currency)} | 
                      PY: {formatValue(row.py_value, results.currency)} | 
                      Var: <span style={{ color: getVarianceColor(row.variance_abs), fontWeight: 600 }}>
                        {formatValue(row.variance_abs, results.currency)} ({row.variance_pct > 0 ? '+' : ''}{row.variance_pct.toFixed(1)}%)
                      </span>
                    </div>
                  </div>

                  <div className="answer-box">
                    {results.narratives[row.fsli] || 'Narrative pending generation...'}
                  </div>
                </div>
              ))}

            <hr />

            {/* Export Button */}
            <button
              className="btn btn-success"
              onClick={handleDownloadReport}
              // onClick={() => {
              //   // In production, this would trigger Excel download
              //   // alert('Excel export functionality would trigger here');
              //   onClick={handleDownloadReport}
              // }}
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
