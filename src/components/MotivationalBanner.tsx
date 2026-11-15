import React, { useState, useEffect } from 'react';
import { Quote } from 'lucide-react';
import { getDailyMotivationalQuote } from '../lib/motivationalQuotes';
import { toDateKey } from '../lib/dateUtils';

interface MotivationalBannerProps {
  compact?: boolean;
}

export const MotivationalBanner: React.FC<MotivationalBannerProps> = ({
  compact = false,
}) => {
  const [todayKey, setTodayKey] = useState<string>(() => toDateKey(new Date()));

  useEffect(() => {
    const syncDay = () => {
      const currentKey = toDateKey(new Date());
      setTodayKey(prev => (prev === currentKey ? prev : currentKey));
    };

    const interval = window.setInterval(syncDay, 60000);
    window.addEventListener('focus', syncDay);
    document.addEventListener('visibilitychange', syncDay);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', syncDay);
      document.removeEventListener('visibilitychange', syncDay);
    };
  }, []);

  const quote = getDailyMotivationalQuote(new Date(`${todayKey}T12:00:00`));

  return (
    <section
      aria-label="عبارة اليوم التشجيعية"
      className={`rounded-3xl bg-slate-900/85 border border-slate-800 transition-colors hover:border-emerald-500/30 ${
        compact ? 'px-4 py-3.5' : 'px-4 py-4 sm:px-6 sm:py-4'
      }`}
    >
      <div className="flex items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
            <Quote className="w-5 h-5" />
          </div>

          <div className="min-w-0 flex-1 text-right">
            <div className="flex items-center gap-2 text-xs text-slate-400 mb-0.5">
              <span className="font-semibold text-emerald-400">عبارة اليوم</span>
              <span aria-hidden="true">·</span>
              <span>{quote.category}</span>
              {quote.author && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{quote.author}</span>
                </>
              )}
            </div>

            <p
              className={`${
                compact ? 'text-xs sm:text-sm' : 'text-sm sm:text-base'
              } font-bold text-slate-100 leading-relaxed`}
            >
              {quote.text}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
