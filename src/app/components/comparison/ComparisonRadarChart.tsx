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
import type { TransferPlayer } from '../../data/transferData';

interface ComparisonRadarChartProps {
  players: TransferPlayer[];
}

export function ComparisonRadarChart({ players }: ComparisonRadarChartProps) {
  const playerColors = ['#2D68C4', '#FFD100', '#8BB8E8'];

  const calculateMetrics = (player: TransferPlayer) => ({
    'Scoring': Math.min((player.stats.ppg / 25) * 100, 100),
    'Shot Creation': Math.min((player.stats.fgPercentage / 60) * 100, 100),
    'Playmaking': Math.min((player.stats.apg / 8) * 100, 100),
    'Defense': Math.min(((player.stats.spg + player.stats.bpg) / 3) * 100, 100),
    'Rebounding': Math.min((player.stats.rpg / 12) * 100, 100),
    'Efficiency': Math.min((player.stats.ftPercentage / 90) * 100, 100),
    'Three-Point': player.stats.threePointPercentage > 0
      ? Math.min((player.stats.threePointPercentage / 45) * 100, 100)
      : 0,
    'Minutes': Math.min((player.stats.minutesPerGame / 36) * 100, 100),
  });

  const metrics = Object.keys(calculateMetrics(players[0]));
  const data = metrics.map((metric) => {
    const dataPoint: Record<string, string | number> = { metric };
    players.forEach((player) => {
      const m = calculateMetrics(player);
      dataPoint[player.name] = m[metric as keyof typeof m];
    });
    return dataPoint;
  });

  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
      <h3 className="text-xl text-white mb-4">Multi-Dimensional Performance Analysis</h3>
      <p className="text-sm text-gray-400 mb-4">
        Normalized scores (0-100) across key performance categories
      </p>
      <ResponsiveContainer width="100%" height={400}>
        <RadarChart data={data}>
          <PolarGrid stroke="#374151" />
          <PolarAngleAxis
            dataKey="metric"
            tick={{ fill: '#9CA3AF', fontSize: 12 }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tick={{ fill: '#6B7280', fontSize: 10 }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1F2937',
              border: '1px solid #374151',
              borderRadius: '8px',
              color: '#fff',
            }}
          />
          {players.map((player, index) => (
            <Radar
              key={player.id}
              name={player.name}
              dataKey={player.name}
              stroke={playerColors[index]}
              fill={playerColors[index]}
              fillOpacity={0.25}
              strokeWidth={2}
            />
          ))}
          <Legend
            wrapperStyle={{ color: '#fff' }}
            iconType="circle"
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
