import express from 'express';
import mongoose from 'mongoose';
import session from 'express-session';
import cors from 'cors';
import axios from 'axios';
import crypto from 'crypto';
import dotenv from 'dotenv';
import Share from './models/Share.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Middleware ───────────────────────────────────────────
app.use(express.json());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // set to true in production with HTTPS
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  },
}));

// ─── MongoDB Connection ──────────────────────────────────
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/gitshare')
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// ─── Auth Middleware ─────────────────────────────────────
function requireAuth(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  next();
}

// ─── GitHub OAuth Routes ─────────────────────────────────

// Redirect to GitHub for login
app.get('/auth/github', (req, res) => {
  const state = crypto.randomBytes(16).toString('hex');
  req.session.oauthState = state;

  const params = new URLSearchParams({
    client_id: process.env.GITHUB_CLIENT_ID,
    scope: 'read:user repo',
    state,
  });

  res.redirect(`https://github.com/login/oauth/authorize?${params}`);
});

// GitHub OAuth callback
app.get('/auth/github/callback', async (req, res) => {
  const { code, state } = req.query;

  if (!code) {
    return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}?error=no_code`);
  }

  try {
    // Exchange code for access token
    const tokenRes = await axios.post('https://github.com/login/oauth/access_token', {
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code,
    }, {
      headers: { Accept: 'application/json' },
    });

    const accessToken = tokenRes.data.access_token;

    if (!accessToken) {
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}?error=no_token`);
    }

    // Get user info
    const userRes = await axios.get('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    // Store in session
    req.session.user = {
      id: userRes.data.id,
      login: userRes.data.login,
      name: userRes.data.name,
      avatar_url: userRes.data.avatar_url,
      bio: userRes.data.bio,
      public_repos: userRes.data.public_repos,
      html_url: userRes.data.html_url,
    };
    req.session.accessToken = accessToken;

    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard`);
  } catch (err) {
    console.error('OAuth error:', err.message);
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}?error=oauth_failed`);
  }
});

// Get current user
app.get('/auth/user', (req, res) => {
  if (!req.session.user) {
    return res.json({ user: null });
  }
  res.json({ user: req.session.user });
});

// Logout
app.post('/auth/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

// ─── Repository Routes ──────────────────────────────────

// Get all repos for authenticated user
app.get('/api/repos', requireAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const perPage = parseInt(req.query.per_page) || 30;
    const sort = req.query.sort || 'updated';
    const type = req.query.type || 'all';

    const params = new URLSearchParams({
      page: page.toString(),
      per_page: perPage.toString(),
      sort,
      type,
    });

    const repoRes = await axios.get(`https://api.github.com/user/repos?${params}`, {
      headers: { Authorization: `Bearer ${req.session.accessToken}` },
    });

    // Parse link header for pagination
    const linkHeader = repoRes.headers.link;
    let hasMore = false;
    if (linkHeader && linkHeader.includes('rel="next"')) {
      hasMore = true;
    }

    res.json({
      repos: repoRes.data,
      hasMore,
      page,
    });
  } catch (err) {
    console.error('Repos error:', err.message);
    res.status(500).json({ error: 'Failed to fetch repositories' });
  }
});

// ─── Share Routes ────────────────────────────────────────

