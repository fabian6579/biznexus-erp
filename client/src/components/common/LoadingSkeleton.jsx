import React from 'react';

export const LoadingSkeleton = ({ count = 5, type = 'table' }) => {
  if (type === 'card') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="h-28 bg-slate-200/70 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="w-full space-y-3 animate-pulse">
      <div className="h-10 bg-slate-200/80 rounded-lg w-full" />
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="h-12 bg-slate-100 rounded-lg w-full" />
      ))}
    </div>
  );
};
