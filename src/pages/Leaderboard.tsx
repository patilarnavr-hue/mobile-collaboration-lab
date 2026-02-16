import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Trophy, Medal, Star, Flame, ArrowLeft, Award } from "lucide-react";
import { useNavigate } from "react-router-dom";
import BottomNav from "@/components/BottomNav";

interface FarmerRank {
  user_id: string;
  total_xp: number;
  level: number;
  streak_days: number;
  display_name: string;
}

interface Achievement {
  achievement_key: string;
  achievement_name: string;
  description: string | null;
  icon: string | null;
  xp_reward: number;
  earned_at: string;
}

const ACHIEVEMENT_DEFS = [
  { key: "first_reading", name: "First Step", desc: "Record your first moisture reading", icon: "💧", xp: 10 },
  { key: "ten_readings", name: "Data Collector", desc: "Record 10 moisture readings", icon: "📊", xp: 50 },
  { key: "first_crop", name: "Seed Sower", desc: "Add your first crop", icon: "🌱", xp: 15 },
  { key: "five_crops", name: "Crop Master", desc: "Manage 5 different crops", icon: "🌾", xp: 75 },
  { key: "first_sensor", name: "Tech Farmer", desc: "Connect your first IoT sensor", icon: "📡", xp: 25 },
  { key: "seven_day_streak", name: "Consistent Farmer", desc: "Log data for 7 consecutive days", icon: "🔥", xp: 100 },
  { key: "first_fertility", name: "Soil Scientist", desc: "Log your first fertility reading", icon: "🧪", xp: 10 },
  { key: "first_plot", name: "Land Mapper", desc: "Map your first farmland plot", icon: "🗺️", xp: 20 },
  { key: "pest_detector", name: "Pest Detective", desc: "Use pest detection feature", icon: "🔍", xp: 30 },
  { key: "yield_forecaster", name: "Future Farmer", desc: "Generate a yield prediction", icon: "📈", xp: 30 },
];

const getLevelInfo = (xp: number) => {
  const level = Math.floor(xp / 100) + 1;
  const xpInLevel = xp % 100;
  const xpForNext = 100;
  return { level, xpInLevel, xpForNext, title: getLevelTitle(level) };
};

const getLevelTitle = (level: number) => {
  if (level >= 20) return "Legendary Farmer";
  if (level >= 15) return "Master Cultivator";
  if (level >= 10) return "Expert Grower";
  if (level >= 7) return "Skilled Farmer";
  if (level >= 5) return "Rising Farmer";
  if (level >= 3) return "Apprentice";
  return "Seedling";
};

const getRankIcon = (index: number) => {
  if (index === 0) return <Trophy className="w-6 h-6 text-yellow-500" />;
  if (index === 1) return <Medal className="w-6 h-6 text-gray-400" />;
  if (index === 2) return <Medal className="w-6 h-6 text-amber-700" />;
  return <Star className="w-5 h-5 text-muted-foreground" />;
};

