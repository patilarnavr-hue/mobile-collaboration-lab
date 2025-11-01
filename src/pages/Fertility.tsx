import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Sprout, Plus } from "lucide-react";
import { toast } from "sonner";
import BottomNav from "@/components/BottomNav";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import FertilityChart from "@/components/FertilityChart";
import EmptyState from "@/components/EmptyState";

interface FertilityReading {
  id: string;
  nitrogen_level: number | null;
  phosphorus_level: number | null;
  potassium_level: number | null;
  overall_fertility: number | null;
  notes: string | null;
  created_at: string;
}

const Fertility = () => {
  const [readings, setReadings] = useState<FertilityReading[]>([]);
  const [nitrogen, setNitrogen] = useState("");
  const [phosphorus, setPhosphorus] = useState("");
  const [potassium, setPotassium] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    fetchReadings();

    const channel = supabase
      .channel("fertility_readings_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "fertility_readings",
        },
        () => {
          fetchReadings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchReadings = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("fertility_readings")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      toast.error("Failed to fetch readings");
    } else {
      setReadings(data || []);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const n = parseFloat(nitrogen);
    const p = parseFloat(phosphorus);
    const k = parseFloat(potassium);

    const overall = ((n + p + k) / 3).toFixed(1);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("fertility_readings").insert({
      user_id: user.id,
      nitrogen_level: n,
      phosphorus_level: p,
      potassium_level: k,
      overall_fertility: parseFloat(overall),
      notes: notes || null,
    });

    if (error) {
      toast.error("Failed to add reading");
    } else {
      toast.success("Fertility data logged successfully");
      setNitrogen("");
      setPhosphorus("");
      setPotassium("");
      setNotes("");
      setDialogOpen(false);
    }
    setLoading(false);
  };

  const currentReading = readings[0];
  const overallLevel = currentReading?.overall_fertility || 0;

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="bg-primary text-primary-foreground p-6 shadow-lg">
        <div className="flex items-center gap-3">
          <Sprout className="w-8 h-8" />
          <div>
            <h1 className="text-2xl font-bold">Soil Fertility</h1>
            <p className="text-sm opacity-90">Track NPK levels</p>
          </div>
        </div>
      </header>

      <main className="p-4 space-y-4 max-w-lg mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Overall Fertility</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <div className="text-5xl font-bold text-primary">{overallLevel}%</div>
              <p className="text-muted-foreground mt-2">
                {overallLevel < 40 ? "Low - Fertilize soon" : overallLevel < 70 ? "Moderate" : "Good"}
              </p>
            </div>
            <Progress value={overallLevel} className="h-3" />
          </CardContent>
        </Card>

        {currentReading && (
          <Card>
            <CardHeader>
              <CardTitle>NPK Levels</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">Nitrogen (N)</span>
                  <span className="text-sm text-muted-foreground">{currentReading.nitrogen_level}%</span>
                </div>
                <Progress value={currentReading.nitrogen_level || 0} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">Phosphorus (P)</span>
                  <span className="text-sm text-muted-foreground">{currentReading.phosphorus_level}%</span>
                </div>
                <Progress value={currentReading.phosphorus_level || 0} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">Potassium (K)</span>
                  <span className="text-sm text-muted-foreground">{currentReading.potassium_level}%</span>
                </div>
                <Progress value={currentReading.potassium_level || 0} className="h-2" />
              </div>
            </CardContent>
          </Card>
        )}

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full" size="lg">
              <Plus className="w-5 h-5 mr-2" />
              Log Fertility Data
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Record Fertility Levels</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nitrogen">Nitrogen Level (%)</Label>
                <Input
                  id="nitrogen"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  placeholder="N level"
                  value={nitrogen}
                  onChange={(e) => setNitrogen(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phosphorus">Phosphorus Level (%)</Label>
                <Input
                  id="phosphorus"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  placeholder="P level"
                  value={phosphorus}
                  onChange={(e) => setPhosphorus(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="potassium">Potassium Level (%)</Label>
                <Input
                  id="potassium"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  placeholder="K level"
                  value={potassium}
                  onChange={(e) => setPotassium(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes (optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Add observations..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Saving..." : "Save Data"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {readings.length > 0 && <FertilityChart readings={readings} />}

        <Card>
          <CardHeader>
            <CardTitle>Recent Readings</CardTitle>
          </CardHeader>
          <CardContent>
            {readings.length === 0 ? (
              <EmptyState
                icon={Sprout}
                title="No Fertility Data"
                description="Start tracking soil fertility by logging NPK levels. Get insights on your soil health."
                actionLabel="Log First Data"
                onAction={() => setDialogOpen(true)}
              />
            ) : (
              <div className="space-y-3">
                {readings.map((reading) => (
                  <div
                    key={reading.id}
                    className="p-3 bg-muted rounded-lg"
                  >
                    <div className="flex justify-between items-center mb-2">
                      <p className="font-semibold">Overall: {reading.overall_fertility}%</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(reading.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      N: {reading.nitrogen_level}% | P: {reading.phosphorus_level}% | K: {reading.potassium_level}%
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <BottomNav />
    </div>
  );
};

export default Fertility;
