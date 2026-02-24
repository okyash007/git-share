"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaGithub,
  FaStar,
  FaCodeBranch,
  FaSignOutAlt,
  FaSearch,
  FaShareAlt,
  FaCopy,
  FaTrash,
  FaExternalLinkAlt,
  FaEye,
  FaClock,
  FaLock,
  FaGlobe,
  FaChevronDown,
} from "react-icons/fa";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

const DURATIONS = [
  { value: "1h", label: "1 Hour" },
  { value: "6h", label: "6 Hours" },
  { value: "12h", label: "12 Hours" },
  { value: "1d", label: "1 Day" },
  { value: "3d", label: "3 Days" },
  { value: "7d", label: "7 Days" },
  { value: "30d", label: "30 Days" },
];

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [repos, setRepos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reposLoading, setReposLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("repos");
  const [shares, setShares] = useState([]);
  const [sharesLoading, setSharesLoading] = useState(false);
  const [shareModal, setShareModal] = useState(null);
  const [selectedDuration, setSelectedDuration] = useState("1d");
  const [sharing, setSharing] = useState(false);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    axios
      .get(`${API_URL}/auth/user`, { withCredentials: true })
      .then((res) => {
        if (!res.data.user) {
          router.push("/");
          return;
        }
        setUser(res.data.user);
      })
      .catch(() => router.push("/"));
  }, [router]);

  const fetchRepos = useCallback(
    async (pageNum = 1, append = false) => {
      setReposLoading(true);
      try {
        const res = await axios.get(`${API_URL}/api/repos`, {
          params: {
            page: pageNum,
            per_page: 30,
            sort: "updated",
            type: filter === "all" ? "all" : filter,
          },
          withCredentials: true,
        });
        setRepos((prev) =>
          append ? [...prev, ...res.data.repos] : res.data.repos
        );
        setHasMore(res.data.hasMore);
        setPage(pageNum);
      } catch (err) {
        toast.error("Failed to fetch repositories");
      } finally {
        setReposLoading(false);
        setLoading(false);
      }
    },
    [filter]
  );

  useEffect(() => {
    if (user) fetchRepos(1, false);
  }, [user, fetchRepos]);

  const fetchShares = useCallback(async () => {
    setSharesLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/my-shares`, {
        withCredentials: true,
      });
      setShares(res.data.shares);
    } catch (err) {
      toast.error("Failed to fetch shares");
    } finally {
      setSharesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user && activeTab === "shares") fetchShares();
  }, [user, activeTab, fetchShares]);

  const handleLogout = async () => {
    await axios.post(`${API_URL}/auth/logout`, {}, { withCredentials: true });
    router.push("/");
  };

  const handleShare = async (repo) => {
    setSharing(true);
    try {
      const res = await axios.post(
        `${API_URL}/api/shares`,
        { repo, duration: selectedDuration },
        { withCredentials: true }
      );
      await navigator.clipboard.writeText(res.data.share.shareUrl);
      toast.success("Share link copied!");
      setShareModal(null);
      if (activeTab === "shares") fetchShares();
    } catch (err) {
      toast.error("Failed to create share link");
    } finally {
      setSharing(false);
    }
  };

  const handleDeleteShare = async (shareId) => {
    try {
      await axios.delete(`${API_URL}/api/shares/${shareId}`, {
        withCredentials: true,
      });
      toast.success("Share link deleted");
      setShares((prev) => prev.filter((s) => s.shareId !== shareId));
    } catch (err) {
      toast.error("Failed to delete share");
    }
  };

  const handleCopyLink = async (shareId) => {
    const url = `${window.location.origin}/share/${shareId}`;
    await navigator.clipboard.writeText(url);
    toast.success("Link copied!");
  };

  const filteredRepos = repos.filter(
    (repo) =>
      repo.name.toLowerCase().includes(search.toLowerCase()) ||
      (repo.description &&
        repo.description.toLowerCase().includes(search.toLowerCase()))
  );

  const formatTimeRemaining = (expiresAt) => {
    const diff = new Date(expiresAt) - new Date();
    if (diff <= 0) return "Expired";
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d ${hours % 24}h remaining`;
    return `${hours}h ${Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))}m`;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white">
        <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-gray-400">Loading repositories...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-black text-white selection:bg-white selection:text-black">
      {/* Share Modal */}
      <AnimatePresence>
        {shareModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={() => setShareModal(null)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="w-full max-w-md p-6 bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="flex items-center gap-2 text-xl font-bold">
                  <FaShareAlt /> Share Repository
                </h2>
                <button
                  onClick={() => setShareModal(null)}
                  className="p-2 text-gray-400 transition-colors rounded-full hover:text-white hover:bg-white/10"
                >
                  ✕
                </button>
              </div>

              <div className="p-4 mb-6 rounded-xl bg-white/5 border border-white/5">
                <div className="flex items-center gap-2 font-mono text-sm font-semibold">
                  {shareModal.private ? <FaLock size={12} /> : <FaGlobe size={12} />}
                  <span>{shareModal.full_name}</span>
                </div>
                {shareModal.description && (
                  <p className="mt-2 text-sm text-gray-400">{shareModal.description}</p>
                )}
              </div>

              <div className="mb-6">
                <label className="block mb-3 text-sm font-medium text-gray-400">
                  Share Duration
                </label>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {DURATIONS.map((d) => (
                    <button
                      key={d.value}
                      onClick={() => setSelectedDuration(d.value)}
                      className={`flex items-center justify-center gap-2 p-2 text-xs transition-colors border rounded-lg ${
                        selectedDuration === d.value
                          ? "bg-white text-black border-white"
                          : "border-white/20 text-gray-400 hover:border-white/50 hover:text-white"
                      }`}
                    >
                      <FaClock size={10} /> {d.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShareModal(null)}
                  className="flex-1 px-4 py-2 text-sm font-medium transition-colors border rounded-xl border-white/20 hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleShare(shareModal)}
                  disabled={sharing}
                  className="flex items-center justify-center flex-1 gap-2 px-4 py-2 text-sm font-medium text-black transition-colors bg-white rounded-xl hover:bg-gray-200 disabled:opacity-50"
                >
                  {sharing ? (
                    <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <FaCopy size={14} /> Create & Copy
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 flex flex-col w-64 border-r border-white/10 bg-[#000]">
        <div className="flex items-center gap-3 p-6 border-b border-white/10">
          <FaGithub size={24} className="text-white" />
          <span className="text-xl font-bold tracking-tight">GitShare</span>
        </div>

        {user && (
          <div className="flexItems-center gap-3 p-6 border-b border-white/10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={user.avatar_url}
              alt="Avatar"
              className="w-10 h-10 rounded-full border border-white/20"
            />
            <div className="flex flex-col">
              <span className="text-sm font-semibold truncate leading-tight">
                {user.name || user.login}
              </span>
              <span className="text-xs text-gray-500 font-mono mt-0.5">
                @{user.login}
              </span>
            </div>
          </div>
        )}

        <nav className="flex-1 p-4 space-y-2">
          {[
            { id: "repos", icon: FaGithub, label: "Repositories" },
            { id: "shares", icon: FaShareAlt, label: "Shared Links" },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center justify-between w-full px-4 py-3 text-sm font-medium rounded-xl transition-all ${
                activeTab === item.id
                  ? "bg-white text-black"
                  : "text-gray-400 hover:bg-white/10 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-3">
                <item.icon size={16} />
                {item.label}
              </div>
              {item.id === "shares" && shares.length > 0 && (
                <span
                  className={`px-2 py-0.5 text-xs rounded-full ${
                    activeTab === item.id ? "bg-black text-white" : "bg-white/20 text-white"
                  }`}
                >
                  {shares.length}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-white/10">
          <button
            onClick={handleLogout}
            className="flex items-center w-full gap-3 px-4 py-3 text-sm font-medium text-red-500 transition-colors rounded-xl hover:bg-red-500/10"
          >
            <FaSignOutAlt /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64 p-8 lg:p-12 overflow-y-auto">
        {activeTab === "repos" ? (
          <div className="max-w-6xl mx-auto">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Your Repositories</h1>
                <p className="mt-1 text-sm text-gray-400">{repos.length} loaded</p>
              </div>

              <div className="flex items-center gap-3">
                <div className="relative flex-1 md:w-64">
                  <FaSearch
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
                    size={14}
                  />
                  <input
                    type="text"
                    placeholder="Search..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full py-2 pl-9 pr-4 text-sm bg-transparent border rounded-full border-white/20 focus:outline-none focus:border-white focus:ring-1 focus:ring-white transition-all"
                  />
                </div>
                <div className="relative">
                  <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className="appearance-none py-2 pl-4 pr-8 text-sm bg-transparent border rounded-full border-white/20 focus:outline-none focus:border-white transition-all"
                  >
                    <option value="all" className="bg-black text-white">All Repos</option>
                    <option value="public" className="bg-black text-white">Public</option>
                    <option value="private" className="bg-black text-white">Private</option>
                  </select>
                  <FaChevronDown
                    size={10}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
                  />
                </div>
              </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredRepos.map((repo, idx) => (
                <motion.div
                  key={repo.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(idx * 0.05, 0.5) }}
                  className="flex flex-col p-5 transition-colors border border-white/10 rounded-2xl bg-[#0a0a0a] hover:border-white/30 group"
                >
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <a
                      href={repo.html_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold break-words hover:underline decoration-white/50 flex items-center gap-2"
                    >
                      {repo.private ? (
                        <FaLock size={12} className="text-gray-500" />
                      ) : (
                        <FaGlobe size={12} className="text-gray-500" />
                      )}
                      {repo.name}
                    </a>
                    <button
                      onClick={() => setShareModal(repo)}
                      className="p-2 transition-colors rounded-full text-gray-400 hover:text-black hover:bg-white opacity-0 group-hover:opacity-100 focus:opacity-100 aspect-square shrink-0"
                    >
                      <FaShareAlt size={14} />
                    </button>
                  </div>
                  {repo.description && (
                    <p className="flex-1 mb-4 text-sm text-gray-400 line-clamp-2">
                      {repo.description}
                    </p>
                  )}
                  <div className="flex items-center gap-4 mt-auto text-xs text-gray-500 font-mono">
                    {repo.language && (
                      <span className="flex items-center gap-1.5 text-gray-300">
                        <span className="w-2 h-2 rounded-full bg-white"></span>
                        {repo.language}
                      </span>
                    )}
                    <span className="flex items-center gap-1.5">
                      <FaStar /> {repo.stargazers_count}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <FaCodeBranch /> {repo.forks_count}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>

            {reposLoading && (
              <div className="flex justify-center my-8">
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}

            {hasMore && !reposLoading && (
              <div className="flex justify-center mt-8">
                <button
                  onClick={() => fetchRepos(page + 1, true)}
                  className="px-6 py-2 text-sm font-medium transition-colors border rounded-full border-white/20 hover:bg-white/10"
                >
                  Load More
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="max-w-6xl mx-auto">
            <header className="mb-8">
              <h1 className="text-3xl font-bold tracking-tight">Shared Links</h1>
              <p className="mt-1 text-sm text-gray-400">Manage your active share links</p>
            </header>

            {sharesLoading ? (
              <div className="flex justify-center my-12">
                <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : shares.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-center border border-white/10 rounded-2xl border-dashed">
                <div className="p-4 mb-4 rounded-full bg-white/5">
                  <FaShareAlt size={32} className="text-gray-500" />
                </div>
                <h3 className="text-lg font-semibold">No active shares</h3>
                <p className="text-sm text-gray-400 max-w-sm mt-2">
                  Share a repository to generate a time-limited magic link for collaboration.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {shares.map((share, i) => (
                  <motion.div
                    key={share.shareId}
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex flex-col sm:flex-row gap-4 p-5 border border-white/10 rounded-2xl bg-[#0a0a0a]"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 font-mono text-sm font-semibold">
                        {share.isPrivate ? <FaLock size={12} /> : <FaGlobe size={12} />}
                        {share.repoFullName}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-400">
                        <span className="flex items-center gap-1.5">
                          <FaClock /> {formatTimeRemaining(share.expiresAt)}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <FaEye /> {share.viewCount} views
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 sm:self-center">
                      <button
                        onClick={() => handleCopyLink(share.shareId)}
                        className="p-2 text-gray-400 transition-colors border rounded-lg border-white/10 hover:text-white hover:bg-white/10"
                        title="Copy Link"
                      >
                        <FaCopy />
                      </button>
                      <a
                        href={`/share/${share.shareId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-gray-400 transition-colors border rounded-lg md border-white/10 hover:text-black hover:bg-white"
                        title="View Share"
                      >
                        <FaExternalLinkAlt />
                      </a>
                      <button
                        onClick={() => handleDeleteShare(share.shareId)}
                        className="p-2 text-gray-400 transition-colors border rounded-lg border-white/10 hover:text-red-500 hover:border-red-500/50 hover:bg-red-500/10"
                        title="Delete Share"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
