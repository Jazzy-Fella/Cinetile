import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Film, ChevronDown, Loader2, Search, AlertCircle, RefreshCw, ExternalLink, X, Star, Info, Play } from 'lucide-react';
import { Movie, Genre, GENRES, YEARS } from './types';
import { MovieService } from './services/movieService';
import MovieCard from './components/MovieCard';
import LoadingSkeleton from './components/LoadingSkeleton';

// Helper functions for initial random state
const getRandomGenre = (): Genre => GENRES[Math.floor(Math.random() * GENRES.length)];
const getRandomYear = (): string => {
  const min = 1998;
  const max = 2015;
  return (Math.floor(Math.random() * (max - min + 1)) + min).toString();
};

const App: React.FC = () => {
  const [selectedGenre, setSelectedGenre] = useState<Genre>(getRandomGenre);
  const [selectedYear, setSelectedYear] = useState<string>(getRandomYear);
  
  const [movies, setMovies] = useState<Movie[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [activeMovie, setActiveMovie] = useState<Movie | null>(null);
  const [showInfo, setShowInfo] = useState(false);

  const initialMount = useRef(true);

  const fetchMovies = useCallback(async (isLoadMore = false) => {
    if (isLoadMore) setLoadingMore(true);
    else {
      setLoading(true);
      setError(null);
    }
    
    try {
      const targetPage = isLoadMore ? page + 1 : 1;
      const response = await MovieService.getMovies(selectedGenre, selectedYear, targetPage);
      
      if (isLoadMore) {
        setMovies(prev => [...prev, ...response.movies]);
        setPage(targetPage);
      } else {
        setMovies(response.movies);
        setPage(1);
        if (response.movies.length === 0) {
          setError(`No titles found for ${selectedGenre} in ${selectedYear}.`);
        }
      }
    } catch (err: any) {
      console.error(err);
      setError("Database connection error. Try another selection.");
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
  
  const closeModal = () => {
    setActiveMovie(null);
    setShowInfo(false);
  };

  const openModal = (movie: Movie) => {
    setActiveMovie(movie);
    setShowInfo(false);
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-white/10 flex flex-col font-sans">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#050505]/80 backdrop-blur-2xl border-b border-white/5 px-4 md:px-10 py-5">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4 group cursor-pointer" onClick={() => window.location.reload()}>
            <div className="w-11 h-11 bg-white text-black rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tighter italic uppercase leading-none">CINETILE</h1>
            </div>
          </div>

          <div className="w-full lg:w-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-1.5 bg-white/5 rounded-2xl border border-white/10">
            <div className="flex flex-1 items-center">
              <div className="relative flex-1">
                <select 
                  value={selectedGenre} 
                  onChange={(e) => setSelectedGenre(e.target.value as Genre)} 
                  className="w-full appearance-none bg-transparent text-[10px] font-black uppercase tracking-widest rounded-xl px-5 py-3.5 focus:outline-none cursor-pointer"
                >
                  {GENRES.map(g => <option key={g} value={g} className="bg-[#0a0a0a] text-white">{g}</option>)}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-3 h-3 text-neutral-600 pointer-events-none" />
              </div>
              <div className="w-[1px] h-5 bg-white/10" />
              <div className="relative flex-1">
                <select 
                  value={selectedYear} 
                  onChange={(e) => setSelectedYear(e.target.value)} 
                  className="w-full appearance-none bg-transparent text-[10px] font-black uppercase tracking-widest rounded-xl px-5 py-3.5 focus:outline-none cursor-pointer"
                >
                  {YEARS.map(y => <option key={y} value={y} className="bg-[#0a0a0a] text-white">{y}</option>)}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-3 h-3 text-neutral-600 pointer-events-none" />
              </div>
            </div>
            <button 
              onClick={handleSearch} 
              disabled={loading} 
              className="px-8 py-3.5 bg-white text-black text-[10px] font-black uppercase tracking-[0.2em] rounded-xl hover:bg-neutral-200 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              {loading ? 'WAITING' : 'DISCOVER'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative max-w-7xl mx-auto px-6 md:px-10 mt-12 flex-grow w-full">
        {error ? (
          <div className="py-32 flex flex-col items-center text-center gap-6">
            <AlertCircle className="w-12 h-12 text-neutral-800" />
            <h3 className="text-xl font-black uppercase italic tracking-tight">{error}</h3>
            <button onClick={handleSearch} className="px-10 py-4 bg-white/5 border border-white/10 text-white text-[10px] font-black uppercase tracking-[0.3em] rounded-xl hover:bg-white hover:text-black transition-all">
              Try Again
            </button>
          </div>
        ) : loading && page === 1 ? (
          <LoadingSkeleton />
        ) : (
          <div className="pb-32">
            <div className="mb-8 flex items-center justify-between border-b border-white/5 pb-4">
               <h2 className="text-[9px] font-black text-neutral-500 uppercase tracking-[0.8em]">{selectedGenre} • {selectedYear}</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 md:gap-8">
              {movies.map((movie, idx) => (
                <MovieCard key={`${movie.id}-${idx}`} movie={movie} onClick={openModal} />
              ))}
            </div>

            {/* Load More Button */}
            {!loading && movies.length > 0 && (
              <div className="mt-20 flex justify-center">
                <button 
                  onClick={() => fetchMovies(true)}
                  disabled={loadingMore}
                  className="group relative px-16 py-6 bg-transparent border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-[0.5em] hover:bg-white hover:text-black transition-all overflow-hidden"
                >
                  <span className="relative z-10 flex items-center gap-3">
                    {loadingMore ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Load More'}
                  </span>
                  <div className="absolute inset-0 bg-white translate-y-full group-hover:translate-y-0 transition-transform duration-300 -z-0" />
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Immersive Modal */}
      {activeMovie && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-6 md:p-12 lg:p-20">
          <div className="absolute inset-0 bg-black/98 backdrop-blur-3xl cursor-zoom-out" onClick={closeModal} />
          
          <div className="relative w-full h-full max-w-7xl max-h-[90vh] overflow-hidden rounded-none sm:rounded-[40px] shadow-[0_0_100px_rgba(0,0,0,0.8)] flex items-center justify-center group animate-in zoom-in-95 duration-500">
            {/* Subtle glow behind poster */}
            <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent pointer-events-none" />
            
            {/* Main Poster Image (Fixed "cut-off" by using object-contain) */}
            <img 
              src={activeMovie.posterUrl} 
              alt={activeMovie.title} 
              className="w-full h-full object-contain transition-all duration-700 brightness-95 group-hover:brightness-100 z-10" 
            />

            {/* Top Floating Controls */}
            <div className="absolute top-6 right-6 flex items-center gap-3 z-40">
              <button 
                onClick={() => setShowInfo(!showInfo)}
                className={`p-4 rounded-2xl border backdrop-blur-xl transition-all flex items-center gap-3 shadow-2xl ${showInfo ? 'bg-white text-black border-white' : 'bg-black/50 text-white border-white/10 hover:bg-white hover:text-black'}`}
              >
                <Info className="w-6 h-6" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] hidden sm:block">Info</span>
              </button>
              <button 
                onClick={closeModal} 
                className="p-4 bg-black/50 text-white rounded-2xl border border-white/10 hover:bg-white hover:text-black transition-all backdrop-blur-xl shadow-2xl"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Sliding Info Panel */}
            <div className={`absolute bottom-0 left-0 right-0 bg-black/85 backdrop-blur-3xl border-t border-white/10 p-8 md:p-14 lg:p-20 transform transition-all duration-500 ease-out z-30 ${showInfo ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}`}>
               <div className="max-w-4xl mx-auto">
                 <div className="flex items-center gap-4 mb-6">
                    <div className="bg-yellow-500/10 border border-yellow-500/20 px-3 py-1.5 rounded-full flex items-center gap-2">
                      <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                      <span className="text-[10px] font-black text-yellow-500">{activeMovie.rating || 'N/A'}</span>
                    </div>
                    <span className="text-[10px] font-black text-neutral-500 uppercase tracking-[0.4em]">{activeMovie.year}</span>
                 </div>
                 <h2 className="text-3xl md:text-5xl lg:text-6xl font-black text-white leading-none tracking-tighter mb-8 italic uppercase line-clamp-2">{activeMovie.title}</h2>
                 <p className="text-neutral-400 text-base md:text-lg lg:text-xl leading-relaxed mb-12 font-light italic max-h-40 overflow-y-auto pr-4 scrollbar-hide">
                    {activeMovie.description}
                 </p>
                 <div className="flex flex-col sm:flex-row gap-4">
                    <a 
                      href={`https://web.stremio.com/#/search?search=${encodeURIComponent(activeMovie.title)}`} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="flex-1 flex items-center justify-center gap-3 p-6 bg-white text-black rounded-2xl hover:bg-neutral-200 transition-all font-black text-[11px] uppercase tracking-[0.3em] shadow-xl"
                    >
                      <Play className="w-4 h-4 fill-black" /> Stream on Stremio
                    </a>
                    <a 
                      href={`https://www.themoviedb.org/movie/${activeMovie.id}`} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="flex-1 flex items-center justify-center gap-3 p-6 bg-white/5 border border-white/10 text-white rounded-2xl hover:bg-white/10 transition-all font-black text-[11px] uppercase tracking-[0.3em]"
                    >
                      <ExternalLink className="w-4 h-4" /> Database Entry
                    </a>
                 </div>
               </div>
            </div>
          </div>
        </div>
      )}

      <footer className="py-12 text-center border-t border-white/5">
        <p className="text-[8px] font-black text-neutral-700 uppercase tracking-[0.8em]">Cinematic Search Provider • TMDB Indexing</p>
      </footer>
    </div>
  );
};

export default App;