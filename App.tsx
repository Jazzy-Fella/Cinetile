
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Film, ChevronDown, Loader2, Search, AlertCircle, RefreshCw, ExternalLink, Info, X, Play } from 'lucide-react';
import { Movie, Genre, GENRES, YEARS } from './types';
import { GeminiService } from './services/geminiService';
import MovieCard from './components/MovieCard';
import LoadingSkeleton from './components/LoadingSkeleton';

const getRandomItem = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

const getRandomInitialYear = (): string => {
  const min = 2010; // Defaulting to newer movies for better poster availability
  const max = 2024;
  return (Math.floor(Math.random() * (max - min + 1)) + min).toString();
};

const App: React.FC = () => {
  const [selectedGenre, setSelectedGenre] = useState<Genre>(() => getRandomItem(GENRES));
  const [selectedYear, setSelectedYear] = useState<string>(() => getRandomInitialYear());
  
  const [movies, setMovies] = useState<Movie[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [activeMovie, setActiveMovie] = useState<Movie | null>(null);
  const [showInfo, setShowInfo] = useState(false);

  const initialMount = useRef(true);

  const fetchMovies = useCallback(async (isLoadMore: boolean = false) => {
    setError(null);
    const targetPage = isLoadMore ? page + 1 : 1;

    if (isLoadMore) {
      setLoadingMore(true);
    } else {
      setLoading(true);
      setMovies([]); // Clear immediately for fresh search to show skeleton
      setPage(1);
    }
    
    try {
      const response = await GeminiService.getMovies(selectedGenre, selectedYear, targetPage);
      
      if (response.movies.length === 0) {
        if (!isLoadMore) {
          setError(`No valid ${selectedGenre} films with posters found for ${selectedYear}.`);
        }
      } else {
        if (isLoadMore) {
          setMovies(prev => {
            const existingIds = new Set(prev.map(m => m.id));
            const uniqueNew = response.movies.filter(m => !existingIds.has(m.id));
            return [...prev, ...uniqueNew];
          });
          setPage(targetPage);
        } else {
          setMovies(response.movies);
        }
      }
    } catch (err) {
      setError("Archive synchronization failed. Ensure your API Key is set in the environment variables.");
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

  const handleSearch = () => {
    fetchMovies(false);
  };

  const closeModal = () => {
    setActiveMovie(null);
    setShowInfo(false);
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-cyan-500/30 flex flex-col font-sans">
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-cyan-900/5 rounded-full blur-[160px] opacity-20" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-blue-900/5 rounded-full blur-[160px] opacity-20" />
      </div>

      <header className="sticky top-0 z-50 bg-[#050505]/95 backdrop-blur-2xl border-b border-white/5 px-4 md:px-8 py-4 shadow-2xl">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-cyan-500 to-blue-700 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Film className="text-white w-5 h-5 md:w-6 md:h-6" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-black tracking-tighter leading-none italic uppercase">CINETILE</h1>
              <span className="text-[8px] md:text-[9px] text-cyan-500 font-bold tracking-[0.4em] uppercase opacity-70 mt-1 block">Cinema Vault</span>
            </div>
          </div>

          <div className="w-full lg:w-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-1.5 bg-white/5 rounded-2xl border border-white/10">
            <div className="flex flex-1 items-center gap-2">
              <select
                value={selectedGenre}
                onChange={(e) => setSelectedGenre(e.target.value as Genre)}
                className="w-full appearance-none bg-transparent text-[10px] md:text-[11px] font-black uppercase tracking-widest rounded-xl pl-4 pr-8 py-2.5 focus:outline-none cursor-pointer hover:bg-white/5 transition-all"
              >
                {GENRES.map(g => <option key={g} value={g} className="bg-[#0a0a0a]">{g}</option>)}
              </select>
              <div className="w-[1px] h-6 bg-white/10" />
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="w-full appearance-none bg-transparent text-[10px] md:text-[11px] font-black uppercase tracking-widest rounded-xl pl-4 pr-8 py-2.5 focus:outline-none cursor-pointer hover:bg-white/5 transition-all"
              >
                {YEARS.map(y => <option key={y} value={y} className="bg-[#0a0a0a]">{y}</option>)}
              </select>
            </div>
            <button
              onClick={handleSearch}
              disabled={loading}
              className="flex items-center justify-center gap-2 px-6 py-2.5 bg-white text-black text-[10px] md:text-[11px] font-black uppercase tracking-[0.2em] rounded-xl hover:bg-cyan-400 transition-all active:scale-95 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
              {loading ? 'Scanning' : 'Search'}
            </button>
          </div>
        </div>
      </header>

      <main className="relative max-w-7xl mx-auto px-6 md:px-8 mt-8 flex-grow w-full">
        {error ? (
          <div className="py-20 flex flex-col items-center text-center gap-6">
            <div className="w-20 h-20 bg-red-500/5 rounded-full flex items-center justify-center border border-red-500/10 shadow-xl">
               <AlertCircle className="w-10 h-10 text-red-500/40" />
            </div>
            <div className="max-w-md">
              <h3 className="text-xl font-black text-white mb-2 uppercase italic tracking-tight">Sync Error</h3>
              <p className="text-neutral-500 text-sm font-medium leading-relaxed">{error}</p>
            </div>
            <button onClick={handleSearch} className="flex items-center gap-3 px-8 py-3.5 bg-white text-black text-[10px] font-black uppercase tracking-[0.3em] rounded-xl hover:bg-cyan-400 transition-all">
              <RefreshCw className="w-3.5 h-3.5" />
              Retry Discovery
            </button>
          </div>
        ) : loading && movies.length === 0 ? (
          <LoadingSkeleton />
        ) : (
          <div className="pb-40">
            <div className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-6 lg:gap-8 transition-opacity duration-700 ${loading ? 'opacity-40' : 'opacity-100'}`}>
              {movies.map((movie, idx) => (
                <MovieCard key={`${movie.id}-${idx}`} movie={movie} onClick={setActiveMovie} />
              ))}
              
              {(loadingMore || (loading && movies.length > 0)) && (
                <>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={`more-${i}`} className="aspect-[2/3] bg-neutral-900 rounded-2xl animate-pulse flex items-center justify-center border border-white/5">
                      <div className="w-8 h-8 border-2 border-white/10 border-t-white/30 rounded-full animate-spin" />
                    </div>
                  ))}
                </>
              )}
            </div>

            {movies.length > 0 && !loadingMore && !loading && (
              <div className="mt-20 flex flex-col items-center">
                <button
                  onClick={() => fetchMovies(true)}
                  className="group flex items-center justify-center gap-6 px-16 py-5 bg-white text-black font-black uppercase tracking-[0.4em] text-[10px] rounded-2xl transition-all hover:scale-[1.03] hover:bg-cyan-400 active:scale-95 shadow-2xl"
                >
                   <Search className="w-4 h-4 transition-transform group-hover:rotate-12" />
                   Discover More
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {activeMovie && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8">
          <div className="absolute inset-0 bg-black/95 backdrop-blur-xl cursor-pointer" onClick={closeModal} />
          
          <div className="relative w-full max-w-5xl max-h-full flex flex-col md:flex-row bg-[#080808] border border-white/10 rounded-[40px] overflow-hidden shadow-[0_0_120px_rgba(0,0,0,1)] animate-in zoom-in-95 duration-500">
            <div className={`relative flex-shrink-0 w-full md:w-[45%] lg:w-[40%] transition-all duration-700 ${showInfo ? 'opacity-20 blur-2xl scale-110' : 'opacity-100'}`}>
              <img src={activeMovie.posterUrl} alt={activeMovie.title} className="w-full h-full object-cover" />
            </div>

            <div className={`absolute inset-0 md:relative md:flex-grow flex flex-col p-8 md:p-14 lg:p-16 transition-all duration-700 ${showInfo ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-20 md:opacity-100 md:translate-y-0 pointer-events-none md:pointer-events-auto'}`}>
              <div className="mb-auto overflow-y-auto max-h-[70vh] md:max-h-none scrollbar-hide">
                 <h2 className="text-3xl md:text-5xl lg:text-6xl font-black text-white leading-[0.9] tracking-tighter mb-6 italic uppercase">
                    {activeMovie.title}
                 </h2>
                 <p className="text-[10px] md:text-xs font-black text-cyan-500 uppercase tracking-[0.6em] mb-10">
                   {activeMovie.year} • {activeMovie.genre}
                 </p>
                 
                 <div className="space-y-6">
                    <div className="p-6 md:p-8 bg-white/5 rounded-3xl border border-white/5 backdrop-blur-sm">
                       <h4 className="text-[10px] font-black text-neutral-500 uppercase tracking-[0.4em] mb-4">Synopsis</h4>
                       <p className="text-neutral-300 text-base md:text-lg leading-relaxed font-medium">
                         {activeMovie.description}
                       </p>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <a href={`https://www.imdb.com/title/${activeMovie.id}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-5 bg-white rounded-2xl text-black transition-all hover:bg-cyan-400 active:scale-95">
                        <span className="text-[10px] font-black uppercase tracking-[0.3em]">IMDb Profile</span>
                        <ExternalLink className="w-4 h-4" />
                      </a>
                      <a href={`https://web.stremio.com/#/search?search=${encodeURIComponent(activeMovie.title)}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-5 bg-neutral-900 rounded-2xl text-white border border-white/10 transition-all hover:bg-neutral-800 active:scale-95">
                        <span className="text-[10px] font-black uppercase tracking-[0.3em]">Watch on Stremio</span>
                        <Play className="w-4 h-4 fill-white" />
                      </a>
                    </div>
                 </div>
              </div>
            </div>

            <div className="absolute top-6 right-6 md:top-10 md:right-10 flex gap-3 z-[110]">
              <button onClick={() => setShowInfo(!showInfo)} className={`p-4 rounded-2xl border transition-all ${showInfo ? 'bg-cyan-500 text-black border-cyan-400' : 'bg-white/5 text-white border-white/10 hover:bg-white/10'}`}>
                <Info className="w-6 h-6" />
              </button>
              <button onClick={closeModal} className="p-4 bg-white/5 text-white rounded-2xl border border-white/10 hover:bg-red-500/80 transition-all hover:border-red-500/20">
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="mt-auto border-t border-white/5 pt-16 pb-12 px-6 md:px-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8 opacity-40">
            <div className="flex items-center gap-4">
              <Film className="w-5 h-5" />
              <span className="text-lg font-black tracking-tighter italic uppercase">CINETILE</span>
            </div>
            <p className="text-[8px] font-bold text-neutral-500 uppercase tracking-widest text-center md:text-right">
              Powered by Gemini 3 Flash & OMDb Hybrid Sync
            </p>
        </div>
      </footer>
    </div>
  );
};

export default App;
