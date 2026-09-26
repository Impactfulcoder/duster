import React from 'react';

const PdfViewerModal = ({ isOpen, onClose, file }) => {
  if (!isOpen || !file) return null;

  const downloadUrl = `http://localhost:5000/api/content/files/${file._id}/download?inline=true`;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-panel"
        style={{ maxWidth: 900, height: '85vh', display: 'flex', flexDirection: 'column', padding: 16 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div>
            <div className="terminal-comment">{"// preview document"}</div>
            <h3 style={{ fontSize: 16, color: 'var(--text)' }}>{file.originalName}</h3>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <a
              href={`http://localhost:5000/api/content/files/${file._id}/download`}
              download
              className="btn-command"
              target="_blank"
              rel="noreferrer"
            >
              [ ↓ download ]
            </a>
            <button className="btn-command" onClick={onClose}>
              [ close ]
            </button>
          </div>
        </div>

        <div style={{ flex: 1, backgroundColor: '#1a1a1e', borderRadius: 'var(--radius-card)', overflow: 'hidden' }}>
          {file.mimeType.startsWith('image/') ? (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img src={downloadUrl} alt={file.originalName} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
            </div>
          ) : (
            <iframe
              src={downloadUrl}
              title={file.originalName}
              style={{ width: '100%', height: '100%', border: 'none' }}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default PdfViewerModal;
