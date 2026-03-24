import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { TransferPlayer } from '@/app/data/transferData';

interface PointsComparisonChartProps {
  players: TransferPlayer[];
}

export function PointsComparisonChart({ players }: PointsComparisonChartProps) {
  const data = players.map((player) => ({
    name: player.name.split(' ')[1] || player.name,
    PPG: player.stats.ppg,
    RPG: player.stats.rpg,
    APG: player.stats.apg,
  }));

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground mb-4">Points, Rebounds & Assists</h3>
      {data.length === 0 ? (
        <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">No data</div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#8a9bb5' }} axisLine={{ stroke: 'rgba(255,255,255,0.08)' }} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#8a9bb5' }} axisLine={{ stroke: 'rgba(255,255,255,0.08)' }} tickLine={false} />
            <Tooltip contentStyle={{ backgroundColor: '#1c2d3f', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#e8edf2' }} />
            <Legend wrapperStyle={{ fontSize: 11, color: '#8a9bb5' }} />
            <Bar dataKey="PPG" fill="#FFD100" radius={[4, 4, 0, 0]} />
            <Bar dataKey="RPG" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            <Bar dataKey="APG" fill="#8BB8E8" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
