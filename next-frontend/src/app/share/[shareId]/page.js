"use client";

import { useState, useEffect, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import axios from "axios";
import toast from "react-hot-toast";
import ReactDiffViewer from "react-diff-viewer-continued";
import Editor from "@monaco-editor/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FaGithub,
  FaStar,
  FaCodeBranch,
  FaClock,
  FaEye,
  FaLock,
  FaGlobe,
  FaExternalLinkAlt,
  FaArrowLeft,
  FaFolder,
  FaFolderOpen,
  FaFile,
  FaChevronRight,
  FaEdit,
  FaTimes,
  FaSave,
  FaCopy,
  FaCheck,
  FaPaperPlane,
} from "react-icons/fa";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

const EXT_TO_LANG = {
  js: "JavaScript", jsx: "JavaScript", ts: "TypeScript", tsx: "TypeScript",
  py: "Python", rb: "Ruby", go: "Go", rs: "Rust", java: "Java",
  cpp: "C++", c: "C", h: "C", cs: "C#", php: "PHP", swift: "Swift",
  kt: "Kotlin", dart: "Dart", html: "HTML", css: "CSS", scss: "SCSS",
  json: "JSON", yaml: "YAML", yml: "YAML", md: "Markdown", xml: "XML",
  sql: "SQL", sh: "Shell", bash: "Shell", zsh: "Shell", dockerfile: "Docker",
  toml: "TOML", ini: "INI", env: "Env", gitignore: "Git", svg: "SVG",
};

function getFileExtension(filename) {
  const parts = filename.split(".");
  return parts.length > 1 ? parts.pop().toLowerCase() : "";
}

function getFileLang(filename) {
  const ext = getFileExtension(filename);
  return EXT_TO_LANG[ext] || ext.toUpperCase() || "Text";
}

const MONACO_LANG = {
  js: "javascript", jsx: "javascript", ts: "typescript", tsx: "typescript",
  py: "python", rb: "ruby", go: "go", rs: "rust", java: "java",
  cpp: "cpp", c: "c", h: "c", cs: "csharp", php: "php", swift: "swift",
  kt: "kotlin", dart: "dart", html: "html", css: "css", scss: "scss",
  json: "json", yaml: "yaml", yml: "yaml", md: "markdown", xml: "xml",
  sql: "sql", sh: "shell", bash: "shell", zsh: "shell", dockerfile: "dockerfile",
};

function getMonacoLang(filename) {
  const ext = getFileExtension(filename);
  return MONACO_LANG[ext] || "plaintext";
}

