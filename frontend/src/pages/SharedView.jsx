import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import ReactDiffViewer from 'react-diff-viewer-continued';
import {
  FaGithub, FaStar, FaCodeBranch, FaClock, FaEye,
  FaLock, FaGlobe, FaExternalLinkAlt, FaArrowLeft,
  FaFolder, FaFolderOpen, FaFile, FaChevronRight,
  FaEdit, FaTimes, FaSave, FaChevronDown, FaCopy, FaCheck, FaPaperPlane
} from 'react-icons/fa';
import './SharedView.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const LANGUAGE_COLORS = {
  JavaScript: '#f1e05a', TypeScript: '#3178c6', Python: '#3572A5',
  Java: '#b07219', Go: '#00ADD8', Rust: '#dea584', 'C++': '#f34b7d',
  C: '#555555', Ruby: '#701516', PHP: '#4F5D95', Swift: '#F05138',
  Kotlin: '#A97BFF', HTML: '#e34c26', CSS: '#563d7c',
};

// Map file extensions to language names for syntax display
const EXT_TO_LANG = {
  js: 'JavaScript', jsx: 'JavaScript', ts: 'TypeScript', tsx: 'TypeScript',
  py: 'Python', rb: 'Ruby', go: 'Go', rs: 'Rust', java: 'Java',
  cpp: 'C++', c: 'C', h: 'C', cs: 'C#', php: 'PHP', swift: 'Swift',
  kt: 'Kotlin', dart: 'Dart', html: 'HTML', css: 'CSS', scss: 'SCSS',
  json: 'JSON', yaml: 'YAML', yml: 'YAML', md: 'Markdown', xml: 'XML',
  sql: 'SQL', sh: 'Shell', bash: 'Shell', zsh: 'Shell', dockerfile: 'Docker',
  toml: 'TOML', ini: 'INI', env: 'Env', gitignore: 'Git', svg: 'SVG',
};

function getFileExtension(filename) {
  const parts = filename.split('.');
  return parts.length > 1 ? parts.pop().toLowerCase() : '';
}

