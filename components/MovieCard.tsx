import React, { useState } from 'react';
import { Movie } from '../types';

interface MovieCardProps {
  movie: Movie;
  onClick: (movie: Movie) => void;
}

const MovieCard: React.FC<MovieCardProps> = ({ movie, onClick }) => {
  const [loaded, setLoaded] = useState(false);

  return (
    <div 
      onClick={() => onClick(movie)}
      className="group relative overflow-hidden rounded-2xl bg-[#111] aspect-[2/3] shadow-2xl cursor-pointer transition-all duration-500 hover:scale-[1.05] active:scale-95 border border-white/5 hover:border-white/20"
    >
      {!loaded && (
        <div className="absolute inset-0 bg-neutral-900 animate-pulse flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-white/10 border-t-white rounded-full animate-spin" />
        </div>
      )}
      
      <img
        src={movie.thumbUrl}
        alt={movie.title}
        className={`h-full w-full object-cover transition-all duration-1000 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        onLoad={() => setLoaded(true)}
        loading="lazy"
      />

      {/* Subtle overlay on hover just to indicate clickability without text clutter */}
      <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
    </div>
  );
};

export default MovieCard;