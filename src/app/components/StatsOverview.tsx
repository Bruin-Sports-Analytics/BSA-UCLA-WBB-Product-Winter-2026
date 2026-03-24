import type { TransferPlayer } from '@/app/data/transferData';
import { Goal, BrickWall, Forward, Award } from 'lucide-react';

interface StatsOverviewProps {
  players: TransferPlayer[];
}

export function StatsOverview({ players }: StatsOverviewProps) {
  if (players.length === 0) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {['Avg PPG', 'Avg RPG', 'Avg APG', 'Avg FG%'].map((label) => (
          <div
            key={label}
            className="bg-card border border-border rounded-xl p-5"
          >
            <p className="text-sm text-muted-foreground mb-1">{label}</p>
            <p className="text-2xl font-bold text-foreground">—</p>
          </div>
        ))}
      </div>
    );
  }

  const avgPPG = (
    players.reduce((sum, p) => sum + p.stats.ppg, 0) / players.length
  ).toFixed(2);
  const avgRPG = (
    players.reduce((sum, p) => sum + p.stats.rpg, 0) / players.length
  ).toFixed(2);
  const avgAPG = (
    players.reduce((sum, p) => sum + p.stats.apg, 0) / players.length
  ).toFixed(2);
  const avgFG = (
    players.reduce((sum, p) => sum + p.stats.fgPercentage, 0) / players.length
  ).toFixed(2);

  const stats = [
    { label: 'Avg PPG', value: avgPPG, icon: Goal, accent: 'from-yellow-500/20 to-transparent', iconColor: 'text-yellow-400' },
    { label: 'Avg RPG', value: avgRPG, icon: BrickWall, accent: 'from-blue-500/20 to-transparent', iconColor: 'text-blue-400' },
    { label: 'Avg APG', value: avgAPG, icon: Forward, accent: 'from-emerald-500/20 to-transparent', iconColor: 'text-emerald-400' },
    { label: 'Avg FG%', value: `${avgFG}%`, icon: Award, accent: 'from-purple-500/20 to-transparent', iconColor: 'text-purple-400' },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <div
            key={stat.label}
            className="relative overflow-hidden bg-card border border-border rounded-xl p-5 hover:border-border-highlight transition-colors"
          >
            <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl ${stat.accent} rounded-bl-full`} />
            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">{stat.label}</p>
                <p className="text-3xl font-bold text-foreground">{stat.value}</p>
              </div>
              <div className={`p-3 rounded-xl bg-card-elevated ${stat.iconColor}`}>
                <Icon className="w-5 h-5" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
