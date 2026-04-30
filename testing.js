import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import {
  CloudUpload as UploadIcon,
  Search as SearchIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon
} from '@mui/icons-material';

export default function TestingMR() {
  const [kbStatus, setKbStatus] = useState({
    ready: false,
    chunk_count: 0,
    doc_count: 0
  });

  const [files, setFiles] = useState([]);
  const [building, setBuilding] = useState(false);
  const [activeTab, setActiveTab] = useState('query');

  // RAG Query state
  const [query, setQuery] = useState('');
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  // DE Template state
  const [deFile, setDeFile] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [deResults, setDeResults] = useState(null);

  // Settings
  const [topK, setTopK] = useState(6);
  const [showEvidence, setShowEvidence] = useState(true);

  useEffect(() => {
    loadKBStatus();
  }, []);

  const loadKBStatus = async () => {
    const status = await api.getKBStatus();
    setKbStatus(status);
  };

  const handleBuildKB = async () => {
    if (files.length === 0) return;

    setBuilding(true);
    try {
      const result = await api.buildKB(files);

      setKbStatus({
        ready: true,
        chunk_count: result.chunk_count,
        doc_count: result.doc_count
      });

      setFiles([]);
    } catch (error) {
      alert('Failed to build KB: ' + error.message);
    } finally {
      setBuilding(false);
    }
  };

  const handleQuery = async () => {
    if (!query.trim() || !kbStatus.ready) return;

    setLoading(true);
    try {
      const result = await api.ragQuery(query, topK);

      setHistory([
        {
          query,
          answer: result.answer,
          evidence: result.evidence
        },
        ...history
      ]);

      setQuery('');
    } catch (error) {
      alert('Query failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDEProcess = async () => {
    if (!deFile || !kbStatus.ready) return;

    setProcessing(true);
    try {
      await api.processDETemplate(deFile, topK);
      alert('DE template processing complete! File downloaded.');
      setDeFile(null);
    } catch (error) {
      alert('Processing failed: ' + error.message);
    } finally {
      setProcessing(false);
    }
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
          DE Audit RAG
        </div>

        <p
          style={{
            fontSize: '13px',
            color: '#5f6368',
            marginBottom: '24px'
          }}
        >
          SOP Knowledge Base
        </p>

        <hr />

        {/* KB STATUS */}
        <div className="section-label">KB Status</div>

        {kbStatus.ready ? (
          <div className="status-ready">● Ready</div>
        ) : (
          <div className="status-pending">○ Not Built</div>
        )}

        {kbStatus.chunk_count > 0 && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '12px',
              margin: '16px 0'
            }}
          >
            <div
              className="metric-card"
              style={{
                padding: '16px',
                textAlign: 'center'
              }}
            >
              <div
                className="metric-value"
                style={{
                  fontSize: '24px'
                }}
              >
                {kbStatus.doc_count}
              </div>
              <div className="metric-label">DOCS</div>
            </div>

            <div
              className="metric-card"
              style={{
                padding: '16px',
                textAlign: 'center'
              }}
            >
              <div
                className="metric-value"
                style={{
                  fontSize: '24px'
                }}
              >
                {kbStatus.chunk_count}
              </div>
              <div className="metric-label">CHUNKS</div>
            </div>
          </div>
        )}

        <hr />

        {/* DOCUMENT UPLOAD */}
        <div className="section-label">Upload SOP Documents</div>

        <div
          className="file-upload"
          style={{
            padding: '24px',
            marginBottom: '12px'
          }}
        >
          <input
            type="file"
            multiple
            accept=".pdf,.docx"
            onChange={(e) => setFiles(Array.from(e.target.files))}
            style={{ display: 'none' }}
            id="doc-upload"
          />

          <label
            htmlFor="doc-upload"
            style={{
              cursor: 'pointer',
              display: 'block'
            }}
          >
            <UploadIcon
              sx={{
                fontSize: 32,
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
              Click to upload SOP PDF or DOCX files
            </div>
          </label>
        </div>

        {files.length > 0 && (
          <div
            style={{
              fontSize: '13px',
              color: '#5f6368',
              marginBottom: '12px'
            }}
          >
            ✓ {files.length} file(s) selected
          </div>
        )}

        <button
          className="btn btn-success"
          onClick={handleBuildKB}
          disabled={files.length === 0 || building}
          style={{ width: '100%' }}
        >
          {building ? 'Building...' : '⚙ Build Knowledge Base'}
        </button>

        <hr />

        {/* SETTINGS */}
        <div className="section-label">Settings</div>

        <label
          style={{
            display: 'block',
            fontSize: '13px',
            color: '#5f6368',
            marginBottom: '8px'
          }}
        >
          Source references to retrieve: <strong>{topK}</strong>
        </label>

        <input
          type="range"
          min="3"
          max="10"
          value={topK}
          onChange={(e) => setTopK(parseInt(e.target.value))}
          style={{
            width: '100%',
            accentColor: '#1a73e8',
            marginBottom: '16px'
          }}
        />

        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            fontSize: '13px',
            color: '#202124',
            cursor: 'pointer'
          }}
        >
          <input
            type="checkbox"
            checked={showEvidence}
            onChange={(e) => setShowEvidence(e.target.checked)}
            style={{
              marginRight: '8px',
              accentColor: '#1a73e8'
            }}
          />
          Show retrieved chunks
        </label>

        {kbStatus.ready && (
          <>
            <hr />

            <button
              className="btn btn-outlined"
              onClick={() => {
                setHistory([]);
                setDeResults(null);
              }}
              style={{ width: '100%' }}
            >
              <DeleteIcon
                sx={{
                  fontSize: 18,
                  marginRight: '8px'
                }}
              />
              Clear Results
            </button>
          </>
        )}
      </div>

      {/* MAIN CONTENT */}
      <div className="main-with-sidebar">
        <h1> DE Audit Dynamic Query Assistant</h1>

        <p style={{ marginBottom: '32px' }}>
          Design Effectiveness audit analysis grounded strictly in uploaded
          SOP documents.
        </p>

        {!kbStatus.ready && (
          <div className="alert warning">
            <span style={{ fontSize: '20px' }}>⚠️</span>
            <div>
              <strong>Knowledge Base not built.</strong> Upload documents in
              the sidebar and click <em>Build Knowledge Base</em> to get
              started.
            </div>
          </div>
        )}

        {/* TABS */}
        <div className="tabs-container">
          <button
            className={`tab-btn ${
              activeTab === 'query' ? 'active' : ''
            }`}
            onClick={() => setActiveTab('query')}
          >
           RAG Query
          </button>

          <button
            className={`tab-btn ${
              activeTab === 'de' ? 'active' : ''
            }`}
            onClick={() => setActiveTab('de')}
          >
            DE Template
          </button>
        </div>

        {/* TAB 1 : QUERY */}
        {activeTab === 'query' && (
          <div>
            <div
              style={{
                display: 'flex',
                gap: '12px',
                marginBottom: '32px'
              }}
            >
              <input
                type="text"
                className="input"
                placeholder="e.g. What is the frequency of the SVaR stress period selection control?"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyPress={(e) =>
                  e.key === 'Enter' && handleQuery()
                }
                disabled={!kbStatus.ready}
                style={{ flex: 1 }}
              />

              <button
                className="btn"
                onClick={handleQuery}
                disabled={
                  !kbStatus.ready || !query.trim() || loading
                }
              >
                <SearchIcon
                  sx={{
                    fontSize: 18,
                    marginRight: '8px'
                  }}
                />
                {loading ? 'Analyzing...' : 'Analyze'}
              </button>
            </div>

            {history.map((item, idx) => (
              <div
                key={idx}
                style={{
                  marginBottom: '32px'
                }}
              >
                <div className="section-label">Question</div>
                <h3 style={{ marginBottom: '16px' }}>
                  {item.query}
                </h3>

                <div className="section-label">Analysis</div>
                <div className="answer-box">{item.answer}</div>

                {showEvidence && item.evidence.length > 0 && (
                  <details
                    style={{
                      marginTop: '16px'
                    }}
                  >
                    <summary
                      style={{
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: 500,
                        color: '#1a73e8',
                        padding: '12px 0',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                    >
                      <ExpandMoreIcon
                        sx={{
                          fontSize: 20
                        }}
                      />
                      📄 Retrieved chunks ({item.evidence.length}
                      retrieved)
                    </summary>

                    <div style={{ marginTop: '12px' }}>
                      {item.evidence.map((e, i) => (
                        <div
                          key={i}
                          className="evidence-card"
                        >
                          <div
                            style={{
                              marginBottom: '8px'
                            }}
                          >
                            <span className="score-badge">
                              score: {e.score.toFixed(3)}
                            </span>

                            <span className="source-tag">
                              {e.source} · p.{e.page}
                            </span>
                          </div>

                          {e.section && (
                            <div
                              style={{
                                fontSize: '12px',
                                color: '#1a73e8',
                                marginBottom: '8px',
                                fontWeight: 500
                              }}
                            >
                              § {e.section}
                            </div>
                          )}

                          <div
                            style={{
                              fontSize: '13px',
                              color: '#202124',
                              lineHeight: 1.6
                            }}
                          >
                            {e.text}
                          </div>
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            ))}
          </div>
        )}

        {/* TAB 2 : DE TEMPLATE */}
        {activeTab === 'de' && (
          <div>
            <div
              className="alert info"
              style={{
                marginBottom: '24px'
              }}
            >
              <span style={{ fontSize: '20px' }}>ℹ️</span>

              <div>
                Upload the DE template Excel. Each sheet is processed
                independently using SOP knowledge base.
                <br />
                <br />
                Required columns:
                <strong> Attribute</strong>,
                <strong> Required Questions</strong>,
                <strong> Considerations</strong>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                gap: '12px',
                marginBottom: '24px'
              }}
            >
              <div
                className="file-upload"
                style={{
                  flex: 1,
                  padding: '32px'
                }}
              >
                <input
                  type="file"
                  accept=".xlsx"
                  onChange={(e) =>
                    setDeFile(e.target.files[0])
                  }
                  style={{ display: 'none' }}
                  id="excel-upload"
                />

                <label
                  htmlFor="excel-upload"
                  style={{
                    cursor: 'pointer',
                    display: 'block'
                  }}
                >
                  <UploadIcon
                    sx={{
                      fontSize: 40,
                      color: '#5f6368',
                      marginBottom: '12px'
                    }}
                  />

                  <div
                    style={{
                      fontSize: '14px',
                      color: '#5f6368',
                      fontWeight: 500
                    }}
                  >
                    {deFile
                      ? `✓ ${deFile.name}`
                      : 'Click to upload DE Template (.xlsx)'}
                  </div>
                </label>
              </div>

              <button
                className="btn"
                onClick={handleDEProcess}
                disabled={
                  !kbStatus.ready || !deFile || processing
                }
                style={{
                  alignSelf: 'center'
                }}
              >
                {processing
                  ? 'Processing...'
                  : '▶ Run DE Analysis'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
