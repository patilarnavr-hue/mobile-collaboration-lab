import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Wifi, Plus, QrCode, Keyboard, Copy, Trash2, Radio, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import BottomNav from "@/components/BottomNav";

interface Sensor {
  id: string;
  sensor_code: string;
  sensor_name: string;
  last_reading: number | null;
  last_reading_at: string | null;
  is_active: boolean;
  created_at: string;
}

const Sensors = () => {
  const navigate = useNavigate();
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sensorName, setSensorName] = useState("");
  const [manualCode, setManualCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [pairingMode, setPairingMode] = useState<"new" | "existing">("new");
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<any>(null);

  useEffect(() => {
    fetchSensors();
    return () => stopScanner();
  }, []);

  const fetchSensors = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("sensors")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setSensors(data || []);
  };

  const generateSensorCode = () =>
    "AGRO-" + Math.random().toString(36).substr(2, 9).toUpperCase();

  const handleCreateSensor = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
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
      toast.error("Failed to register sensor");
    } else {
      toast.success(`Sensor "${sensorName}" registered! Code: ${sensorCode}`);
      setSensorName("");
      setDialogOpen(false);
      fetchSensors();
    }
    setLoading(false);
  };

  const handlePairExisting = async (code: string) => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Check if sensor code exists and is not yet assigned
    const { data: sensor } = await supabase
      .from("sensors")
      .select("*")
      .eq("sensor_code", code.trim().toUpperCase())
      .single();

    if (!sensor) {
      toast.error("Sensor not found. Check the code and try again.");
    } else if (sensor.user_id === user.id) {
      toast.info("This sensor is already paired to your account.");
    } else {
      // For demo: create a new sensor with the same code for this user
      const { error } = await supabase.from("sensors").insert({
        user_id: user.id,
        sensor_code: code.trim().toUpperCase(),
        sensor_name: sensor.sensor_name || "Paired Sensor",
        is_active: true,
      });
      if (error) {
        toast.error("Failed to pair sensor");
      } else {
        toast.success("Sensor paired successfully!");
        setManualCode("");
        setDialogOpen(false);
        fetchSensors();
      }
    }
    setLoading(false);
  };

  const startScanner = async () => {
    setScanning(true);
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const scanner = new Html5Qrcode("qr-reader");
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          toast.success(`Scanned code: ${decodedText}`);
          setManualCode(decodedText);
          stopScanner();
          handlePairExisting(decodedText);
        },
        () => {} // ignore errors during scanning
      );
    } catch (err) {
      toast.error("Camera access denied or not available");
      setScanning(false);
    }
  };

  const stopScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.stop().catch(() => {});
      scannerRef.current = null;
    }
    setScanning(false);
  };

  const handleDeleteSensor = async (id: string) => {
    const { error } = await supabase.from("sensors").delete().eq("id", id);
    if (error) toast.error("Failed to remove sensor");
    else {
      toast.success("Sensor removed");
      fetchSensors();
    }
  };

  const copySensorCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("Code copied!");
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="bg-primary text-primary-foreground p-6 shadow-lg">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="text-primary-foreground hover:bg-primary/80">
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <Radio className="w-8 h-8" />
          <div>
            <h1 className="text-2xl font-bold">Connect Sensors</h1>
            <p className="text-sm opacity-90">Pair your IoT moisture sensors</p>
          </div>
        </div>
      </header>

      <main className="p-4 space-y-4 max-w-lg mx-auto">
        {/* Pair New Sensor */}
        <Card className="border-2 border-dashed border-primary/30">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <Wifi className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-bold">Connect a Sensor</h2>
                <p className="text-sm text-muted-foreground">
                  Pair your IoT moisture sensor to receive automatic readings
                </p>
              </div>

              <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) stopScanner(); }}>
                <DialogTrigger asChild>
                  <Button size="lg" className="w-full">
                    <Plus className="w-5 h-5 mr-2" />
                    Connect Sensor
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Connect a Sensor</DialogTitle>
                  </DialogHeader>

                  <Tabs defaultValue="new" onValueChange={(v) => setPairingMode(v as "new" | "existing")}>
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="new">
                        <Plus className="w-4 h-4 mr-1" />
                        Register New
                      </TabsTrigger>
                      <TabsTrigger value="existing">
                        <QrCode className="w-4 h-4 mr-1" />
                        Pair Existing
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="new" className="space-y-4 mt-4">
                      <form onSubmit={handleCreateSensor} className="space-y-4">
                        <div className="space-y-2">
                          <Label>Sensor Name</Label>
                          <Input
                            placeholder="e.g., Garden Bed 1, Greenhouse A"
                            value={sensorName}
                            onChange={(e) => setSensorName(e.target.value)}
                            required
                          />
                          <p className="text-xs text-muted-foreground">
                            A unique pairing code will be generated automatically
                          </p>
                        </div>
                        <Button type="submit" className="w-full" disabled={loading}>
                          {loading ? "Registering..." : "Register Sensor"}
                        </Button>
                      </form>
                    </TabsContent>

                    <TabsContent value="existing" className="space-y-4 mt-4">
                      <Tabs defaultValue="manual">
                        <TabsList className="grid w-full grid-cols-2">
                          <TabsTrigger value="manual">
                            <Keyboard className="w-4 h-4 mr-1" />
                            Enter Code
                          </TabsTrigger>
                          <TabsTrigger value="qr">
                            <QrCode className="w-4 h-4 mr-1" />
                            Scan QR
                          </TabsTrigger>
                        </TabsList>

                        <TabsContent value="manual" className="space-y-4 mt-4">
                          <div className="space-y-2">
                            <Label>Sensor Code</Label>
                            <Input
                              placeholder="e.g., AGRO-ABC123DEF"
                              value={manualCode}
                              onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                            />
                            <p className="text-xs text-muted-foreground">
                              Enter the code printed on your sensor device
                            </p>
                          </div>
                          <Button
                            className="w-full"
                            disabled={!manualCode || loading}
                            onClick={() => handlePairExisting(manualCode)}
                          >
                            {loading ? "Pairing..." : "Pair Sensor"}
                          </Button>
                        </TabsContent>

                        <TabsContent value="qr" className="space-y-4 mt-4">
                          <div className="rounded-lg overflow-hidden bg-black">
                            <div id="qr-reader" className="w-full" />
                          </div>
                          {!scanning ? (
                            <Button className="w-full" onClick={startScanner}>
                              <QrCode className="w-4 h-4 mr-2" />
                              Start Camera
                            </Button>
                          ) : (
                            <Button className="w-full" variant="secondary" onClick={stopScanner}>
                              Stop Scanning
                            </Button>
                          )}
                          <p className="text-xs text-muted-foreground text-center">
                            Point your camera at the QR code on the sensor device
                          </p>
                        </TabsContent>
                      </Tabs>
                    </TabsContent>
                  </Tabs>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>

        {/* Connected Sensors */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wifi className="w-5 h-5" />
              My Sensors ({sensors.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sensors.length === 0 ? (
              <div className="text-center py-8">
                <Wifi className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">No sensors connected yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Connect your first sensor to start receiving automatic readings
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {sensors.map((sensor) => (
                  <div key={sensor.id} className="p-4 bg-muted rounded-lg space-y-2">
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
                          <Button size="sm" variant="ghost" onClick={() => copySensorCode(sensor.sensor_code)}>
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                        {sensor.last_reading !== null && (
                          <div className="mt-2 text-sm">
                            <span className="text-muted-foreground">Last: </span>
                            <span className="font-semibold">{sensor.last_reading}%</span>
                            {sensor.last_reading_at && (
                              <span className="text-muted-foreground ml-2">
                                ({new Date(sensor.last_reading_at).toLocaleString()})
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => handleDeleteSensor(sensor.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* How it works */}
        <Card>
          <CardHeader>
            <CardTitle>How Sensor Pairing Works</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">1</span>
              <p>Register a new sensor or enter the code printed on your device</p>
            </div>
            <div className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">2</span>
              <p>Configure your IoT device with the sensor code from the app</p>
            </div>
            <div className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">3</span>
              <p>Your sensor automatically sends moisture data to AgroEye in real-time</p>
            </div>
          </CardContent>
        </Card>
      </main>

      <BottomNav />
    </div>
  );
};

export default Sensors;
