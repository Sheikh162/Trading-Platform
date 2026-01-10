"use client"

interface SparklineProps {
    data: number[];
    color?: string;
    width?: number;
    height?: number;
}

export const Sparkline = ({ data, color = "#22c55e", width = 100, height = 32 }: SparklineProps) => {
    if (data.length < 2) return null;

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1; // FIX: Added || 1 to avoid division by zero
    
    const points = data.map((val, i) => {
        const x = (i / (data.length - 1)) * width;
        const y = height - ((val - min) / range) * height; 
        return `${x},${y}`;
    }).join(" ");

    return (
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
            <polyline
                fill="none"
                stroke={color}
                strokeWidth="2"
                points={points}
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
};