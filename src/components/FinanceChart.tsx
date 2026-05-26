import React, { useState, useEffect, useRef } from 'react';
import { formatCurrency } from '../lib/utils';

interface ChartDataItem {
  name: string;
  amount: number;
  dateStr: string;
}

interface FinanceChartProps {
  data: ChartDataItem[];
}

export default function FinanceChart({ data }: FinanceChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 500, height: 260 });
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [touchPos, setTouchPos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        // Fallback to reasonable defaults if container element is hidden/temporarily collapsed
        setDimensions({
          width: rect.width > 0 ? rect.width : 500,
          height: rect.height > 0 ? rect.height : 260,
        });
      }
    };

    updateSize();

    const observer = new ResizeObserver((entries) => {
      if (!Array.isArray(entries) || !entries.length) return;
      const entry = entries[0];
      const width = entry.contentRect.width;
      const height = entry.contentRect.height;
      if (width > 0 && height > 0) {
        setDimensions({ width, height });
      }
    });

    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
    };
  }, []);

  const { width, height } = dimensions;

  // Chart configuration constants
  const paddingLeft = 16;
  const paddingRight = 16;
  const paddingTop = 32;
  const paddingBottom = 32;

  // Compute maximum amount to scale the Y-axis
  const maxVal = Math.max(...data.map((d) => d.amount), 0);
  const maxAmount = maxVal > 0 ? maxVal * 1.15 : 1000; // 15% head room, or $1,000 baseline if no data

  // Math helper functions
  const getX = (index: number) => {
    const totalPoints = data.length || 1;
    const availableWidth = width - paddingLeft - paddingRight;
    const steps = totalPoints > 1 ? totalPoints - 1 : 1;
    return paddingLeft + (index / steps) * availableWidth;
  };

  const getY = (amount: number) => {
    const availableHeight = height - paddingTop - paddingBottom;
    const ratio = Math.max(0, Math.min(1, amount / maxAmount));
    return height - paddingBottom - ratio * availableHeight;
  };

  // Generate path coordinates
  const points = data.map((d, i) => ({
    x: getX(i),
    y: getY(d.amount),
    item: d,
    index: i,
  }));

  // Coordinate string for outline path: M x0, y0 L x1, y1 ...
  let linePath = '';
  let fillPath = '';

  if (points.length > 0) {
    const startPoint = points[0];
    const endPoint = points[points.length - 1];
    
    // Draw continuous straight line segments
    linePath = `M ${startPoint.x} ${startPoint.y} ` + points.slice(1).map((p) => `L ${p.x} ${p.y}`).join(' ');
    
    // Create fill path closing at bottom boundary
    const bottomY = height - paddingBottom;
    fillPath = `${linePath} L ${endPoint.x} ${bottomY} L ${startPoint.x} ${bottomY} Z`;
  }

  // Handle local alignment for tooltips and hover trackers
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!containerRef.current || points.length === 0) return;
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Find the closest point index by X coordinate distance
    let closestIndex = 0;
    let minDistance = Infinity;

    points.forEach((p, index) => {
      const dist = Math.abs(p.x - mouseX);
      if (dist < minDistance) {
        minDistance = dist;
        closestIndex = index;
      }
    });

    setHoveredIndex(closestIndex);
    setTouchPos({ x: points[closestIndex].x, y: points[closestIndex].y });
  };

  const handleMouseLeave = () => {
    setHoveredIndex(null);
    setTouchPos(null);
  };

  // Generate grid coordinates
  const gridLines = [0, 0.25, 0.5, 0.75, 1].map((ratio) => {
    const amt = ratio * maxAmount;
    const y = getY(amt);
    return { amt, y };
  });

  const activeItem = hoveredIndex !== null ? data[hoveredIndex] : null;

  return (
    <div className="relative w-full h-full select-none" ref={containerRef}>
      {/* Absolute floating tooltip using pure CSS positioning to prevent React node tree insertion errors */}
      {hoveredIndex !== null && activeItem && touchPos && (
        <div 
          className="absolute z-30 pointer-events-none p-3 bg-white border border-zinc-200/80 rounded-xl shadow-xl space-y-1 transition-all duration-75 text-left"
          style={{
            left: `${Math.min(width - 150, Math.max(10, touchPos.x - 75))}px`,
            top: `${Math.max(5, touchPos.y - 75)}px`,
          }}
        >
          <div className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">
            {activeItem.name} • {new Date(activeItem.dateStr + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' })}
          </div>
          <div className="text-sm font-black text-zinc-950">
            {formatCurrency(activeItem.amount)}
          </div>
        </div>
      )}

      {/* SVG Canvas */}
      <svg 
        width="100%" 
        height="100%" 
        className="overflow-visible"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <defs>
          <linearGradient id="svgAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#991b1b" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#991b1b" stopOpacity="0.00" />
          </linearGradient>
          <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#b91c1c" />
            <stop offset="100%" stopColor="#991b1b" />
          </linearGradient>
        </defs>

        {/* Horizontal Dotted Grid Lines */}
        {gridLines.map((line, idx) => (
          <g key={idx} className="opacity-40">
            <line
              x1={paddingLeft}
              y1={line.y}
              x2={width - paddingRight}
              y2={line.y}
              stroke="#e4e4e7"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
            {/* Show value indicator on left edge */}
            {idx % 2 === 0 && line.amt > 0 && (
              <text
                x={paddingLeft + 4}
                y={line.y - 4}
                fill="#a1a1aa"
                fontSize="9"
                fontWeight="700"
                className="font-mono select-none pointer-events-none"
              >
                {formatCurrency(line.amt).replace(/,00/, '')}
              </text>
            )}
          </g>
        ))}

        {/* The Gradient Fill Path */}
        {fillPath && (
          <path
            d={fillPath}
            fill="url(#svgAreaGrad)"
            className="transition-all duration-300 ease-out"
          />
        )}

        {/* The Stroke Outline Path */}
        {linePath && (
          <path
            d={linePath}
            stroke="url(#lineGrad)"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            className="transition-all duration-300 ease-out"
          />
        )}

        {/* Vertical Tracker Guide Line */}
        {hoveredIndex !== null && touchPos && (
          <line
            x1={touchPos.x}
            y1={paddingTop}
            x2={touchPos.x}
            y2={height - paddingBottom}
            stroke="#991b1b"
            strokeWidth="1.5"
            strokeOpacity="0.3"
            strokeDasharray="3 3"
            className="pointer-events-none"
          />
        )}

        {/* Data points & Interactive Hover targets */}
        {points.map((p, idx) => {
          const isActive = hoveredIndex === idx;
          return (
            <g key={idx} className="group">
              {/* Highlight active circle on top of stroke */}
              {isActive && (
                <>
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r="8"
                    fill="#991b1b"
                    fillOpacity="0.25"
                    className="pointer-events-none animate-ping"
                  />
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r="5"
                    fill="#ffffff"
                    stroke="#991b1b"
                    strokeWidth="3"
                    className="pointer-events-none shadow"
                  />
                </>
              )}

              {/* Smaller dormant points */}
              {!isActive && p.item.amount > 0 && (
                <circle
                  cx={p.x}
                  cy={p.y}
                  r="3.5"
                  fill="#ffffff"
                  stroke="#991b1b"
                  strokeWidth="2"
                  className="pointer-events-none opacity-80"
                />
              )}

              {/* Day Labels Under the graph */}
              <text
                x={p.x}
                y={height - paddingBottom + 20}
                textAnchor="middle"
                fontSize="10"
                fontWeight={isActive ? "bold" : "medium"}
                fill={isActive ? "#991b1b" : "#71717a"}
                className="select-none font-sans transition-colors pointer-events-none"
              >
                {p.item.name}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
