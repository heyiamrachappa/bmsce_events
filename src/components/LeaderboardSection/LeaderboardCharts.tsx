import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LineChart, Line } from 'recharts';

interface LeaderboardData {
  club_name: string;
  score: number;
  events_count: number;
  registrations_count: number;
}

interface LeaderboardChartsProps {
  data: LeaderboardData[];
}

const LeaderboardCharts = ({ data }: LeaderboardChartsProps) => {
  const topData = data.slice(0, 10);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="glass-card p-4 border border-primary/20 bg-black/80 backdrop-blur-xl rounded-xl shadow-2xl">
          <p className="font-bold text-primary mb-2 uppercase tracking-wider">{label}</p>
          <div className="space-y-1 text-xs">
            <p className="text-foreground/80 flex justify-between gap-4">
              <span>Score:</span> <span className="font-mono text-primary">{payload[0].value}</span>
            </p>
            <p className="text-foreground/60 flex justify-between gap-4">
              <span>Events:</span> <span className="font-mono">{payload[0].payload.events_count}</span>
            </p>
            <p className="text-foreground/60 flex justify-between gap-4">
              <span>Participants:</span> <span className="font-mono">{payload[0].payload.registrations_count}</span>
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full mt-12 mb-12">
      {/* Bar Chart - Top Clubs Comparison */}
      <div className="glass-card p-8 rounded-[2rem] border border-white/5 relative overflow-hidden group hover:neon-glow-blue transition-all duration-500">
        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
          <BarChart width={40} height={40} data={[{v:1},{v:3},{v:2}]}>
            <Bar dataKey="v" fill="currentColor" />
          </BarChart>
        </div>
        <h3 className="text-xl font-black mb-8 uppercase tracking-widest flex items-center gap-3">
          <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
          Score Comparison
        </h3>
        <div className="h-[350px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={topData} margin={{ top: 20, right: 30, left: 0, bottom: 60 }}>
              <defs>
                <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={1} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
              <XAxis 
                dataKey="club_name" 
                angle={-45} 
                textAnchor="end" 
                interval={0} 
                height={60} 
                stroke="#666" 
                fontSize={10}
                fontWeight={700}
                tick={{ fill: '#888' }}
              />
              <YAxis stroke="#666" fontSize={10} fontWeight={700} tick={{ fill: '#888' }} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
              <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                {topData.map((_entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={index === 0 ? 'url(#barGradient)' : 'rgba(255,255,255,0.1)'}
                    className="hover:fill-primary/80 transition-all duration-300 cursor-pointer"
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Activity Growth Visualization (Simplified) */}
      <div className="glass-card p-8 rounded-[2rem] border border-white/5 relative overflow-hidden group hover:neon-glow-purple transition-all duration-500">
        <h3 className="text-xl font-black mb-8 uppercase tracking-widest flex items-center gap-3">
          <div className="h-2 w-2 rounded-full bg-accent animate-pulse" />
          Activity Distribution
        </h3>
        <div className="h-[350px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={topData} margin={{ top: 20, right: 30, left: 0, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
              <XAxis 
                dataKey="club_name" 
                angle={-45} 
                textAnchor="end" 
                interval={0} 
                height={60} 
                stroke="#666" 
                fontSize={10}
                fontWeight={700}
                tick={{ fill: '#888' }}
              />
              <YAxis stroke="#666" fontSize={10} fontWeight={700} tick={{ fill: '#888' }} />
              <Tooltip content={<CustomTooltip />} />
              <Line 
                type="monotone" 
                dataKey="registrations_count" 
                name="Registrations" 
                stroke="hsl(var(--accent))" 
                strokeWidth={3}
                dot={{ r: 4, fill: 'hsl(var(--accent))', strokeWidth: 2, stroke: '#000' }}
                activeDot={{ r: 8, strokeWidth: 0 }}
              />
              <Line 
                type="monotone" 
                dataKey="events_count" 
                name="Events" 
                stroke="hsl(var(--primary))" 
                strokeWidth={3}
                dot={{ r: 4, fill: 'hsl(var(--primary))', strokeWidth: 2, stroke: '#000' }}
                activeDot={{ r: 8, strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default LeaderboardCharts;
