
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useEffect, useState, useRef } from 'react';
import { 
  Loader2, BrainCircuit, BookOpen, Atom, Lightbulb, 
  ScrollText, Database, Dna, Microscope, Globe, 
  Compass, Search, Sparkles, Terminal, Activity
} from 'lucide-react';

interface LoadingProps {
  status: string;
  step: number;
  facts?: string[];
}

const Loading: React.FC<LoadingProps> = ({ status, step, facts = [] }) => {
  const [currentFactIndex, setCurrentFactIndex] = useState(0);
  const [smoothProgress, setSmoothProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const logContainerRef = useRef<HTMLDivElement>(null);

  // Smooth Progress Logic
  useEffect(() => {
    const targetProgress = step === 1 ? 45 : step === 2 ? 90 : 10;
    const interval = setInterval(() => {
      setSmoothProgress(prev => {
        if (prev < targetProgress) return prev + 0.5;
        if (prev >= 90 && step === 2) return prev + 0.05; // Very slow crawl near end
        return prev;
      });
    }, 50);
    return () => clearInterval(interval);
  }, [step]);

  // Fact Cycling
  useEffect(() => {
    if (facts.length > 0) {
      const interval = setInterval(() => {
        setCurrentFactIndex((prev) => (prev + 1) % facts.length);
      }, 4500);
      return () => clearInterval(interval);
    }
  }, [facts]);

  // System Log Mock Feedback
  useEffect(() => {
    const messages = [
      "INITIALIZING_NEURAL_CORE...",
      "CONNECTING_TO_SEARCH_GROUNDING...",
      "PARSING_USER_QUERY_INTENT...",
      "FETCHING_REAL_TIME_DATA_STREAMS...",
      "VERIFYING_SOURCE_CREDIBILITY...",
      "EXTRACTING_KEY_FACTUAL_VECTORS...",
      "MAPPING_VISUAL_RELATIONSHIPS...",
      "SYNTHESIZING_AESTHETIC_PARAMETERS...",
      "GENERATING_LATENT_SPACE_COORDINATES...",
      "RENDERING_HIGH_FIDELITY_LAYERS...",
      "FINALIZING_COMPOSITION_VECTORS...",
      "POLISHING_VISUAL_CLARITY..."
    ];

    let msgIndex = 0;
    const logInterval = setInterval(() => {
      if (msgIndex < messages.length) {
        setLogs(prev => [...prev, messages[msgIndex]].slice(-5));
        msgIndex++;
      }
    }, 2000);

    return () => clearInterval(logInterval);
  }, []);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="relative flex flex-col items-center justify-center w-full max-w-5xl mx-auto mt-8 min-h-[450px] md:min-h-[600px] overflow-hidden rounded-[2.5rem] bg-white/40 dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 shadow-2xl backdrop-blur-2xl transition-all duration-700">
      
      <style>{`
        @keyframes orbit-1 { from { transform: rotate3d(1, 1, 1, 0deg); } to { transform: rotate3d(1, 1, 1, 360deg); } }
        @keyframes orbit-2 { from { transform: rotate3d(-1, 1, 0, 0deg); } to { transform: rotate3d(-1, 1, 0, 360deg); } }
        @keyframes pulse-ring { 
          0%, 100% { transform: scale(1); opacity: 0.3; }
          50% { transform: scale(1.1); opacity: 0.6; }
        }
        @keyframes float-particle {
          0% { transform: translateY(0) translateX(0); opacity: 0; }
          50% { opacity: 1; }
          100% { transform: translateY(-100px) translateX(20px); opacity: 0; }
        }
        @keyframes radar-scan {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .perspective-1000 { perspective: 1000px; }
      `}</style>

      {/* BACKGROUND AMBIANCE */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] transition-colors duration-1000 blur-[120px] opacity-20 ${step === 1 ? 'bg-amber-500' : 'bg-cyan-500'}`}></div>
        
        {/* Floating Particles */}
        {Array.from({ length: 15 }).map((_, i) => (
          <div 
            key={i}
            className="absolute w-1 h-1 bg-cyan-400 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `float-particle ${3 + Math.random() * 5}s infinite linear ${Math.random() * 5}s`
            }}
          ></div>
        ))}
      </div>

      {/* THE CORE ENGINE */}
      <div className="relative z-20 mb-12 perspective-1000">
        <div className="relative w-48 h-48 md:w-64 md:h-64 flex items-center justify-center">
          
          {/* Rotating Orbits */}
          <div className="absolute inset-0 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-full opacity-20"></div>
          <div className="absolute inset-2 border border-cyan-500/30 rounded-full animate-[orbit-1_15s_linear_infinite]"></div>
          <div className="absolute inset-6 border border-amber-500/30 rounded-full animate-[orbit-2_10s_linear_infinite]"></div>
          
          {/* Step 1: Search Radar */}
          {step === 1 && (
            <div className="absolute inset-0 rounded-full overflow-hidden opacity-40">
              <div className="absolute inset-0 bg-gradient-to-r from-amber-500/40 to-transparent origin-center animate-[radar-scan_4s_linear_infinite]"></div>
            </div>
          )}

          {/* Central Reactor */}
          <div className="relative group">
            <div className={`absolute inset-0 blur-2xl transition-colors duration-1000 ${step === 1 ? 'bg-amber-500/30' : 'bg-cyan-500/30'}`}></div>
            <div className="relative w-24 h-24 md:w-32 md:h-32 bg-white dark:bg-slate-950 rounded-full border-4 border-slate-100 dark:border-slate-800 shadow-2xl flex items-center justify-center overflow-hidden">
              
              {/* Dynamic Icon */}
              <div className="transition-all duration-700 transform scale-110">
                {step === 1 ? (
                  <div className="relative">
                    <Search className="w-10 h-10 md:w-14 md:h-14 text-amber-500 animate-pulse" />
                    <Globe className="absolute -top-1 -right-1 w-5 h-5 text-cyan-500 animate-bounce" />
                  </div>
                ) : (
                  <div className="relative">
                    <BrainCircuit className="w-10 h-10 md:w-14 md:h-14 text-cyan-400 animate-[spin_4s_linear_infinite]" />
                    <Sparkles className="absolute -top-1 -right-1 w-5 h-5 text-amber-400 animate-pulse" />
                  </div>
                )}
              </div>

              {/* Liquid Wave Effect */}
              <div className={`absolute bottom-0 left-0 right-0 transition-all duration-1000 ${step === 1 ? 'bg-amber-500/10' : 'bg-cyan-500/10'}`} style={{ height: `${smoothProgress}%` }}>
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-white/50 blur-[1px] animate-pulse"></div>
              </div>
            </div>
          </div>

          {/* Satellite Data Nodes */}
          {step === 1 && (
            <>
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-8 flex flex-col items-center">
                <Database className="w-4 h-4 text-amber-500" />
                <div className="w-[1px] h-4 bg-amber-500/50"></div>
              </div>
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-8 flex flex-col items-center">
                <div className="w-[1px] h-4 bg-cyan-500/50"></div>
                <Globe className="w-4 h-4 text-cyan-500" />
              </div>
            </>
          )}
        </div>
      </div>

      {/* STATUS & PROGRESS */}
      <div className="relative z-30 w-full max-w-2xl px-6 flex flex-col items-center">
        
        {/* Holographic Log */}
        <div 
          ref={logContainerRef}
          className="w-full h-16 mb-4 overflow-hidden border-l-2 border-cyan-500/30 pl-4 font-mono text-[9px] md:text-[10px] uppercase tracking-widest text-slate-400 dark:text-slate-500 space-y-1 select-none"
        >
          {logs.map((log, i) => (
            <div key={i} className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-300">
              <span className="text-cyan-600 dark:text-cyan-400">>></span>
              <span>{log}</span>
              {i === logs.length - 1 && <span className="w-1.5 h-3 bg-cyan-500 animate-pulse"></span>}
            </div>
          ))}
        </div>

        {/* Status Text */}
        <div className="flex flex-col items-center mb-6 text-center">
          <h3 className="text-lg md:text-xl font-display font-bold text-slate-900 dark:text-white mb-1">
            {status}
          </h3>
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em]">
            <Activity className="w-3 h-3 text-cyan-500 animate-pulse" />
            <span>Neural Link Active</span>
            <span className="mx-1 opacity-30">•</span>
            <span className="text-cyan-600 dark:text-cyan-400">{Math.round(smoothProgress)}% Complete</span>
          </div>
        </div>

        {/* Accurate Progress Bar */}
        <div className="w-full h-2 bg-slate-200/50 dark:bg-slate-800/50 rounded-full overflow-hidden border border-slate-200 dark:border-white/5 backdrop-blur-sm p-0.5 mb-8">
          <div 
            className="h-full rounded-full bg-gradient-to-r from-amber-500 via-cyan-500 to-indigo-600 transition-all duration-500 ease-out relative shadow-[0_0_15px_rgba(6,182,212,0.5)]"
            style={{ width: `${smoothProgress}%` }}
          >
            <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.4)_50%,transparent_100%)] animate-[shimmer_1.5s_infinite]"></div>
          </div>
        </div>

        {/* Fact Display Hub */}
        <div className="w-full bg-white/60 dark:bg-slate-950/40 rounded-3xl p-6 md:p-8 border border-slate-200 dark:border-white/10 shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-50"></div>
          
          <div className="flex items-start gap-4">
            <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl text-cyan-600 dark:text-cyan-400 border border-slate-200 dark:border-white/10 shadow-sm shrink-0">
               <Lightbulb className="w-5 h-5 animate-pulse" />
            </div>
            
            <div className="flex-1 min-h-[80px] flex items-center">
               {facts.length > 0 ? (
                <div key={currentFactIndex} className="animate-in fade-in slide-in-from-bottom-2 duration-700">
                   <p className="text-sm md:text-lg text-slate-700 dark:text-slate-200 font-serif-display leading-relaxed italic">
                     "{facts[currentFactIndex]}"
                   </p>
                </div>
               ) : (
                <div className="flex items-center gap-2 text-slate-400 animate-pulse text-sm uppercase tracking-widest font-bold">
                  <span>Synthesizing Insight...</span>
                </div>
               )}
            </div>
          </div>
        </div>

        {/* Phase Indicator */}
        <div className="mt-8 flex gap-8">
           <div className={`flex flex-col items-center transition-opacity duration-500 ${step === 1 ? 'opacity-100' : 'opacity-30'}`}>
              <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mb-2"></div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Research</span>
           </div>
           <div className={`flex flex-col items-center transition-opacity duration-500 ${step === 2 ? 'opacity-100' : 'opacity-30'}`}>
              <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 mb-2"></div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Synthesis</span>
           </div>
           <div className={`flex flex-col items-center transition-opacity duration-500 ${step === 3 ? 'opacity-100' : 'opacity-30'}`}>
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mb-2"></div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Render</span>
           </div>
        </div>
      </div>

      <style>{`
          @keyframes shimmer {
              0% { transform: translateX(-100%); }
              100% { transform: translateX(100%); }
          }
      `}</style>

    </div>
  );
};

export default Loading;
