import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Droplet, Plus, Wifi, Copy, Trash2 } from "lucide-react";
import { toast } from "sonner";
import BottomNav from "@/components/BottomNav";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import MoistureChart from "@/components/MoistureChart";
import EmptyState from "@/components/EmptyState";

interface MoistureReading {
  id: string;
  moisture_level: number;
  status: string | null;
  notes: string | null;
  created_at: string;
  sensor_id?: string | null;
}

interface Sensor {
  id: string;
  sensor_code: string;
  sensor_name: string;
  last_reading: number | null;
  last_reading_at: string | null;
  is_active: boolean;
  created_at: string;
}

const Moisture = () => {
  const [readings, setReadings] = useState<MoistureReading[]>([]);
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [moistureLevel, setMoistureLevel] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sensorDialogOpen, setSensorDialogOpen] = useState(false);
  const [sensorName, setSensorName] = useState("");
  const [sensorLoading, setSensorLoading] = useState(false);

  useEffect(() => {
    fetchReadings();
    fetchSensors();

    const readingsChannel = supabase
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

    const sensorsChannel = supabase
      .channel("sensors_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "sensors",
        },
        () => {
          fetchSensors();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(readingsChannel);
      supabase.removeChannel(sensorsChannel);
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

  const fetchSensors = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("sensors")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to fetch sensors");
    } else {
      setSensors(data || []);
    }
  };

  const generateSensorCode = () => {
    return 'AGRO-' + Math.random().toString(36).substr(2, 9).toUpperCase();
  };

  const handleAddSensor = async (e: React.FormEvent) => {
    e.preventDefault();
    setSensorLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const sensorCode = generateSensorCode();

    const { error } = await supabase.from("sensors").insert({
      user_id: user.id,
      sensor_code: sensorCode,
      sensor_name: sensorName,
      is_active: true,
    });

    if (error) {
      toast.error("Failed to add sensor");
    } else {
      toast.success(`Sensor "${sensorName}" added successfully!`);
      setSensorName("");
      setSensorDialogOpen(false);
      fetchSensors();
    }
    setSensorLoading(false);
  };

  const handleDeleteSensor = async (sensorId: string) => {
    const { error } = await supabase
      .from("sensors")
      .delete()
      .eq("id", sensorId);

    if (error) {
      toast.error("Failed to delete sensor");
    } else {
      toast.success("Sensor removed");
      fetchSensors();
    }
  };

  const copySensorCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("Sensor code copied to clipboard!");
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

    const status = level < 30 ? "low" : level > 70 ? "high" : "optimal";

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

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Wifi className="w-5 h-5" />
                Connected Sensors
              </CardTitle>
              <Dialog open={sensorDialogOpen} onOpenChange={setSensorDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="w-4 h-4 mr-1" />
                    Add Sensor
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Sensor</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleAddSensor} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="sensorName">Sensor Name</Label>
                      <Input
                        id="sensorName"
                        placeholder="e.g., Garden Bed 1, Greenhouse A"
                        value={sensorName}
                        onChange={(e) => setSensorName(e.target.value)}
                        required
                      />
                      <p className="text-xs text-muted-foreground">
                        A unique sensor code will be automatically generated
                      </p>
                    </div>
                    <Button type="submit" className="w-full" disabled={sensorLoading}>
                      {sensorLoading ? "Adding..." : "Add Sensor"}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {sensors.length === 0 ? (
              <div className="text-center py-8">
                <Wifi className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">No sensors connected yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Add a sensor to receive automatic readings
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {sensors.map((sensor) => (
                  <div
                    key={sensor.id}
                    className="p-4 bg-muted rounded-lg space-y-2"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{sensor.sensor_name}</h3>
                          <Badge variant={sensor.is_active ? "default" : "secondary"}>
                            {sensor.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <code className="text-xs bg-background px-2 py-1 rounded">
                            {sensor.sensor_code}
                          </code>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => copySensorCode(sensor.sensor_code)}
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                        {sensor.last_reading !== null && (
                          <div className="mt-2 text-sm">
                            <span className="text-muted-foreground">Last reading: </span>
                            <span className="font-semibold">{sensor.last_reading}%</span>
                            {sensor.last_reading_at && (
                              <span className="text-muted-foreground ml-2">
                                ({new Date(sensor.last_reading_at).toLocaleString()})
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteSensor(sensor.id)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                    <div className="text-xs text-muted-foreground pt-2 border-t border-border">
                      <p>Configure your sensor to send data to:</p>
                      <code className="text-xs bg-background px-2 py-1 rounded mt-1 block">
                        POST https://hhujbxvyluxahsvferfp.supabase.co/functions/v1/sensor-data
                      </code>
                      <p className="mt-1">
                        Body: {`{"sensor_code": "${sensor.sensor_code}", "moisture_level": 45.5}`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
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

        {readings.length > 0 && <MoistureChart readings={readings} />}

        <Card>
          <CardHeader>
            <CardTitle>Recent Readings</CardTitle>
          </CardHeader>
          <CardContent>
            {readings.length === 0 ? (
              <EmptyState
                icon={Droplet}
                title="No Moisture Readings"
                description="Start tracking soil moisture levels by adding your first reading or connecting a sensor."
                actionLabel="Add First Reading"
                onAction={() => setDialogOpen(true)}
              />
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
