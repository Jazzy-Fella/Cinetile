
import React, { useState } from 'react';
import { Movie } from '../types';
import { Film } from 'lucide-react';

interface MovieCardProps {
  movie: Movie;
  onClick: (movie: Movie) => void;
}

const MovieCard: React.FC<MovieCardProps> = ({ movie, onClick }) => {
  const [imgStatus, setImgStatus] = useState<'loading' | 'loaded' | 'error'>('loading');

  return (
    <div 
      onClick={() => onClick(movie)}
      className="group relative overflow-hidden rounded-2xl bg-neutral-900 aspect-[2/3] shadow-2xl border border-white/5 cursor-pointer transition-all duration-500 hover:scale-[1.03] hover:shadow-cyan-500/10 hover:border-white/10"
    >
      {/* Skeleton / Loading State */}
      <div className={`absolute inset-0 flex flex-col items-center justify-center p-4 text-center transition-opacity duration-300 ${
        imgStatus === 'loaded' ? 'opacity-0' : 'opacity-100'
      }`}>
        <div className="w-8 h-8 border-2 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin mb-4" />
        <span className="text-[10px] font-black uppercase tracking-widest text-neutral-600 line-clamp-1 px-4">{movie.title}</span>
      </div>

      {/* Poster Image */}
      {imgStatus !== 'error' ? (
        <img
          src={movie.posterUrl}
          alt={movie.title}
          className={`h-full w-full object-cover transition-all duration-700 transform group-hover:scale-110 ${
            imgStatus === 'loaded' ? 'opacity-100 scale-100' : 'opacity-0 scale-105'
          }`}
          loading="lazy"
          onLoad={() => setImgStatus('loaded')}
          onError={() => setImgStatus('error')}
        />
      ) : (
        <div className="h-full w-full flex flex-col items-center justify-center bg-neutral-950 p-6 text-center">
          <Film className="w-8 h-8 text-neutral-800 mb-2" />
          <h4 className="text-[10px] font-black text-neutral-600 uppercase tracking-widest leading-tight">
            {movie.title}
          </h4>
        </div>
      )}

      {/* Hover Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex flex-col justify-end p-6">
        <h4 className="text-white text-sm font-black italic uppercase leading-tight tracking-tighter transform translate-y-2 group-hover:translate-y-0 transition-transform duration-500">
          {movie.title}
        </h4>
        <p className="text-cyan-500 text-[10px] font-black uppercase tracking-widest mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-700 delay-100">
          {movie.year}
        </p>
      </div>
    </div>
  );
};

export default MovieCard;
