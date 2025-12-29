import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Film, ChevronDown, Loader2, Search, AlertCircle, ExternalLink, X, Star, Info, Play } from 'lucide-react';
import { Movie, Genre, GENRES, YEARS } from './types';
import { MovieService } from './services/movieService';
import MovieCard from './components/MovieCard';
import LoadingSkeleton from './components/LoadingSkeleton';

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
      if (!isLoadMore) window.scrollTo({ top: 0, behavior: 'smooth' });
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

  // Select a high-scoring film for the highlight section
  const featuredMovie = useMemo(() => {
    if (movies.length === 0) return null;
    // Prefer highly rated films for the featured slot
    const highRated = movies.find(m => m.rating && parseFloat(m.rating) >= 8.0) 
                    || movies.find(m => m.rating && parseFloat(m.rating) >= 7.5) 
                    || movies.find(m => m.rating && parseFloat(m.rating) >= 7.0) 
                    || movies[0];
    return highRated;
  }, [movies]);

  // List excludes the featured one to avoid duplicates in the grid
  const listMovies = useMemo(() => {
    if (!featuredMovie) return movies;
    return movies.filter(m => m.id !== featuredMovie.id);
  }, [movies, featuredMovie]);

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-white/10 flex flex-col font-sans">
      {/* Header - Non-sticky on mobile, sticky on desktop */}
      <header className="relative md:sticky top-0 z-[60] bg-[#050505] md:bg-[#050505]/80 md:backdrop-blur-xl border-b border-white/5 px-4 md:px-10 py-3 md:py-4">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-3 md:gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-white text-black rounded-lg flex items-center justify-center shadow-lg">
              <Film className="w-4 h-4 md:w-5 md:h-5" />
            </div>
            <h1 className="text-base md:text-lg font-black tracking-tighter italic uppercase">CINETILE</h1>
          </div>

          <div className="w-full lg:w-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-1 bg-white/5 rounded-xl md:rounded-2xl border border-white/10">
            <div className="flex flex-1 items-center">
              <div className="relative flex-1">
                <select 
                  value={selectedGenre} 
                  onChange={(e) => setSelectedGenre(e.target.value as Genre)} 
                  className="w-full appearance-none bg-transparent text-[9px] md:text-[10px] font-black uppercase tracking-widest rounded-xl px-3 md:px-4 py-2.5 md:py-3 focus:outline-none cursor-pointer"
                >
                  {GENRES.map(g => <option key={g} value={g} className="bg-[#0a0a0a] text-white">{g}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-neutral-600 pointer-events-none" />
              </div>
              <div className="w-[1px] h-3 bg-white/10" />
              <div className="relative flex-1">
                <select 
                  value={selectedYear} 
                  onChange={(e) => setSelectedYear(e.target.value)} 
                  className="w-full appearance-none bg-transparent text-[9px] md:text-[10px] font-black uppercase tracking-widest rounded-xl px-3 md:px-4 py-2.5 md:py-3 focus:outline-none cursor-pointer"
                >
                  {YEARS.map(y => <option key={y} value={y} className="bg-[#0a0a0a] text-white">{y}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-neutral-600 pointer-events-none" />
              </div>
            </div>
            <button 
              onClick={handleSearch} 
              disabled={loading} 
              className="px-5 py-2.5 md:px-6 md:py-3 bg-white text-black text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] rounded-lg md:rounded-xl hover:bg-neutral-200 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
              DISCOVER
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative flex-grow w-full">
        {error ? (
          <div className="py-24 md:py-32 max-w-7xl mx-auto px-6 flex flex-col items-center text-center gap-6">
            <AlertCircle className="w-12 h-12 text-neutral-800" />
            <h3 className="text-xl font-black uppercase italic tracking-tight">{error}</h3>
            <button onClick={handleSearch} className="px-10 py-4 bg-white/5 border border-white/10 text-white text-[10px] font-black uppercase tracking-[0.3em] rounded-xl hover:bg-white hover:text-black transition-all">
              Try Again
            </button>
          </div>
        ) : loading && page === 1 ? (
          <div className="max-w-7xl mx-auto px-6 mt-12">
            <LoadingSkeleton />
          </div>
        ) : (
          <div className="flex flex-col w-full">
            {/* Reduced Height Hero Section - Highlight */}
            {featuredMovie && !loading && (
              <section 
                className="relative w-full h-[35vh] md:h-[45vh] flex items-end overflow-hidden cursor-pointer group"
                onClick={() => openModal(featuredMovie)}
              >
                <div className="absolute inset-0 transition-transform duration-1000 group-hover:scale-105">
                  <img 
                    src={featuredMovie.posterUrl} 
                    alt={featuredMovie.title} 
                    className="w-full h-full object-cover brightness-[0.35]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-transparent" />
                  <div className="absolute inset-0 bg-gradient-to-r from-[#050505]/70 via-transparent to-transparent" />
                </div>
                
                <div className="relative max-w-7xl mx-auto px-6 md:px-10 pb-8 md:pb-12 w-full animate-in fade-in slide-in-from-bottom-6 duration-1000">
                  <div className="flex items-center gap-2.5 mb-2.5">
                    <span className="px-2.5 py-1 bg-white/10 backdrop-blur-md border border-white/10 rounded-full text-[8px] font-black uppercase tracking-widest text-white/80">Highlight</span>
                    <div className="flex items-center gap-1.5 bg-yellow-500/10 px-2.5 py-1 rounded-full border border-yellow-500/20">
                      <Star className="w-2.5 h-2.5 text-yellow-500 fill-yellow-500" />
                      <span className="text-[9px] font-black text-yellow-500">{featuredMovie.rating}</span>
                    </div>
                  </div>
                  <h2 className="text-3xl md:text-5xl lg:text-6xl font-black italic uppercase leading-[0.95] tracking-tighter max-w-3xl drop-shadow-2xl">{featuredMovie.title}</h2>
                  <div className="mt-4 flex items-center gap-2 text-[8px] md:text-[9px] font-black uppercase tracking-widest text-neutral-400">
                    <span>Click for details</span>
                    <ChevronDown className="w-3 h-3 -rotate-90" />
                  </div>
                </div>
              </section>
            )}

            {/* Grid Section */}
            <div className="max-w-7xl mx-auto px-4 md:px-10 pb-32 w-full">
              <div className="flex items-center justify-between border-b border-white/5 py-8 md:py-10 mb-6 md:mb-8">
                 <h2 className="text-[9px] md:text-[10px] font-black text-white uppercase tracking-[0.6em] md:tracking-[0.8em]">{selectedGenre} • {selectedYear}</h2>
                 {/* Results counter removed as requested */}
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-8">
                {listMovies.map((movie, idx) => (
                  <MovieCard key={`${movie.id}-${idx}`} movie={movie} onClick={openModal} />
                ))}
              </div>

              {!loading && movies.length > 0 && (
                <div className="mt-20 md:mt-24 flex justify-center">
                  <button 
                    onClick={() => fetchMovies(true)}
                    disabled={loadingMore}
                    className="group relative px-10 py-4 md:px-12 md:py-5 bg-transparent border border-white/10 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-[0.5em] hover:bg-white hover:text-black transition-all overflow-hidden"
                  >
                    <span className="relative z-10 flex items-center gap-3">
                      {loadingMore ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Load More'}
                    </span>
                    <div className="absolute inset-0 bg-white translate-y-full group-hover:translate-y-0 transition-transform duration-300 -z-0" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Immersive Modal */}
      {activeMovie && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-6 md:p-12 lg:p-20">
          <div className="absolute inset-0 bg-black/95 backdrop-blur-3xl cursor-zoom-out" onClick={closeModal} />
          
          <div className="relative w-full h-full max-w-6xl max-h-[90vh] overflow-hidden rounded-none sm:rounded-[32px] shadow-[0_0_100px_rgba(0,0,0,0.8)] flex items-center justify-center group animate-in zoom-in-95 duration-500">
            <img 
              src={activeMovie.posterUrl} 
              alt={activeMovie.title} 
              className="w-full h-full object-contain z-10" 
            />

            <div className="absolute top-4 right-4 md:top-6 md:right-6 flex items-center gap-2 md:gap-3 z-40">
              <button 
                onClick={() => setShowInfo(!showInfo)}
                className={`p-3 md:p-4 rounded-xl border backdrop-blur-xl transition-all flex items-center gap-3 shadow-2xl ${showInfo ? 'bg-white text-black border-white' : 'bg-black/50 text-white border-white/10 hover:bg-white hover:text-black'}`}
              >
                <Info className="w-5 h-5" />
              </button>
              <button 
                onClick={closeModal} 
                className="p-3 md:p-4 bg-black/50 text-white rounded-xl border border-white/10 hover:bg-white hover:text-black transition-all backdrop-blur-xl shadow-2xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className={`absolute bottom-0 left-0 right-0 bg-black/90 backdrop-blur-2xl border-t border-white/10 p-6 md:p-14 transform transition-all duration-500 ease-out z-30 ${showInfo ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}`}>
               <div className="max-w-3xl mx-auto">
                 <div className="flex items-center gap-4 mb-4 md:mb-6">
                    <div className="bg-yellow-500/10 border border-yellow-500/20 px-3 py-1 rounded-full flex items-center gap-2">
                      <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                      <span className="text-[10px] font-black text-yellow-500">{activeMovie.rating || 'N/A'}</span>
                    </div>
                    <span className="text-[10px] font-black text-neutral-500 uppercase tracking-[0.4em]">{activeMovie.year}</span>
                 </div>
                 <h2 className="text-2xl md:text-5xl font-black text-white leading-none tracking-tighter mb-4 md:mb-6 italic uppercase">{activeMovie.title}</h2>
                 <p className="text-neutral-400 text-sm md:text-lg leading-relaxed mb-8 md:mb-10 font-light italic max-h-40 overflow-y-auto pr-4">
                    {activeMovie.description}
                 </p>
                 <div className="flex flex-col sm:flex-row gap-3">
                    <a 
                      href={`https://web.stremio.com/#/search?search=${encodeURIComponent(activeMovie.title)}`} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="flex-1 flex items-center justify-center gap-3 p-4 md:p-5 bg-white text-black rounded-lg md:rounded-xl hover:bg-neutral-200 transition-all font-black text-[9px] md:text-[10px] uppercase tracking-[0.3em] shadow-xl"
                    >
                      <Play className="w-4 h-4 fill-black" /> Stream Now
                    </a>
                    <a 
                      href={`https://www.themoviedb.org/movie/${activeMovie.id}`} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="flex-1 flex items-center justify-center gap-3 p-4 md:p-5 bg-white/5 border border-white/10 text-white rounded-lg md:rounded-xl hover:bg-white/10 transition-all font-black text-[9px] md:text-[10px] uppercase tracking-[0.3em]"
                    >
                      <ExternalLink className="w-4 h-4" /> View Info
                    </a>
                 </div>
               </div>
            </div>
          </div>
        </div>
      )}

      <footer className="py-12 md:py-16 text-center border-t border-white/5">
        <p className="text-[7px] md:text-[8px] font-black text-neutral-700 uppercase tracking-[1em]">Cinematic Tile Indexing • Provider v2.3</p>
      </footer>
    </div>
  );
};

export default App;