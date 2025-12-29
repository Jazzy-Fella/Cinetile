import React from 'react';

const LoadingSkeleton: React.FC = () => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-6 w-full">
      {Array.from({ length: 12 }).map((_, i) => (
        <div 
          key={i} 
          className="aspect-[2/3] bg-white/5 border border-white/5 rounded-xl animate-pulse flex items-center justify-center"
        >
          <div className="w-8 h-8 opacity-10">
            <div className="w-full h-full border-2 border-white rounded-full animate-spin border-t-transparent" />
          </div>
        </div>
      ))}
    </div>
  );
};

export default LoadingSkeleton;