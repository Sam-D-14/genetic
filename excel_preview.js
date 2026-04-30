import React, { useState, useEffect, useRef } from 'react';
import { HotTable } from '@handsontable/react';
import { registerAllModules } from 'handsontable/registry';
// import 'handsontable/dist/handsontable.full.min.css';
import 'handsontable/styles/handsontable.min.css';
import 'handsontable/styles/ht-theme-main.min.css';
import * as XLSX from 'xlsx';
import {
  Download as DownloadIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';

// Register Handsontable modules
registerAllModules();

export const EditableExcelPreview = ({ 
  data, 
  filename = 'output.xlsx',
  onDataChange,
  height = 500,
  readOnly = false 
}) => {
  const [sheets, setSheets] = useState([]);
  const [activeSheet, setActiveSheet] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const hotTableRef = useRef(null);

  useEffect(() => {
    if (data) {
      parseExcelData(data);
    }
  }, [data]);

  const parseExcelData = (fileOrData) => {
    // If data is already parsed (from API response)
    if (typeof fileOrData === 'object' && fileOrData.sheets) {
      setSheets(fileOrData.sheets.map(sheet => ({
        name: sheet.name,
        data: sheet.data,
        colHeaders: sheet.headers || true,
        columns: sheet.columns || null
      })));
      return;
    }

    // If data is a File object
    const reader = new FileReader();
    reader.onload = (e) => {
      const arrayBuffer = e.target.result;
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });

      const parsedSheets = workbook.SheetNames.map(name => {
        const worksheet = workbook.Sheets[name];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
          header: 1, 
          defval: '',
          raw: false // Preserve formatting
        });

        return {
          name,
          data: jsonData,
          colHeaders: true,
          columns: null
        };
      });

      setSheets(parsedSheets);
    };

    if (fileOrData instanceof File) {
      reader.readAsArrayBuffer(fileOrData);
    }
  };

  const handleCellChange = (changes, source) => {
    if (source === 'loadData') return;

    setHasChanges(true);

    if (onDataChange) {
      const currentData = hotTableRef.current?.hotInstance?.getData();
      const updatedSheets = [...sheets];
      updatedSheets[activeSheet].data = currentData;
      onDataChange(updatedSheets);
    }
  };

  const handleSaveChanges = () => {
    const currentData = hotTableRef.current?.hotInstance?.getData();
    const updatedSheets = [...sheets];
    updatedSheets[activeSheet].data = currentData;
    setSheets(updatedSheets);
    setHasChanges(false);
    setIsEditing(false);

    if (onDataChange) {
      onDataChange(updatedSheets);
    }
  };

  const handleDownload = () => {
    const workbook = XLSX.utils.book_new();

    sheets.forEach(sheet => {
      const worksheet = XLSX.utils.aoa_to_sheet(sheet.data);
      XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name);
    });

    XLSX.writeFile(workbook, filename);
  };

  const handleRefresh = () => {
    if (hasChanges) {
      if (!window.confirm('You have unsaved changes. Discard them?')) {
        return;
      }
    }
    
    setHasChanges(false);
    setIsEditing(false);
    
    // Reset to original data
    if (hotTableRef.current?.hotInstance) {
      hotTableRef.current.hotInstance.loadData(sheets[activeSheet].data);
    }
  };

  if (!sheets.length) {
    return (
      <div style={{
        background: '#f8f9fa',
        border: '1px solid #e0e0e0',
        borderRadius: '8px',
        padding: '48px',
        textAlign: 'center',
        color: '#5f6368'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>📄</div>
        <div style={{ fontSize: '14px' }}>
          No preview available. Run the pipeline to generate results.
        </div>
      </div>
    );
  }

  const currentSheet = sheets[activeSheet];

  return (
    <div style={{
      background: '#ffffff',
      border: '1px solid #e0e0e0',
      borderRadius: '8px',
      overflow: 'hidden',
      boxShadow: '0 1px 2px 0 rgba(60,64,67,0.3), 0 1px 3px 1px rgba(60,64,67,0.15)'
    }}>
      {/* Header Bar */}
      <div style={{
        background: '#f8f9fa',
        borderBottom: '1px solid #e0e0e0',
        padding: '12px 16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ fontSize: '14px', fontWeight: 600, color: '#202124' }}>
            📊 Excel Preview
          </div>
          
          {hasChanges && (
            <div style={{
              background: '#fef7e0',
              color: '#ea8600',
              padding: '4px 10px',
              borderRadius: '12px',
              fontSize: '11px',
              fontWeight: 600
            }}>
              ● UNSAVED CHANGES
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          {!readOnly && (
            <>
              {!isEditing ? (
                <button
                  className="btn btn-outlined"
                  onClick={() => setIsEditing(true)}
                  style={{ padding: '6px 16px' }}
                >
                  <EditIcon sx={{ fontSize: 16, marginRight: '6px' }} />
                  Edit
                </button>
              ) : (
                <>
                  <button
                    className="btn btn-outlined"
                    onClick={handleRefresh}
                    style={{ padding: '6px 16px' }}
                  >
                    <RefreshIcon sx={{ fontSize: 16, marginRight: '6px' }} />
                    Discard
                  </button>
                  
                  <button
                    className="btn btn-success"
                    onClick={handleSaveChanges}
                    disabled={!hasChanges}
                    style={{ padding: '6px 16px' }}
                  >
                    <SaveIcon sx={{ fontSize: 16, marginRight: '6px' }} />
                    Save
                  </button>
                </>
              )}
            </>
          )}

          <button
            className="btn"
            onClick={handleDownload}
            style={{ padding: '6px 16px' }}
          >
            <DownloadIcon sx={{ fontSize: 16, marginRight: '6px' }} />
            Download
          </button>
        </div>
      </div>

      {/* Sheet Tabs */}
      {sheets.length > 1 && (
        <div style={{
          display: 'flex',
          gap: '4px',
          padding: '8px 16px',
          background: '#f8f9fa',
          borderBottom: '1px solid #e0e0e0',
          overflowX: 'auto'
        }}>
          {sheets.map((sheet, idx) => (
            <button
              key={idx}
              onClick={() => {
                if (hasChanges && !window.confirm('Discard unsaved changes?')) {
                  return;
                }
                setActiveSheet(idx);
                setHasChanges(false);
              }}
              style={{
                background: activeSheet === idx ? '#ffffff' : 'transparent',
                border: activeSheet === idx ? '1px solid #e0e0e0' : '1px solid transparent',
                borderBottom: activeSheet === idx ? '1px solid #ffffff' : '1px solid transparent',
                padding: '8px 16px',
                borderRadius: '8px 8px 0 0',
                fontSize: '13px',
                fontWeight: activeSheet === idx ? 600 : 400,
                color: activeSheet === idx ? '#1a73e8' : '#5f6368',
                cursor: 'pointer',
                transition: 'all 0.2s',
                whiteSpace: 'nowrap',
                marginBottom: '-1px'
              }}
            >
              {sheet.name}
            </button>
          ))}
        </div>
      )}

      {/* Handsontable Grid */}
      <div style={{ 
        padding: '16px',
        background: '#ffffff'
      }}>
        <HotTable
          ref={hotTableRef}
          data={currentSheet.data}
          colHeaders={currentSheet.colHeaders}
          rowHeaders={true}
          width="100%"
          height={height}
          licenseKey="non-commercial-and-evaluation"
          readOnly={!isEditing}
          afterChange={handleCellChange}
          contextMenu={isEditing}
          manualColumnResize={true}
          manualRowResize={true}
          stretchH="all"
          className={isEditing ? 'editing-mode' : 'readonly-mode'}
          cells={(row, col) => {
            const cellProperties = {};
            
            // Style header rows (first row typically)
            if (row === 0) {
              cellProperties.className = 'header-cell';
            }
            
            // Highlight changed cells
            if (hasChanges && isEditing) {
              cellProperties.className = 'editable-cell';
            }
            
            return cellProperties;
          }}
        />
      </div>

      {/* Footer Info */}
      <div style={{
        background: '#f8f9fa',
        borderTop: '1px solid #e0e0e0',
        padding: '12px 16px',
        fontSize: '12px',
        color: '#5f6368',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          {currentSheet.data.length} rows × {currentSheet.data[0]?.length || 0} columns
        </div>
        
        {isEditing && (
          <div style={{ color: '#1a73e8', fontWeight: 500 }}>
            ✏️ Editing mode active - Double-click cells to edit
          </div>
        )}
      </div>

      {/* Custom Styles */}
      <style jsx global>{`
        .header-cell {
          background-color: #e8f0fe !important;
          font-weight: 600 !important;
          color: #1a73e8 !important;
        }

        .editable-cell {
          background-color: #fef7e0 !important;
        }

        .editing-mode .handsontable td {
          cursor: cell !important;
        }

        .readonly-mode .handsontable td {
          cursor: default !important;
        }

        .handsontable td.area {
          background-color: #e8f0fe !important;
        }

        .handsontable th {
          background-color: #f8f9fa !important;
          color: #5f6368 !important;
          font-weight: 600 !important;
          font-size: 11px !important;
        }
      `}</style>
    </div>
  );
};
