import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaGithub, FaShareAlt, FaClock, FaLock, FaArrowRight } from 'react-icons/fa';
import { HiSparkles } from 'react-icons/hi2';
import axios from 'axios';
import './Landing.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function Landing() {
  const navigate = useNavigate();

  useEffect(() => {
    // Check if already logged in
    axios.get(`${API_URL}/auth/user`, { withCredentials: true })
      .then(res => {
        if (res.data.user) {
          navigate('/dashboard');
        }
      })
      .catch(() => {});
  }, [navigate]);

  const handleLogin = () => {
    window.location.href = `${API_URL}/auth/github`;
  };

  return (
    <div className="landing">
      {/* Animated background orbs */}
      <div className="bg-orbs">
        <div className="orb orb-1"></div>
        <div className="orb orb-2"></div>
        <div className="orb orb-3"></div>
      </div>

      {/* Navbar */}
      <nav className="landing-nav">
        <div className="nav-brand">
          <div className="brand-icon">
            <FaGithub size={24} />
          </div>
          <span className="brand-text">GitShare</span>
        </div>
        <button className="nav-login" onClick={handleLogin}>
          <FaGithub size={18} />
          <span>Sign in with GitHub</span>
        </button>
      </nav>

      {/* Hero */}
      <main className="hero">
        <div className="hero-badge animate-fade-in-up">
          <HiSparkles />
          <span>Share repos with time-limited links</span>
        </div>

        <h1 className="hero-title animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          Share Your GitHub Repos
          <br />
          <span className="gradient-text">With Anyone, Temporarily</span>
        </h1>

        <p className="hero-subtitle animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          Login with GitHub, browse your repositories, and generate time-limited
          shareable links. Perfect for code reviews, interviews, and collaboration.
        </p>

        <div className="hero-actions animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
          <button className="btn-primary" onClick={handleLogin}>
            <FaGithub size={20} />
            <span>Get Started with GitHub</span>
            <FaArrowRight size={14} />
          </button>
        </div>

        {/* Feature cards */}
        <div className="features animate-fade-in-up" style={{ animationDelay: '0.5s' }}>
          <div className="feature-card">
            <div className="feature-icon" style={{ background: 'rgba(124, 92, 252, 0.15)' }}>
              <FaGithub size={24} color="#7c5cfc" />
            </div>
            <h3>GitHub Login</h3>
            <p>Securely authenticate with your GitHub account to access all your repositories.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon" style={{ background: 'rgba(0, 212, 170, 0.15)' }}>
              <FaShareAlt size={24} color="#00d4aa" />
            </div>
            <h3>Instant Sharing</h3>
            <p>Generate shareable links for any of your repos — public or private — in one click.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon" style={{ background: 'rgba(255, 184, 77, 0.15)' }}>
              <FaClock size={24} color="#ffb84d" />
            </div>
            <h3>Time-Limited</h3>
            <p>Set expiration from 1 hour to 30 days. Links automatically expire and are deleted.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon" style={{ background: 'rgba(255, 77, 106, 0.15)' }}>
              <FaLock size={24} color="#ff4d6a" />
            </div>
            <h3>Secure & Private</h3>
            <p>Your data stays safe. Share info is stored temporarily and auto-purged on expiry.</p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="landing-footer">
        <p>Built with ❤️ for developers · <a href="https://github.com" target="_blank" rel="noopener">GitHub</a></p>
      </footer>
    </div>
  );
}
