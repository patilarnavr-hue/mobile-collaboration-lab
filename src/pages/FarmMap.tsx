import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Map, Trash2, ArrowLeft, Layers, MapPin } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";

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

interface SensorLocation {
  id: string;
  sensor_name: string;
  last_reading: number | null;
}

const FarmMap = () => {
  const navigate = useNavigate();
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<any>(null);
  const drawnItems = useRef<any>(null);
  const [plots, setPlots] = useState<FarmlandPlot[]>([]);
  const [markers, setMarkers] = useState<MapMarker[]>([]);
  const [sensors, setSensors] = useState<SensorLocation[]>([]);
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
  const [mapLoading, setMapLoading] = useState(true);

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    if (mapRef.current && !leafletMap.current) initMap();
    return () => { if (leafletMap.current) { leafletMap.current.remove(); leafletMap.current = null; } };
  }, []);

  useEffect(() => {
    if (mapReady && leafletMap.current) { renderPlotsOnMap(); renderMarkersOnMap(); renderSensorsOnMap(); }
  }, [plots, markers, sensors, mapReady]);

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const [plotsRes, markersRes, sensorsRes] = await Promise.all([
      supabase.from("farmland_plots").select("*").eq("user_id", user.id).order("created_at"),
      supabase.from("map_markers").select("*").eq("user_id", user.id),
      supabase.from("sensors").select("id, sensor_name, last_reading").eq("user_id", user.id).eq("is_active", true),
    ]);
    setPlots((plotsRes.data as any[]) || []);
    setMarkers((markersRes.data as any[]) || []);
    setSensors((sensorsRes.data as any[]) || []);
  };

  const initMap = async () => {
    const L = await import("leaflet");
    await import("leaflet/dist/leaflet.css");
    await import("leaflet-draw");
    await import("leaflet-draw/dist/leaflet.draw.css");

    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
      iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
      shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
    });

    const map = L.map(mapRef.current!, { center: [20.5937, 78.9629], zoom: 5, zoomControl: false });

    L.control.zoom({ position: "bottomright" }).addTo(map);

    L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
      attribution: "Tiles © Esri", maxZoom: 19,
    }).addTo(map);

    L.tileLayer("https://stamen-tiles.a.ssl.fastly.net/toner-labels/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(map);

    const drawn = new L.FeatureGroup();
    map.addLayer(drawn);
    drawnItems.current = drawn;

    const drawControl = new (L as any).Control.Draw({
      position: "topright",
      draw: {
        polygon: { shapeOptions: { color: "#22c55e", weight: 3 } },
        polyline: false, rectangle: { shapeOptions: { color: "#22c55e" } },
        circle: false, circlemarker: false, marker: false,
      },
      edit: { featureGroup: drawn },
    });
    map.addControl(drawControl);

    map.on((L as any).Draw.Event.CREATED, (e: any) => {
      const layer = e.layer;
      const coords = layer.getLatLngs()[0].map((ll: any) => [ll.lat, ll.lng]);
      const area = (L as any).GeometryUtil
        ? (L as any).GeometryUtil.geodesicArea(layer.getLatLngs()[0])
        : calculateArea(coords);
      setPendingCoords(coords);
      setPendingArea(Math.round(area));
      setDialogOpen(true);
    });

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
    setMapLoading(false);

    // High-accuracy GPS zoom
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => { map.setView([pos.coords.latitude, pos.coords.longitude], 18); },
        () => {},
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    }
  };

  const calculateArea = (coords: number[][]) => {
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
        { color: plot.color || "#22c55e", weight: 3, fillOpacity: 0.2 }
      );
      polygon.bindTooltip(
        `<strong>${plot.name}</strong><br/>${plot.area_sqm ? `${(plot.area_sqm / 10000).toFixed(2)} ha` : ""}`,
        { permanent: true, className: "plot-label" }
      );
      drawnItems.current.addLayer(polygon);
    });
    if (plots.length > 0) leafletMap.current.fitBounds(drawnItems.current.getBounds().pad(0.1));
  };

  const renderMarkersOnMap = async () => {
    if (!leafletMap.current) return;
    const L = await import("leaflet");
    leafletMap.current.eachLayer((layer: any) => {
      if (layer instanceof L.Marker && !(layer as any)._isSensor) leafletMap.current.removeLayer(layer);
    });
    markers.forEach((m) => {
      const icon = L.divIcon({
        className: "custom-marker",
        html: `<div style="background:${m.marker_type === "sensor" ? "#eab308" : "#22c55e"};width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);font-size:12px;">📍</div>`,
        iconSize: [28, 28], iconAnchor: [14, 14],
      });
      L.marker([m.latitude, m.longitude], { icon }).bindTooltip(m.label).addTo(leafletMap.current);
    });
  };

  const renderSensorsOnMap = async () => {
    if (!leafletMap.current) return;
    const L = await import("leaflet");
    // Remove old sensor markers
    leafletMap.current.eachLayer((layer: any) => {
      if ((layer as any)._isSensor) leafletMap.current.removeLayer(layer);
    });
    // Place sensor markers at user's location (since sensors don't have lat/lng yet)
    // For now, show them near the map center with offsets
    const center = leafletMap.current.getCenter();
    sensors.forEach((s, idx) => {
      const offset = (idx - sensors.length / 2) * 0.0005;
      const icon = L.divIcon({
        className: "sensor-marker",
        html: `<div style="background:#3b82f6;width:32px;height:32px;border-radius:12px;display:flex;align-items:center;justify-content:center;border:2px solid white;box-shadow:0 2px 12px rgba(59,130,246,0.4);font-size:13px;color:white;font-weight:600;">${s.last_reading !== null ? s.last_reading + '%' : '📡'}</div>`,
        iconSize: [32, 32], iconAnchor: [16, 16],
      });
      const marker = L.marker([center.lat + offset, center.lng + offset], { icon }) as any;
      marker._isSensor = true;
      marker.bindTooltip(`${s.sensor_name}${s.last_reading !== null ? ` - ${s.last_reading}%` : ""}`);
      marker.addTo(leafletMap.current);
    });
  };

  const handleSavePlot = async () => {
    if (!pendingCoords || !plotName) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("farmland_plots").insert({
      user_id: user.id, name: plotName, description: plotDescription || null,
      coordinates: pendingCoords, area_sqm: pendingArea,
    });
    if (error) toast.error("Failed to save plot");
    else { toast.success("Plot saved!"); setDialogOpen(false); setPlotName(""); setPlotDescription(""); setPendingCoords(null); fetchData(); }
  };

  const handleSaveMarker = async () => {
    if (!pendingMarkerLatLng || !markerLabel) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("map_markers").insert({
      user_id: user.id, label: markerLabel, marker_type: markerType,
      latitude: pendingMarkerLatLng[0], longitude: pendingMarkerLatLng[1],
    });
    if (error) toast.error("Failed to add marker");
    else { toast.success("Marker added!"); setMarkerDialogOpen(false); setMarkerLabel(""); setPendingMarkerLatLng(null); fetchData(); }
  };

  const handleDeletePlot = async (id: string) => {
    const { error } = await supabase.from("farmland_plots").delete().eq("id", id);
    if (error) toast.error("Failed to delete");
    else { toast.success("Deleted"); fetchData(); }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="glass-header text-primary-foreground p-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="text-primary-foreground hover:bg-primary-foreground/10 rounded-full">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <Map className="w-6 h-6" />
        <div>
          <h1 className="text-lg font-bold">Farm Map</h1>
          <p className="text-[10px] opacity-80">Draw boundaries & track sensors</p>
        </div>
      </header>

      <div className="flex gap-2 p-3 flex-wrap">
        <Button variant="outline" size="sm" className="rounded-full text-xs" onClick={() => {
          setAddingMarker(true);
          if (leafletMap.current) leafletMap.current.getContainer().style.cursor = "crosshair";
          toast.info("Tap the map to place a marker");
        }}>
          <MapPin className="w-3 h-3 mr-1" /> Add Marker
        </Button>
        <Badge variant="secondary" className="text-xs"><Layers className="w-3 h-3 mr-1" />{plots.length} plots</Badge>
        <Badge variant="secondary" className="text-xs"><MapPin className="w-3 h-3 mr-1" />{markers.length} markers</Badge>
        {sensors.length > 0 && (
          <Badge variant="default" className="text-xs">📡 {sensors.length} sensors</Badge>
        )}
      </div>

      <div className="flex-1 mx-3 mb-3 rounded-2xl overflow-hidden border border-border/50 shadow-lg relative" style={{ minHeight: "55vh" }}>
        {mapLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80">
            <div className="text-center space-y-2">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
              <p className="text-xs text-muted-foreground">Loading map...</p>
            </div>
          </div>
        )}
        <div ref={mapRef} style={{ height: "100%", width: "100%" }} />
      </div>

      {plots.length > 0 && (
        <div className="px-3 pb-3">
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2"><Layers className="w-4 h-4" />My Plots</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {plots.map((p) => (
                <div key={p.id} className="flex items-center justify-between p-2.5 bg-muted/40 rounded-xl text-sm">
                  <div>
                    <p className="font-medium">{p.name}</p>
                    {p.area_sqm && <Badge variant="outline" className="text-[10px] mt-0.5">{(p.area_sqm / 10000).toFixed(2)} ha</Badge>}
                  </div>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 rounded-full" onClick={() => handleDeletePlot(p.id)}>
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="rounded-3xl">
          <DialogHeader><DialogTitle>Save Plot</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name</Label><Input placeholder="e.g., North Field" value={plotName} onChange={(e) => setPlotName(e.target.value)} className="rounded-xl" /></div>
            <div><Label>Description</Label><Input placeholder="Optional" value={plotDescription} onChange={(e) => setPlotDescription(e.target.value)} className="rounded-xl" /></div>
            {pendingArea > 0 && <Badge variant="secondary">{(pendingArea / 10000).toFixed(2)} hectares</Badge>}
            <Button className="w-full rounded-xl" onClick={handleSavePlot} disabled={!plotName}>Save</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={markerDialogOpen} onOpenChange={setMarkerDialogOpen}>
        <DialogContent className="rounded-3xl">
          <DialogHeader><DialogTitle>Add Marker</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Label</Label><Input placeholder="e.g., Sensor A" value={markerLabel} onChange={(e) => setMarkerLabel(e.target.value)} className="rounded-xl" /></div>
            <div>
              <Label>Type</Label>
              <div className="flex gap-2 mt-1">
                {["sensor", "crop", "zone"].map((t) => (
                  <Button key={t} size="sm" variant={markerType === t ? "default" : "outline"} className="rounded-full text-xs" onClick={() => setMarkerType(t)}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </Button>
                ))}
              </div>
            </div>
            <Button className="w-full rounded-xl" onClick={handleSaveMarker} disabled={!markerLabel}>Add</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FarmMap;