function formatBytes(bytes) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export default function SharedView({ params }) {
  const unwrappedParams = use(params);
  const { shareId } = unwrappedParams;
  const router = useRouter();

  const [share, setShare] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState("");
  const [loadingBranches, setLoadingBranches] = useState(false);

  const [treeData, setTreeData] = useState({});
  const [expandedFolders, setExpandedFolders] = useState(new Set([""]));
  const [loadingFolders, setLoadingFolders] = useState(new Set());

  const [selectedFile, setSelectedFile] = useState(null);
  const [fileContent, setFileContent] = useState("");
  const [fileLoading, setFileLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const [editMode, setEditMode] = useState(false);
  const [editedContent, setEditedContent] = useState("");
  const [pendingChanges, setPendingChanges] = useState({});
  const [originalContents, setOriginalContents] = useState({});

  const [isPrModalOpen, setIsPrModalOpen] = useState(false);
  const [viewingDiffPath, setViewingDiffPath] = useState(null);
  const [prSubmitting, setPrSubmitting] = useState(false);
  const [prForm, setPrForm] = useState({ title: "", description: "", authorName: "" });

  const [sidebarWidth, setSidebarWidth] = useState(280);
  const [isDragging, setIsDragging] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showSidebarMobile, setShowSidebarMobile] = useState(true);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleEditorWillMount = (monaco) => {
    monaco.editor.defineTheme("gitshare-custom-dark", {
      base: "vs-dark",
      inherit: true,
      rules: [],
      colors: {
        "editor.background": "#050505",
        "editor.lineHighlightBackground": "#ffffff05",
      },
    });
  };

  useEffect(() => {
    axios
      .get(`${API_URL}/api/shares/${shareId}`)
      .then((res) => {
        setShare(res.data.share);
        setSelectedBranch(res.data.share.defaultBranch || 'main');
        setLoadingBranches(true);
        return axios.get(`${API_URL}/api/shares/${shareId}/branches`).catch(() => null);
      })
      .then((res) => {
        if (res && res.data) setBranches(res.data.branches);
        setLoadingBranches(false);
      })
      .catch((err) => {
        if (err.response?.status === 404) setError("not_found");
        else if (err.response?.status === 410) setError("expired");
        else setError("unknown");
      })
      .finally(() => setLoading(false));
  }, [shareId]);

  const fetchFolder = useCallback(
    async (path = "") => {
      if (treeData[path]) return;
      setLoadingFolders((prev) => new Set(prev).add(path));
      try {
        const res = await axios.get(`${API_URL}/api/shares/${shareId}/tree`, {
          params: { path, ref: selectedBranch },
        });
        const sorted = res.data.items.sort((a, b) => {
          if (a.type === "dir" && b.type !== "dir") return -1;
          if (a.type !== "dir" && b.type === "dir") return 1;
          return a.name.localeCompare(b.name);
        });
        setTreeData((prev) => ({ ...prev, [path]: sorted }));
      } catch (err) {
        toast.error("Failed to fetch folder");
      } finally {
        setLoadingFolders((prev) => {
          const next = new Set(prev);
          next.delete(path);
          return next;
        });
      }
    },
    [shareId, treeData, selectedBranch]
  );

  useEffect(() => {
    if (share && selectedBranch) fetchFolder("");
  }, [share, selectedBranch, fetchFolder]);

  const handleBranchChange = (newBranch) => {
    setSelectedBranch(newBranch);
    setTreeData({});
    setExpandedFolders(new Set([""]));
    setSelectedFile(null);
    setFileContent("");
    setEditedContent("");
    setEditMode(false);
    setPendingChanges({});
    setOriginalContents({});
  };

  const toggleFolder = (path) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else {
        next.add(path);
        fetchFolder(path);
      }
      return next;
    });
  };

  const handleFileClick = async (file) => {
    setSelectedFile(file);
    setFileLoading(true);
    setFileContent("");
    setEditMode(false);
    setShowSidebarMobile(false);
    try {
      if (pendingChanges[file.path] !== undefined) {
        setFileContent(pendingChanges[file.path]);
        setEditedContent(pendingChanges[file.path]);
      } else {
        const res = await axios.get(`${API_URL}/api/shares/${shareId}/file`, {
          params: { path: file.path, ref: selectedBranch },
        });
        setFileContent(res.data.content);
        setEditedContent(res.data.content);
        setOriginalContents((prev) => ({ ...prev, [file.path]: res.data.content }));
      }
    } catch (err) {
      setFileContent("// Unable to load file content\n// It might be binary or inaccessible.");
      setEditedContent("");
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
    setPendingChanges((prev) => ({
      ...prev,
      [selectedFile.path]: editedContent,
    }));
    setFileContent(editedContent);
    setEditMode(false);
  };

  const handleDiscardChanges = (path) => {
    setPendingChanges((prev) => {
      const next = { ...prev };
      delete next[path];
      return next;
    });
    setOriginalContents((prev) => {
      const next = { ...prev };
      delete next[path];
      return next;
    });
    if (selectedFile?.path === path) handleFileClick(selectedFile);
  };

  const handlePrSubmit = async (e) => {
    e.preventDefault();
    const modifiedFiles = Object.keys(pendingChanges);
    if (!prForm.title) return toast.error("PR Title is required");
    if (modifiedFiles.length === 0) return toast.error("No file changes to submit.");

    setPrSubmitting(true);
    const filesPayload = modifiedFiles.map((path) => ({
      path,
      content: pendingChanges[path],
    }));

    try {
      const res = await axios.post(`${API_URL}/api/shares/${shareId}/pr`, {
        files: filesPayload,
        title: prForm.title,
        description: prForm.description,
        authorName: prForm.authorName || "Guest Contributor",
        baseBranch: selectedBranch,
      });

      toast.success(`Pull Request created for ${modifiedFiles.length} file(s)!`);
      if (res.data.prUrl) window.open(res.data.prUrl, "_blank");

      setIsPrModalOpen(false);
      setEditMode(false);
      setPendingChanges({});
      setPrForm({ title: "", description: "", authorName: "" });
    } catch (err) {
      const msg = err.response?.data?.error || "Failed to submit PR";
      toast.error(msg);
    } finally {
      setPrSubmitting(false);
    }
  };

  const getTimeRemaining = (expiresAt) => {
    const diff = new Date(expiresAt) - new Date();
    if (diff <= 0) return "Expired";
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d ${hours % 24}h remaining`;
    return `${hours}h ${Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))}m`;
  };

  const startResizing = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const stopResizing = useCallback(() => setIsDragging(false), []);

  const resize = useCallback((e) => {
    if (isDragging) {
      let newWidth = e.clientX;
      if (newWidth < 200) newWidth = 200;
      if (newWidth > 600) newWidth = 600;
      setSidebarWidth(newWidth);
    }
  }, [isDragging]);

  useEffect(() => {
    window.addEventListener("mousemove", resize);
    window.addEventListener("mouseup", stopResizing);
    return () => {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    };
  }, [resize, stopResizing]);

  const renderTree = (path = "", depth = 0) => {
    const items = treeData[path];
    if (!items) return null;

    return items.map((item) => {
      const isExpanded = expandedFolders.has(item.path);
      const isSelected = selectedFile?.path === item.path;
      const isLoading = loadingFolders.has(item.path);
      const isModified = pendingChanges[item.path] !== undefined;

      return (
        <div key={item.path} className="flex flex-col select-none">
          <div
            className={`flex items-center gap-2 py-1.5 px-2 hover:bg-white/10 cursor-pointer transition-colors ${
              isSelected ? "bg-white/15 text-white font-medium" : "text-gray-400"
            }`}
            style={{ paddingLeft: `${16 + depth * 16}px` }}
            onClick={() => {
              if (item.type === "dir") toggleFolder(item.path);
              else handleFileClick(item);
            }}
          >
            <div className="w-4 h-4 flex items-center justify-center shrink-0">
              {item.type === "dir" ? (
                isLoading ? (
                  <div className="w-2.5 h-2.5 border border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <FaChevronRight
                    size={8}
                    className={`transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}`}
                  />
                )
              ) : null}
            </div>

            {item.type === "dir" ? (
              isExpanded ? <FaFolderOpen size={14} className="text-white" /> : <FaFolder size={14} className="text-gray-500" />
            ) : (
              <FaFile size={12} className="text-gray-500" />
            )}

            <span className="text-sm truncate mr-auto">{item.name}</span>
            {isModified && <span className="w-1.5 h-1.5 bg-white rounded-full shrink-0"></span>}
          </div>

          {item.type === "dir" && isExpanded && (
            <div className="flex flex-col">{renderTree(item.path, depth + 1)}</div>
          )}
        </div>
      );
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white">
        <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-gray-400">Loading shared repository...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-4">
        <div className="flex flex-col items-center max-w-md p-8 text-center border border-white/10 bg-[#0a0a0a] rounded-2xl animate-in fade-in-up">
          <FaGithub size={48} className="mb-6 opacity-80" />
          <h2 className="mb-2 text-2xl font-bold tracking-tight">
            {error === "expired" ? "Link Expired" : error === "not_found" ? "Not Found" : "Error"}
          </h2>
          <p className="mb-8 text-gray-400">
            {error === "expired"
              ? "This link has past its deadline and data was wiped."
              : error === "not_found"
              ? "This share doesn't exist or was removed."
              : "Something went wrong fetching the repo."}
          </p>
          <Link
            href="/"
            className="flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors border rounded-full border-white/20 hover:bg-white hover:text-black"
          >
            <FaArrowLeft /> Back Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-black text-white overflow-hidden selection:bg-white selection:text-black">
      {/* Navbar */}
      <nav className="flex items-center justify-between px-4 py-3 md:px-6 md:py-4 border-b border-white/10 shrink-0 bg-black z-10">
        <Link href="/" className="flex items-center gap-3 font-bold tracking-tight hover:opacity-80 transition-opacity">
          <FaGithub size={20} />
          GitShare
        </Link>
        <div className="flex items-center gap-2 px-3 py-1 text-xs font-mono font-medium rounded-full border border-white/20 text-gray-300">
          <FaClock size={10} />
          {getTimeRemaining(share.expiresAt)}
        </div>
      </nav>

      <main className="flex flex-col flex-1 overflow-hidden relative">
        {/* Repo Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6 px-4 py-4 md:px-6 md:py-6 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={share.ownerAvatar} alt={share.ownerLogin} className="w-12 h-12 rounded-full border border-white/20" />
            <div>
              <h1 className="text-xl font-semibold flex items-center gap-2 flex-wrap">
                <span className="text-gray-400">{share.ownerLogin}</span>
                <span className="text-gray-600">/</span>
                <span>{share.repoName}</span>
              </h1>
              {share.repoDescription && (
                <p className="max-w-xl text-sm text-gray-400 mt-1 truncate">{share.repoDescription}</p>
              )}
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex items-center gap-3 text-xs font-mono text-gray-400">
              <span className="flex items-center gap-1.5"><FaStar /> {share.stars}</span>
              <span className="flex items-center gap-1.5"><FaCodeBranch /> {share.forks}</span>
              <span className="flex items-center gap-1.5"><FaEye /> {share.viewCount}</span>
              <span className="flex items-center gap-1.5">
                {share.isPrivate ? <FaLock /> : <FaGlobe />} {share.isPrivate ? "Private" : "Public"}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 mr-2">
                <FaCodeBranch className="text-gray-400" size={14} />
                <Select
                  value={selectedBranch}
                  onValueChange={handleBranchChange}
                  disabled={loadingBranches || branches.length === 0}
                >
                  <SelectTrigger className="w-auto h-7 px-2 py-1 border-white/20 bg-[#050505] text-xs focus:ring-0 focus:ring-offset-0 transition-colors">
                    <SelectValue placeholder="Branch" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0a0a0a] border-white/20 text-white min-w-[120px]">
                    {branches.length > 0 ? (
                      branches.map(b => (
                        <SelectItem key={b} value={b} className="text-xs py-1.5 focus:bg-white/10 focus:text-white cursor-pointer">
                          {b}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value={selectedBranch || "main"} className="text-xs py-1.5 focus:bg-white/10 focus:text-white cursor-pointer">
                        {selectedBranch}
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {Object.keys(pendingChanges).length > 0 && (
                <button
                  onClick={() => setIsPrModalOpen(true)}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-white text-black rounded-lg transition-transform hover:scale-105"
                >
                  <FaPaperPlane size={10} /> Create PR
                </button>
              )}
              <a
                href={share.repoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium transition-colors border rounded-lg border-white/20 hover:bg-white hover:text-black"
              >
                <FaGithub /> View on GitHub <FaExternalLinkAlt size={10} className="ml-1" />
              </a>
            </div>
          </div>
        </div>

        {/* Browser Grid */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar Area */}
          <aside
            className={`flex flex-col border-r border-white/10 shrink-0 select-none bg-black relative ${showSidebarMobile ? 'flex' : 'hidden md:flex'}`}
            style={{ width: isMobile ? '100%' : `${sidebarWidth}px` }}
          >
            <div className="flex items-center gap-2 px-4 h-12 text-xs font-semibold tracking-wide text-gray-400 uppercase border-b border-white/10 shrink-0">
              <FaFolderOpen /> Files
            </div>
            <div className="flex-1 overflow-y-auto w-full pb-6 custom-scrollbar text-sm">
              {loadingFolders.has("") && !treeData[""] ? (
                <div className="flex items-center justify-center p-6 text-xs text-gray-500 gap-2">
                  <div className="w-3 h-3 border border-white/50 border-t-transparent rounded-full animate-spin"></div>
                  Loading tree...
                </div>
              ) : (
                renderTree("")
              )}
            </div>
            {/* Drag Handle Overlay */}
            <div
              className={`absolute top-0 right-0 w-1.5 h-full cursor-col-resize z-10 transition-colors ${
                isDragging ? "bg-white/30" : "hover:bg-white/10"
              }`}
              onMouseDown={startResizing}
            />
          </aside>

          {/* Main Code View Area */}
          <section className={`flex flex-col flex-1 overflow-hidden bg-[#050505] relative z-0 ${showSidebarMobile ? 'hidden md:flex' : 'flex'}`}>
            {selectedFile ? (
              <div className="flex flex-col flex-1 h-full w-full">
                <header className="flex items-center justify-between gap-4 px-4 h-12 border-b border-white/10 bg-[#0a0a0a] shrink-0 overflow-x-auto custom-scrollbar">
                  <div className="flex items-center gap-3 text-xs font-mono whitespace-nowrap">
                    <button 
                      className="md:hidden flex items-center justify-center w-6 h-6 hover:bg-white/10 rounded transition-colors shrink-0"
                      onClick={() => setShowSidebarMobile(true)}
                    >
                      <FaArrowLeft size={12} className="text-gray-400" />
                    </button>
                    <FaFile className="text-gray-500 shrink-0" size={12} />
                    <span className="font-semibold">{selectedFile.path}</span>
                    <span className="hidden sm:inline px-1.5 py-0.5 rounded border border-white/10 text-gray-400">
                      {getFileLang(selectedFile.name)}
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-gray-500 hidden sm:inline">{formatBytes(selectedFile.size)}</span>
                    {editMode && <span className="px-1.5 py-0.5 bg-white text-black font-bold uppercase tracking-wider rounded">Editing</span>}
                  </div>

                  <div className="flex items-center gap-2">
                    {editMode ? (
                      <>
                        <button
                          onClick={handleSaveFileEdits}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white text-black transition-colors rounded hover:bg-gray-200"
                        >
                          <FaSave /> Save
                        </button>
                        <button
                          onClick={() => {
                            setEditMode(false);
                            setEditedContent(fileContent);
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-white/20 transition-colors rounded hover:bg-white/10"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setEditMode(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-white/20 transition-colors rounded hover:bg-white/10"
                      >
                        <FaEdit /> Edit
                      </button>
                    )}
                    <button
                      onClick={handleCopyCode}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-white/20 transition-colors rounded hover:bg-white/10"
                    >
                      {copied ? <><FaCheck /> Copied</> : <><FaCopy /> Copy</>}
                    </button>
                  </div>
                </header>

                <div className="flex-1 w-full relative">
                  {fileLoading ? (
                    <div className="flex items-center justify-center h-full gap-3 text-sm text-gray-500 bg-[#0a0a0a]">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Loading file contents...
                    </div>
                  ) : (
                    <Editor
                      height="100%"
                      language={getMonacoLang(selectedFile.name)}
                      theme="gitshare-custom-dark"
                      beforeMount={handleEditorWillMount}
                      value={editMode ? editedContent : fileContent}
                      onChange={(value) => editMode && setEditedContent(value)}
                      options={{
                        readOnly: !editMode,
                        minimap: { enabled: false },
                        fontSize: 14,
                        fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, 'Courier New', monospace",
                        wordWrap: "on",
                        scrollBeyondLastLine: false,
                        padding: { top: 16, bottom: 16 },
                      }}
                      loading={
                        <div className="flex items-center justify-center h-full gap-3 text-sm text-gray-500 bg-[#0a0a0a]">
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          Loading Editor Environment...
                        </div>
                      }
                    />
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center p-6 opacity-40">
                <FaFile size={48} className="mb-4 text-white" />
                <h3 className="text-lg font-medium text-white mb-2">No File Selected</h3>
                <p className="text-sm">Click a file in the sidebar to view its code</p>
              </div>
            )}
          </section>
        </div>
      </main>

      {/* Footer Strip */}
      <footer className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 py-3 md:px-6 md:py-2 text-xs text-gray-500 border-t border-white/10 bg-black shrink-0 relative z-10 font-mono">
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={share.sharedByAvatar} alt="" className="w-4 h-4 rounded-full grayscale" />
          <span>Shared by <strong className="text-gray-300">@{share.sharedBy}</strong></span>
        </div>
        <div>
          Expires: {new Date(share.expiresAt).toLocaleString()}
        </div>
      </footer>

      {/* PR Modal Overlay */}
      <AnimatePresence>
        {isPrModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/90 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.98, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.98, y: 10 }}
              className="flex flex-col w-full max-w-4xl max-h-[90vh] bg-[#050505] border border-white/20 rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-black">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <FaPaperPlane size={14} /> Open Pull Request
                </h2>
                <button
                  onClick={() => {
                    setIsPrModalOpen(false);
                    setViewingDiffPath(null);
                  }}
                  className="p-2 transition-colors rounded-full hover:bg-white/10 text-gray-400 hover:text-white"
                >
                  <FaTimes />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar relative">
                {viewingDiffPath ? (
                  <div className="flex flex-col min-h-[60vh] bg-[#050505] z-10">
                    <div className="flex items-center gap-4 px-6 py-3 border-b border-white/10 bg-black shrink-0">
                      <button
                        onClick={() => setViewingDiffPath(null)}
                        className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
                      >
                        <FaArrowLeft size={12} /> Back
                      </button>
                      <span className="text-sm font-mono truncate">{viewingDiffPath}</span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                      <ReactDiffViewer
                        oldValue={originalContents[viewingDiffPath] || ""}
                        newValue={pendingChanges[viewingDiffPath] || ""}
                        splitView={false}
                        useDarkTheme={true}
                        hideLineNumbers={false}
                        styles={{
                          variables: {
                            dark: {
                              diffViewerBackground: "transparent",
                              diffViewerColor: "#D1D5DB",
                              addedBackground: "rgba(255, 255, 255, 0.05)",
                              addedColor: "#F9FAFB",
                              removedBackground: "rgba(0, 0, 0, 0.3)",
                              removedColor: "#6B7280",
                              wordAddedBackground: "rgba(255, 255, 255, 0.15)",
                              wordRemovedBackground: "rgba(0, 0, 0, 0.5)",
                              addedGutterBackground: "rgba(255, 255, 255, 0.02)",
                              removedGutterBackground: "rgba(0, 0, 0, 0.2)",
                              gutterBackground: "#0a0a0a",
                              gutterBackgroundDark: "#050505",
                              highlightBackground: "rgba(255, 255, 255, 0.1)",
                              highlightGutterBackground: "rgba(255, 255, 255, 0.05)",
                              codeFoldGutterBackground: "#0a0a0a",
                              codeFoldBackground: "#050505",
                              emptyLineBackground: "transparent",
                              gutterColor: "#6B7280",
                              addedGutterColor: "#D1D5DB",
                              removedGutterColor: "#4B5563",
                            },
                          },
                          titleBlock: { display: "none" },
                        }}
                      />
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handlePrSubmit} className="flex flex-col gap-6 p-6">
                    <div>
                      <label className="block mb-1.5 text-sm font-medium">PR Title</label>
                      <input
                        required
                        type="text"
                        value={prForm.title}
                        onChange={(e) => setPrForm({ ...prForm, title: e.target.value })}
                        placeholder="e.g. Fix calculation bug"
                        className="w-full px-4 py-2 text-sm transition-colors bg-black border border-white/20 rounded-xl focus:border-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block mb-1.5 text-sm font-medium">Author Name (Optional)</label>
                      <input
                        type="text"
                        value={prForm.authorName}
                        onChange={(e) => setPrForm({ ...prForm, authorName: e.target.value })}
                        placeholder="Anonymous if empty"
                        className="w-full px-4 py-2 text-sm transition-colors bg-black border border-white/20 rounded-xl focus:border-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block mb-1.5 text-sm font-medium">Description (Optional)</label>
                      <textarea
                        value={prForm.description}
                        onChange={(e) => setPrForm({ ...prForm, description: e.target.value })}
                        placeholder="Why making these changes?"
                        rows={4}
                        className="w-full px-4 py-2 text-sm transition-colors bg-black border border-white/20 rounded-xl focus:border-white focus:outline-none resize-y"
                      />
                    </div>

                    <div className="border border-white/10 rounded-xl bg-black p-4">
                      <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                        Files Modified ({Object.keys(pendingChanges).length})
                      </h4>
                      <div className="flex flex-col gap-2">
                        {Object.keys(pendingChanges).map((path) => (
                          <div key={path} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                            <span className="text-sm font-mono truncate mr-4">{path}</span>
                            <button
                              type="button"
                              onClick={() => setViewingDiffPath(path)}
                              className="px-3 py-1 text-xs transition-colors border rounded-md border-white/20 hover:bg-white hover:text-black shrink-0 whitespace-nowrap"
                            >
                              View Diff
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-3 justify-end pt-4 border-t border-white/10">
                      <button
                        type="button"
                        onClick={() => setIsPrModalOpen(false)}
                        className="px-5 py-2 text-sm font-medium transition-colors border rounded-xl border-white/20 hover:bg-white/10"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={prSubmitting}
                        className="flex items-center gap-2 px-6 py-2 text-sm font-medium text-black transition-colors bg-white rounded-xl hover:bg-gray-200 disabled:opacity-50"
                      >
                        {prSubmitting ? (
                          <>
                            <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                            Submitting...
                          </>
                        ) : (
                          <>Open PR</>
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </div>
  );
}
