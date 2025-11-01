import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Droplet, Sprout, Clock, Activity } from "lucide-react";
import { useNavigate } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import ChatBot from "@/components/ChatBot";
import AIRecommendations from "@/components/AIRecommendations";
import WeatherWidget from "@/components/WeatherWidget";
import AlertsPanel from "@/components/AlertsPanel";
import CropSelector from "@/components/CropSelector";
import HealthScore from "@/components/HealthScore";
import HealthScoreChart from "@/components/HealthScoreChart";
import Onboarding from "@/components/Onboarding";

const Index = () => {
  const navigate = useNavigate();
  const [moistureLevel, setMoistureLevel] = useState<number | null>(null);
  const [fertilityLevel, setFertilityLevel] = useState<number | null>(null);
  const [nextSchedule, setNextSchedule] = useState<string | null>(null);
  const [selectedCrop, setSelectedCrop] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    checkOnboarding();
    fetchDashboardData();
  }, [selectedCrop]);

  const checkOnboarding = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("user_preferences")
      .select("onboarding_completed")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!data) {
      setShowOnboarding(true);
    }
  };

  const fetchDashboardData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Fetch latest moisture reading
    const moistureQuery = supabase
      .from("moisture_readings")
      .select("moisture_level")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1);
    
    if (selectedCrop) moistureQuery.eq("crop_id", selectedCrop);
    
    const { data: moistureData } = await moistureQuery.single();
    if (moistureData) setMoistureLevel(moistureData.moisture_level);

    // Fetch latest fertility reading
    const fertilityQuery = supabase
      .from("fertility_readings")
      .select("overall_fertility")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1);
    
    if (selectedCrop) fertilityQuery.eq("crop_id", selectedCrop);
    
    const { data: fertilityData } = await fertilityQuery.single();
    if (fertilityData) setFertilityLevel(fertilityData.overall_fertility);

    // Fetch next schedule
    const { data: scheduleData } = await supabase
      .from("watering_schedules")
      .select("time_of_day, title")
      .eq("user_id", user.id)
      .eq("is_enabled", true)
      .limit(1)
      .single();

    if (scheduleData) {
      setNextSchedule(`${scheduleData.title} at ${scheduleData.time_of_day}`);
    }
  };

  const getStatusColor = (level: number | null) => {
    if (level === null) return "text-muted-foreground";
    if (level < 30) return "text-destructive";
    if (level < 60) return "text-accent";
    return "text-primary";
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="bg-primary text-primary-foreground p-6 shadow-lg">
        <h1 className="text-3xl font-bold">AgroEye</h1>
        <p className="text-sm opacity-90">Monitor your crops in real-time</p>
      </header>

      <main className="p-4 space-y-6 max-w-lg mx-auto">
        {/* Crop Selector */}
        <CropSelector value={selectedCrop || undefined} onChange={setSelectedCrop} />

        {/* AI Recommendations */}
        <AIRecommendations />

        {/* Alerts Panel */}
        <AlertsPanel />

        {/* Weather Widget */}
        <WeatherWidget />

        {/* Health Score */}
        <HealthScore cropId={selectedCrop} />
        
        <HealthScoreChart cropId={selectedCrop} />

        <div className="grid grid-cols-1 gap-4">
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/moisture")}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Soil Moisture</CardTitle>
              <Droplet className={getStatusColor(moistureLevel)} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {moistureLevel !== null ? `${moistureLevel}%` : "No data"}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {moistureLevel !== null
                  ? moistureLevel < 30
                    ? "Low - Water needed"
                    : moistureLevel < 60
                    ? "Moderate"
                    : "Optimal"
                  : "Add your first reading"}
              </p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/fertility")}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Soil Fertility</CardTitle>
              <Sprout className={getStatusColor(fertilityLevel)} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {fertilityLevel !== null ? `${fertilityLevel}%` : "No data"}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {fertilityLevel !== null
                  ? fertilityLevel < 40
                    ? "Low - Fertilize soon"
                    : fertilityLevel < 70
                    ? "Moderate"
                    : "Good"
                  : "Add your first reading"}
              </p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/schedule")}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Next Watering</CardTitle>
              <Clock className="text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-semibold">
                {nextSchedule || "No schedule set"}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Tap to manage schedules
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button className="w-full" onClick={() => navigate("/moisture")}>
              Add Moisture Reading
            </Button>
            <Button className="w-full" variant="secondary" onClick={() => navigate("/fertility")}>
              Log Fertility Data
            </Button>
          </CardContent>
        </Card>
      </main>

      <BottomNav />
      <ChatBot />
      
      <Onboarding
        open={showOnboarding}
        onComplete={() => setShowOnboarding(false)}
      />
    </div>
  );
};

export default Index;
