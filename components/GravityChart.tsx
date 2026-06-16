
import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { Reading, FermentationEvent } from '../types';

interface GravityChartProps {
  data: Reading[];
  og?: number;
  fg?: number;
  events?: FermentationEvent[];
}

export const GravityChart: React.FC<GravityChartProps> = ({ data, og, fg, events = [] }) => {
  if (!data || data.length === 0) return null;

  // Calculate domain to ensure OG and FG are visible
  const dataMin = Math.min(...data.map(d => d.gravity));
  const dataMax = Math.max(...data.map(d => d.gravity));
  
  // Extend domain to include targets if they exist
  const finalMin = fg ? Math.min(dataMin, fg) : dataMin;
  const finalMax = og ? Math.max(dataMax, og) : dataMax;

  // Map events to chart data points
  const eventMarks = events.map(event => {
    const eventTime = new Date(event.timestamp).getTime();
    const closest = data.reduce((prev, curr) => {
      return Math.abs(new Date(curr.timestamp).getTime() - eventTime) < 
             Math.abs(new Date(prev.timestamp).getTime() - eventTime) ? curr : prev;
    }, data[0]);
    return { ...event, markTime: closest?.timestamp };
  }).filter(e => e.markTime);

  return (
    <div className="w-full bg-neutral-900/30 p-8 rounded-3xl border border-neutral-800 backdrop-blur-sm overflow-hidden">
      <h3 className="text-neutral-500 font-bold mb-6 text-xs uppercase tracking-widest pl-2">Curva de Atenuação (Gravidade)</h3>
      {/* Fixed height container for Recharts */}
      <div className="w-full h-[350px]">
        <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorGravity" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2}/>
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--color-neutral-700))" vertical={false} strokeWidth={0.5} opacity={0.5} />
            <XAxis 
               dataKey="timestamp" 
               tickFormatter={(str) => new Date(str).toLocaleDateString(undefined, {day: '2-digit', month:'2-digit'})}
               stroke="rgb(var(--color-neutral-600))"
               fontSize={11}
               tickLine={false}
               axisLine={false}
               dy={10}
            />
            <YAxis 
              stroke="rgb(var(--color-neutral-600))" 
              domain={[finalMin - 0.002, finalMax + 0.002]} 
              fontSize={11} 
              tickFormatter={(val) => val.toFixed(3)} 
              tickLine={false}
              axisLine={false}
              dx={-10}
            />
            <Tooltip 
              contentStyle={{ backgroundColor: 'rgb(var(--color-neutral-900))', borderColor: 'rgb(var(--color-neutral-700))', color: 'rgb(var(--color-neutral-100))', borderRadius: '16px', padding: '12px' }}
              itemStyle={{ color: 'rgb(var(--color-neutral-300))', fontSize: '12px', paddingBottom: '4px' }}
              labelStyle={{ color: 'rgb(var(--color-neutral-400))', fontSize: '10px', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}
              labelFormatter={(label) => new Date(label).toLocaleString()}
              formatter={(value: number) => [value.toFixed(3), 'SG']}
              cursor={{ stroke: 'rgb(var(--color-neutral-600))', strokeWidth: 0.5, strokeDasharray: '4 4' }}
            />
            <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }} iconType="circle" />
            
            {og && (
              <ReferenceLine 
                  y={og} 
                  stroke="rgb(var(--color-neutral-500))" 
                  strokeDasharray="3 3" 
                  strokeWidth={1}
                  label={{ position: 'insideTopRight', value: `OG: ${og.toFixed(3)}`, fill: 'rgb(var(--color-neutral-500))', fontSize: 10, fontWeight: 600 }} 
              />
            )}
            {fg && (
              <ReferenceLine 
                  y={fg} 
                  stroke="rgb(var(--color-neutral-100))" 
                  strokeDasharray="3 3" 
                  strokeWidth={1}
                  label={{ position: 'insideBottomRight', value: `Meta FG: ${fg.toFixed(3)}`, fill: 'rgb(var(--color-neutral-100))', fontSize: 10, fontWeight: 600 }} 
              />
            )}

            {eventMarks.map(e => (
              <ReferenceLine 
                key={e.id}
                x={e.markTime}
                stroke="rgb(var(--color-neutral-400))"
                strokeWidth={1}
                label={{ 
                  value: e.type, 
                  position: 'insideTopLeft', 
                  fill: 'rgb(var(--color-neutral-100))', 
                  fontSize: 9, 
                  fontWeight: 'bold',
                  offset: 5,
                  style: { textTransform: 'uppercase' }
                }}
              />
            ))}

            <Area 
              type="linear" 
              dataKey="gravity" 
              name="Gravidade (SG)" 
              stroke="#8b5cf6" 
              fillOpacity={1} 
              fill="url(#colorGravity)" 
              strokeWidth={1.5}
              activeDot={{ r: 4, strokeWidth: 0, fill: '#8b5cf6' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
