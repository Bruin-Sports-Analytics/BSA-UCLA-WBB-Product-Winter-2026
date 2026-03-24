import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import type { TransferPlayer } from '@/app/data/transferData';

interface PositionDistributionChartProps {
  players: TransferPlayer[];
}

function CustomTooltip({
  active,
  payload,
  total,
}: {
  active?: boolean;
  payload?: Array<{ payload?: { value: number }; name?: string; value?: number }>;
  total: number;
}) {
  if (active && payload && payload.length) {
    const value = payload[0].value ?? payload[0].payload?.value ?? 0;
    const percentage = total ? ((value / total) * 100).toFixed(1) : '0';
    const name = payload[0].name ?? '';
    return (
      <div className="bg-card-elevated border border-border rounded-xl p-3 shadow-xl">
        <p className="font-semibold text-primary text-sm">{name}</p>
        <p className="text-xs text-muted-foreground mt-1">Players: <span className="text-foreground">{value}</span></p>
        <p className="text-xs text-muted-foreground">Percentage: <span className="text-foreground">{percentage}%</span></p>
      </div>
    );
  }
  return null;
}

export function PositionDistributionChart({ players }: PositionDistributionChartProps) {
  const positionCounts = players.reduce((acc, player) => {
    acc[player.position] = (acc[player.position] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const data = Object.entries(positionCounts).map(([position, count]) => ({
    name: position,
    value: count,
  }));

  const COLORS = ['#FFD100', '#3b82f6', '#8BB8E8', '#005587', '#FFC72C'];

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground mb-4">Position Distribution</h3>
      {data.length === 0 ? (
        <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">No data</div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip total={players.length} />} />
            <Legend wrapperStyle={{ fontSize: 11, color: '#8a9bb5' }} />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
