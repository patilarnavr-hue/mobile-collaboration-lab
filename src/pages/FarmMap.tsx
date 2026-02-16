import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Map, Plus, Trash2, ArrowLeft, Layers, MapPin, Pencil } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import BottomNav from "@/components/BottomNav";

interface FarmlandPlot {
  id: string;
  name: string;
  description: string | null;
  coordinates: number[][];
  area_sqm: number | null;
  color: string;
}

interface MapMarker {
  id: string;
  plot_id: string | null;
  marker_type: string;
  label: string;
  latitude: number;
  longitude: number;
}

const FarmMap = () => {
  const navigate = useNavigate();
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<any>(null);
  const drawnItems = useRef<any>(null);
  const [plots, setPlots] = useState<FarmlandPlot[]>([]);
  const [markers, setMarkers] = useState<MapMarker[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [plotName, setPlotName] = useState("");
  const [plotDescription, setPlotDescription] = useState("");
  const [pendingCoords, setPendingCoords] = useState<number[][] | null>(null);
  const [pendingArea, setPendingArea] = useState<number>(0);
  const [markerDialogOpen, setMarkerDialogOpen] = useState(false);
  const [markerLabel, setMarkerLabel] = useState("");
  const [markerType, setMarkerType] = useState("sensor");
  const [pendingMarkerLatLng, setPendingMarkerLatLng] = useState<[number, number] | null>(null);
  const [addingMarker, setAddingMarker] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (mapRef.current && !leafletMap.current) {
      initMap();
    }
    return () => {
      if (leafletMap.current) {
        leafletMap.current.remove();
        leafletMap.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (mapReady && leafletMap.current) {
      renderPlotsOnMap();
      renderMarkersOnMap();
    }
  }, [plots, markers, mapReady]);

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [plotsRes, markersRes] = await Promise.all([
      supabase.from("farmland_plots").select("*").eq("user_id", user.id).order("created_at"),
      supabase.from("map_markers").select("*").eq("user_id", user.id),
    ]);
    setPlots((plotsRes.data as any[]) || []);
    setMarkers((markersRes.data as any[]) || []);
  };

  const initMap = async () => {
    const L = await import("leaflet");
    await import("leaflet/dist/leaflet.css");
    await import("leaflet-draw");
    await import("leaflet-draw/dist/leaflet.draw.css");

    // Fix default icon
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
      iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
      shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
    });

    const map = L.map(mapRef.current!, {
      center: [20.5937, 78.9629], // India center
      zoom: 5,
    });

    L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
      attribution: "Tiles © Esri",
      maxZoom: 19,
    }).addTo(map);

    // Labels overlay
    L.tileLayer("https://stamen-tiles.a.ssl.fastly.net/toner-labels/{z}/{x}/{y}.png", {
      maxZoom: 19,
    }).addTo(map);

    const drawn = new L.FeatureGroup();
    map.addLayer(drawn);
    drawnItems.current = drawn;

    const drawControl = new (L as any).Control.Draw({
      draw: {
        polygon: { shapeOptions: { color: "#2D5A27", weight: 3 } },
        polyline: false,
        rectangle: { shapeOptions: { color: "#2D5A27" } },
        circle: false,
        circlemarker: false,
        marker: false,
      },
      edit: { featureGroup: drawn },
    });
    map.addControl(drawControl);

    map.on((L as any).Draw.Event.CREATED, (e: any) => {
      const layer = e.layer;
      const coords = layer.getLatLngs()[0].map((ll: any) => [ll.lat, ll.lng]);
      
      // Calculate area
      const area = (L as any).GeometryUtil
        ? (L as any).GeometryUtil.geodesicArea(layer.getLatLngs()[0])
        : calculateArea(coords);

      setPendingCoords(coords);
      setPendingArea(Math.round(area));
      setDialogOpen(true);
    });

    // Click handler for adding markers
    map.on("click", (e: any) => {
      if (addingMarker) {
        setPendingMarkerLatLng([e.latlng.lat, e.latlng.lng]);
        setMarkerDialogOpen(true);
        setAddingMarker(false);
        map.getContainer().style.cursor = "";
      }
    });

    leafletMap.current = map;
    setMapReady(true);

    // Try to get user location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          map.setView([pos.coords.latitude, pos.coords.longitude], 15);
        },
        () => {} // ignore error
      );
    }
  };

  const calculateArea = (coords: number[][]) => {
    // Simple Shoelace formula approximation in sq meters
    const R = 6371000;
    let area = 0;
    for (let i = 0; i < coords.length; i++) {
      const j = (i + 1) % coords.length;
      const lat1 = (coords[i][0] * Math.PI) / 180;
      const lat2 = (coords[j][0] * Math.PI) / 180;
      const dLng = ((coords[j][1] - coords[i][1]) * Math.PI) / 180;
      area += dLng * (2 + Math.sin(lat1) + Math.sin(lat2));
    }
    return Math.abs((area * R * R) / 2);
  };

  const renderPlotsOnMap = async () => {
    if (!leafletMap.current || !drawnItems.current) return;
    const L = await import("leaflet");
    drawnItems.current.clearLayers();

    plots.forEach((plot) => {
      const polygon = L.polygon(
        plot.coordinates.map((c) => [c[0], c[1]] as [number, number]),
        { color: plot.color || "#2D5A27", weight: 3, fillOpacity: 0.2 }
      );
      polygon.bindTooltip(
        `<strong>${plot.name}</strong><br/>${plot.area_sqm ? `${(plot.area_sqm / 10000).toFixed(2)} hectares` : ""}`,
        { permanent: true, className: "plot-label" }
      );
      drawnItems.current.addLayer(polygon);
    });

    if (plots.length > 0) {
      leafletMap.current.fitBounds(drawnItems.current.getBounds().pad(0.1));
    }
  };

  const renderMarkersOnMap = async () => {
    if (!leafletMap.current) return;
    const L = await import("leaflet");

    // Clear existing markers (non-polygon layers)
    leafletMap.current.eachLayer((layer: any) => {
      if (layer instanceof L.Marker) leafletMap.current.removeLayer(layer);
    });

    markers.forEach((m) => {
      const icon = L.divIcon({
        className: "custom-marker",
        html: `<div style="background:${m.marker_type === "sensor" ? "#FFD700" : m.marker_type === "crop" ? "#2D5A27" : "#8FBC8F"};width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);font-size:12px;">📍</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });
      L.marker([m.latitude, m.longitude], { icon })
        .bindTooltip(m.label, { permanent: false })
        .addTo(leafletMap.current);
    });
  };

  const handleSavePlot = async () => {
    if (!pendingCoords || !plotName) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("farmland_plots").insert({
      user_id: user.id,
      name: plotName,
      description: plotDescription || null,
      coordinates: pendingCoords,
      area_sqm: pendingArea,
    });

    if (error) {
      toast.error("Failed to save plot");
    } else {
      toast.success("Farmland plot saved!");
      setDialogOpen(false);
      setPlotName("");
      setPlotDescription("");
      setPendingCoords(null);
      fetchData();
    }
  };

  const handleSaveMarker = async () => {
    if (!pendingMarkerLatLng || !markerLabel) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("map_markers").insert({
      user_id: user.id,
      label: markerLabel,
      marker_type: markerType,
      latitude: pendingMarkerLatLng[0],
      longitude: pendingMarkerLatLng[1],
    });

    if (error) {
      toast.error("Failed to add marker");
    } else {
      toast.success("Marker added!");
      setMarkerDialogOpen(false);
      setMarkerLabel("");
      setPendingMarkerLatLng(null);
      fetchData();
    }
  };

  const handleDeletePlot = async (id: string) => {
    const { error } = await supabase.from("farmland_plots").delete().eq("id", id);
    if (error) toast.error("Failed to delete");
    else {
      toast.success("Plot deleted");
      fetchData();
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="bg-primary text-primary-foreground p-6 shadow-lg">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="text-primary-foreground hover:bg-primary/80">
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <Map className="w-8 h-8" />
          <div>
            <h1 className="text-2xl font-bold">Farm Map</h1>
            <p className="text-sm opacity-90">Map and manage your farmland</p>
          </div>
        </div>
      </header>

      <main className="p-4 space-y-4 max-w-4xl mx-auto">
        {/* Map Controls */}
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setAddingMarker(true);
              if (leafletMap.current) leafletMap.current.getContainer().style.cursor = "crosshair";
              toast.info("Click on the map to place a marker");
            }}
          >
            <MapPin className="w-4 h-4 mr-1" /> Add Marker
          </Button>
          <Badge variant="secondary" className="flex items-center gap-1">
            <Layers className="w-3 h-3" /> {plots.length} plots
          </Badge>
          <Badge variant="secondary" className="flex items-center gap-1">
            <MapPin className="w-3 h-3" /> {markers.length} markers
          </Badge>
        </div>

        {/* Map Container */}
        <div className="rounded-xl overflow-hidden border border-border shadow-lg" style={{ height: "450px" }}>
          <div ref={mapRef} style={{ height: "100%", width: "100%" }} />
        </div>

        {/* Plot List */}
        {plots.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layers className="w-5 h-5" /> My Farmland Plots
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {plots.map((plot) => (
                <div key={plot.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div>
                    <h3 className="font-semibold">{plot.name}</h3>
                    {plot.description && <p className="text-sm text-muted-foreground">{plot.description}</p>}
                    {plot.area_sqm && (
                      <Badge variant="outline" className="mt-1">
                        {(plot.area_sqm / 10000).toFixed(2)} hectares ({plot.area_sqm.toLocaleString()} m²)
                      </Badge>
                    )}
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => handleDeletePlot(plot.id)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Pencil className="w-5 h-5" /> How to Map Your Farm
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">1</span>
              <p>Use the draw tools (top-left of map) to draw polygon boundaries around your farmland</p>
            </div>
            <div className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">2</span>
              <p>Name your plot and the area will be calculated automatically</p>
            </div>
            <div className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">3</span>
              <p>Add markers for sensors, crops, or zones by clicking "Add Marker"</p>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Save Plot Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Farmland Plot</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Plot Name</Label>
              <Input placeholder="e.g., North Field, Rice Paddy" value={plotName} onChange={(e) => setPlotName(e.target.value)} />
            </div>
            <div>
              <Label>Description (optional)</Label>
              <Input placeholder="e.g., Main wheat field" value={plotDescription} onChange={(e) => setPlotDescription(e.target.value)} />
            </div>
            {pendingArea > 0 && (
              <Badge variant="secondary">
                Area: {(pendingArea / 10000).toFixed(2)} hectares ({pendingArea.toLocaleString()} m²)
              </Badge>
            )}
            <Button className="w-full" onClick={handleSavePlot} disabled={!plotName}>
              Save Plot
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Save Marker Dialog */}
      <Dialog open={markerDialogOpen} onOpenChange={setMarkerDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Map Marker</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Label</Label>
              <Input placeholder="e.g., Sensor A, Tomato Zone" value={markerLabel} onChange={(e) => setMarkerLabel(e.target.value)} />
            </div>
            <div>
              <Label>Type</Label>
              <div className="flex gap-2 mt-1">
                {["sensor", "crop", "zone", "custom"].map((t) => (
                  <Button key={t} size="sm" variant={markerType === t ? "default" : "outline"} onClick={() => setMarkerType(t)}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </Button>
                ))}
              </div>
            </div>
            <Button className="w-full" onClick={handleSaveMarker} disabled={!markerLabel}>
              Add Marker
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
};

export default FarmMap;
