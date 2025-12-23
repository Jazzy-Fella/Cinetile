
import React from 'react';

const LoadingSkeleton: React.FC = () => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6 w-full">
      {Array.from({ length: 12 }).map((_, i) => (
        <div 
          key={i} 
          className="aspect-[2/3] bg-neutral-800 rounded-xl animate-pulse flex items-center justify-center"
        >
          <div className="w-12 h-1 bg-neutral-700 rounded-full" />
        </div>
      ))}
    </div>
  );
};

export default LoadingSkeleton;
