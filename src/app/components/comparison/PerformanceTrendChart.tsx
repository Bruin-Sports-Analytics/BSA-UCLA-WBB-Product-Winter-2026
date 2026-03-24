import { useState } from 'react';
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
import type { TransferPlayer } from '../../data/transferData';

interface PerformanceTrendChartProps {
  players: TransferPlayer[];
}

const metricLabels: Record<string, string> = {
  ppg: 'Points Per Game',
  rpg: 'Rebounds Per Game',
  apg: 'Assists Per Game',
  fg: 'Field Goal %',
};

export function PerformanceTrendChart({ players }: PerformanceTrendChartProps) {
  const playerColors = ['#2D68C4', '#FFD100', '#8BB8E8'];
  const [metric, setMetric] = useState<'ppg' | 'rpg' | 'apg' | 'fg'>('ppg');

  const generateTrendData = (player: TransferPlayer) => {
    const baseValue = {
      ppg: player.stats.ppg,
      rpg: player.stats.rpg,
      apg: player.stats.apg,
      fg: player.stats.fgPercentage,
    }[metric];

    return Array.from({ length: 15 }, () => {
      const variance = (Math.random() - 0.5) * 0.3 * baseValue;
      return Math.max(0, baseValue + variance);
    });
  };

  const data = Array.from({ length: 15 }, (_, i) => {
    const gameData: Record<string, string | number> = { game: i + 1 };
    players.forEach((player) => {
      const trendData = generateTrendData(player);
      gameData[player.name] = parseFloat(trendData[i].toFixed(1));
    });
    return gameData;
  });

  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
        <div>
          <h3 className="text-xl text-white mb-1">Performance Trend (Last 15 Games)</h3>
          <p className="text-sm text-gray-400">
            Track player performance consistency over recent games
          </p>
        </div>
        <div className="flex gap-2">
          {(Object.keys(metricLabels) as Array<'ppg' | 'rpg' | 'apg' | 'fg'>).map((m) => (
            <button
              key={m}
              onClick={() => setMetric(m)}
              className={`px-3 py-1.5 rounded text-sm transition-colors ${
                metric === m
                  ? 'bg-primary text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {m.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={350}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis
            dataKey="game"
            tick={{ fill: '#9CA3AF', fontSize: 12 }}
            label={{ value: 'Game Number', position: 'bottom', fill: '#9CA3AF', fontSize: 12 }}
          />
          <YAxis
            tick={{ fill: '#9CA3AF', fontSize: 12 }}
            label={{
              value: metricLabels[metric],
              angle: -90,
              position: 'insideLeft',
              fill: '#9CA3AF',
              fontSize: 12,
            }}
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
            <Line
              key={player.id}
              type="monotone"
              dataKey={player.name}
              stroke={playerColors[index]}
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
