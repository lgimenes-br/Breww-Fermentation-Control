
import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { Reading, FermentationEvent } from '../types';
import { EventLog } from './EventLog';

import { useSettings } from '../SettingsContext';

interface TemperatureChartProps {
  data: Reading[];
  events?: FermentationEvent[];
  onAddEvent?: (event: Omit<FermentationEvent, 'id'>) => void;
  onRemoveEvent?: (id: string) => void;
  className?: string;
  titleClassName?: string;
}

export const TemperatureChart: React.FC<TemperatureChartProps> = ({ data, events = [], onAddEvent, onRemoveEvent, className, titleClassName }) => {
  const { settings } = useSettings();
  // Map events to the closest data point's timestamp for alignment
  const eventMarks = events.map(event => {
    const eventTime = new Date(event.timestamp).getTime();
    const closest = data.reduce((prev, curr) => {
      return Math.abs(new Date(curr.timestamp).getTime() - eventTime) < 
             Math.abs(new Date(prev.timestamp).getTime() - eventTime) ? curr : prev;
    }, data[0]);
    return { ...event, markTime: closest?.timestamp };
  }).filter(e => e.markTime);

  return (
    <div className={className || "w-full bg-neutral-900/30 p-8 rounded-3xl border border-neutral-800 backdrop-blur-sm overflow-hidden"}>
      <h3 className={titleClassName || "text-neutral-500 font-bold mb-6 text-xs uppercase tracking-widest pl-2"}>Histórico de Temperatura</h3>
      {/* Fixed height container for Recharts */}
      <div className="w-full h-[350px]">
        <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
          <LineChart data={data}>
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
              domain={['auto', 'auto']} 
              fontSize={11} 
              unit="°" 
              tickLine={false}
              axisLine={false}
              dx={-10}
            />
            <Tooltip 
              contentStyle={{ backgroundColor: 'rgb(var(--color-neutral-900))', borderColor: 'rgb(var(--color-neutral-700))', color: 'rgb(var(--color-neutral-100))', borderRadius: '16px', padding: '12px' }}
              itemStyle={{ color: 'rgb(var(--color-neutral-300))', fontSize: '12px', paddingBottom: '4px' }}
              labelStyle={{ color: 'rgb(var(--color-neutral-400))', fontSize: '10px', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}
              labelFormatter={(label) => new Date(label).toLocaleString()}
              cursor={{ stroke: 'rgb(var(--color-neutral-600))', strokeWidth: 0.5, strokeDasharray: '4 4' }}
            />
            <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }} iconType="circle" />
            
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

            <Line 
              type="linear" 
              dataKey="beerTemp" 
              name={settings.sensor1Name} 
              stroke="rgb(var(--color-neutral-100))" 
              strokeWidth={1.5} 
              dot={false} 
              activeDot={{ r: 4, strokeWidth: 0, fill: 'rgb(var(--color-neutral-100))' }}
            />
            <Line 
              type="linear" 
              dataKey="targetTemp" 
              name="Set Point" 
              stroke="#22c55e" 
              strokeDasharray="4 4" 
              strokeWidth={1} 
              dot={false} 
            />
             <Line 
              type="linear" 
              dataKey="fridgeTemp" 
              name={settings.sensor2Name} 
              stroke="#3b82f6" 
              strokeWidth={1} 
              dot={false} 
              opacity={0.5}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {events && (
        <div className="mt-8 pt-6 border-t border-neutral-800/50 -mx-2">
           <div className="px-2">
             <EventLog events={events} onAddEvent={onAddEvent} onRemoveEvent={onRemoveEvent} />
           </div>
        </div>
      )}
    </div>
  );
};
