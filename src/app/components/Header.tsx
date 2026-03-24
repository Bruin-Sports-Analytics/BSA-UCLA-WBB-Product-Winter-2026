import { Moon, Sun, Users } from 'lucide-react';

interface HeaderProps {
  playerCount: number;
  theme: 'dark' | 'light';
  onThemeToggle: () => void;
}

export function Header({ playerCount, theme, onThemeToggle }: HeaderProps) {
  return (
    <div className="relative overflow-hidden border-b border-border">
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(to right, var(--header-gradient-from), var(--header-gradient-via), var(--header-gradient-to))',
        }}
      />
      <div className="absolute inset-0" style={{ background: 'var(--header-glow)' }} />
      <div className="relative max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-1.5 h-8 bg-primary rounded-full" />
              <h1 className="text-3xl font-bold tracking-tight text-foreground">
                WBB Stats & Recruiting
              </h1>
            </div>
            <p className="text-muted-foreground text-sm ml-[1.125rem] tracking-wide uppercase">
              Dashboard
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onThemeToggle}
              type="button"
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              className="bg-card/70 backdrop-blur-sm rounded-xl px-4 py-3 border border-border-highlight text-foreground hover:bg-card transition-colors"
            >
              <span className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider">
                {theme === 'dark' ? <Sun className="w-4 h-4 text-primary" /> : <Moon className="w-4 h-4 text-primary" />}
                {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
              </span>
            </button>
            <div className="bg-card/60 backdrop-blur-sm rounded-xl px-6 py-4 border border-border-highlight">
              <div className="flex items-center gap-3">
                <Users className="w-7 h-7 text-primary" />
                <div>
                  <div className="text-2xl font-bold text-foreground">{playerCount}</div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider">Players</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
