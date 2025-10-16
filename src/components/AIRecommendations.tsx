import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, AlertCircle, Info, TrendingUp, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Recommendation {
  priority: "high" | "medium" | "low";
  category: "watering" | "fertilization" | "monitoring" | "maintenance";
  title: string;
  description: string;
  impact: string;
}

const AIRecommendations = () => {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchRecommendations = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-recommendations");

      if (error) throw error;

      if (data?.recommendations) {
        setRecommendations(data.recommendations);
      }
    } catch (error) {
      console.error("Error fetching recommendations:", error);
      toast({
        title: "Error",
        description: "Failed to load AI recommendations. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecommendations();
  }, []);

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case "high":
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      case "medium":
        return <Info className="h-4 w-4 text-warning" />;
      default:
        return <TrendingUp className="h-4 w-4 text-primary" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "destructive";
      case "medium":
        return "secondary";
      default:
        return "outline";
    }
  };

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, string> = {
      watering: "💧",
      fertilization: "🌱",
      monitoring: "📊",
      maintenance: "🔧",
    };
    return icons[category] || "📋";
  };

  return (
    <Card className="bg-gradient-to-br from-primary/5 to-primary/10">
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <div>
            <CardTitle>AI Recommendations</CardTitle>
            <CardDescription>Smart insights based on your data</CardDescription>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchRecommendations}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading && (
          <div className="text-center py-8 text-muted-foreground">
            <div className="animate-pulse">Analyzing your farm data...</div>
          </div>
        )}

        {!loading && recommendations.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Sparkles className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Add some readings to get personalized recommendations!</p>
          </div>
        )}

        {!loading &&
          recommendations.map((rec, idx) => (
            <div
              key={idx}
              className="bg-card rounded-lg p-4 border border-border hover:border-primary/50 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="text-2xl mt-1">{getCategoryIcon(rec.category)}</div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-semibold text-foreground">{rec.title}</h4>
                    <div className="flex items-center gap-1">
                      {getPriorityIcon(rec.priority)}
                      <Badge variant={getPriorityColor(rec.priority)} className="text-xs">
                        {rec.priority}
                      </Badge>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {rec.category}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{rec.description}</p>
                  <div className="flex items-start gap-2 bg-muted/50 rounded p-2">
                    <TrendingUp className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-foreground">
                      <span className="font-medium">Impact:</span> {rec.impact}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
      </CardContent>
    </Card>
  );
};

export default AIRecommendations;
