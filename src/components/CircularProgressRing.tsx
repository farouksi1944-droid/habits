import React from 'react';

interface CircularProgressRingProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  label?: string;
  sublabel?: string;
}

export const CircularProgressRing: React.FC<CircularProgressRingProps> = ({
  percentage,
  size = 52,
  strokeWidth = 5,
  color = '#10b981',
  label,
  sublabel,
}) => {
  const clamped = Math.max(0, Math.min(100, Math.round(percentage)));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (clamped / 100) * circumference;

  return (
    <div
      className="relative inline-flex items-center justify-center shrink-0 select-none"
      style={{ width: size, height: size }}
      title={`${clamped}%`}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
      >
        {/* Track circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-slate-800"
        />

        {/* Progress arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-500 ease-out"
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        <span
          className="font-mono font-extrabold text-slate-100"
          style={{ fontSize: size >= 64 ? '0.85rem' : '0.68rem' }}
        >
          {label ?? `${clamped}%`}
        </span>
        {sublabel && (
          <span className="text-[9px] text-slate-400 mt-0.5">{sublabel}</span>
        )}
      </div>
    </div>
  );
};
