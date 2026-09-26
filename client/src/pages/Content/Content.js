import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Folder,
  FileText,
  Image as ImageIcon,
  File,
  Upload,
  FolderPlus,
  Search,
  Eye,
  Download,
  Trash2,
  ChevronRight,
} from 'lucide-react';
import { request } from '../../services/api';
import { useWorkspace } from '../../context/WorkspaceContext';
import PdfViewerModal from '../../components/common/PdfViewerModal';

const Content = () => {
  const { activeWorkspace } = useWorkspace();
  const fileInputRef = useRef(null);

  const [folders, setFolders] = useState([]);
  const [files, setFiles] = useState([]);
  const [currentFolder, setCurrentFolder] = useState(null); // null is root
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all'); // 'all' | 'pdf' | 'image'

  // Modals & previews
  const [previewFile, setPreviewFile] = useState(null);
  const [isNewFolderOpen, setIsNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [uploading, setUploading] = useState(false);

  const fetchContent = useCallback(async () => {
    if (!activeWorkspace) return;
    try {
      setLoading(true);
      const folderParam = currentFolder ? currentFolder._id : '';
      const [foldersData, filesData] = await Promise.all([
        request(`/content/folders?parentId=${folderParam}`),
        request(`/content/files?folderId=${folderParam}&search=${searchQuery}&type=${typeFilter}`),
      ]);
      setFolders(foldersData);
      setFiles(filesData);
    } catch (err) {
      console.error('Failed to load content:', err);
    } finally {
      setLoading(false);
    }
  }, [activeWorkspace, currentFolder, searchQuery, typeFilter]);

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  const handleCreateFolder = async (e) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    try {
      await request('/content/folders', {
        method: 'POST',
        body: JSON.stringify({
          name: newFolderName.trim(),
          parentId: currentFolder?._id || null,
        }),
      });
      setNewFolderName('');
      setIsNewFolderOpen(false);
      fetchContent();
    } catch (err) {
      console.error('Failed to create folder:', err);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    if (currentFolder) {
      formData.append('folderId', currentFolder._id);
    }

    setUploading(true);
    try {
      await request('/content/upload', {
        method: 'POST',
        body: formData,
      });
      fetchContent();
    } catch (err) {
      console.error('Upload failed:', err);
      alert('Upload failed: ' + (err.message || 'unknown error'));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteFile = async (fileId) => {
    if (!window.confirm('Delete this file from workspace?')) return;
    try {
      await request(`/content/files/${fileId}`, { method: 'DELETE' });
      fetchContent();
    } catch (err) {
      console.error('Failed to delete file:', err);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <div className="terminal-comment">{"// knowledge & materials"}</div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)', margin: '4px 0 0' }}>
            content
          </h1>
        </div>

        {/* Action Commands */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button className="btn-command" onClick={() => setIsNewFolderOpen(true)}>
            <FolderPlus size={13} />
            <span>[ + new folder ]</span>
          </button>

          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            onChange={handleFileUpload}
          />

          <button
            className="btn-command accent"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            <Upload size={13} />
            <span>{uploading ? '[ uploading... ]' : '[ ↑ upload file ]'}</span>
          </button>
        </div>
      </div>

      {/* Breadcrumbs & Filters */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-card)',
          padding: '10px 16px',
          marginBottom: 16,
          fontFamily: 'var(--font-mono)',
          fontSize: 12,
        }}
      >
        {/* Breadcrumb Path */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span
            onClick={() => setCurrentFolder(null)}
            style={{
              cursor: 'pointer',
              color: currentFolder ? 'var(--text-muted)' : 'var(--accent)',
              fontWeight: currentFolder ? 400 : 600,
            }}
          >
            root
          </span>
          {currentFolder && (
            <>
              <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />
              <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{currentFolder.name}</span>
            </>
          )}
        </div>

        {/* Search & Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ position: 'relative', width: 220 }}>
            <Search
              size={13}
              style={{
                position: 'absolute',
                left: 8,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
              }}
            />
            <input
              type="text"
              placeholder="filter files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', paddingLeft: 26, paddingRight: 8, height: 28, fontSize: 11 }}
            />
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            style={{ height: 28, fontSize: 11, padding: '2px 8px' }}
          >
            <option value="all">all types</option>
            <option value="pdf">PDFs only</option>
            <option value="image">images only</option>
          </select>
        </div>
      </div>

      {/* New Folder Modal */}
      {isNewFolderOpen && (
        <div className="modal-backdrop" onClick={() => setIsNewFolderOpen(false)}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 380 }}>
            <div className="terminal-comment">{"// create directory"}</div>
            <h3 style={{ fontSize: 16, marginBottom: 14 }}>new folder</h3>
            <form onSubmit={handleCreateFolder}>
              <input
                type="text"
                placeholder="Folder name (e.g. Research, Specifications)"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                autoFocus
                style={{ width: '100%', marginBottom: 16 }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button type="button" className="btn-command" onClick={() => setIsNewFolderOpen(false)}>
                  [ cancel ]
                </button>
                <button type="submit" className="btn-command accent">
                  [ create ]
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Folders Row */}
      {folders.length > 0 && (
        <div style={{ marginBottom: 18 }}>
          <div className="terminal-comment" style={{ marginBottom: 8 }}>{"// folders"}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
            {folders.map((f) => (
              <div
                key={f._id}
                onClick={() => setCurrentFolder(f)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 14px',
                  backgroundColor: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-card)',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12,
                  transition: 'background-color 0.15s ease',
                }}
              >
                <Folder size={16} style={{ color: 'var(--accent)' }} />
                <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                  {f.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Files Table View */}
      <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-card)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', backgroundColor: 'var(--surface-hover)' }}>
              <th style={{ padding: '10px 16px' }}>NAME</th>
              <th style={{ padding: '10px 16px' }}>TYPE</th>
              <th style={{ padding: '10px 16px' }}>SIZE</th>
              <th style={{ padding: '10px 16px' }}>UPLOADED BY</th>
              <th style={{ padding: '10px 16px' }}>DATE</th>
              <th style={{ padding: '10px 16px', textAlign: 'right' }}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {loading && !files.length ? (
              <tr>
                <td colSpan={6} style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  [ loading content materials... ]
                </td>
              </tr>
            ) : files.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>
                  No files in this folder. Use [ ↑ upload file ] to add PDFs, materials, or documents.
                </td>
              </tr>
            ) : (
              files.map((file) => {
                const isPdf = file.mimeType === 'application/pdf';
                const isImg = file.mimeType.startsWith('image/');

                return (
                  <tr
                    key={file._id}
                    style={{ borderBottom: '1px solid var(--border)', transition: 'background-color 0.15s ease' }}
                  >
                    <td style={{ padding: '10px 16px', color: 'var(--text)', fontWeight: 500 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {isPdf ? (
                          <FileText size={15} style={{ color: 'var(--danger)' }} />
                        ) : isImg ? (
                          <ImageIcon size={15} style={{ color: 'var(--info)' }} />
                        ) : (
                          <File size={15} style={{ color: 'var(--text-muted)' }} />
                        )}
                        <span>{file.originalName}</span>
                      </div>
                    </td>
                    <td style={{ padding: '10px 16px', color: 'var(--text-muted)' }}>
                      {file.mimeType.split('/')[1]?.toUpperCase() || 'FILE'}
                    </td>
                    <td style={{ padding: '10px 16px', color: 'var(--text-muted)' }}>
                      {formatFileSize(file.size)}
                    </td>
                    <td style={{ padding: '10px 16px', color: 'var(--text-muted)' }}>
                      {file.uploadedBy?.name || 'Someone'}
                    </td>
                    <td style={{ padding: '10px 16px', color: 'var(--text-muted)' }}>
                      {new Date(file.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    </td>
                    <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                        {(isPdf || isImg) && (
                          <button
                            title="Preview in-app"
                            className="btn-command"
                            style={{ padding: '3px 8px' }}
                            onClick={() => setPreviewFile(file)}
                          >
                            <Eye size={12} />
                            <span>preview</span>
                          </button>
                        )}

                        <a
                          href={`http://localhost:5000/api/content/files/${file._id}/download`}
                          download
                          className="btn-command"
                          style={{ padding: '3px 8px' }}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <Download size={12} />
                          <span>download</span>
                        </a>

                        <button
                          className="btn-command danger"
                          style={{ padding: '3px 6px' }}
                          onClick={() => handleDeleteFile(file._id)}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* PDF / Image Preview Modal */}
      <PdfViewerModal
        isOpen={Boolean(previewFile)}
        onClose={() => setPreviewFile(null)}
        file={previewFile}
      />
    </div>
  );
};

export default Content;
