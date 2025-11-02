import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ArrowLeft, TrendingUp, Droplets, Leaf } from "lucide-react";
import { useNavigate } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Crop {
  id: string;
  name: string;
  crop_type: string;
}

interface CropStats {
  crop_id: string;
  crop_name: string;
  avg_moisture: number;
  avg_fertility: number;
  reading_count: number;
  latest_reading: string;
}

const CropComparison = () => {
  const navigate = useNavigate();
  const [crops, setCrops] = useState<Crop[]>([]);
  const [stats, setStats] = useState<CropStats[]>([]);
  const [selectedMetric, setSelectedMetric] = useState<'moisture' | 'fertility'>('moisture');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Fetch crops
    const { data: cropsData } = await supabase
      .from('crops')
      .select('id, name, crop_type')
      .eq('user_id', user.id)
      .eq('is_active', true);

    if (cropsData) {
      setCrops(cropsData);
      await fetchStats(cropsData.map(c => c.id));
    }
  };

  const fetchStats = async (cropIds: string[]) => {
    const statsPromises = cropIds.map(async (cropId) => {
      const crop = crops.find(c => c.id === cropId);
      
      const { data: moistureData } = await supabase
        .from('moisture_readings')
        .select('moisture_level, created_at')
        .eq('crop_id', cropId)
        .order('created_at', { ascending: false })
        .limit(10);

      const { data: fertilityData } = await supabase
        .from('fertility_readings')
        .select('overall_fertility, created_at')
        .eq('crop_id', cropId)
        .order('created_at', { ascending: false })
        .limit(10);

      const avgMoisture = moistureData?.length 
        ? moistureData.reduce((sum, r) => sum + r.moisture_level, 0) / moistureData.length 
        : 0;

      const avgFertility = fertilityData?.length 
        ? fertilityData.reduce((sum, r) => sum + (r.overall_fertility || 0), 0) / fertilityData.length 
        : 0;

      return {
        crop_id: cropId,
        crop_name: crop?.name || 'Unknown',
        avg_moisture: Math.round(avgMoisture),
        avg_fertility: Math.round(avgFertility),
        reading_count: (moistureData?.length || 0) + (fertilityData?.length || 0),
        latest_reading: moistureData?.[0]?.created_at || fertilityData?.[0]?.created_at || ''
      };
    });

    const statsData = await Promise.all(statsPromises);
    setStats(statsData.filter(s => s.reading_count > 0));
  };

  const chartData = stats.map(stat => ({
    name: stat.crop_name,
    [selectedMetric]: selectedMetric === 'moisture' ? stat.avg_moisture : stat.avg_fertility,
  }));

  const getBestCrop = () => {
    if (stats.length === 0) return null;
    return stats.reduce((best, current) => 
      (selectedMetric === 'moisture' ? current.avg_moisture : current.avg_fertility) > 
      (selectedMetric === 'moisture' ? best.avg_moisture : best.avg_fertility) 
        ? current : best
    );
  };

  const bestCrop = getBestCrop();

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="bg-primary text-primary-foreground p-6 shadow-lg">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/crops')}
            className="text-primary-foreground hover:bg-primary-foreground/20"
          >
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <TrendingUp className="w-8 h-8" />
              Crop Comparison
            </h1>
            <p className="text-sm opacity-90">Compare performance across crops</p>
          </div>
        </div>
      </header>

      <main className="p-4 space-y-4 max-w-4xl mx-auto">
        {stats.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center text-muted-foreground">
              <p>No crop data available for comparison.</p>
              <p className="text-sm mt-2">Add readings to your crops to see comparisons.</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Performance Comparison</span>
                  <Select value={selectedMetric} onValueChange={(v: 'moisture' | 'fertility') => setSelectedMetric(v)}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="moisture">
                        <div className="flex items-center gap-2">
                          <Droplets className="w-4 h-4" />
                          Moisture
                        </div>
                      </SelectItem>
                      <SelectItem value="fertility">
                        <div className="flex items-center gap-2">
                          <Leaf className="w-4 h-4" />
                          Fertility
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar 
                      dataKey={selectedMetric} 
                      fill="hsl(var(--primary))"
                      name={selectedMetric === 'moisture' ? 'Avg Moisture (%)' : 'Avg Fertility (%)'}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {bestCrop && (
              <Card className="bg-primary/10">
                <CardHeader>
                  <CardTitle className="text-lg">🏆 Top Performer</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{bestCrop.crop_name}</p>
                  <p className="text-muted-foreground">
                    {selectedMetric === 'moisture' 
                      ? `${bestCrop.avg_moisture}% average moisture` 
                      : `${bestCrop.avg_fertility}% average fertility`
                    }
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    {bestCrop.reading_count} total readings
                  </p>
                </CardContent>
              </Card>
            )}

            <div className="grid gap-4">
              {stats.sort((a, b) => {
                const valA = selectedMetric === 'moisture' ? a.avg_moisture : a.avg_fertility;
                const valB = selectedMetric === 'moisture' ? b.avg_moisture : b.avg_fertility;
                return valB - valA;
              }).map((stat, index) => (
                <Card key={stat.crop_id}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>#{index + 1} {stat.crop_name}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Avg Moisture</p>
                        <p className="text-2xl font-bold">{stat.avg_moisture}%</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Avg Fertility</p>
                        <p className="text-2xl font-bold">{stat.avg_fertility}%</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Total Readings</p>
                        <p className="text-lg font-medium">{stat.reading_count}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Last Updated</p>
                        <p className="text-sm">
                          {stat.latest_reading ? new Date(stat.latest_reading).toLocaleDateString() : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </main>

      <BottomNav />
    </div>
  );
};

export default CropComparison;
