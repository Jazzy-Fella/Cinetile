
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Film, ChevronDown, Loader2, Search, AlertCircle, RefreshCw, ExternalLink, Info, X, Play, Settings, Database } from 'lucide-react';
import { Movie, Genre, GENRES, YEARS } from './types';
import { GeminiService } from './services/geminiService';
import MovieCard from './components/MovieCard';
import LoadingSkeleton from './components/LoadingSkeleton';

const getRandomItem = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

const App: React.FC = () => {
  const [selectedGenre, setSelectedGenre] = useState<Genre>(() => getRandomItem(GENRES));
  const [selectedYear, setSelectedYear] = useState<string>("2024");
  
  const [movies, setMovies] = useState<Movie[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPreview, setIsPreview] = useState(false);
  
  const [activeMovie, setActiveMovie] = useState<Movie | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const [showSetupGuide, setShowSetupGuide] = useState(false);

  const initialMount = useRef(true);

  const fetchMovies = useCallback(async (isLoadMore: boolean = false) => {
    setError(null);
    const nextPage = isLoadMore ? page + 1 : 1;

    if (isLoadMore) {
      setLoadingMore(true);
    } else {
      setLoading(true);
      setPage(1);
    }
    
    try {
      const response = await GeminiService.getMovies(selectedGenre, selectedYear, nextPage);
      setIsPreview(!!response.isPreview);
      
      if (response.movies.length === 0) {
        if (!isLoadMore) setError("No data found for this period.");
      } else {
        setMovies(prev => {
          if (!isLoadMore) return response.movies;
          const existingIds = new Set(prev.map(m => m.id));
          const uniqueNew = response.movies.filter(m => !existingIds.has(m.id));
          return [...prev, ...uniqueNew];
        });
        if (isLoadMore) setPage(nextPage);
      }
    } catch (err: any) {
      setError(err.message || "Archive synchronization failed.");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [selectedGenre, selectedYear, page]);

  useEffect(() => {
    if (initialMount.current) {
      fetchMovies();
      initialMount.current = false;
    }
  }, []);

  const handleSearch = () => fetchMovies(false);
  const closeModal = () => { setActiveMovie(null); setShowInfo(false); };

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-cyan-500/30 flex flex-col font-sans">
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-cyan-900/10 rounded-full blur-[160px] opacity-30" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-blue-900/10 rounded-full blur-[160px] opacity-30" />
      </div>

      {isPreview && (
        <div className="bg-cyan-500 text-black py-1 px-4 flex items-center justify-center gap-4 z-[100] sticky top-0">
          <span className="text-[10px] font-black uppercase tracking-[0.2em]">Preview Mode Active: API_KEY Required for Real-Time Sync</span>
          <button onClick={() => setShowSetupGuide(true)} className="text-[9px] font-black uppercase underline hover:opacity-70 transition-opacity">View Setup Guide</button>
        </div>
      )}

      <header className={`sticky ${isPreview ? 'top-[24px]' : 'top-0'} z-50 bg-[#050505]/95 backdrop-blur-2xl border-b border-white/5 px-4 md:px-8 py-4 shadow-2xl`}>
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-700 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Film className="text-white w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tighter leading-none italic uppercase">CINETILE</h1>
              <span className="text-[8px] text-cyan-500 font-bold tracking-[0.4em] uppercase opacity-70 mt-1 block">Cinema Vault</span>
            </div>
          </div>

          <div className="w-full lg:w-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-1.5 bg-white/5 rounded-2xl border border-white/10">
            <div className="flex flex-1 items-center gap-2">
              <div className="relative flex-1">
                <select value={selectedGenre} onChange={(e) => setSelectedGenre(e.target.value as Genre)} className="w-full appearance-none bg-transparent text-[10px] font-black uppercase tracking-widest rounded-xl pl-4 pr-10 py-3 focus:outline-none cursor-pointer hover:bg-white/5">
                  {GENRES.map(g => <option key={g} value={g} className="bg-[#0a0a0a]">{g}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-cyan-500 pointer-events-none" />
              </div>
              <div className="w-[1px] h-6 bg-white/10" />
              <div className="relative flex-1">
                <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="w-full appearance-none bg-transparent text-[10px] font-black uppercase tracking-widest rounded-xl pl-4 pr-10 py-3 focus:outline-none cursor-pointer hover:bg-white/5">
                  {YEARS.map(y => <option key={y} value={y} className="bg-[#0a0a0a]">{y}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-cyan-500 pointer-events-none" />
              </div>
            </div>
            <button onClick={handleSearch} disabled={loading} className="px-8 py-3 bg-white text-black text-[10px] font-black uppercase tracking-[0.2em] rounded-xl hover:bg-cyan-400 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
              {loading ? 'Scanning' : 'Search'}
            </button>
          </div>
        </div>
      </header>

      <main className="relative max-w-7xl mx-auto px-6 md:px-8 mt-10 flex-grow w-full">
        {error ? (
          <div className="py-20 flex flex-col items-center text-center gap-6">
            <AlertCircle className="w-12 h-12 text-red-500/50" />
            <div className="max-w-md">
              <h3 className="text-xl font-black uppercase italic tracking-tight mb-2">Sync Fault</h3>
              <p className="text-neutral-500 text-sm leading-relaxed">{error}</p>
            </div>
            <button onClick={handleSearch} className="flex items-center gap-3 px-10 py-4 bg-white text-black text-[10px] font-black uppercase tracking-[0.3em] rounded-xl hover:bg-cyan-400 transition-all">
              <RefreshCw className="w-3.5 h-3.5" /> Retry Sync
            </button>
          </div>
        ) : loading && movies.length === 0 ? (
          <LoadingSkeleton />
        ) : (
          <div className="pb-40">
            <div className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6 md:gap-8 transition-all duration-700 ${loading ? 'opacity-40 blur-sm' : 'opacity-100'}`}>
              {movies.map((movie, idx) => <MovieCard key={`${movie.id}-${idx}`} movie={movie} onClick={setActiveMovie} />)}
              {loadingMore && Array.from({ length: 6 }).map((_, i) => (
                <div key={`more-${i}`} className="aspect-[2/3] bg-neutral-900 rounded-2xl animate-pulse border border-white/5 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-neutral-700" />
                </div>
              ))}
            </div>

            {movies.length > 0 && !loadingMore && !loading && !isPreview && (
              <div className="mt-24 flex flex-col items-center">
                <button onClick={() => fetchMovies(true)} className="px-20 py-6 bg-white text-black font-black uppercase tracking-[0.5em] text-[10px] rounded-2xl transition-all hover:scale-[1.05] hover:bg-cyan-400 active:scale-95 shadow-2xl">
                   Expand Archive
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Setup Guide Modal */}
      {showSetupGuide && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" onClick={() => setShowSetupGuide(false)} />
          <div className="relative w-full max-w-xl bg-[#0a0a0a] border border-white/10 rounded-[32px] p-10 shadow-2xl animate-in zoom-in-95 duration-300">
             <div className="flex items-center gap-4 mb-8">
               <div className="w-12 h-12 bg-cyan-500/10 rounded-xl flex items-center justify-center border border-cyan-500/20">
                 <Settings className="w-6 h-6 text-cyan-500" />
               </div>
               <h3 className="text-2xl font-black italic uppercase tracking-tighter">System Configuration</h3>
             </div>
             <div className="space-y-6">
               <div className="p-6 bg-white/5 rounded-2xl border border-white/5">
                 <div className="flex items-center gap-3 mb-3">
                   <Database className="w-4 h-4 text-cyan-500" />
                   <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Environment Sync</span>
                 </div>
                 <p className="text-sm text-neutral-300 leading-relaxed">
                   CineTile requires a valid <code className="text-cyan-500">API_KEY</code> from Google AI Studio to sync with the movie database in real-time.
                 </p>
               </div>
               <div className="space-y-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500">How to Fix:</p>
                  <ol className="text-sm text-neutral-400 space-y-3 list-decimal pl-4">
                    <li>Open your <span className="text-white font-bold">Vercel Dashboard</span>.</li>
                    <li>Go to <span className="text-white font-bold">Project Settings &gt; Environment Variables</span>.</li>
                    <li>Add <code className="text-cyan-500 font-bold">API_KEY</code> as the name.</li>
                    <li>Paste your Gemini API Key as the value.</li>
                    <li><span className="text-white font-bold">Redeploy</span> your application.</li>
                  </ol>
               </div>
               <button onClick={() => setShowSetupGuide(false)} className="w-full py-4 bg-white text-black text-[10px] font-black uppercase tracking-[0.3em] rounded-xl hover:bg-cyan-400 transition-all">Dismiss Diagnostics</button>
             </div>
          </div>
        </div>
      )}

      {/* Movie Details Modal */}
      {activeMovie && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/95 backdrop-blur-2xl cursor-pointer" onClick={closeModal} />
          <div className="relative w-full max-w-5xl bg-[#080808] border border-white/10 rounded-[40px] overflow-hidden shadow-2xl flex flex-col md:flex-row animate-in zoom-in-95 duration-500">
            <div className={`relative flex-shrink-0 w-full md:w-[45%] transition-all duration-700 ${showInfo ? 'opacity-20 blur-3xl scale-110' : 'opacity-100'}`}>
              <img src={activeMovie.posterUrl} alt={activeMovie.title} className="w-full h-full object-cover" />
            </div>
            <div className="relative flex-grow flex flex-col p-8 md:p-16">
              <div className="mb-auto overflow-y-auto max-h-[70vh] md:max-h-none pr-2">
                 <h2 className="text-3xl md:text-5xl font-black text-white leading-none tracking-tighter mb-6 italic uppercase">{activeMovie.title}</h2>
                 <p className="text-[10px] font-black text-cyan-500 uppercase tracking-[0.7em] mb-8">{activeMovie.year} • {activeMovie.genre}</p>
                 <div className="p-8 bg-white/5 rounded-[32px] border border-white/5 backdrop-blur-md mb-8">
                    <p className="text-neutral-200 text-base leading-relaxed">{activeMovie.description}</p>
                 </div>
                 <div className="flex flex-col sm:flex-row gap-4">
                    <a href={`https://www.imdb.com/title/${activeMovie.id}`} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-between p-6 bg-white rounded-2xl text-black transition-all hover:bg-cyan-400 active:scale-95">
                      <span className="text-[10px] font-black uppercase tracking-[0.3em]">IMDb Profile</span>
                      <ExternalLink className="w-4 h-4" />
                    </a>
                 </div>
              </div>
            </div>
            <button onClick={closeModal} className="absolute top-8 right-8 p-4 bg-white/5 text-white rounded-2xl border border-white/10 hover:bg-red-500 transition-all"><X className="w-6 h-6" /></button>
          </div>
        </div>
      )}

      <footer className="mt-auto border-t border-white/5 pt-20 pb-16 px-6 opacity-30">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex items-center gap-4">
              <Film className="w-6 h-6" />
              <span className="text-xl font-black tracking-tighter italic uppercase">CINETILE</span>
            </div>
            <p className="text-[9px] font-bold text-neutral-500 uppercase tracking-widest">Hybrid Discovery Engine • v2.1 Stable</p>
        </div>
      </footer>
    </div>
  );
};

export default App;
