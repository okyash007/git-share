import mongoose from 'mongoose';

const shareSchema = new mongoose.Schema({
  shareId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  repoFullName: {
    type: String,
    required: true,
  },
  repoName: {
    type: String,
    required: true,
  },
  repoDescription: {
    type: String,
    default: '',
  },
  repoUrl: {
    type: String,
    required: true,
  },
  ownerLogin: {
    type: String,
    required: true,
  },
  ownerAvatar: {
    type: String,
    default: '',
  },
  language: {
    type: String,
    default: null,
  },
  stars: {
    type: Number,
    default: 0,
  },
  forks: {
    type: Number,
    default: 0,
  },
  isPrivate: {
    type: Boolean,
    default: false,
  },
  defaultBranch: {
    type: String,
    default: 'main',
  },
  accessToken: {
    type: String,
    required: true,
  },
  sharedBy: {
    type: String,
    required: true,
  },
  sharedByAvatar: {
    type: String,
    default: '',
  },
  expiresAt: {
    type: Date,
    required: true,
    index: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  viewCount: {
    type: Number,
    default: 0,
  },
});

// TTL index: MongoDB will auto-delete expired documents
shareSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const Share = mongoose.model('Share', shareSchema);
export default Share;
