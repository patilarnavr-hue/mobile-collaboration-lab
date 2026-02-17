import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Cloud, Droplets, Wind, ThermometerSun, Sun, Gauge, Leaf } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

interface WeatherData {
  temperature: number;
  humidity: number;
  condition: string;
  precipitation: number;
  windSpeed: number;
}

const WeatherWidget = () => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [locationName, setLocationName] = useState("Detecting...");

  useEffect(() => {
    getLocationAndFetch();
  }, []);

  const getLocationAndFetch = () => {
    if (!navigator.geolocation) {
      fetchWeather(20.5937, 78.9629, "Default Location");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        // Reverse geocode for location name
        try {
          const res = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m&timezone=auto`
          );
          const data = await res.json();
          setLocationName(data.timezone?.replace(/_/g, " ").split("/").pop() || "Your Farm");
        } catch {
          setLocationName("Your Farm");
        }
        fetchWeather(latitude, longitude, "Your Farm");
      },
      () => {
        setLocationName("Default Location");
        fetchWeather(20.5937, 78.9629, "Default Location");
      },
      { timeout: 5000 }
    );
  };

  const fetchWeather = async (lat: number, lon: number, name: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("weather-data", {
        body: { location: { lat, lon, name } },
      });

      if (error) throw error;
      setWeather(data.current);
    } catch (error) {
      console.error("Error fetching weather:", error);
    } finally {
      setLoading(false);
    }
  };

  // Farming-relevant calculations
  const getDewPoint = (temp: number, humidity: number) => {
    const a = 17.27, b = 237.7;
    const gamma = (a * temp) / (b + temp) + Math.log(humidity / 100);
    return (b * gamma) / (a - gamma);
  };

  const getFrostRisk = (temp: number) => {
    if (temp <= 0) return { level: "High", color: "destructive" as const };
    if (temp <= 4) return { level: "Medium", color: "secondary" as const };
    return { level: "Low", color: "default" as const };
  };

  const getSprayCondition = (windSpeed: number, humidity: number) => {
    if (windSpeed > 15 || humidity < 40) return "Poor";
    if (windSpeed > 10 || humidity < 50) return "Fair";
    return "Good";
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cloud className="w-5 h-5" />
            Weather
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse text-muted-foreground">Detecting location...</div>
        </CardContent>
      </Card>
    );
  }

  if (!weather) return null;

  const dewPoint = getDewPoint(weather.temperature, weather.humidity);
  const frost = getFrostRisk(weather.temperature);
  const sprayCondition = getSprayCondition(weather.windSpeed, weather.humidity);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Cloud className="w-5 h-5" />
          Weather — {locationName}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Core metrics */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2">
              <ThermometerSun className="w-4 h-4 text-orange-500 flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Temperature</p>
                <p className="font-semibold">{weather.temperature.toFixed(1)}°C</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Droplets className="w-4 h-4 text-blue-500 flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Humidity</p>
                <p className="font-semibold">{weather.humidity}%</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Wind className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Wind Speed</p>
                <p className="font-semibold">{weather.windSpeed.toFixed(1)} km/h</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Cloud className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Precipitation</p>
                <p className="font-semibold">{weather.precipitation} mm</p>
              </div>
            </div>
          </div>

          {/* Farming insights */}
          <div className="pt-3 border-t space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Farming Insights</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground">Dew Point</p>
                <p className="text-sm font-semibold">{dewPoint.toFixed(1)}°C</p>
              </div>
              <div className="p-2 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground">Frost Risk</p>
                <Badge variant={frost.color} className="text-xs">{frost.level}</Badge>
              </div>
              <div className="p-2 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground">Spray Conditions</p>
                <p className="text-sm font-semibold">{sprayCondition}</p>
              </div>
              <div className="p-2 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground">Condition</p>
                <p className="text-sm font-semibold">{weather.condition}</p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default WeatherWidget;
