import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { TransferPlayer } from '../../data/transferData';

interface AdvancedImpactBarsProps {
  players: TransferPlayer[];
}

export function AdvancedImpactBars({ players }: AdvancedImpactBarsProps) {
  const playerColors = ['#2D68C4', '#FFD100', '#8BB8E8'];

  const calculateOffensiveImpact = (player: TransferPlayer) =>
    parseFloat(
      ((player.stats.ppg + player.stats.apg * 1.5 + player.stats.fgPercentage / 10) / 3).toFixed(1)
    );

  const calculateDefensiveImpact = (player: TransferPlayer) =>
    parseFloat(
      ((player.stats.spg + player.stats.bpg + player.stats.rpg / 2) * 2).toFixed(1)
    );

  const calculateOverallImpact = (player: TransferPlayer) =>
    parseFloat(
      ((calculateOffensiveImpact(player) + calculateDefensiveImpact(player)) / 2).toFixed(1)
    );

  const calculateNetRating = (player: TransferPlayer) =>
    parseFloat(
      ((player.stats.ppg - (20 - player.stats.fgPercentage / 5)) * 0.5).toFixed(1)
    );

  const data = [
    {
      metric: 'Offensive Impact',
      ...Object.fromEntries(players.map((p) => [p.name, calculateOffensiveImpact(p)])),
    },
    {
      metric: 'Defensive Impact',
      ...Object.fromEntries(players.map((p) => [p.name, calculateDefensiveImpact(p)])),
    },
    {
      metric: 'Overall Impact',
      ...Object.fromEntries(players.map((p) => [p.name, calculateOverallImpact(p)])),
    },
    {
      metric: 'Net Rating',
      ...Object.fromEntries(players.map((p) => [p.name, calculateNetRating(p)])),
    },
  ];

  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
      <h3 className="text-xl text-white mb-2">Advanced Impact Metrics</h3>
      <p className="text-sm text-gray-400 mb-4">
        Calculated impact scores across offensive and defensive categories
      </p>
      <ResponsiveContainer width="100%" height={350}>
        <BarChart data={data} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis type="number" tick={{ fill: '#9CA3AF', fontSize: 12 }} />
          <YAxis
            dataKey="metric"
            type="category"
            tick={{ fill: '#9CA3AF', fontSize: 12 }}
            width={130}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1F2937',
              border: '1px solid #374151',
              borderRadius: '8px',
              color: '#fff',
            }}
          />
          <Legend wrapperStyle={{ color: '#fff' }} />
          {players.map((player, index) => (
            <Bar
              key={player.id}
              dataKey={player.name}
              fill={playerColors[index]}
              radius={[0, 4, 4, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
