import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ZAxis,
  Legend,
} from 'recharts';
import type { TransferPlayer } from '@/app/data/transferData';

interface StatsScatterChartProps {
  players: TransferPlayer[];
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: { name: string; ppg: number; efficiency: number; minutesPerGame: number } }> }) {
  if (active && payload && payload.length) {
    const p = payload[0].payload;
    return (
      <div className="bg-card-elevated border border-border rounded-xl p-3 shadow-xl">
        <p className="font-semibold text-primary text-sm">{p.name}</p>
        <p className="text-xs text-muted-foreground mt-1">PPG: <span className="text-foreground">{p.ppg}</span></p>
        <p className="text-xs text-muted-foreground">Efficiency: <span className="text-foreground">{p.efficiency}%</span></p>
        <p className="text-xs text-muted-foreground">MPG: <span className="text-foreground">{p.minutesPerGame}</span></p>
      </div>
    );
  }
  return null;
}

export function StatsScatterChart({ players }: StatsScatterChartProps) {
  const data = players.map((player) => {
    const eff =
      (player.stats.fgPercentage +
        player.stats.ftPercentage +
        (player.stats.threePointPercentage || 0)) /
      3;
    return {
      name: player.name,
      ppg: player.stats.ppg,
      efficiency: Number(eff.toFixed(1)),
      minutesPerGame: player.stats.minutesPerGame,
    };
  });

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground mb-1">PPG vs Shooting Efficiency</h3>
      <p className="text-xs text-muted-foreground mb-4">X: points per game · Bubble size: minutes per game</p>
      {data.length === 0 ? (
        <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">No data</div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <ScatterChart margin={{ bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis type="number" dataKey="ppg" name="Points Per Game" tick={{ fontSize: 11, fill: '#8a9bb5' }} axisLine={{ stroke: 'rgba(255,255,255,0.08)' }} tickLine={false} />
            <YAxis type="number" dataKey="efficiency" name="Efficiency" tick={{ fontSize: 11, fill: '#8a9bb5' }} axisLine={{ stroke: 'rgba(255,255,255,0.08)' }} tickLine={false} label={{ value: 'Shooting Efficiency %', angle: -90, position: 'insideLeft', fontSize: 11, fill: '#8a9bb5' }} />
            <ZAxis type="number" dataKey="minutesPerGame" range={[50, 400]} />
            <Tooltip content={<CustomTooltip />} />
            <Legend verticalAlign="bottom" wrapperStyle={{ fontSize: 11, color: '#8a9bb5', paddingTop: 8 }} />
            <Scatter name="Players" data={data} fill="#FFD100" fillOpacity={0.7} />
          </ScatterChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