const Leaderboard = () => {
  const navigate = useNavigate();
  const [leaderboard, setLeaderboard] = useState<FarmerRank[]>([]);
  const [myXp, setMyXp] = useState<{ total_xp: number; streak_days: number } | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [myUserId, setMyUserId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setMyUserId(user.id);

    // Ensure XP row exists
    const { data: existingXp } = await supabase.from("farmer_xp").select("*").eq("user_id", user.id).maybeSingle();
    if (!existingXp) {
      await supabase.from("farmer_xp").insert({ user_id: user.id, total_xp: 0, level: 1 });
    }

    // Check and award achievements
    await checkAchievements(user.id);

    // Load leaderboard
    const { data: xpData } = await supabase
      .from("farmer_xp")
      .select("user_id, total_xp, level, streak_days")
      .order("total_xp", { ascending: false })
      .limit(50);

    if (xpData) {
      // Get display names
      const userIds = xpData.map((x) => x.user_id);
      const { data: profiles } = await supabase.from("profiles").select("id, full_name").in("id", userIds);
      const nameMap = new Map(profiles?.map((p) => [p.id, p.full_name || "Anonymous Farmer"]) || []);

      setLeaderboard(
        xpData.map((x) => ({
          ...x,
          display_name: nameMap.get(x.user_id) || "Anonymous Farmer",
        }))
      );
    }

    // Load my XP
    const { data: myData } = await supabase.from("farmer_xp").select("total_xp, streak_days").eq("user_id", user.id).single();
    if (myData) setMyXp(myData);

    // Load achievements
    const { data: achData } = await supabase
      .from("achievements")
      .select("*")
      .eq("user_id", user.id)
      .order("earned_at", { ascending: false });
    setAchievements((achData as Achievement[]) || []);
  };

  const checkAchievements = async (userId: string) => {
    const { data: existing } = await supabase.from("achievements").select("achievement_key").eq("user_id", userId);
    const earned = new Set(existing?.map((a) => a.achievement_key) || []);

    const toAward: typeof ACHIEVEMENT_DEFS = [];

    // Check conditions
    if (!earned.has("first_reading")) {
      const { count } = await supabase.from("moisture_readings").select("id", { count: "exact", head: true }).eq("user_id", userId);
      if (count && count >= 1) toAward.push(ACHIEVEMENT_DEFS.find((a) => a.key === "first_reading")!);
    }
    if (!earned.has("ten_readings")) {
      const { count } = await supabase.from("moisture_readings").select("id", { count: "exact", head: true }).eq("user_id", userId);
      if (count && count >= 10) toAward.push(ACHIEVEMENT_DEFS.find((a) => a.key === "ten_readings")!);
    }
    if (!earned.has("first_crop")) {
      const { count } = await supabase.from("crops").select("id", { count: "exact", head: true }).eq("user_id", userId);
      if (count && count >= 1) toAward.push(ACHIEVEMENT_DEFS.find((a) => a.key === "first_crop")!);
    }
    if (!earned.has("five_crops")) {
      const { count } = await supabase.from("crops").select("id", { count: "exact", head: true }).eq("user_id", userId);
      if (count && count >= 5) toAward.push(ACHIEVEMENT_DEFS.find((a) => a.key === "five_crops")!);
    }
    if (!earned.has("first_sensor")) {
      const { count } = await supabase.from("sensors").select("id", { count: "exact", head: true }).eq("user_id", userId);
      if (count && count >= 1) toAward.push(ACHIEVEMENT_DEFS.find((a) => a.key === "first_sensor")!);
    }
    if (!earned.has("first_fertility")) {
      const { count } = await supabase.from("fertility_readings").select("id", { count: "exact", head: true }).eq("user_id", userId);
      if (count && count >= 1) toAward.push(ACHIEVEMENT_DEFS.find((a) => a.key === "first_fertility")!);
    }
    if (!earned.has("first_plot")) {
      const { count } = await supabase.from("farmland_plots").select("id", { count: "exact", head: true }).eq("user_id", userId);
      if (count && count >= 1) toAward.push(ACHIEVEMENT_DEFS.find((a) => a.key === "first_plot")!);
    }

    // Award achievements
    let totalNewXp = 0;
    for (const ach of toAward) {
      await supabase.from("achievements").insert({
        user_id: userId,
        achievement_key: ach.key,
        achievement_name: ach.name,
        description: ach.desc,
        icon: ach.icon,
        xp_reward: ach.xp,
      });
      totalNewXp += ach.xp;
    }

    if (totalNewXp > 0) {
      const { data: currentXp } = await supabase.from("farmer_xp").select("total_xp").eq("user_id", userId).single();
      const newTotal = (currentXp?.total_xp || 0) + totalNewXp;
      await supabase.from("farmer_xp").update({
        total_xp: newTotal,
        level: Math.floor(newTotal / 100) + 1,
      }).eq("user_id", userId);
    }
  };

  const myRank = leaderboard.findIndex((r) => r.user_id === myUserId) + 1;
  const levelInfo = myXp ? getLevelInfo(myXp.total_xp) : null;

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="bg-primary text-primary-foreground p-6 shadow-lg">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="text-primary-foreground hover:bg-primary/80">
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <Trophy className="w-8 h-8" />
          <div>
            <h1 className="text-2xl font-bold">Leaderboard</h1>
            <p className="text-sm opacity-90">Compete & earn achievements</p>
          </div>
        </div>
      </header>

      <main className="p-4 space-y-4 max-w-lg mx-auto">
        {/* My Stats */}
        {levelInfo && (
          <Card className="bg-gradient-to-br from-primary/10 to-accent/10 border-primary/20">
            <CardContent className="pt-6">
              <div className="text-center space-y-3">
                <div className="text-4xl">🌾</div>
                <h2 className="text-xl font-bold">{levelInfo.title}</h2>
                <div className="flex items-center justify-center gap-2">
                  <Badge variant="default" className="text-lg px-3 py-1">
                    Level {levelInfo.level}
                  </Badge>
                  {myRank > 0 && (
                    <Badge variant="secondary" className="text-lg px-3 py-1">
                      Rank #{myRank}
                    </Badge>
                  )}
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>{myXp?.total_xp || 0} XP</span>
                    <span>{levelInfo.xpForNext} XP to next level</span>
                  </div>
                  <Progress value={(levelInfo.xpInLevel / levelInfo.xpForNext) * 100} className="h-3" />
                </div>
                {myXp && myXp.streak_days > 0 && (
                  <div className="flex items-center justify-center gap-1 text-sm">
                    <Flame className="w-4 h-4 text-orange-500" />
                    <span>{myXp.streak_days} day streak!</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Rankings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5" /> Top Farmers
            </CardTitle>
          </CardHeader>
          <CardContent>
            {leaderboard.length === 0 ? (
              <p className="text-center text-muted-foreground py-6">No farmers ranked yet. Start logging data to earn XP!</p>
            ) : (
              <div className="space-y-2">
                {leaderboard.map((farmer, i) => (
                  <div
                    key={farmer.user_id}
                    className={`flex items-center gap-3 p-3 rounded-lg ${farmer.user_id === myUserId ? "bg-primary/10 border border-primary/20" : "bg-muted"}`}
                  >
                    <div className="flex-shrink-0 w-8 text-center">{getRankIcon(i)}</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">
                        {farmer.display_name}
                        {farmer.user_id === myUserId && <span className="text-primary ml-1">(You)</span>}
                      </p>
                      <p className="text-xs text-muted-foreground">Level {farmer.level} • {getLevelTitle(farmer.level)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{farmer.total_xp}</p>
                      <p className="text-xs text-muted-foreground">XP</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Achievements */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5" /> Achievements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {ACHIEVEMENT_DEFS.map((def) => {
                const earned = achievements.find((a) => a.achievement_key === def.key);
                return (
                  <div
                    key={def.key}
                    className={`p-3 rounded-lg text-center space-y-1 ${earned ? "bg-primary/10 border border-primary/20" : "bg-muted opacity-50"}`}
                  >
                    <div className="text-2xl">{def.icon}</div>
                    <p className="text-xs font-bold">{def.name}</p>
                    <p className="text-[10px] text-muted-foreground">{def.desc}</p>
                    <Badge variant={earned ? "default" : "secondary"} className="text-[10px]">
                      {earned ? `+${def.xp} XP ✓` : `${def.xp} XP`}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </main>

      <BottomNav />
    </div>
  );
};

export default Leaderboard;
