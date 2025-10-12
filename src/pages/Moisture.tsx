import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Droplet, Plus } from "lucide-react";
import { toast } from "sonner";
import BottomNav from "@/components/BottomNav";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface MoistureReading {
  id: string;
  moisture_level: number;
  status: string | null;
  notes: string | null;
  created_at: string;
}

const Moisture = () => {
  const [readings, setReadings] = useState<MoistureReading[]>([]);
  const [moistureLevel, setMoistureLevel] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    fetchReadings();

    const channel = supabase
      .channel("moisture_readings_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "moisture_readings",
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
      .from("moisture_readings")
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

    const level = parseFloat(moistureLevel);
    if (level < 0 || level > 100) {
      toast.error("Moisture level must be between 0 and 100");
      setLoading(false);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const status = level < 30 ? "Low" : level < 60 ? "Moderate" : "Optimal";

    const { error } = await supabase.from("moisture_readings").insert({
      user_id: user.id,
      moisture_level: level,
      status,
      notes: notes || null,
    });

    if (error) {
      toast.error("Failed to add reading");
    } else {
      toast.success("Reading added successfully");
      setMoistureLevel("");
      setNotes("");
      setDialogOpen(false);
    }
    setLoading(false);
  };

  const currentLevel = readings[0]?.moisture_level || 0;
  const currentStatus = readings[0]?.status || "No data";

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="bg-primary text-primary-foreground p-6 shadow-lg">
        <div className="flex items-center gap-3">
          <Droplet className="w-8 h-8" />
          <div>
            <h1 className="text-2xl font-bold">Soil Moisture</h1>
            <p className="text-sm opacity-90">Monitor water levels</p>
          </div>
        </div>
      </header>

      <main className="p-4 space-y-4 max-w-lg mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Current Moisture Level</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <div className="text-5xl font-bold text-primary">{currentLevel}%</div>
              <p className="text-muted-foreground mt-2">{currentStatus}</p>
            </div>
            <Progress value={currentLevel} className="h-3" />
          </CardContent>
        </Card>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full" size="lg">
              <Plus className="w-5 h-5 mr-2" />
              Add New Reading
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Record Moisture Reading</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="moisture">Moisture Level (%)</Label>
                <Input
                  id="moisture"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  placeholder="Enter percentage"
                  value={moistureLevel}
                  onChange={(e) => setMoistureLevel(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes (optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Add any observations..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Saving..." : "Save Reading"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        <Card>
          <CardHeader>
            <CardTitle>Recent Readings</CardTitle>
          </CardHeader>
          <CardContent>
            {readings.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No readings yet. Add your first reading above!
              </p>
            ) : (
              <div className="space-y-3">
                {readings.map((reading) => (
                  <div
                    key={reading.id}
                    className="flex items-center justify-between p-3 bg-muted rounded-lg"
                  >
                    <div>
                      <p className="font-semibold">{reading.moisture_level}%</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(reading.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <span className="text-sm font-medium">{reading.status}</span>
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

export default Moisture;
