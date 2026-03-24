import type { TransferPlayer } from '../../data/transferData';

interface ShotProfileComparisonProps {
  players: TransferPlayer[];
}

export function ShotProfileComparison({ players }: ShotProfileComparisonProps) {
  const playerColors = ['#2D68C4', '#FFD100', '#8BB8E8'];

  const getShotZones = (player: TransferPlayer) => {
    const threePointPct = player.stats.threePointPercentage || 0;
    const fgPct = player.stats.fgPercentage;
    return [
      { zone: 'Paint', frequency: 35, efficiency: fgPct + 5 },
      { zone: 'Mid-Range', frequency: 25, efficiency: fgPct - 8 },
      { zone: 'Corner 3', frequency: 15, efficiency: threePointPct > 0 ? threePointPct + 3 : 0 },
      { zone: 'Wing 3', frequency: 15, efficiency: threePointPct },
      { zone: 'Top 3', frequency: 10, efficiency: threePointPct > 0 ? threePointPct - 2 : 0 },
    ];
  };

  const getFrequencyColor = (frequency: number) => {
    if (frequency >= 30) return 'bg-red-500/80';
    if (frequency >= 20) return 'bg-orange-500/80';
    if (frequency >= 10) return 'bg-yellow-500/80';
    return 'bg-green-500/80';
  };

  const getEfficiencyColor = (efficiency: number) => {
    if (efficiency >= 50) return 'text-green-400';
    if (efficiency >= 40) return 'text-yellow-400';
    if (efficiency >= 30) return 'text-orange-400';
    return 'text-red-400';
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
      <h3 className="text-xl text-white mb-2">Shot Profile Analysis</h3>
      <p className="text-sm text-gray-400 mb-6">
        Shot distribution and efficiency by court zone
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {players.map((player, playerIndex) => {
          const zones = getShotZones(player);
          return (
            <div
              key={player.id}
              className="bg-gray-900 rounded-lg p-4 border-2"
              style={{ borderColor: playerColors[playerIndex] }}
            >
              <div className="mb-4">
                <h4 className="text-lg text-white mb-1">{player.name}</h4>
                <div className="text-sm text-gray-400">{player.position} • {player.previousSchool}</div>
              </div>
              <div className="relative bg-gray-950 rounded-lg p-4 mb-4" style={{ aspectRatio: '1' }}>
                <div className="absolute inset-4 border-2 border-gray-700 rounded-lg">
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-20 border-2 border-gray-700">
                    <div className={`absolute inset-0 ${getFrequencyColor(zones[0].frequency)}`} />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className={`text-xs font-bold ${getEfficiencyColor(zones[0].efficiency)}`}>
                        {zones[0].efficiency.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                  <div className="absolute bottom-20 left-1/2 -translate-x-1/2 w-24 h-12">
                    <div className={`${getFrequencyColor(zones[1].frequency)} rounded`} style={{ height: '100%', opacity: 0.8 }} />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className={`text-xs font-bold ${getEfficiencyColor(zones[1].efficiency)}`}>
                        {zones[1].efficiency.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                  <div className="absolute bottom-2 left-2 w-10 h-10 rounded-full border-2 border-gray-700">
                    <div className={`absolute inset-0 ${getFrequencyColor(zones[2].frequency)} rounded-full`} />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className={`text-xs font-bold ${getEfficiencyColor(zones[2].efficiency)}`}>
                        {zones[2].efficiency > 0 ? zones[2].efficiency.toFixed(0) : 'N/A'}
                      </span>
                    </div>
                  </div>
                  <div className="absolute bottom-2 right-2 w-10 h-10 rounded-full border-2 border-gray-700">
                    <div className={`absolute inset-0 ${getFrequencyColor(zones[2].frequency)} rounded-full`} />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className={`text-xs font-bold ${getEfficiencyColor(zones[2].efficiency)}`}>
                        {zones[2].efficiency > 0 ? zones[2].efficiency.toFixed(0) : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                {zones.map((zone) => (
                  <div
                    key={zone.zone}
                    className="flex justify-between items-center text-sm"
                  >
                    <span className="text-gray-400">{zone.zone}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-gray-300">{zone.frequency}% freq</span>
                      <span className={getEfficiencyColor(zone.efficiency)}>
                        {zone.efficiency > 0 ? `${zone.efficiency.toFixed(1)}%` : 'N/A'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
