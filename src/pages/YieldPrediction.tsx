import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, ArrowLeft, Loader2, BarChart3, Sprout } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import CropSelector from "@/components/CropSelector";

interface YieldResult {
  estimated_yield: string;
  confidence: string;
  factors: { name: string; impact: string; status: string }[];
  recommendations: string[];
  timeline: string;
}

const YieldPrediction = () => {
  const navigate = useNavigate();
  const [selectedCrop, setSelectedCrop] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<YieldResult | null>(null);

  const predict = async () => {
    if (!selectedCrop) {
      toast.error("Select a crop first");
      return;
    }
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please log in first");
        return;
      }

      const response = await supabase.functions.invoke("yield-prediction", {
        body: { crop_id: selectedCrop },
      });

      if (response.error) throw response.error;
      setResult(response.data.prediction);
      toast.success("Prediction generated!");
    } catch (err) {
      toast.error("Failed to generate prediction");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "good": return "text-primary";
      case "warning": return "text-accent";
      case "critical": return "text-destructive";
      default: return "text-muted-foreground";
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="bg-primary text-primary-foreground p-6 shadow-lg">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="text-primary-foreground hover:bg-primary/80">
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <TrendingUp className="w-8 h-8" />
          <div>
            <h1 className="text-2xl font-bold">Yield Prediction</h1>
            <p className="text-sm opacity-90">AI-powered harvest forecasting</p>
          </div>
        </div>
      </header>

      <main className="p-4 space-y-4 max-w-lg mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Select Crop to Predict</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <CropSelector value={selectedCrop} onChange={(v) => setSelectedCrop(v || undefined)} />
            <Button className="w-full" disabled={!selectedCrop || loading} onClick={predict}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing Data...
                </>
              ) : (
                <>
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Generate Prediction
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {result && (
          <>
            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sprout className="w-5 h-5 text-primary" />
                  Yield Estimate
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-center py-4">
                  <div className="text-4xl font-bold text-primary">{result.estimated_yield}</div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Confidence: {result.confidence}
                  </p>
                  <p className="text-sm text-muted-foreground">{result.timeline}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Contributing Factors</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {result.factors.map((f, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div>
                      <p className="font-medium text-sm">{f.name}</p>
                      <p className="text-xs text-muted-foreground">{f.impact}</p>
                    </div>
                    <span className={`text-sm font-semibold ${getStatusColor(f.status)}`}>
                      {f.status}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">💡 Recommendations to Improve Yield</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {result.recommendations.map((r, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex gap-2">
                      <span>•</span>
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </>
        )}
      </main>

      <BottomNav />
    </div>
  );
};

export default YieldPrediction;
