import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Medal, Target, Calendar, Filter, ChevronRight, Zap, TrendingUp, BarChart3, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { 
  revealUp, 
  staggerContainer, 
  premiumHover,
  scaleIn
} from '@/lib/motion-variants';
import LeaderboardCharts from './LeaderboardCharts';

// Configurable Weights
const EVENTS_WEIGHT = 10;
const REGS_WEIGHT = 1;

interface LeaderboardEntry {
  club_id: string;
  club_name: string;
  club_category: string;
  events_count: number;
  registrations_count: number;
  score: number;
  rank: number;
}

const LeaderboardSection = () => {
  const { user } = useAuth();
  const [categoryId, setCategoryId] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<'all' | 'weekly'>('all');
  const [showCharts, setShowCharts] = useState(false);

  // Fetch User's Profile to get their club_id
  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase.from('profiles').select('club_id').eq('user_id', user.id).single();
      if (error) return null;
      return data;
    },
    enabled: !!user
  });

  // Fetch Categories
  const { data: categories } = useQuery({
    queryKey: ['event-categories'],
    queryFn: async () => {
      const { data, error } = await supabase.from('event_categories').select('*');
      if (error) throw error;
      return data;
    }
  });

  // Calculate start date for weekly ranking
  const getStartDate = () => {
    if (timeRange === 'weekly') {
      const now = new Date();
      now.setDate(now.getDate() - 7);
      return now.toISOString();
    }
    return null;
  };

  // Fetch Leaderboard Data (Full Dataset)
  // Fetch exactly once per timeRange, removing categoryId from queryKey and RPC
  const { data: allLeaderboardData, isLoading, isFetching } = useQuery({
    queryKey: ['leaderboard', timeRange],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc('get_club_leaderboard', {
        p_category_id: null, // Always fetch "All Universe"
        p_start_date: getStartDate(),
        p_events_weight: EVENTS_WEIGHT,
        p_regs_weight: REGS_WEIGHT
      });
      if (error) throw error;
      return (data as any[] || []) as LeaderboardEntry[];
    },
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });

  // Derived visible dataset: Filtered on frontend for instant zero-flicker transitions
  const selectedCategoryName = useMemo(() => {
    if (categoryId === 'all') return 'all';
    return categories?.find(c => c.id === categoryId)?.name?.toLowerCase() || 'all';
  }, [categoryId, categories]);

  const visibleLeaderboard = useMemo(() => {
    if (!allLeaderboardData) return [];
    if (selectedCategoryName === 'all') return allLeaderboardData;
    
    return allLeaderboardData.filter(entry => {
      if (!entry.club_category) return false;
      const clubCat = entry.club_category.toLowerCase();
      
      // Mapping logic: Event Category UI Strings -> Club Category Database Strings
      if (clubCat.includes(selectedCategoryName)) return true;
      if (selectedCategoryName === 'technical' && (clubCat.includes('coding') || clubCat.includes('professional') || clubCat.includes('technical'))) return true;
      if (selectedCategoryName === 'cultural' && clubCat.includes('cultural')) return true;
      if (selectedCategoryName === 'business' && clubCat.includes('business')) return true;
      
      return false;
    });
  }, [allLeaderboardData, selectedCategoryName]);

  // Derived data: always computed from the filtered visible leaderboard
  const podium = useMemo(() => visibleLeaderboard.slice(0, 3) || [], [visibleLeaderboard]);
  const remaining = useMemo(() => visibleLeaderboard.slice(3, 20) || [], [visibleLeaderboard]);
  const userClubRank = useMemo(() => visibleLeaderboard.find(entry => entry.club_id === profile?.club_id), [visibleLeaderboard, profile?.club_id]);
  const mostActive = useMemo(() => visibleLeaderboard.length > 0 ? [...visibleLeaderboard].sort((a, b) => b.events_count - a.events_count)[0] : null, [visibleLeaderboard]);
  const mostParticipants = useMemo(() => visibleLeaderboard.length > 0 ? [...visibleLeaderboard].sort((a, b) => b.registrations_count - a.registrations_count)[0] : null, [visibleLeaderboard]);

  return (
    <section className="py-12 md:py-24 relative overflow-hidden" id="leaderboard">
      <div className="container relative z-10">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between mb-16 gap-8">
          <motion.div 
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={revealUp}
            className="space-y-4"
          >
            <div className="flex items-center gap-2 text-primary font-black uppercase tracking-[0.4em] text-xs">
              <Trophy className="h-4 w-4 fill-primary animate-pulse" /> Hall of Fame
            </div>
            <h2 className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tighter uppercase leading-none">CLUBS <span className="text-shimmer">ARENA</span></h2>
          </motion.div>

          <motion.div 
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={revealUp}
            className="flex flex-wrap items-center gap-3"
          >
            <Button 
              variant="outline" 
              className={`rounded-full border-border bg-secondary/30 px-6 h-12 font-black uppercase tracking-widest text-[10px] gap-2 transition-all duration-300 hover:bg-primary hover:text-black hover:border-primary ${showCharts ? 'bg-primary text-black border-primary shadow-glow-orange' : ''}`}
              onClick={() => setShowCharts(!showCharts)}
            >
              <BarChart3 className="h-4 w-4" /> {showCharts ? 'Hide Analytics' : 'Show Analytics'}
            </Button>
            
            <div className="flex bg-secondary/50 border border-border/50 rounded-full p-1">
              <button 
                onClick={() => setTimeRange('all')}
                className={`px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${timeRange === 'all' ? 'bg-foreground text-background shadow-lg' : 'text-muted-foreground hover:text-foreground'}`}
              >
                All Time
              </button>
              <button 
                onClick={() => setTimeRange('weekly')}
                className={`px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${timeRange === 'weekly' ? 'bg-foreground text-background shadow-lg' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Weekly
              </button>
            </div>
          </motion.div>
        </div>

        {/* Categories Tabs */}
        <motion.div 
          initial="initial"
          whileInView="animate"
          viewport={{ once: true }}
          variants={revealUp}
          className="mb-12 relative -mx-6 sm:mx-0 overflow-hidden"
        >
          <div className="overflow-x-auto overflow-y-hidden no-scrollbar relative z-10 snap-x snap-mandatory touch-pan-x px-6 sm:px-0">
            <div className="flex flex-nowrap gap-4 w-max pb-4">
            <button
              onClick={() => setCategoryId('all')}
              className={`pill-nav-item snap-start ${categoryId === 'all' ? 'pill-nav-item-active' : 'bg-secondary/40 border border-border/50'}`}
            >
              All Universe
            </button>
            {categories?.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategoryId(cat.id)}
                className={`pill-nav-item snap-start ${categoryId === cat.id ? 'pill-nav-item-active' : 'bg-secondary/40 border border-border/50'}`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
          {/* Gradient indicators for scroll */}
          <div className="absolute right-0 top-0 bottom-4 w-12 bg-gradient-to-l from-background to-transparent pointer-events-none z-30 pointer-events-none" />
          <div className="absolute left-0 top-0 bottom-4 w-12 bg-gradient-to-r from-background to-transparent pointer-events-none z-30 pointer-events-none" />
        </motion.div>

        {/* Subtle loading bar during category refetch */}
        {isFetching && (
          <div className="flex justify-center mb-6">
            <div className="h-0.5 w-32 bg-primary/20 rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full animate-pulse w-1/2" />
            </div>
          </div>
        )}

        <AnimatePresence mode="wait">
          {showCharts ? (
            <motion.div 
              key="charts"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <LeaderboardCharts data={allLeaderboardData || []} />
            </motion.div>
          ) : isLoading && !allLeaderboardData ? (
            <div key="skeleton" className="space-y-12">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-64 glass-morphism animate-pulse rounded-[2.5rem]" />
                ))}
              </div>
            </div>
          ) : (
            <div key="list" className="space-y-12">
              {visibleLeaderboard.length === 0 ? (
                <div className="py-24 text-center glass-card rounded-[2.5rem] border-dashed border-2 border-primary/20 bg-primary/5 flex flex-col items-center gap-6">
                  <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
                    <Target className="h-10 w-10 text-primary opacity-40" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xl font-bold uppercase tracking-tight text-white">No data found in this category</p>
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-50">Join the arena to start ranking</p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Podium View */}
              <motion.div 
                variants={staggerContainer}
                initial="initial"
                whileInView="animate"
                viewport={{ once: true }}
                className="grid grid-cols-1 md:grid-cols-3 gap-8 items-end"
              >
                {/* 2nd Place */}
                {podium[1] && (
                  <motion.div variants={revealUp} className="order-2 md:order-1 lg:mb-0 mb-8">
                    <div className="relative group transition-all duration-500 hover:scale-105">
                      <div className="absolute inset-0 bg-white/5 blur-[60px] group-hover:bg-white/10 transition-colors" />
                      <div className="relative border-2 border-white/10 bg-secondary/80 rounded-[3rem] p-4 sm:p-10 pt-16 md:pt-20 text-center shadow-2xl">
                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 h-20 w-20 rounded-full bg-slate-400 flex items-center justify-center text-3xl font-black text-black shadow-2xl border-4 border-background group-hover:animate-bounce">
                          2
                        </div>
                        <h3 className="text-3xl md:text-3xl font-black tracking-tighter mb-2 truncate uppercase text-white">{podium[1].club_name}</h3>
                        <p className="text-primary font-black text-xs uppercase tracking-widest mb-8">Silver Contender</p>
                        
                        <div className="grid grid-cols-2 gap-4 mb-8">
                          <div className="p-6 rounded-[2rem] bg-background border border-white/10 shadow-inner">
                            <p className="text-[10px] uppercase font-black text-muted-foreground mb-1">Score</p>
                            <p className="text-3xl font-black text-white">{Math.round(podium[1].score)}</p>
                          </div>
                          <div className="p-6 rounded-[2rem] bg-background border border-white/10 shadow-inner">
                            <p className="text-[10px] uppercase font-black text-muted-foreground mb-1">Rank</p>
                            <p className="text-3xl font-black text-white">#2</p>
                          </div>
                        </div>

                        <div className="flex justify-center gap-6 text-xs font-bold text-muted-foreground pt-4 border-t border-border/50">
                          <div className="flex items-center gap-1.5"><Calendar className="h-3 w-3" /> {podium[1].events_count}</div>
                          <div className="flex items-center gap-1.5"><Target className="h-3 w-3" /> {podium[1].registrations_count}</div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* 1st Place */}
                {podium[0] && (
                  <motion.div variants={revealUp} className="order-1 md:order-2 lg:mb-12 mb-8">
                    <div className="relative group transition-all duration-700 hover:scale-[1.03]">
                      <div className="absolute inset-0 bg-primary/20 blur-[120px] group-hover:bg-primary/30 transition-colors" />
                      <div className="relative border-4 border-primary/30 bg-secondary rounded-[3.5rem] p-4 sm:p-10 pt-24 text-center shadow-glow-orange ring-1 ring-primary/20">
                        <div className="absolute -top-12 left-1/2 -translate-x-1/2 h-24 w-24 rounded-full bg-primary flex items-center justify-center text-5xl font-black text-black shadow-glow-orange border-8 border-background group-hover:scale-110 transition-transform">
                          1
                        </div>
                        <h3 className="text-5xl md:text-6xl font-black tracking-[-0.06em] mb-2 truncate uppercase text-white leading-none">{podium[0].club_name}</h3>
                        <p className="text-primary font-black text-sm uppercase tracking-[0.4em] mb-10 text-glow-orange">Grand Champion</p>
                        
                        <div className="grid grid-cols-2 gap-3 sm:gap-6 mb-12">
                          <div className="p-4 sm:p-8 rounded-[2.5rem] bg-background border-2 border-primary/20 shadow-inner">
                            <p className="text-[10px] uppercase font-black text-primary/60 mb-1">Elite Score</p>
                            <p className="text-3xl sm:text-5xl font-black text-primary drop-shadow-sm">{Math.round(podium[0].score)}</p>
                          </div>
                          <div className="p-4 sm:p-8 rounded-[2.5rem] bg-background border-2 border-primary/20 shadow-inner">
                            <p className="text-[10px] uppercase font-black text-primary/60 mb-1">Events</p>
                            <p className="text-3xl sm:text-5xl font-black text-white">{podium[0].events_count}</p>
                          </div>
                        </div>

                        <div className="flex justify-between items-center px-4 py-4 rounded-2xl bg-primary/10 border border-primary/5">
                          <div className="flex items-center gap-2 text-primary font-black text-xs uppercase tracking-widest">
                            <Zap className="h-4 w-4" /> Leading the Era
                          </div>
                          <div className="text-primary font-black flex items-center gap-1">
                            <Target className="h-3 w-3" /> {podium[0].registrations_count}
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* 3rd Place */}
                {podium[2] && (
                  <motion.div variants={revealUp} className="order-3 lg:mb-0 mb-8">
                    <div className="relative group transition-all duration-500 hover:scale-105">
                      <div className="absolute inset-0 bg-amber-600/10 blur-[60px] group-hover:bg-amber-600/20 transition-colors" />
                      <div className="relative border-2 border-white/10 bg-secondary/80 rounded-[3rem] p-6 md:p-10 pt-16 md:pt-20 text-center shadow-2xl">
                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 h-20 w-20 rounded-full bg-amber-600 flex items-center justify-center text-3xl font-black text-black shadow-2xl border-4 border-background group-hover:animate-bounce">
                          3
                        </div>
                        <h3 className="text-3xl md:text-3xl font-black tracking-tighter mb-2 truncate uppercase text-white">{podium[2].club_name}</h3>
                        <p className="text-amber-500 font-bold text-[10px] uppercase tracking-widest mb-8 opacity-80">Bronze Titan</p>
                        
                        <div className="grid grid-cols-2 gap-3 md:gap-4 mb-8">
                          <div className="p-6 rounded-[2rem] bg-background border border-white/10 shadow-inner">
                            <p className="text-[10px] uppercase font-black text-muted-foreground mb-1">Score</p>
                            <p className="text-3xl font-black text-white">{Math.round(podium[2].score)}</p>
                          </div>
                          <div className="p-6 rounded-[2rem] bg-background border border-white/10 shadow-inner">
                            <p className="text-[10px] uppercase font-black text-muted-foreground mb-1">Rank</p>
                            <p className="text-3xl font-black text-white">#3</p>
                          </div>
                        </div>

                        <div className="flex justify-center gap-6 text-xs font-bold text-muted-foreground pt-4 border-t border-border/50">
                          <div className="flex items-center gap-1.5"><Calendar className="h-3 w-3" /> {podium[2].events_count}</div>
                          <div className="flex items-center gap-1.5"><Target className="h-3 w-3" /> {podium[2].registrations_count}</div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </motion.div>

              {/* Your Club Rank Highlight */}
              {userClubRank && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="max-w-5xl mx-auto mt-12 p-6 rounded-[2rem] bg-primary/10 border-2 border-primary/30 neon-glow-blue flex flex-col md:flex-row items-center justify-between gap-6"
                >
                  <div className="flex items-center gap-6">
                    <div className="h-16 w-16 rounded-2xl bg-primary flex items-center justify-center text-3xl font-black text-foreground shadow-glow">
                      {userClubRank.rank}
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em] mb-1">Your Club Standing</p>
                      <h4 className="text-2xl font-black uppercase tracking-tight">{userClubRank.club_name}</h4>
                    </div>
                  </div>
                  <div className="flex gap-8">
                    <div className="text-center">
                      <p className="text-[10px] font-black text-muted-foreground uppercase mb-1">Score</p>
                      <p className="text-2xl font-black text-primary">{Math.round(userClubRank.score)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] font-black text-muted-foreground uppercase mb-1">Events</p>
                      <p className="text-2xl font-black">{userClubRank.events_count}</p>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Badges Section */}
              <div className="max-w-5xl mx-auto mt-24 grid grid-cols-1 md:grid-cols-2 gap-6">
                {mostActive && (
                  <div className="p-6 glass-card rounded-3xl border border-border/50 flex items-center gap-6 group hover:neon-glow-green transition-all">
                    <div className="h-14 w-14 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform">
                      <Zap className="h-7 w-7 fill-emerald-500" />
                    </div>
                    <div>
                      <h5 className="font-black uppercase text-xs tracking-widest text-emerald-500">Most Active Club</h5>
                      <p className="font-bold text-lg">{mostActive.club_name}</p>
                    </div>
                  </div>
                )}
                {mostParticipants && (
                  <div className="p-6 glass-card rounded-3xl border border-border/50 flex items-center gap-6 group hover:neon-glow-magenta transition-all">
                    <div className="h-14 w-14 rounded-full bg-magenta-500/20 flex items-center justify-center text-magenta-500 group-hover:scale-110 transition-transform">
                      <Users className="h-7 w-7 fill-magenta-500" />
                    </div>
                    <div>
                      <h5 className="font-black uppercase text-xs tracking-widest text-magenta-500">Crowd Magnet</h5>
                      <p className="font-bold text-lg">{mostParticipants.club_name}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Remaining Rankings */}
              <motion.div 
                variants={staggerContainer}
                initial="initial"
                whileInView="animate"
                viewport={{ once: true }}
                className="space-y-4 max-w-5xl mx-auto mt-24"
              >
                {remaining.length > 0 && (
                  remaining.map((club, index) => (
                    <motion.div 
                      key={club.club_id} 
                      variants={revealUp}
                      className="group p-5 bg-secondary/40 border border-white/5 rounded-2xl hover:bg-secondary/70 transition-all hover:border-primary/30 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-6">
                        <div className="h-12 w-12 rounded-xl bg-background border border-white/10 flex items-center justify-center text-xl font-black text-white group-hover:bg-primary group-hover:text-black transition-all">
                          {index + 4}
                        </div>
                        <div>
                          <h4 className="font-black uppercase tracking-tight text-xl text-white group-hover:text-primary transition-colors">{club.club_name}</h4>
                          <Badge variant="outline" className="text-[9px] tracking-[0.2em] font-black uppercase text-primary border-primary/30 bg-primary/5 px-2 py-0.5 mt-1">
                            {club.club_category}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-12">
                        <div className="hidden md:flex gap-8 text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                          <div className="flex flex-col items-center">
                            <span className="opacity-50 mb-1">Events</span>
                            <span className="text-white text-xl">{club.events_count}</span>
                          </div>
                          <div className="flex flex-col items-center">
                            <span className="opacity-50 mb-1">Regs</span>
                            <span className="text-white text-xl">{club.registrations_count}</span>
                          </div>
                        </div>
                        <div className="text-right ml-4">
                          <p className="text-[9px] font-black text-muted-foreground uppercase mb-0.5 tracking-tighter opacity-50">Score Units</p>
                          <p className="text-4xl font-black text-primary tracking-tighter leading-none glow-text-orange">{Math.round(club.score)}</p>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-all group-hover:translate-x-1" />
                      </div>
                    </motion.div>
                  ))
                )}
              </motion.div>
              </>
            )}
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Background Decor */}
      <div className="absolute top-1/2 left-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[150px] -z-10" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-accent/5 rounded-full blur-[120px] -z-10" />
    </section>
  );
};

export default LeaderboardSection;
