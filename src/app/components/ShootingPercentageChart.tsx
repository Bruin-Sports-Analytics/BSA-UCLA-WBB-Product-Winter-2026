import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import type { TransferPlayer } from '@/app/data/transferData';

interface ShootingPercentageChartProps {
  players: TransferPlayer[];
}

export function ShootingPercentageChart({ players }: ShootingPercentageChartProps) {
  const selectedPlayers = players.slice(0, 3);

  const data = [
    {
      metric: 'FG%',
      ...Object.fromEntries(
        selectedPlayers.map((p) => [p.name.split(' ')[1] || p.name, p.stats.fgPercentage])
      ),
    },
    {
      metric: '3PT%',
      ...Object.fromEntries(
        selectedPlayers.map((p) => [p.name.split(' ')[1] || p.name, p.stats.threePointPercentage || 0])
      ),
    },
    {
      metric: 'FT%',
      ...Object.fromEntries(
        selectedPlayers.map((p) => [p.name.split(' ')[1] || p.name, p.stats.ftPercentage])
      ),
    },
    {
      metric: 'PPG×5',
      ...Object.fromEntries(
        selectedPlayers.map((p) => [p.name.split(' ')[1] || p.name, p.stats.ppg * 5])
      ),
    },
    {
      metric: 'RPG×10',
      ...Object.fromEntries(
        selectedPlayers.map((p) => [p.name.split(' ')[1] || p.name, p.stats.rpg * 10])
      ),
    },
  ];

  const colors = ['#FFD100', '#3b82f6', '#8BB8E8'];

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground mb-4">Player Performance Radar</h3>
      {selectedPlayers.length === 0 ? (
        <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">Select players to compare</div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <RadarChart data={data}>
            <PolarGrid stroke="rgba(255,255,255,0.08)" />
            <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fill: '#8a9bb5' }} />
            <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 10, fill: '#8a9bb5' }} />
            <Tooltip contentStyle={{ backgroundColor: '#1c2d3f', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#e8edf2' }} />
            {selectedPlayers.map((player, index) => (
              <Radar
                key={player.id}
                name={player.name.split(' ')[1] || player.name}
                dataKey={player.name.split(' ')[1] || player.name}
                stroke={colors[index]}
                fill={colors[index]}
                fillOpacity={0.2}
              />
            ))}
            <Legend wrapperStyle={{ fontSize: 11, color: '#8a9bb5' }} />
          </RadarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
