import type { TransferPlayer } from '../../data/transferData';

interface PlayerSummaryCardsProps {
  players: TransferPlayer[];
}

export function PlayerSummaryCards({ players }: PlayerSummaryCardsProps) {
  const playerColors = ['#2D68C4', '#FFD100', '#8BB8E8'];

  const calculateTrueShootingPct = (player: TransferPlayer) => {
    const pts = player.stats.ppg;
    const fga = pts / (player.stats.fgPercentage / 100) || 1;
    const fta = pts / 5;
    return (((pts / (2 * (fga + 0.44 * fta))) * 100) || 0).toFixed(2);
  };

  const calculateUsagePct = (player: TransferPlayer) => {
    const mpg = player.stats.minutesPerGame || 1;
    return ((player.stats.ppg / mpg) * 20).toFixed(2);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {players.map((player, index) => (
        <div
          key={player.id}
          className="bg-gray-800 rounded-lg overflow-hidden border-2 shadow-lg hover:shadow-xl transition-shadow"
          style={{ borderColor: playerColors[index] }}
        >
          <div
            className="h-2"
            style={{ backgroundColor: playerColors[index] }}
          />
          <div className="p-5">
            <div className="mb-4">
              <h3 className="text-xl text-white mb-1">{player.name}</h3>
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <span className="px-2 py-0.5 bg-gray-700 rounded text-white">
                  {player.position}
                </span>
                <span>{player.previousSchool}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-400 mt-2">
                <span>{player.height}</span>
                <span>•</span>
                <span>{player.year}</span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-4 pb-4 border-b border-gray-700">
              <div>
                <div className="text-xs text-gray-500 mb-1">PPG</div>
                <div className="text-lg text-white">{player.stats.ppg.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">RPG</div>
                <div className="text-lg text-white">{player.stats.rpg.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">APG</div>
                <div className="text-lg text-white">{player.stats.apg.toFixed(2)}</div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">True Shooting %</span>
                <span className="text-white">{calculateTrueShootingPct(player)}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Usage Rate</span>
                <span className="text-white">{calculateUsagePct(player)}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">FG%</span>
                <span className="text-white">{player.stats.fgPercentage.toFixed(2)}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Minutes/Game</span>
                <span className="text-white">{player.stats.minutesPerGame.toFixed(2)}</span>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-700">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-900 rounded p-2">
                  <div className="text-xs text-gray-500 mb-1">Games Played</div>
                  <div className="text-lg text-white">{player.stats.gamesPlayed}</div>
                </div>
                <div className="bg-gray-900 rounded p-2">
                  <div className="text-xs text-gray-500 mb-1">3PT%</div>
                  <div className="text-lg text-white">
                    {player.stats.threePointPercentage > 0
                      ? `${player.stats.threePointPercentage.toFixed(2)}%`
                      : 'N/A'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