function getFileLang(filename) {
  const ext = getFileExtension(filename);
  return EXT_TO_LANG[ext] || ext.toUpperCase() || 'Text';
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export default function SharedView() {
  const { shareId } = useParams();
  const [share, setShare] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // File browser state
  const [treeData, setTreeData] = useState({}); // mapping of path => array of items
  const [expandedFolders, setExpandedFolders] = useState(new Set([''])); // paths of expanded folders, '' is root
  const [loadingFolders, setLoadingFolders] = useState(new Set()); // paths currently loading
  
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileContent, setFileContent] = useState('');
  const [fileLoading, setFileLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Edit & PR features
  const [editMode, setEditMode] = useState(false);
  const [editedContent, setEditedContent] = useState('');
  const [pendingChanges, setPendingChanges] = useState({}); // { [path]: newContent }
  const [originalContents, setOriginalContents] = useState({}); // { [path]: originalContent }
  
  const [isPrModalOpen, setIsPrModalOpen] = useState(false);
  const [viewingDiffPath, setViewingDiffPath] = useState(null); // path for which we are viewing diff
  const [prSubmitting, setPrSubmitting] = useState(false);
  const [prForm, setPrForm] = useState({ title: '', description: '', authorName: '' });

  // Resizable sidebar state
  const [sidebarWidth, setSidebarWidth] = useState(280);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    axios.get(`${API_URL}/api/shares/${shareId}`)
      .then(res => {
        setShare(res.data.share);
      })
      .catch(err => {
        if (err.response?.status === 404) setError('not_found');
        else if (err.response?.status === 410) setError('expired');
        else setError('unknown');
      })
      .finally(() => setLoading(false));
  }, [shareId]);

  // Fetch directory contents
  const fetchFolder = useCallback(async (path = '') => {
    if (treeData[path]) return; // already fetched

    setLoadingFolders(prev => new Set(prev).add(path));
    try {
      const res = await axios.get(`${API_URL}/api/shares/${shareId}/tree`, {
        params: { path },
      });
      // sort: directories first, then files, alphabetically
      const sorted = res.data.items.sort((a, b) => {
        if (a.type === 'dir' && b.type !== 'dir') return -1;
        if (a.type !== 'dir' && b.type === 'dir') return 1;
        return a.name.localeCompare(b.name);
      });
      setTreeData(prev => ({ ...prev, [path]: sorted }));
    } catch (err) {
      console.error('Failed to fetch folder:', err);
    } finally {
      setLoadingFolders(prev => {
        const next = new Set(prev);
        next.delete(path);
        return next;
      });
    }
  }, [shareId, treeData]);

  // Fetch root tree when share is loaded
  useEffect(() => {
    if (share) {
      fetchFolder('');
    }
  }, [share, fetchFolder]);

  const toggleFolder = (path) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
        fetchFolder(path);
      }
      return next;
    });
  };

  // Fetch file content
  const handleFileClick = async (file) => {
    setSelectedFile(file);
    setFileLoading(true);
    setFileContent('');
    setEditMode(false); // Reset edit mode when changing files
    try {
      if (pendingChanges[file.path] !== undefined) {
        // We have unsaved local edits
        setFileContent(pendingChanges[file.path]);
        setEditedContent(pendingChanges[file.path]);
      } else {
        const res = await axios.get(`${API_URL}/api/shares/${shareId}/file`, {
          params: { path: file.path },
        });
        setFileContent(res.data.content);
        setEditedContent(res.data.content);
        setOriginalContents(prev => ({ ...prev, [file.path]: res.data.content }));
      }
    } catch (err) {
      setFileContent('// Unable to load file content');
      setEditedContent('');
    } finally {
      setFileLoading(false);
    }
  };

  const handleCopyCode = async () => {
    await navigator.clipboard.writeText(editMode ? editedContent : fileContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  const handleSaveFileEdits = () => {
    setPendingChanges(prev => ({
      ...prev,
      [selectedFile.path]: editedContent
    }));
    setFileContent(editedContent);
    setEditMode(false);
  };
  
  const handleDiscardChanges = (path) => {
    setPendingChanges(prev => {
      const next = { ...prev };
      delete next[path];
      return next;
    });
    setOriginalContents(prev => {
      const next = { ...prev };
      delete next[path];
      return next;
    });
    if (selectedFile?.path === path) {
      // Reload logic from server if it's currently open
      handleFileClick(selectedFile);
    }
  };

  const handlePrSubmit = async (e) => {
    e.preventDefault();
    const modifiedFiles = Object.keys(pendingChanges);
    if (!prForm.title) return toast.error('PR Title is required');
    if (modifiedFiles.length === 0) return toast.error('No file changes to submit.');

    setPrSubmitting(true);
    
    const filesPayload = modifiedFiles.map(path => ({
      path,
      content: pendingChanges[path]
    }));

    try {
      const res = await axios.post(`${API_URL}/api/shares/${shareId}/pr`, {
        files: filesPayload,
        title: prForm.title,
        description: prForm.description,
        authorName: prForm.authorName || 'Guest Contributor'
      });
      
      toast.success(`Pull Request created for ${modifiedFiles.length} file(s)!`, {
        duration: 5000,
        icon: '🚀'
      });
      
      // Optionally open PR link
      window.open(res.data.prUrl, '_blank');
      
      setIsPrModalOpen(false);
      setEditMode(false);
      setPendingChanges({});
      // Reset form
      setPrForm({ title: '', description: '', authorName: '' });
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.details || 'Failed to submit PR';
      toast.error(msg);
    } finally {
      setPrSubmitting(false);
    }
  };

  const getTimeRemaining = (expiresAt) => {
    const now = new Date();
    const exp = new Date(expiresAt);
    const diff = exp - now;
    if (diff <= 0) return 'Expired';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d ${hours % 24}h remaining`;
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) return `${hours}h ${minutes}m remaining`;
    return `${minutes}m remaining`;
  };

  // Drag handlers for resizable sidebar
  const startResizing = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const stopResizing = useCallback(() => {
    setIsDragging(false);
  }, []);

  const resize = useCallback((e) => {
    if (isDragging) {
      // Find the main container padding to offset correctly or calculate change.
      // E.g: A simple approach is finding offset from the left side of the window.
      // We can get the left bounds from an element. But a simpler approach is just doing a relative change or a simplified absolute one if we assume layout:
      // Since it's centered, we let's calculate based on mouse X position relative to layout. 
      // Actually e.clientX measures from window edge. Better to use a relative movement approach or bound checking.
      const paddingSide = (window.innerWidth - Math.min(1400, window.innerWidth)) / 2 + 32;
      let newWidth = e.clientX - paddingSide; 
      
      if (newWidth < 200) newWidth = 200;
      if (newWidth > 600) newWidth = 600;
      setSidebarWidth(newWidth);
    }
  }, [isDragging]);

  useEffect(() => {
    window.addEventListener('mousemove', resize);
    window.addEventListener('mouseup', stopResizing);
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [resize, stopResizing]);

  const renderTree = (path = '', depth = 0) => {
    const items = treeData[path];
    if (!items) return null;

    return items.map((item) => {
      const isExpanded = expandedFolders.has(item.path);
      const isSelected = selectedFile?.path === item.path;
      const isLoading = loadingFolders.has(item.path);

      return (
        <div key={item.path} className="tree-node-wrapper">
          <div 
            className={`tree-node ${isSelected ? 'active' : ''}`}
            style={{ paddingLeft: `${24 + depth * 20}px` }}
            onClick={() => {
              if (item.type === 'dir') {
                toggleFolder(item.path);
              } else {
                handleFileClick(item);
              }
            }}
          >
            {/* Expand/Collapse arrow for folders */}
            <div className="tree-node-arrow">
              {item.type === 'dir' && (
                isLoading ? (
                  <div className="spinner-micro"></div>
                ) : (
                  <FaChevronRight size={10} className={`chevron-icon ${isExpanded ? 'rotated' : ''}`} />
                )
              )}
            </div>

            {/* Icon */}
            {item.type === 'dir' ? (
              isExpanded ? <FaFolderOpen size={14} className="tree-icon folder-icon" /> : <FaFolder size={14} className="tree-icon folder-icon" />
            ) : (
              <FaFile size={13} className="tree-icon file-icon" />
            )}
            
            <span className="tree-name">{item.name}</span>
            {pendingChanges[item.path] !== undefined && <span className="tree-modified-dot"></span>}
          </div>

          {/* Children */}
          {item.type === 'dir' && isExpanded && (
            <div className="tree-children">
              {renderTree(item.path, depth + 1)}
            </div>
          )}
        </div>
      );
    });
  };

  if (loading) {
    return (
      <div className="shared-view-loading">
        <div className="loader-ring"><div></div><div></div><div></div><div></div></div>
        <p>Loading shared repository...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="shared-view-error">
        <div className="error-card animate-fade-in-up">
          {error === 'expired' ? (
            <>
              <div className="error-icon expired"><FaClock size={40} /></div>
              <h2>Link Expired</h2>
              <p>This share link has expired and is no longer accessible.</p>
            </>
          ) : error === 'not_found' ? (
            <>
              <div className="error-icon not-found"><FaGithub size={40} /></div>
              <h2>Not Found</h2>
              <p>This share link doesn't exist or has been deleted.</p>
            </>
          ) : (
            <>
              <div className="error-icon unknown"><FaGithub size={40} /></div>
              <h2>Something went wrong</h2>
              <p>We couldn't load this shared repository. Please try again later.</p>
            </>
          )}
          <Link to="/" className="back-link">
            <FaArrowLeft size={14} /> Back to GitShare
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="shared-view">
      <div className="shared-bg-orbs">
        <div className="orb orb-1"></div>
        <div className="orb orb-2"></div>
      </div>

      {/* Top Nav */}
      <nav className="shared-nav">
        <Link to="/" className="nav-brand">
          <div className="brand-icon"><FaGithub size={20} /></div>
          <span>GitShare</span>
        </Link>
        <span className="shared-badge">
          <FaClock size={12} />
          {getTimeRemaining(share.expiresAt)}
        </span>
      </nav>

      <main className="shared-main animate-fade-in-up">
        {/* Repo Header Panel */}
        <div className="repo-header-panel">
          <div className="repo-header-left">
            <img src={share.ownerAvatar} alt={share.ownerLogin} className="owner-avatar" />
            <div>
              <h1 className="repo-header-name">
                <span className="repo-header-owner">{share.ownerLogin}</span>
                <span className="repo-header-sep">/</span>
                <span className="repo-header-repo">{share.repoName}</span>
              </h1>
              {share.repoDescription && (
                <p className="repo-header-desc">{share.repoDescription}</p>
              )}
            </div>
          </div>
          <div className="repo-header-right">
            <div className="repo-header-stats">
              {share.language && (
                <span className="stat-pill">
                  <span className="lang-dot" style={{ background: LANGUAGE_COLORS[share.language] || '#8b8b8b' }}></span>
                  {share.language}
                </span>
              )}
              <span className="stat-pill"><FaStar size={12} /> {share.stars}</span>
              <span className="stat-pill"><FaCodeBranch size={12} /> {share.forks}</span>
              <span className="stat-pill"><FaEye size={12} /> {share.viewCount}</span>
              <span className="stat-pill visibility">
                {share.isPrivate ? <><FaLock size={11} /> Private</> : <><FaGlobe size={11} /> Public</>}
              </span>
            </div>
            <div className="repo-actions">
              {Object.keys(pendingChanges).length > 0 && (
                <button 
                  className="action-btn contribute-btn pr-ready-btn animate-fade-in-up" 
                  onClick={() => setIsPrModalOpen(true)}
                >
                  <FaPaperPlane size={14} /> Create PR ({Object.keys(pendingChanges).length} files)
                </button>
              )}
              <a href={`${share.repoUrl}/fork`} target="_blank" rel="noopener noreferrer" className="action-btn github-link-btn">
                <FaCodeBranch size={14} /> Fork Repo
              </a>
              <a href={share.repoUrl} target="_blank" rel="noopener noreferrer" className="action-btn github-link-btn">
                <FaGithub size={16} /> View on GitHub <FaExternalLinkAlt size={10} />
              </a>
            </div>
          </div>
        </div>

        {/* File Browser with Sidebar Tree */}
        <div className={`file-browser tree-layout ${isDragging ? 'dragging' : ''}`}>
          {/* Sidebar */}
          <aside className="tree-sidebar" style={{ width: `${sidebarWidth}px`, minWidth: `${sidebarWidth}px`, flexShrink: 0 }}>
            <div className="tree-header">
              <FaFolderOpen size={14} className="folder-icon" />
              <span>{share.repoName}</span>
            </div>
            <div className="tree-root">
              {loadingFolders.has('') && !treeData[''] ? (
                <div className="tree-loading-root">
                  <div className="spinner-small"></div>
                  <span>Loading tree...</span>
                </div>
              ) : (
                renderTree('')
              )}
            </div>
          </aside>

          {/* Resizer Handle */}
          <div className="tree-resizer" onMouseDown={startResizing}></div>

          {/* Main Area Code Viewer */}
          <div className="tree-main">
            {selectedFile ? (
              <div className="code-panel animate-fade-in">
                <div className="code-header">
                  <div className="code-file-info">
                    <FaFile size={13} />
                    <span className="code-filename">{selectedFile.path}</span>
                    <span className="code-lang-badge">{getFileLang(selectedFile.name)}</span>
                    <span className="code-size">{formatBytes(selectedFile.size)}</span>
                    {editMode && <span className="edit-badge">EDITING</span>}
                  </div>
                  <div className="code-header-actions">
                    {editMode ? (
                      <>
                        <button className="copy-btn copy-btn-primary" onClick={handleSaveFileEdits}>
                          <FaSave size={12} /> Save
                        </button>
                        <button className="copy-btn cancel-btn" onClick={() => { setEditMode(false); setEditedContent(fileContent); }}>
                          <FaTimes size={12} /> Cancel
                        </button>
                      </>
                    ) : (
                      <button className="copy-btn edit-btn" onClick={() => setEditMode(true)}>
                        <FaEdit size={12} /> Edit File
                      </button>
                    )}
                    <button className="copy-btn" onClick={handleCopyCode}>
                      {copied ? <><FaCheck size={12} /> Copied!</> : <><FaCopy size={12} /> Copy</>}
                    </button>
                  </div>
                </div>
                <div className="code-body">
                  {fileLoading ? (
                    <div className="code-loading">
                      <div className="spinner-small"></div>
                      <span>Loading file...</span>
                    </div>
                  ) : editMode ? (
                    <textarea 
                      className="code-editor"
                      value={editedContent}
                      onChange={(e) => setEditedContent(e.target.value)}
                      spellCheck="false"
                    />
                  ) : (
                    <pre className="code-content">
                      <code>
                        {fileContent.split('\n').map((line, i) => (
                          <div key={i} className="code-line">
                            <span className="line-number">{i + 1}</span>
                            <span className="line-content">{line}</span>
                          </div>
                        ))}
                      </code>
                    </pre>
                  )}
                </div>
              </div>
            ) : (
              <div className="empty-selection">
                <FaFile size={40} />
                <p>Select a file from the sidebar to view its code</p>
              </div>
            )}
          </div>
        </div>

        {/* Shared By Footer */}
        <div className="shared-footer-bar">
          <div className="footer-item">
            <img src={share.sharedByAvatar} alt={share.sharedBy} className="sharer-avatar" />
            <span>Shared by <strong>@{share.sharedBy}</strong></span>
          </div>
          <div className="footer-item">
            <FaClock size={12} />
            <span>Expires {new Date(share.expiresAt).toLocaleDateString('en-US', {
              month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
            })}</span>
          </div>
        </div>
      </main>

      {/* PR Modal */}
      {isPrModalOpen && (
        <div className="modal-overlay pr-modal-overlay">
          <div className="modal-content pr-modal-dialog animate-fade-in-up">
            <button 
              className="close-btn" 
              onClick={() => {
                setIsPrModalOpen(false);
                setViewingDiffPath(null);
              }}
            >
              <FaTimes />
            </button>

            {viewingDiffPath ? (
              <div className="diff-viewer-container">
                <div className="diff-viewer-header">
                  <button className="back-btn" onClick={() => setViewingDiffPath(null)}>
                    <FaArrowLeft size={12} /> Back
                  </button>
                  <span className="diff-viewer-title">Changes in {viewingDiffPath}</span>
                </div>
                <div className="diff-viewer-body">
                  <ReactDiffViewer 
                    oldValue={originalContents[viewingDiffPath] || ''} 
                    newValue={pendingChanges[viewingDiffPath] || ''} 
                    splitView={false}
                    useDarkTheme={true}
                    hideLineNumbers={false}
                    styles={{
                      variables: {
                        dark: {
                          diffViewerBackground: '#0a0a0f', // --bg-primary
                          diffViewerColor: '#a0a0b8', // --text-secondary
                          addedBackground: 'rgba(0, 212, 170, 0.1)',
                          addedColor: '#00d4aa',
                          removedBackground: 'rgba(255, 77, 106, 0.1)',
                          removedColor: '#ff4d6a',
                          wordAddedBackground: 'rgba(0, 212, 170, 0.25)',
                          wordRemovedBackground: 'rgba(255, 77, 106, 0.25)',
                          addedGutterBackground: 'rgba(0, 212, 170, 0.05)',
                          removedGutterBackground: 'rgba(255, 77, 106, 0.05)',
                          gutterBackground: '#16162a', // --bg-card
                          gutterBackgroundDark: '#1a1a2e', // --bg-tertiary
                          highlightBackground: 'rgba(124, 92, 252, 0.15)',
                          highlightGutterBackground: 'rgba(124, 92, 252, 0.1)',
                          codeFoldGutterBackground: '#1a1a2e',
                          codeFoldBackground: '#12121a',
                          emptyLineBackground: '#0a0a0f',
                          gutterColor: '#6b6b85',
                          addedGutterColor: '#00d4aa',
                          removedGutterColor: '#ff4d6a',
                        }
                      },
                      titleBlock: {
                        display: 'none',
                      }
                    }}
                  />
                </div>
              </div>
            ) : (
              <>
                <h2 className="modal-title">📦 Create Pull Request</h2>
                <p className="modal-subtitle">Propose your changes to the owner's repository securely through GitShare.</p>
                
                <form onSubmit={handlePrSubmit} className="pr-form">
                  <div className="form-group">
                    <label>PR Title</label>
                    <input 
                      type="text" 
                      value={prForm.title}
                      onChange={(e) => setPrForm({...prForm, title: e.target.value})}
                      placeholder="e.g. Fix typo in index.js"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Author Name (Optional)</label>
                    <input 
                      type="text" 
                      value={prForm.authorName}
                      onChange={(e) => setPrForm({...prForm, authorName: e.target.value})}
                      placeholder="Your Name (Anonymous if blank)"
                    />
                  </div>
                  <div className="form-group">
                    <label>Description (Optional)</label>
                    <textarea 
                      value={prForm.description}
                      onChange={(e) => setPrForm({...prForm, description: e.target.value})}
                      placeholder="Describe what changed and why..."
                      rows="3"
                    ></textarea>
                  </div>

                  <div className="pr-diff-preview pr-diff-list">
                    <strong>Files modified ({Object.keys(pendingChanges).length}):</strong>
                    <ul className="modified-files-list">
                      {Object.keys(pendingChanges).map(path => (
                        <li key={path}>
                          <div className="file-diff-info">
                            <FaFile size={11} /> <span>{path}</span>
                          </div>
                          <button 
                            type="button" 
                            className="view-diff-btn" 
                            onClick={() => setViewingDiffPath(path)}
                          >
                            <FaEye size={12} /> View Changes
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="pr-actions">
                    <button type="button" className="btn-secondary" onClick={() => setIsPrModalOpen(false)} disabled={prSubmitting}>
                      Cancel
                    </button>
                    <button type="submit" className="action-btn contribute-btn" disabled={prSubmitting}>
                      {prSubmitting ? <><div className="spinner-small"></div> Submitting...</> : <><FaPaperPlane size={13} /> Open Pull Request</>}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
