import React, { useState } from 'react';
import { Star } from 'lucide-react';
import { Language } from '../translations';
import { useTranslation } from '../hooks/useTranslation';

export function StarRating({ rating, onRate, lang, isSubmitting, success }: { rating: number, onRate: (score: number) => void, lang: Language, isSubmitting: boolean, success: boolean }) {
  const { t } = useTranslation(lang);
  const [hover, setHover] = useState(0);

  return (
    <div className="flex items-center gap-1">
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            disabled={isSubmitting}
            onClick={() => onRate(star)}
            onMouseEnter={() => setHover(star)}
            onMouseLeave={() => setHover(0)}
            className="p-0.5 transition-transform hover:scale-110 disabled:opacity-50"
          >
            <Star 
              size={16} 
              className={`${(hover || rating) >= star ? 'text-yellow-500 fill-yellow-500' : 'text-zinc-300'} transition-colors`} 
            />
          </button>
        ))}
      </div>
      {success && (
        <span className="text-[10px] font-bold text-green-500 uppercase tracking-wider ml-1">
          ✓
        </span>
      )}
    </div>
  );
}
