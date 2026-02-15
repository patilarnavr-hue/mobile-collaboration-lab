import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bug, Camera, Upload, ArrowLeft, AlertTriangle, CheckCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import BottomNav from "@/components/BottomNav";

interface DetectionResult {
  disease_name: string;
  confidence: string;
  severity: string;
  description: string;
  treatment: string[];
  prevention: string[];
}

const PestDetection = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DetectionResult | null>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(reader.result as string);
      setResult(null);
    };
    reader.readAsDataURL(file);
  };

  const analyzeImage = async () => {
    if (!imagePreview) return;
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please log in first");
        return;
      }

      const response = await supabase.functions.invoke("pest-detection", {
        body: { image: imagePreview },
      });

      if (response.error) throw response.error;
      setResult(response.data.result);
      toast.success("Analysis complete!");
    } catch (err) {
      toast.error("Failed to analyze image. Try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case "high": return "destructive";
      case "medium": return "default";
      case "low": return "secondary";
      default: return "outline";
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="bg-primary text-primary-foreground p-6 shadow-lg">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="text-primary-foreground hover:bg-primary/80">
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <Bug className="w-8 h-8" />
          <div>
            <h1 className="text-2xl font-bold">Pest & Disease Detection</h1>
            <p className="text-sm opacity-90">AI-powered crop health analysis</p>
          </div>
        </div>
      </header>

      <main className="p-4 space-y-4 max-w-lg mx-auto">
        {/* Upload Section */}
        <Card>
          <CardHeader>
            <CardTitle>Upload Crop Image</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleImageSelect}
            />

            {imagePreview ? (
              <div className="relative">
                <img
                  src={imagePreview}
                  alt="Crop preview"
                  className="w-full h-64 object-cover rounded-lg"
                />
                <Button
                  size="sm"
                  variant="secondary"
                  className="absolute top-2 right-2"
                  onClick={() => { setImagePreview(null); setResult(null); }}
                >
                  Change
                </Button>
              </div>
            ) : (
              <div
                className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <Camera className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                <p className="font-medium">Take a Photo or Upload</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Capture a close-up of the affected leaf or plant
                </p>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                className="flex-1"
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload
              </Button>
              <Button
                className="flex-1"
                disabled={!imagePreview || loading}
                onClick={analyzeImage}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Bug className="w-4 h-4 mr-2" />
                    Analyze
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {result && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  {result.severity.toLowerCase() === "none" ? (
                    <CheckCircle className="w-5 h-5 text-primary" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-destructive" />
                  )}
                  Detection Result
                </CardTitle>
                <Badge variant={getSeverityColor(result.severity)}>
                  {result.severity} Severity
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-bold text-lg">{result.disease_name}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Confidence: {result.confidence}
                </p>
              </div>

              <p className="text-sm">{result.description}</p>

              <div>
                <h4 className="font-semibold mb-2 text-sm">🧪 Treatment</h4>
                <ul className="space-y-1">
                  {result.treatment.map((t, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex gap-2">
                      <span>•</span>
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-2 text-sm">🛡️ Prevention</h4>
                <ul className="space-y-1">
                  {result.prevention.map((p, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex gap-2">
                      <span>•</span>
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tips */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">📸 Tips for Best Results</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>• Take close-up photos of affected leaves or stems</p>
            <p>• Ensure good lighting (natural daylight works best)</p>
            <p>• Include both healthy and affected areas if possible</p>
            <p>• Avoid blurry images — hold your phone steady</p>
          </CardContent>
        </Card>
      </main>

      <BottomNav />
    </div>
  );
};

export default PestDetection;
