import { X } from 'lucide-react';
import type { TransferPlayer } from '../data/transferData';
import { PlayerSummaryCards } from './comparison/PlayerSummaryCards';
import { ComparisonRadarChart } from './comparison/ComparisonRadarChart';
import { EfficiencyUsageScatter } from './comparison/EfficiencyUsageScatter';
import { ShotProfileComparison } from './comparison/ShotProfileComparison';
import { AdvancedImpactBars } from './comparison/AdvancedImpactBars';
import { PerformanceTrendChart } from './comparison/PerformanceTrendChart';

interface PlayerComparisonModalProps {
  players: TransferPlayer[];
  onClose: () => void;
}

export function PlayerComparisonModal({ players, onClose }: PlayerComparisonModalProps) {
  if (players.length < 2) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 overflow-y-auto">
      <div className="min-h-screen px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-gradient-to-r from-primary to-[#005587] rounded-t-lg px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-lg">
            <div>
              <h2 className="text-2xl text-white mb-1">Player Comparison Dashboard</h2>
              <p className="text-white/80 text-sm">
                Advanced Analytics & Performance Metrics
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-6 h-6 text-white" />
            </button>
          </div>

          <div className="bg-gray-900 rounded-b-lg p-6 space-y-6">
            <PlayerSummaryCards players={players} />
            <ComparisonRadarChart players={players} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <EfficiencyUsageScatter players={players} />
              <AdvancedImpactBars players={players} />
            </div>
            <ShotProfileComparison players={players} />
            <PerformanceTrendChart players={players} />
          </div>
        </div>
      </div>
    </div>
  );
}