// Create a share link
app.post('/api/shares', requireAuth, async (req, res) => {
  try {
    const { repo, duration } = req.body;

    if (!repo || !duration) {
      return res.status(400).json({ error: 'Missing repo or duration' });
    }

    // Calculate expiration
    const now = new Date();
    let expiresAt;
    switch (duration) {
      case '1h':
        expiresAt = new Date(now.getTime() + 60 * 60 * 1000);
        break;
      case '6h':
        expiresAt = new Date(now.getTime() + 6 * 60 * 60 * 1000);
        break;
      case '12h':
        expiresAt = new Date(now.getTime() + 12 * 60 * 60 * 1000);
        break;
      case '1d':
        expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        break;
      case '3d':
        expiresAt = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
        break;
      case '7d':
        expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        return res.status(400).json({ error: 'Invalid duration' });
    }

    const shareId = crypto.randomBytes(8).toString('hex');

    const share = new Share({
      shareId,
      repoFullName: repo.full_name,
      repoName: repo.name,
      repoDescription: repo.description || '',
      repoUrl: repo.html_url,
      ownerLogin: repo.owner.login,
      ownerAvatar: repo.owner.avatar_url,
      language: repo.language,
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      isPrivate: repo.private,
      defaultBranch: repo.default_branch || 'main',
      accessToken: req.session.accessToken,
      sharedBy: req.session.user.login,
      sharedByAvatar: req.session.user.avatar_url,
      expiresAt,
    });

    await share.save();

    const shareUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/share/${shareId}`;

    res.json({
      share: {
        shareId,
        shareUrl,
        expiresAt,
        repo: repo.full_name,
      },
    });
  } catch (err) {
    console.error('Share creation error:', err.message);
    res.status(500).json({ error: 'Failed to create share link' });
  }
});

// Get a shared repo (public - no auth needed)
app.get('/api/shares/:shareId', async (req, res) => {
  try {
    const share = await Share.findOne({ shareId: req.params.shareId });

    if (!share) {
      return res.status(404).json({ error: 'Share not found or expired' });
    }

    if (new Date() > share.expiresAt) {
      return res.status(410).json({ error: 'Share link has expired' });
    }

    // Increment view count
    share.viewCount += 1;
    await share.save();

    // Never expose the access token to the frontend
    const shareObj = share.toObject();
    delete shareObj.accessToken;

    res.json({ share: shareObj });
  } catch (err) {
    console.error('Share fetch error:', err.message);
    res.status(500).json({ error: 'Failed to fetch share' });
  }
});

// Get file tree for a shared repo
app.get('/api/shares/:shareId/tree', async (req, res) => {
  try {
    const share = await Share.findOne({ shareId: req.params.shareId });
    if (!share || new Date() > share.expiresAt) {
      return res.status(404).json({ error: 'Share not found or expired' });
    }

    const path = req.query.path || '';
    const ref = req.query.ref || share.defaultBranch;

    const url = `https://api.github.com/repos/${share.repoFullName}/contents/${path}?ref=${ref}`;
    const ghRes = await axios.get(url, {
      headers: { Authorization: `Bearer ${share.accessToken}` },
    });

    // Return only safe fields
    const items = Array.isArray(ghRes.data)
      ? ghRes.data.map(item => ({
          name: item.name,
          path: item.path,
          type: item.type, // 'file' or 'dir'
          size: item.size,
          sha: item.sha,
        }))
      : [];

    res.json({ items });
  } catch (err) {
    console.error('Tree error:', err.message);
    res.status(500).json({ error: 'Failed to fetch file tree' });
  }
});

// Get file content for a shared repo
app.get('/api/shares/:shareId/file', async (req, res) => {
  try {
    const share = await Share.findOne({ shareId: req.params.shareId });
    if (!share || new Date() > share.expiresAt) {
      return res.status(404).json({ error: 'Share not found or expired' });
    }

    const path = req.query.path;
    if (!path) {
      return res.status(400).json({ error: 'File path is required' });
    }

    const ref = req.query.ref || share.defaultBranch;
    const url = `https://api.github.com/repos/${share.repoFullName}/contents/${path}?ref=${ref}`;
    const ghRes = await axios.get(url, {
      headers: { Authorization: `Bearer ${share.accessToken}` },
    });

    // Decode base64 content
    let content = '';
    if (ghRes.data.encoding === 'base64' && ghRes.data.content) {
      content = Buffer.from(ghRes.data.content, 'base64').toString('utf-8');
    }

    res.json({
      name: ghRes.data.name,
      path: ghRes.data.path,
      size: ghRes.data.size,
      content,
      sha: ghRes.data.sha,
    });
  } catch (err) {
    if (err.response?.status === 404) {
      return res.status(404).json({ error: 'File not found' });
    }
    console.error('File error:', err.message);
    res.status(500).json({ error: 'Failed to fetch file content' });
  }
});

