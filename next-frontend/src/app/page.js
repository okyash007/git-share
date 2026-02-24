"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FaGithub, FaShareAlt, FaClock, FaLock, FaArrowRight } from "react-icons/fa";
import { HiSparkles } from "react-icons/hi2";
import axios from "axios";
import { motion } from "framer-motion";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export default function Landing() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Check if already logged in
    axios
      .get(`${API_URL}/auth/user`, { withCredentials: true })
      .then((res) => {
        if (res.data.user) {
          router.push("/dashboard");
        }
      })
      .catch(() => {});
  }, [router]);

  const handleLogin = () => {
    window.location.href = `${API_URL}/auth/github`;
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-black text-white selection:bg-white selection:text-black overflow-hidden relative">
      {/* Abstract Background Noise / Grid */}
      <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none" 
           style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px' }}></div>
           
      {/* Navbar */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-6 md:px-12 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white text-black rounded-lg">
            <FaGithub size={24} />
          </div>
          <span className="text-xl font-bold tracking-tight">GitShare</span>
        </div>
        <button
          onClick={handleLogin}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors border border-white/20 rounded-full hover:bg-white hover:text-black"
        >
          <FaGithub size={16} />
          <span className="hidden sm:inline">Sign in with GitHub</span>
        </button>
      </nav>

      {/* Hero */}
      <main className="relative z-10 flex flex-col items-center justify-center px-6 pt-24 pb-32 text-center md:pt-32 max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-3 py-1 mb-8 text-xs font-medium border rounded-full border-white/20 bg-white/5 backdrop-blur-sm"
        >
          <HiSparkles className="text-white" />
          <span>Share repos with time-limited links</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-5xl md:text-7xl font-extrabold tracking-tighter leading-[1.1] mb-6"
        >
          Share Your GitHub Repos
          <br className="hidden md:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-gray-300 to-gray-500"> With Anyone, Temporarily</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="max-w-2xl mb-10 text-lg md:text-xl text-gray-400 font-light"
        >
          Login with GitHub, browse your repositories, and generate time-limited
          shareable links. Perfect for code reviews, interviews, and collaboration.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center gap-4 mb-24"
        >
          <button
            onClick={handleLogin}
            className="flex items-center gap-3 px-8 py-4 text-black transition-transform bg-white rounded-full hover:scale-105 font-medium"
          >
            <FaGithub size={20} />
            <span>Get Started with GitHub</span>
            <FaArrowRight size={14} />
          </button>
        </motion.div>

        {/* Feature cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full text-left">
          {[
            { icon: FaGithub, title: 'GitHub Login', desc: 'Securely authenticate with your GitHub account to access all your repositories.' },
            { icon: FaShareAlt, title: 'Instant Sharing', desc: 'Generate shareable links for any of your repos — public or private — in one click.' },
            { icon: FaClock, title: 'Time-Limited', desc: 'Set expiration from 1 hour to 30 days. Links automatically expire and are deleted.' },
            { icon: FaLock, title: 'Secure & Private', desc: 'Your data stays safe. Share info is stored temporarily and auto-purged on expiry.' }
          ].map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 + i * 0.1 }}
              className="p-6 border border-white/10 rounded-2xl bg-white/[0.02] hover:bg-white/[0.04] transition-colors group"
            >
              <div className="flex items-center justify-center w-12 h-12 mb-4 bg-white text-black rounded-xl group-hover:scale-110 transition-transform">
                <feature.icon size={20} />
              </div>
              <h3 className="mb-2 text-lg font-semibold">{feature.title}</h3>
              <p className="text-sm text-gray-400 leading-relaxed">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 py-8 text-center text-sm text-gray-500">
        <p>
          Built with for developers &middot;{" "}
          <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="text-white hover:underline">
            GitHub
          </a>
        </p>
      </footer>
    </div>
  );
}
