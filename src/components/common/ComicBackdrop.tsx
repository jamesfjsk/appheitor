import React from 'react';

const ComicBackdrop: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`hq-backdrop ${className}`} aria-hidden>
      <img className="hq-backdrop-art" src="/bg/hq-comic.jpg" alt="" />
      <div className="hq-backdrop-wash" />
    </div>
  );
};

export default ComicBackdrop;
