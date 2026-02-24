import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  FaGithub, FaStar, FaCodeBranch, FaSignOutAlt, FaSearch,
  FaShareAlt, FaCopy, FaTrash, FaExternalLinkAlt, FaEye,
  FaClock, FaLock, FaGlobe, FaChevronDown
} from 'react-icons/fa';
import { HiSparkles } from 'react-icons/hi2';
import './Dashboard.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const DURATIONS = [
  { value: '1h', label: '1 Hour' },
  { value: '6h', label: '6 Hours' },
  { value: '12h', label: '12 Hours' },
  { value: '1d', label: '1 Day' },
  { value: '3d', label: '3 Days' },
  { value: '7d', label: '7 Days' },
  { value: '30d', label: '30 Days' },
];

const LANGUAGE_COLORS = {
  JavaScript: '#f1e05a',
  TypeScript: '#3178c6',
  Python: '#3572A5',
  Java: '#b07219',
  Go: '#00ADD8',
  Rust: '#dea584',
  'C++': '#f34b7d',
  C: '#555555',
  Ruby: '#701516',
  PHP: '#4F5D95',
  Swift: '#F05138',
  Kotlin: '#A97BFF',
  Dart: '#00B4AB',
  HTML: '#e34c26',
  CSS: '#563d7c',
  Shell: '#89e051',
  Vue: '#41b883',
  Svelte: '#ff3e00',
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [repos, setRepos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reposLoading, setReposLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('repos'); // repos | shares
  const [shares, setShares] = useState([]);
  const [sharesLoading, setSharesLoading] = useState(false);
  const [shareModal, setShareModal] = useState(null);
  const [selectedDuration, setSelectedDuration] = useState('1d');
  const [sharing, setSharing] = useState(false);
  const [filter, setFilter] = useState('all'); // all | public | private

  // Check auth
  useEffect(() => {
    axios.get(`${API_URL}/auth/user`, { withCredentials: true })
      .then(res => {
        if (!res.data.user) {
          navigate('/');
          return;
        }
        setUser(res.data.user);
      })
      .catch(() => navigate('/'));
  }, [navigate]);

  // Fetch repos
  const fetchRepos = useCallback(async (pageNum = 1, append = false) => {
    setReposLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/repos`, {
        params: { page: pageNum, per_page: 30, sort: 'updated', type: filter === 'all' ? 'all' : filter },
        withCredentials: true,
      });
      setRepos(prev => append ? [...prev, ...res.data.repos] : res.data.repos);
      setHasMore(res.data.hasMore);
      setPage(pageNum);
    } catch (err) {
      toast.error('Failed to fetch repositories');
    } finally {
      setReposLoading(false);
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    if (user) {
      fetchRepos(1, false);
    }
  }, [user, fetchRepos]);

  // Fetch shares
  const fetchShares = useCallback(async () => {
    setSharesLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/my-shares`, { withCredentials: true });
      setShares(res.data.shares);
    } catch (err) {
      toast.error('Failed to fetch shares');
    } finally {
      setSharesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user && activeTab === 'shares') {
      fetchShares();
    }
  }, [user, activeTab, fetchShares]);

  const handleLogout = async () => {
    await axios.post(`${API_URL}/auth/logout`, {}, { withCredentials: true });
    navigate('/');
  };

  const handleLoadMore = () => {
    fetchRepos(page + 1, true);
  };

  const handleShare = async (repo) => {
    setSharing(true);
    try {
      const res = await axios.post(`${API_URL}/api/shares`, {
        repo,
        duration: selectedDuration,
      }, { withCredentials: true });

      const shareUrl = res.data.share.shareUrl;
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Share link copied to clipboard!');
      setShareModal(null);
      if (activeTab === 'shares') fetchShares();
    } catch (err) {
      toast.error('Failed to create share link');
    } finally {
      setSharing(false);
    }
  };

  const handleDeleteShare = async (shareId) => {
    try {
      await axios.delete(`${API_URL}/api/shares/${shareId}`, { withCredentials: true });
      toast.success('Share link deleted');
      setShares(prev => prev.filter(s => s.shareId !== shareId));
    } catch (err) {
      toast.error('Failed to delete share');
    }
  };

  const handleCopyLink = async (shareId) => {
    const url = `${window.location.origin}/share/${shareId}`;
    await navigator.clipboard.writeText(url);
    toast.success('Link copied!');
  };

  const formatTimeRemaining = (expiresAt) => {
    const now = new Date();
    const exp = new Date(expiresAt);
    const diff = exp - now;
    if (diff <= 0) return 'Expired';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d ${hours % 24}h remaining`;
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m remaining`;
  };

  const filteredRepos = repos.filter(repo =>
    repo.name.toLowerCase().includes(search.toLowerCase()) ||
    (repo.description && repo.description.toLowerCase().includes(search.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loader-ring">
          <div></div><div></div><div></div><div></div>
        </div>
        <p>Loading your repositories...</p>
      </div>
    );
  }

  return (
    <div className="dashboard">
      {/* Share Modal */}
      {shareModal && (
        <div className="modal-overlay" onClick={() => setShareModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                <FaShareAlt />
                Share Repository
              </h2>
              <button className="modal-close" onClick={() => setShareModal(null)}>×</button>
            </div>
            <div className="modal-body">
              <div className="modal-repo-info">
                <div className="modal-repo-name">
                  {shareModal.private ? <FaLock size={14} /> : <FaGlobe size={14} />}
                  <span>{shareModal.full_name}</span>
                </div>
                {shareModal.description && (
                  <p className="modal-repo-desc">{shareModal.description}</p>
                )}
              </div>
              <div className="duration-section">
                <label>Share Duration</label>
                <div className="duration-grid">
                  {DURATIONS.map(d => (
                    <button
                      key={d.value}
                      className={`duration-btn ${selectedDuration === d.value ? 'active' : ''}`}
                      onClick={() => setSelectedDuration(d.value)}
                    >
                      <FaClock size={12} />
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setShareModal(null)}>Cancel</button>
              <button
                className="btn-share"
                onClick={() => handleShare(shareModal)}
                disabled={sharing}
              >
                {sharing ? (
                  <span className="spinner-small"></span>
                ) : (
                  <>
                    <FaCopy size={14} />
                    Create & Copy Link
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-icon">
            <FaGithub size={20} />
          </div>
          <span>GitShare</span>
        </div>

        <div className="sidebar-user">
          <img src={user?.avatar_url} alt={user?.login} className="user-avatar" />
          <div className="user-info">
            <span className="user-name">{user?.name || user?.login}</span>
            <span className="user-login">@{user?.login}</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <button
            className={`nav-item ${activeTab === 'repos' ? 'active' : ''}`}
            onClick={() => setActiveTab('repos')}
          >
            <FaGithub size={18} />
            <span>Repositories</span>
          </button>
          <button
            className={`nav-item ${activeTab === 'shares' ? 'active' : ''}`}
            onClick={() => setActiveTab('shares')}
          >
            <FaShareAlt size={18} />
            <span>Shared Links</span>
            {shares.length > 0 && (
              <span className="nav-badge">{shares.length}</span>
            )}
          </button>
        </nav>

        <button className="sidebar-logout" onClick={handleLogout}>
          <FaSignOutAlt size={16} />
          <span>Sign Out</span>
        </button>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {activeTab === 'repos' ? (
          <>
            <div className="content-header">
              <div>
                <h1>Your Repositories</h1>
                <p className="content-subtitle">{repos.length} repositories loaded</p>
              </div>
              <div className="header-actions">
                <div className="search-box">
                  <FaSearch size={14} />
                  <input
                    type="text"
                    placeholder="Search repositories..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                </div>
                <div className="filter-dropdown">
                  <select value={filter} onChange={e => setFilter(e.target.value)}>
                    <option value="all">All Repos</option>
                    <option value="public">Public</option>
                    <option value="private">Private</option>
                  </select>
                  <FaChevronDown size={12} className="dropdown-icon" />
                </div>
              </div>
            </div>

            <div className="repos-grid">
              {filteredRepos.map((repo, i) => (
                <div
                  key={repo.id}
                  className="repo-card animate-fade-in-up"
                  style={{ animationDelay: `${Math.min(i * 0.03, 0.5)}s` }}
                >
                  <div className="repo-card-header">
                    <div className="repo-name-row">
                      <span className="repo-visibility">
                        {repo.private ? <FaLock size={11} /> : <FaGlobe size={11} />}
                      </span>
                      <a href={repo.html_url} target="_blank" rel="noopener noreferrer" className="repo-name">
                        {repo.name}
                      </a>
                    </div>
                    <button
                      className="repo-share-btn"
                      onClick={() => setShareModal(repo)}
                      title="Share this repo"
                    >
                      <FaShareAlt size={14} />
                    </button>
                  </div>

                  {repo.description && (
                    <p className="repo-description">{repo.description}</p>
                  )}

                  <div className="repo-meta">
                    {repo.language && (
                      <span className="repo-lang">
                        <span
                          className="lang-dot"
                          style={{ background: LANGUAGE_COLORS[repo.language] || '#8b8b8b' }}
                        ></span>
                        {repo.language}
                      </span>
                    )}
                    <span className="repo-stat">
                      <FaStar size={12} />
                      {repo.stargazers_count}
                    </span>
                    <span className="repo-stat">
                      <FaCodeBranch size={12} />
                      {repo.forks_count}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {reposLoading && (
              <div className="loading-more">
                <div className="spinner-small"></div>
                <span>Loading more...</span>
              </div>
            )}

            {hasMore && !reposLoading && (
              <div className="load-more-wrapper">
                <button className="btn-load-more" onClick={handleLoadMore}>
                  Load More Repositories
                </button>
              </div>
            )}

            {filteredRepos.length === 0 && !reposLoading && (
              <div className="empty-state">
                <FaSearch size={40} />
                <h3>No repositories found</h3>
                <p>Try adjusting your search or filters.</p>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="content-header">
              <div>
                <h1>Shared Links</h1>
                <p className="content-subtitle">Manage your active share links</p>
              </div>
            </div>

            {sharesLoading ? (
              <div className="loading-more">
                <div className="spinner-small"></div>
                <span>Loading shares...</span>
              </div>
            ) : shares.length === 0 ? (
              <div className="empty-state">
                <FaShareAlt size={40} />
                <h3>No active shares</h3>
                <p>Share a repository to generate a time-limited link.</p>
              </div>
            ) : (
              <div className="shares-list">
                {shares.map((share, i) => (
                  <div
                    key={share.shareId}
                    className="share-card animate-fade-in-up"
                    style={{ animationDelay: `${i * 0.05}s` }}
                  >
                    <div className="share-card-main">
                      <div className="share-info">
                        <div className="share-repo-name">
                          {share.isPrivate ? <FaLock size={12} /> : <FaGlobe size={12} />}
                          <span>{share.repoFullName}</span>
                        </div>
                        <div className="share-stats">
                          <span className="share-stat">
                            <FaClock size={12} />
                            {formatTimeRemaining(share.expiresAt)}
                          </span>
                          <span className="share-stat">
                            <FaEye size={12} />
                            {share.viewCount} views
                          </span>
                        </div>
                      </div>
                      <div className="share-actions">
                        <button
                          className="share-action-btn copy"
                          onClick={() => handleCopyLink(share.shareId)}
                          title="Copy link"
                        >
                          <FaCopy size={14} />
                        </button>
                        <a
                          href={`/share/${share.shareId}`}
                          target="_blank"
                          rel="noopener"
                          className="share-action-btn view"
                          title="View share"
                        >
                          <FaExternalLinkAlt size={14} />
                        </a>
                        <button
                          className="share-action-btn delete"
                          onClick={() => handleDeleteShare(share.shareId)}
                          title="Delete share"
                        >
                          <FaTrash size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
