import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Cloud, Droplets, Wind, ThermometerSun } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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
  const { toast } = useToast();

  useEffect(() => {
    fetchWeather();
  }, []);

  const fetchWeather = async () => {
    try {
      // Get user's approximate location (you can enhance this with geolocation API)
      const { data, error } = await supabase.functions.invoke('weather-data', {
        body: { 
          location: { 
            lat: 0, // Default coordinates, can be enhanced with actual location
            lon: 0,
            name: 'Farm Location'
          } 
        }
      });

      if (error) throw error;

      setWeather(data.current);
    } catch (error) {
      console.error('Error fetching weather:', error);
      toast({
        title: "Weather Error",
        description: "Could not fetch weather data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
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
          <div className="animate-pulse">Loading weather...</div>
        </CardContent>
      </Card>
    );
  }

  if (!weather) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Cloud className="w-5 h-5" />
          Weather Conditions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ThermometerSun className="w-5 h-5 text-orange-500" />
              <span className="text-sm">Temperature</span>
            </div>
            <span className="font-semibold">{weather.temperature.toFixed(1)}°C</span>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Droplets className="w-5 h-5 text-blue-500" />
              <span className="text-sm">Humidity</span>
            </div>
            <span className="font-semibold">{weather.humidity}%</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wind className="w-5 h-5 text-gray-500" />
              <span className="text-sm">Wind Speed</span>
            </div>
            <span className="font-semibold">{weather.windSpeed.toFixed(1)} km/h</span>
          </div>

          <div className="pt-2 border-t">
            <p className="text-sm text-muted-foreground">Condition</p>
            <p className="text-lg font-semibold">{weather.condition}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default WeatherWidget;