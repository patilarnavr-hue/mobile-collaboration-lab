import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Wifi, Plus, QrCode, Trash2, Radio, ArrowLeft, Copy } from "lucide-react";
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
}

const Sensors = () => {
  const navigate = useNavigate();
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [sensorName, setSensorName] = useState("");
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
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

  const handleQuickAdd = async () => {
    if (!sensorName.trim()) {
      toast.error("Please enter a name for your sensor");
      return;
    }
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const code = "AGRO-" + Math.random().toString(36).substr(2, 9).toUpperCase();
    const { error } = await supabase.from("sensors").insert({
      user_id: user.id,
      sensor_code: code,
      sensor_name: sensorName.trim(),
      is_active: true,
    });

    if (error) {
      toast.error("Failed to add sensor");
    } else {
      toast.success(`Sensor added! Code: ${code}`, { duration: 5000 });
      setSensorName("");
      fetchSensors();
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
        async (decodedText) => {
          stopScanner();
          toast.success(`Scanned: ${decodedText}`);
          // Auto-add with scanned code
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;
          const { error } = await supabase.from("sensors").insert({
            user_id: user.id,
            sensor_code: decodedText.toUpperCase(),
            sensor_name: `Sensor ${decodedText.slice(-4)}`,
            is_active: true,
          });
          if (error) toast.error("Failed to pair sensor");
          else {
            toast.success("Sensor paired successfully!");
            fetchSensors();
          }
        },
        () => {}
      );
    } catch {
      toast.error("Camera not available");
      setScanning(false);
    }
  };

  const stopScanner = () => {
    scannerRef.current?.stop().catch(() => {});
    scannerRef.current = null;
    setScanning(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("sensors").delete().eq("id", id);
    if (error) toast.error("Failed to remove");
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
            <h1 className="text-2xl font-bold">Sensors</h1>
            <p className="text-sm opacity-90">Connect moisture sensors</p>
          </div>
        </div>
      </header>

      <main className="p-4 space-y-4 max-w-lg mx-auto">
        {/* Quick Add — single input */}
        <Card className="border-2 border-primary/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Add a Sensor</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-sm">Sensor Name</Label>
              <Input
                placeholder="e.g., Garden Bed, Greenhouse"
                value={sensorName}
                onChange={(e) => setSensorName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleQuickAdd()}
              />
            </div>
            <div className="flex gap-2">
              <Button className="flex-1" onClick={handleQuickAdd} disabled={loading}>
                <Plus className="w-4 h-4 mr-1" />
                {loading ? "Adding..." : "Add Sensor"}
              </Button>
              <Button variant="outline" onClick={scanning ? stopScanner : startScanner}>
                <QrCode className="w-4 h-4 mr-1" />
                {scanning ? "Stop" : "Scan QR"}
              </Button>
            </div>
            {scanning && (
              <div className="rounded-lg overflow-hidden bg-black">
                <div id="qr-reader" className="w-full" />
              </div>
            )}
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
              <div className="text-center py-6">
                <Wifi className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground text-sm">No sensors yet. Add one above!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {sensors.map((sensor) => (
                  <div key={sensor.id} className="p-3 bg-muted rounded-lg">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{sensor.sensor_name}</h3>
                          <Badge variant={sensor.is_active ? "default" : "secondary"}>
                            {sensor.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1 mt-1">
                          <code className="text-xs bg-background px-2 py-0.5 rounded">{sensor.sensor_code}</code>
                          <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => copySensorCode(sensor.sensor_code)}>
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                        {sensor.last_reading !== null && (
                          <p className="text-sm mt-1">
                            <span className="text-muted-foreground">Last: </span>
                            <span className="font-semibold">{sensor.last_reading}%</span>
                          </p>
                        )}
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(sensor.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Simple instructions */}
        <Card>
          <CardContent className="pt-6 space-y-2 text-sm text-muted-foreground">
            <p><strong>How it works:</strong></p>
            <p>1. Add a sensor name → get a pairing code</p>
            <p>2. Enter the code on your IoT device</p>
            <p>3. Readings appear automatically in AgroEye</p>
            <p className="pt-2 text-xs">Or scan the QR code on your sensor device to pair instantly.</p>
          </CardContent>
        </Card>
      </main>

      <BottomNav />
    </div>
  );
};

export default Sensors;
