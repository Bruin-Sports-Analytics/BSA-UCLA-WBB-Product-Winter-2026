import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { TransferPlayer } from '@/app/data/transferData';

interface DefensiveStatsChartProps {
  players: TransferPlayer[];
}

export function DefensiveStatsChart({ players }: DefensiveStatsChartProps) {
  const data = players.map((player) => ({
    name: player.name.split(' ')[1] || player.name,
    Steals: player.stats.spg,
    Blocks: player.stats.bpg,
    'Def Rating': Number(
      ((player.stats.spg + player.stats.bpg + player.stats.rpg) / 3).toFixed(2)
    ),
  }));

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground mb-4">Defensive Impact Analysis</h3>
      {data.length === 0 ? (
        <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">No data</div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#8a9bb5' }} axisLine={{ stroke: 'rgba(255,255,255,0.08)' }} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#8a9bb5' }} axisLine={{ stroke: 'rgba(255,255,255,0.08)' }} tickLine={false} />
            <Tooltip contentStyle={{ backgroundColor: '#1c2d3f', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#e8edf2' }} />
            <Legend wrapperStyle={{ fontSize: 11, color: '#8a9bb5' }} />
            <Line type="monotone" dataKey="Steals" stroke="#FFD100" strokeWidth={2} dot={{ r: 4, fill: '#FFD100' }} activeDot={{ r: 6 }} />
            <Line type="monotone" dataKey="Blocks" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4, fill: '#3b82f6' }} activeDot={{ r: 6 }} />
            <Line type="monotone" dataKey="Def Rating" stroke="#8BB8E8" strokeWidth={2} dot={{ r: 4, fill: '#8BB8E8' }} activeDot={{ r: 6 }} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