// Create a PR for multiple files in the shared repo
app.post('/api/shares/:shareId/pr', async (req, res) => {
  try {
    const { files, title, description, authorName } = req.body;
    // files should be an array of: { path, content }
    if (!files || !Array.isArray(files) || files.length === 0 || !title) {
      return res.status(400).json({ error: 'Missing required PR fields or files array' });
    }

    const share = await Share.findOne({ shareId: req.params.shareId });
    if (!share || new Date() > share.expiresAt) {
      return res.status(404).json({ error: 'Share not found or expired' });
    }

    const token = share.accessToken;
    const repoFull = share.repoFullName;
    const baseBranch = share.defaultBranch || 'main';
    const newBranch = `gitshare-pr-${Date.now()}`;

    // 1. Get the SHA of the latest commit on the base branch
    const baseRefUrl = `https://api.github.com/repos/${repoFull}/git/ref/heads/${baseBranch}`;
    const baseRefRes = await axios.get(baseRefUrl, { headers: { Authorization: `Bearer ${token}` } });
    const baseCommitSha = baseRefRes.data.object.sha;

    // 2. Create a new branch pointing to that commit
    const newRefUrl = `https://api.github.com/repos/${repoFull}/git/refs`;
    await axios.post(newRefUrl, {
      ref: `refs/heads/${newBranch}`,
      sha: baseCommitSha
    }, { headers: { Authorization: `Bearer ${token}` } });

    // 3. Create new blobs for all updated files
    const blobUrl = `https://api.github.com/repos/${repoFull}/git/blobs`;
    
    const treeItems = await Promise.all(files.map(async (file) => {
      const blobRes = await axios.post(blobUrl, {
        content: Buffer.from(file.content).toString('base64'),
        encoding: 'base64'
      }, { headers: { Authorization: `Bearer ${token}` } });
      
      return {
        path: file.path,
        mode: '100644', // file mode
        type: 'blob',
        sha: blobRes.data.sha
      };
    }));

    // 4. Create a new tree containing all the new blobs
    // We get the base commit's tree SHA first
    const commitUrl = `https://api.github.com/repos/${repoFull}/git/commits/${baseCommitSha}`;
    const commitRes = await axios.get(commitUrl, { headers: { Authorization: `Bearer ${token}` } });
    const baseTreeSha = commitRes.data.tree.sha;

    const treeUrl = `https://api.github.com/repos/${repoFull}/git/trees`;
    const treeRes = await axios.post(treeUrl, {
      base_tree: baseTreeSha,
      tree: treeItems
    }, { headers: { Authorization: `Bearer ${token}` } });
    const newTreeSha = treeRes.data.sha;

    // 5. Create a new commit
    const newCommitUrl = `https://api.github.com/repos/${repoFull}/git/commits`;
    const newCommitRes = await axios.post(newCommitUrl, {
      message: `Update ${files.length} file(s) via GitShare`,
      tree: newTreeSha,
      parents: [baseCommitSha]
    }, { headers: { Authorization: `Bearer ${token}` } });
    const newCommitSha = newCommitRes.data.sha;

    // 6. Update the new branch reference to point to the new commit
    const updateRefUrl = `https://api.github.com/repos/${repoFull}/git/refs/heads/${newBranch}`;
    await axios.patch(updateRefUrl, {
      sha: newCommitSha,
      force: true
    }, { headers: { Authorization: `Bearer ${token}` } });

    // 7. Open a Pull Request
    const prUrl = `https://api.github.com/repos/${repoFull}/pulls`;
    const prBody = `${description || 'No description provided.'}\n\n---\n*Submitted anonymously via [GitShare](http://gitshare.dev) by ${authorName || 'a contributor'}.*`;
    
    const prRes = await axios.post(prUrl, {
      title,
      head: newBranch,
      base: baseBranch,
      body: prBody
    }, { headers: { Authorization: `Bearer ${token}` } });

    res.json({ prUrl: prRes.data.html_url });
  } catch (err) {
    console.error('PR error:', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to create Pull Request', details: err.response?.data?.message });
  }
});

// Get user's active shares
app.get('/api/my-shares', requireAuth, async (req, res) => {
  try {
    const shares = await Share.find({
      sharedBy: req.session.user.login,
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 });

    res.json({ shares });
  } catch (err) {
    console.error('My shares error:', err.message);
    res.status(500).json({ error: 'Failed to fetch shares' });
  }
});

// Delete a share
app.delete('/api/shares/:shareId', requireAuth, async (req, res) => {
  try {
    const share = await Share.findOneAndDelete({
      shareId: req.params.shareId,
      sharedBy: req.session.user.login,
    });

    if (!share) {
      return res.status(404).json({ error: 'Share not found' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Share delete error:', err.message);
    res.status(500).json({ error: 'Failed to delete share' });
  }
});

// ─── Start Server ────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 GitShare backend running on http://localhost:${PORT}`);
});
