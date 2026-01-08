
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect, useRef } from 'react';
import { GeneratedImage, ComplexityLevel, VisualStyle, Language, SearchResultItem, AspectRatio, ImageGenerationModel, ImageSize, AnalysisResult } from './types';
import { 
  researchTopicForPrompt, 
  generateInfographicImage, 
  editInfographicImage,
  analyzeImageWithGemini,
  transcribeAudio,
  generateSpeech
} from './services/geminiService';
import Infographic from './components/Infographic';
import Loading from './components/Loading';
import IntroScreen from './components/IntroScreen';
import SearchResults from './components/SearchResults';
import ChatBot from './components/ChatBot';
import { 
  Search, AlertCircle, History, GraduationCap, Palette, Microscope, 
  Atom, Compass, Globe, Sun, Moon, Key, CreditCard, ExternalLink, 
  DollarSign, Layout, Cpu, Image as ImageIcon, X, Wand2, FileSearch, 
  Layers, Mic, MicOff, Volume2 
} from 'lucide-react';

const App: React.FC = () => {
  const [showIntro, setShowIntro] = useState(true);
  const [topic, setTopic] = useState('');
  const [analysisContext, setAnalysisContext] = useState('');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9');
  const [imageSize, setImageSize] = useState<ImageSize>('1K');
  const [selectedModel, setSelectedModel] = useState<ImageGenerationModel>('gemini-2.5-flash-image');
  const [complexityLevel, setComplexityLevel] = useState<ComplexityLevel>('High School');
  const [visualStyle, setVisualStyle] = useState<VisualStyle>('Default');
  const [language, setLanguage] = useState<Language>('English');
  
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [loadingStep, setLoadingStep] = useState<number>(0);
  const [loadingFacts, setLoadingFacts] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  const [imageHistory, setImageHistory] = useState<GeneratedImage[]>([]);
  const [currentSearchResults, setCurrentSearchResults] = useState<SearchResultItem[]>([]);
  const [isDarkMode, setIsDarkMode] = useState(true);

  // Audio Recording State
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Vision State
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // API Key State
  const [hasApiKey, setHasApiKey] = useState(false);
  const [checkingKey, setCheckingKey] = useState(true);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  useEffect(() => {
    const checkKey = async () => {
      try {
        if (window.aistudio && window.aistudio.hasSelectedApiKey) {
          const hasKey = await window.aistudio.hasSelectedApiKey();
          setHasApiKey(hasKey);
        } else {
          setHasApiKey(true);
        }
      } catch (e) {
        console.error("Error checking API key:", e);
      } finally {
        setCheckingKey(false);
      }
    };
    checkKey();
  }, []);

  const handleSelectKey = async () => {
    if (window.aistudio && window.aistudio.openSelectKey) {
      try {
        await window.aistudio.openSelectKey();
        setHasApiKey(true);
        setError(null);
      } catch (e) {
        console.error("Failed to open key selector:", e);
      }
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
        setAnalysisResult(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Audio = (reader.result as string).split(',')[1];
          try {
            setIsLoading(true);
            setLoadingMessage('Transcribing audio...');
            const text = await transcribeAudio(base64Audio, 'audio/webm');
            setTopic(text);
          } catch (err) {
            setError('Transcription failed. Please try again.');
          } finally {
            setIsLoading(false);
          }
        };
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      setError('Microphone access denied or not available.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const playTTS = async (text: string) => {
    try {
      const base64Audio = await generateSpeech(text);
      const binaryString = atob(base64Audio);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});
      const dataInt16 = new Int16Array(bytes.buffer);
      const frameCount = dataInt16.length;
      const buffer = audioContext.createBuffer(1, frameCount, 24000);
      const channelData = buffer.getChannelData(0);
      for (let i = 0; i < frameCount; i++) {
        channelData[i] = dataInt16[i] / 32768.0;
      }
      const source = audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(audioContext.destination);
      source.start();
    } catch (err) {
      console.error("TTS failed", err);
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    if (!topic.trim() && !selectedImage) {
        setError("Please enter a topic or upload an image to analyze.");
        return;
    }

    setIsLoading(true);
    setError(null);
    setLoadingStep(1);
    setLoadingFacts([]);
    setCurrentSearchResults([]);
    setAnalysisResult(null);

    try {
      if (selectedImage) {
        setLoadingMessage(`Analyzing image content...`);
        const analysis = await analyzeImageWithGemini(selectedImage, topic, analysisContext, language);
        setAnalysisResult({
          text: analysis,
          imageUrl: selectedImage,
          timestamp: Date.now()
        });
      } else {
        setLoadingMessage(`Researching topic with Search & Maps...`);
        const researchResult = await researchTopicForPrompt(topic, complexityLevel, visualStyle, language);
        
        setLoadingFacts(researchResult.facts);
        setCurrentSearchResults(researchResult.searchResults);
        
        setLoadingStep(2);
        setLoadingMessage(`Designing Infographic (${imageSize})...`);
        
        let base64Data = await generateInfographicImage(researchResult.imagePrompt, selectedModel, aspectRatio, imageSize);
        
        const newImage: GeneratedImage = {
          id: Date.now().toString(),
          data: base64Data,
          prompt: topic,
          timestamp: Date.now(),
          level: complexityLevel,
          style: visualStyle,
          language: language,
          aspectRatio: aspectRatio,
          model: selectedModel,
          size: imageSize
        };

        setImageHistory([newImage, ...imageHistory]);
      }
    } catch (err: any) {
      console.error(err);
      if (err.message && (err.message.includes("Requested entity was not found") || err.message.includes("404") || err.message.includes("403"))) {
          setError("Access denied. A paid Gemini API key is required for Pro features. Please re-select your key.");
          setHasApiKey(false);
      } else {
          setError('The service is temporarily unavailable. Please try again.');
      }
    } finally {
      setIsLoading(false);
      setLoadingStep(0);
    }
  };

  const handleEdit = async (editPrompt: string) => {
    if (imageHistory.length === 0) return;
    const currentImage = imageHistory[0];
    setIsLoading(true);
    setError(null);
    setLoadingStep(2);
    setLoadingMessage(`Processing Modification: "${editPrompt}"...`);

    try {
      const base64Data = await editInfographicImage(currentImage.data, editPrompt, selectedModel, aspectRatio);
      const newImage: GeneratedImage = {
        id: Date.now().toString(),
        data: base64Data,
        prompt: editPrompt,
        timestamp: Date.now(),
        level: currentImage.level,
        style: currentImage.style,
        language: currentImage.language,
        aspectRatio: currentImage.aspectRatio,
        model: selectedModel
      };
      setImageHistory([newImage, ...imageHistory]);
    } catch (err: any) {
      console.error(err);
      if (err.message && (err.message.includes("Requested entity was not found") || err.message.includes("404") || err.message.includes("403"))) {
          setError("Access denied. Please select a valid API key with billing enabled.");
          setHasApiKey(false);
      } else {
          setError('Modification failed. Try a different command.');
      }
    } finally {
      setIsLoading(false);
      setLoadingStep(0);
    }
  };

  const restoreImage = (img: GeneratedImage) => {
     const newHistory = imageHistory.filter(i => i.id !== img.id);
     setImageHistory([img, ...newHistory]);
     setAnalysisResult(null);
     setSelectedImage(null);
     if (img.aspectRatio) setAspectRatio(img.aspectRatio);
     if (img.model) setSelectedModel(img.model);
     if (img.size) setImageSize(img.size);
  };

  const KeySelectionModal = () => (
    <div className="fixed inset-0 z-[200] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
        <div className="bg-white dark:bg-slate-900 border-2 border-amber-500/50 rounded-2xl shadow-2xl max-w-md w-full p-6 md:p-8 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500"></div>
            
            <div className="flex flex-col items-center text-center space-y-6">
                <div className="relative">
                    <div className="w-20 h-20 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center text-amber-600 dark:text-amber-400 mb-2 border-4 border-white dark:border-slate-900 shadow-lg">
                        <CreditCard className="w-8 h-8" />
                    </div>
                    <div className="absolute -bottom-1 -right-1 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm border-2 border-white dark:border-slate-900 uppercase tracking-wide">
                        Paid App
                    </div>
                </div>
                
                <div className="space-y-3">
                    <h2 className="text-2xl font-display font-bold text-slate-900 dark:text-white">
                        Paid API Key Required
                    </h2>
                    <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed font-medium">
                        Advanced generation features require a paid Gemini API key.
                    </p>
                    <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                        You must select a Google Cloud Project with <span className="font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-1 py-0.5 rounded">Billing Enabled</span> to proceed.
                    </p>
                </div>

                <button 
                    onClick={handleSelectKey}
                    className="w-full py-3.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white rounded-xl font-bold shadow-lg shadow-amber-500/20 transition-all transform hover:scale-[1.02] flex items-center justify-center gap-2"
                >
                    <Key className="w-4 h-4" />
                    <span>Select Paid API Key</span>
                </button>
            </div>
        </div>
    </div>
  );

  return (
    <>
    {!checkingKey && !hasApiKey && <KeySelectionModal />}
    <ChatBot />

    {showIntro ? (
      <IntroScreen onComplete={() => setShowIntro(false)} />
    ) : (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-200 font-sans selection:bg-cyan-500 selection:text-white pb-20 relative overflow-x-hidden animate-in fade-in duration-1000 transition-colors">
      
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-100 via-slate-50 to-white dark:from-indigo-900 dark:via-slate-950 dark:to-black z-0 transition-colors"></div>

      <header className="border-b border-slate-200 dark:border-white/10 sticky top-0 z-50 backdrop-blur-md bg-white/70 dark:bg-slate-950/60 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 md:h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 md:gap-4 group cursor-pointer" onClick={() => { setImageHistory([]); setCurrentSearchResults([]); setTopic(''); setAnalysisResult(null); }}>
            <div className="relative scale-90 md:scale-100">
                <div className="absolute inset-0 bg-cyan-500 blur-lg opacity-20 dark:opacity-40 group-hover:opacity-60 transition-opacity"></div>
                <div className="bg-white dark:bg-gradient-to-br dark:from-slate-900 dark:to-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-white/10 relative z-10 shadow-sm dark:shadow-none">
                   <Atom className="w-6 h-6 text-cyan-600 dark:text-cyan-400 animate-[spin_10s_linear_infinite]" />
                </div>
            </div>
            <div className="flex flex-col">
                <span className="font-display font-bold text-lg md:text-2xl tracking-tight text-slate-900 dark:text-white leading-none">
                InfoGenius <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 to-indigo-600 dark:from-cyan-400 dark:to-amber-400">Vision</span>
                </span>
                <span className="text-[8px] md:text-[10px] uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 font-medium">Visual Knowledge Engine</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
              <button 
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-300 transition-colors border border-slate-200 dark:border-white/10 shadow-sm"
              >
                {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
          </div>
        </div>
      </header>

      <main className="px-3 sm:px-6 py-4 md:py-8 relative z-10">
        
        <div className={`max-w-6xl mx-auto transition-all duration-500 ${imageHistory.length > 0 || analysisResult ? 'mb-4 md:mb-8' : 'min-h-[50vh] md:min-h-[70vh] flex flex-col justify-center'}`}>
          
          {!imageHistory.length && !analysisResult && (
            <div className="text-center mb-6 md:mb-16 space-y-3 md:space-y-8 animate-in slide-in-from-bottom-8 duration-700 fade-in">
              <div className="inline-flex items-center justify-center gap-2 px-4 py-1.5 rounded-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-amber-600 dark:text-amber-300 text-[10px] md:text-xs font-bold tracking-widest uppercase shadow-sm backdrop-blur-sm">
                <Compass className="w-3 h-3 md:w-4 md:h-4" /> Integrated Search, Maps, and Nano Banana Pro Synthesis
              </div>
              <h1 className="text-3xl sm:text-5xl md:text-8xl font-display font-bold text-slate-900 dark:text-white tracking-tight leading-[0.95] md:leading-[0.9]">
                Decode <br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 via-indigo-600 to-purple-600 dark:from-cyan-400 dark:via-indigo-400 dark:to-purple-400">Reality.</span>
              </h1>
            </div>
          )}

          <form onSubmit={handleGenerate} className={`relative z-20 transition-all duration-300 ${isLoading ? 'opacity-50 pointer-events-none scale-95 blur-sm' : 'scale-100'}`}>
            <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 via-purple-500 to-amber-500 rounded-3xl opacity-10 dark:opacity-20 group-hover:opacity-30 transition duration-500 blur-xl"></div>
                <div className="relative bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-white/10 p-2 rounded-3xl shadow-2xl">
                    
                    <div className="flex flex-col">
                        <div className="relative flex items-center">
                            <Search className="absolute left-4 md:left-6 w-5 h-5 md:w-6 md:h-6 text-slate-400 group-focus-within:text-cyan-500 transition-colors" />
                            <input
                                type="text"
                                value={topic}
                                onChange={(e) => setTopic(e.target.value)}
                                placeholder={selectedImage ? "Targeted question about this image..." : "What do you want to visualize?"}
                                className="w-full pl-12 md:pl-16 pr-24 md:pr-32 py-3 md:py-6 bg-transparent border-none outline-none text-base md:text-2xl placeholder:text-slate-400 font-medium text-slate-900 dark:text-white"
                            />
                            {/* Actions Group */}
                            <div className="absolute right-4 md:right-6 flex items-center gap-2">
                                <button 
                                  type="button" 
                                  onClick={isRecording ? stopRecording : startRecording}
                                  className={`p-2 rounded-xl transition-all ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200'}`}
                                  title={isRecording ? "Stop Recording" : "Speak to Transcribe"}
                                >
                                    {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                                </button>
                                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                                <button type="button" onClick={() => fileInputRef.current?.click()} className={`p-2 rounded-xl transition-all ${selectedImage ? 'bg-cyan-500 text-white shadow-lg' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200'}`} title="Upload for Vision Analysis">
                                    <ImageIcon className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {selectedImage && (
                            <div className="px-4 pb-4 animate-in slide-in-from-top-2 duration-300 space-y-4">
                                <div className="flex items-center gap-4">
                                    <div className="relative inline-block">
                                        <img src={selectedImage} alt="Preview" className="h-20 w-32 object-cover rounded-xl border-2 border-cyan-500 shadow-md" />
                                        <button type="button" onClick={() => setSelectedImage(null)} className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition-colors"><X className="w-3 h-3" /></button>
                                    </div>
                                    <div className="flex-1">
                                        <input 
                                          type="text" 
                                          value={analysisContext} 
                                          onChange={(e) => setAnalysisContext(e.target.value)}
                                          placeholder="Additional context (e.g., 'Look for security flaws', 'Identify text')"
                                          className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-cyan-500 outline-none text-slate-900 dark:text-white"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col md:flex-row gap-2 p-2 mt-2">
                        {/* Model Selector */}
                        <div className="flex-1 bg-slate-50 dark:bg-slate-950/50 rounded-2xl border border-slate-200 dark:border-white/5 px-4 py-3 flex items-center gap-3 hover:border-cyan-500/30 transition-colors relative overflow-hidden group/item">
                            <Cpu className="w-4 h-4 text-cyan-600" />
                            <div className="flex flex-col z-10 w-full overflow-hidden">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Engine</label>
                                <select value={selectedModel} onChange={(e) => setSelectedModel(e.target.value as ImageGenerationModel)} className="bg-transparent border-none text-sm font-bold text-slate-900 dark:text-slate-100 focus:ring-0 cursor-pointer p-0 w-full truncate pr-4">
                                    <option value="gemini-2.5-flash-image">Flash (Fast)</option>
                                    <option value="gemini-3-pro-image-preview">Pro (Nano Banana Pro)</option>
                                    <option value="imagen-4.0-generate-001">Imagen 4 (Creative)</option>
                                </select>
                            </div>
                        </div>

                        {/* Image Size Selector (Only for Nano Banana Pro) */}
                        {selectedModel === 'gemini-3-pro-image-preview' && (
                            <div className="flex-1 bg-slate-50 dark:bg-slate-950/50 rounded-2xl border border-slate-200 dark:border-white/5 px-4 py-3 flex items-center gap-3 hover:border-indigo-500/30 transition-colors relative overflow-hidden animate-in zoom-in duration-300">
                                <Layers className="w-4 h-4 text-indigo-600" />
                                <div className="flex flex-col z-10 w-full overflow-hidden">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Size</label>
                                    <select value={imageSize} onChange={(e) => setImageSize(e.target.value as ImageSize)} className="bg-transparent border-none text-sm font-bold text-slate-900 dark:text-slate-100 focus:ring-0 cursor-pointer p-0 w-full">
                                        <option value="1K">1K (Standard)</option>
                                        <option value="2K">2K (High-Res)</option>
                                        <option value="4K">4K (Ultra-Res)</option>
                                    </select>
                                </div>
                            </div>
                        )}

                        {/* Aspect Ratio Selector */}
                        <div className="flex-1 bg-slate-50 dark:bg-slate-950/50 rounded-2xl border border-slate-200 dark:border-white/5 px-4 py-3 flex items-center gap-3 hover:border-amber-500/30 transition-colors relative overflow-hidden group/item">
                            <Layout className="w-4 h-4 text-amber-600" />
                            <div className="flex flex-col z-10 w-full overflow-hidden">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Ratio</label>
                                <select value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value as AspectRatio)} className="bg-transparent border-none text-sm font-bold text-slate-900 dark:text-slate-100 focus:ring-0 cursor-pointer p-0 w-full">
                                    <option value="16:9">16:9 Wide</option>
                                    <option value="1:1">1:1 Square</option>
                                    <option value="9:16">9:16 Mobile</option>
                                </select>
                            </div>
                        </div>

                        {/* Audience Selector */}
                        {!selectedImage && (
                          <div className="flex-1 bg-slate-50 dark:bg-slate-950/50 rounded-2xl border border-slate-200 dark:border-white/5 px-4 py-3 flex items-center gap-3 hover:border-cyan-500/30 transition-colors group/item">
                              <GraduationCap className="w-4 h-4 text-cyan-600" />
                              <div className="flex flex-col w-full overflow-hidden">
                                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Audience</label>
                                  <select value={complexityLevel} onChange={(e) => setComplexityLevel(e.target.value as ComplexityLevel)} className="bg-transparent border-none text-sm font-bold text-slate-900 dark:text-slate-100 focus:ring-0 cursor-pointer p-0 w-full truncate pr-4">
                                      <option value="Elementary">Elementary</option>
                                      <option value="High School">High School</option>
                                      <option value="College">College</option>
                                      <option value="Expert">Expert</option>
                                  </select>
                              </div>
                          </div>
                        )}

                        {/* Aesthetic Selector */}
                        {!selectedImage && (
                          <div className="flex-1 bg-slate-50 dark:bg-slate-950/50 rounded-2xl border border-slate-200 dark:border-white/5 px-4 py-3 flex items-center gap-3 hover:border-purple-500/30 transition-colors group/item">
                              <Palette className="w-4 h-4 text-purple-600" />
                              <div className="flex flex-col w-full overflow-hidden">
                                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Aesthetic</label>
                                  <select value={visualStyle} onChange={(e) => setVisualStyle(e.target.value as VisualStyle)} className="bg-transparent border-none text-sm font-bold text-slate-900 dark:text-slate-100 focus:ring-0 cursor-pointer p-0 w-full truncate pr-4">
                                      <option value="Default">Standard</option>
                                      <option value="Geometric Patterns">Geometric Patterns</option>
                                      <option value="Minimalist">Minimalist</option>
                                      <option value="Realistic">Realistic</option>
                                      <option value="Cartoon">Graphic Novel</option>
                                      <option value="Vintage">Vintage Litho</option>
                                      <option value="Futuristic">Cyberpunk</option>
                                      <option value="3D Render">3D Isometric</option>
                                      <option value="Sketch">Blueprint</option>
                                  </select>
                              </div>
                          </div>
                        )}

                        <button type="submit" disabled={isLoading} className={`w-full md:w-auto h-full px-8 py-4 rounded-2xl font-bold font-display tracking-wide hover:brightness-110 transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)] whitespace-nowrap flex items-center justify-center gap-2 ${selectedImage ? 'bg-gradient-to-r from-purple-600 to-indigo-600' : 'bg-gradient-to-r from-cyan-600 to-blue-600'} text-white`}>
                            {selectedImage ? <FileSearch className="w-5 h-5" /> : <Microscope className="w-5 h-5" />}
                            <span>{selectedImage ? 'ANALYZE' : 'INITIATE'}</span>
                        </button>
                    </div>
                </div>
            </div>
          </form>
        </div>

        {isLoading && <Loading status={loadingMessage} step={loadingStep} facts={loadingFacts} />}

        {error && (
          <div className="max-w-2xl mx-auto mt-8 p-6 bg-red-100 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-2xl flex items-center gap-4 text-red-800 dark:text-red-200 animate-in fade-in">
            <AlertCircle className="w-6 h-6 shrink-0 text-red-500" />
            <p className="font-medium">{error}</p>
          </div>
        )}

        {/* Vision Analysis Display */}
        {analysisResult && !isLoading && (
            <div className="max-w-6xl mx-auto mt-8 animate-in fade-in zoom-in duration-700">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                    <div className="relative rounded-3xl overflow-hidden border border-slate-200 dark:border-white/10 shadow-2xl bg-white dark:bg-slate-900">
                        <img src={analysisResult.imageUrl} alt="Analyzed" className="w-full h-auto max-h-[60vh] object-contain" />
                        <div className="absolute bottom-4 left-4"><div className="px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md text-[10px] font-bold text-white uppercase tracking-widest border border-white/20">Source Image</div></div>
                    </div>
                    <div className="bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl rounded-[2.5rem] p-8 md:p-12 border border-slate-200 dark:border-white/10 shadow-xl relative overflow-hidden h-full flex flex-col">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-indigo-500"></div>
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-2xl text-purple-600"><Wand2 className="w-6 h-6" /></div>
                                <div><h2 className="text-2xl font-display font-bold text-slate-900 dark:text-white">Vision Intelligence</h2><p className="text-xs font-medium text-slate-500 uppercase tracking-widest">Neural Synthesis Report</p></div>
                            </div>
                            <button 
                              onClick={() => playTTS(analysisResult.text)}
                              className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-full hover:bg-cyan-500 hover:text-white transition-all shadow-sm"
                              title="Listen to analysis"
                            >
                                <Volume2 className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="prose prose-slate dark:prose-invert max-w-none flex-1 overflow-y-auto pr-2">
                            <div className="text-slate-700 dark:text-slate-200 leading-relaxed font-medium whitespace-pre-wrap">
                                {analysisResult.text}
                            </div>
                        </div>
                        <div className="mt-12 flex items-center justify-between">
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">GEN AT {new Date(analysisResult.timestamp).toLocaleTimeString()}</div>
                            <button onClick={() => { setTopic(`Explain visual findings: ${analysisResult.text.slice(0, 50)}...`); setSelectedImage(null); setAnalysisResult(null); }} className="px-6 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-full text-xs font-bold hover:opacity-80 transition-all flex items-center gap-2"><Atom className="w-3.5 h-3.5" /><span>Visualise This</span></button>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {imageHistory.length > 0 && !isLoading && !analysisResult && (
            <>
                <Infographic image={imageHistory[0]} onEdit={handleEdit} isEditing={isLoading} onSpeak={() => playTTS(`Infographic generated for topic: ${imageHistory[0].prompt}. Analysis summary available.`)} />
                <SearchResults results={currentSearchResults} />
            </>
        )}

        {(imageHistory.length > 1 || (imageHistory.length > 0 && analysisResult)) && (
            <div className="max-w-7xl mx-auto mt-16 border-t border-slate-200 dark:border-white/10 pt-12">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-[0.2em] mb-8 flex items-center gap-3"><History className="w-4 h-4" />Session Archives</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
                    {imageHistory.slice(analysisResult ? 0 : 1).map((img) => (
                        <div key={img.id} onClick={() => restoreImage(img)} className="group relative cursor-pointer rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10 hover:border-cyan-500/50 transition-all shadow-lg bg-white dark:bg-slate-900/50 backdrop-blur-sm">
                            <img src={img.data} alt={img.prompt} className="w-full aspect-video object-cover opacity-90 group-hover:opacity-100 transition-opacity duration-500" />
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-4 pt-8 translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                                <p className="text-xs text-white font-bold truncate font-display">{img.prompt}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}
      </main>
    </div>
    )}
    </>
  );
};

export default App;
