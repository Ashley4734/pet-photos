import React from 'react';
import { motion } from 'framer-motion';
import { Toaster } from 'react-hot-toast';
import { Sparkles } from 'lucide-react';
import GenerateTab from './components/GenerateTab';

export default function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <Toaster position="top-right" />

      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-white/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-r from-accent-500 to-primary-500 rounded-xl">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-accent-600 to-primary-600 bg-clip-text text-transparent">
                AI Art Generator
              </h1>
              <p className="text-xs text-slate-500">Multi-model image generation</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-primary-600 via-accent-500 to-primary-700 bg-clip-text text-transparent mb-4">
            Create Amazing AI Art
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Generate stunning artwork using multiple AI models including Flux, SeedreamS-3, Stable Diffusion, and OpenAI
          </p>
        </motion.div>

        <GenerateTab />
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-slate-500 text-sm">
        <p>Powered by Replicate API</p>
      </footer>
    </div>
  );
}
