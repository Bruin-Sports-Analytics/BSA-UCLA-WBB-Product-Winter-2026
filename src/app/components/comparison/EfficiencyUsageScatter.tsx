import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Label,
  Cell,
} from 'recharts';
import type { TransferPlayer } from '../../data/transferData';

interface EfficiencyUsageScatterProps {
  players: TransferPlayer[];
}

export function EfficiencyUsageScatter({ players }: EfficiencyUsageScatterProps) {
  const playerColors = ['#2D68C4', '#FFD100', '#8BB8E8'];

  const calculateTrueShootingPct = (player: TransferPlayer) => {
    const pts = player.stats.ppg;
    const fga = pts / (player.stats.fgPercentage / 100) || 1;
    const fta = pts / 5;
    return (((pts / (2 * (fga + 0.44 * fta))) * 100) || 0);
  };

  const calculateUsagePct = (player: TransferPlayer) => {
    const mpg = player.stats.minutesPerGame || 1;
    return (player.stats.ppg / mpg) * 20;
  };

  const data = players.map((player, index) => ({
    name: player.name,
    usage: parseFloat(calculateUsagePct(player).toFixed(1)),
    ts: parseFloat(calculateTrueShootingPct(player).toFixed(1)),
    color: playerColors[index],
  }));

  const avgUsage = data.length ? data.reduce((sum, d) => sum + d.usage, 0) / data.length : 0;
  const avgTS = data.length ? data.reduce((sum, d) => sum + d.ts, 0) / data.length : 0;

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: { name: string; usage: number; ts: number } }> }) => {
    if (active && payload && payload.length) {
      const p = payload[0].payload;
      return (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 shadow-lg">
          <p className="font-medium text-white">{p.name}</p>
          <p className="text-sm text-gray-300">Usage: {p.usage}%</p>
          <p className="text-sm text-gray-300">TS%: {p.ts}%</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
      <h3 className="text-xl text-white mb-2">Efficiency vs Usage Rate</h3>
      <p className="text-sm text-gray-400 mb-4">
        True Shooting % vs Usage Rate (Reference lines show averages)
      </p>
      <ResponsiveContainer width="100%" height={350}>
        <ScatterChart margin={{ top: 20, right: 20, bottom: 40, left: 40 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis
            type="number"
            dataKey="usage"
            name="Usage %"
            tick={{ fill: '#9CA3AF', fontSize: 12 }}
            domain={['dataMin - 2', 'dataMax + 2']}
          >
            <Label
              value="Usage Rate %"
              position="bottom"
              style={{ fill: '#9CA3AF', fontSize: 12 }}
            />
          </XAxis>
          <YAxis
            type="number"
            dataKey="ts"
            name="True Shooting %"
            tick={{ fill: '#9CA3AF', fontSize: 12 }}
            domain={['dataMin - 5', 'dataMax + 5']}
          >
            <Label
              value="True Shooting %"
              angle={-90}
              position="insideLeft"
              style={{ fill: '#9CA3AF', fontSize: 12 }}
            />
          </YAxis>
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine
            x={avgUsage}
            stroke="#6B7280"
            strokeDasharray="3 3"
            label={{ value: 'Avg Usage', fill: '#9CA3AF', fontSize: 10 }}
          />
          <ReferenceLine
            y={avgTS}
            stroke="#6B7280"
            strokeDasharray="3 3"
            label={{ value: 'Avg TS%', fill: '#9CA3AF', fontSize: 10 }}
          />
          <Scatter name="Players" data={data} fill="#8884d8">
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
