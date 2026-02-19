import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Droplet, Sprout, Calendar, Leaf, ArrowRight, ArrowLeft, X, Wifi, Map, Trophy, Bug } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface OnboardingProps {
  open: boolean;
  onComplete: () => void;
}

const steps = [
  {
    title: "Welcome to AgroEye 🌾",
    description: "Your smart farming companion",
    icon: Leaf,
    content: "Track soil moisture, fertility, weather, pests, and manage watering schedules — all from your phone. Let's show you around!",
    tip: "Tap 'Next' to continue or 'Skip' anytime.",
  },
  {
    title: "Soil Moisture 💧",
    description: "Monitor water levels in real-time",
    icon: Droplet,
    content: "Go to the Moisture tab to see current levels. You can add manual readings or pair an IoT sensor for automatic updates.",
    tip: "To pair a sensor: Enter a name and tap '+', or scan a QR code on your sensor device.",
  },
  {
    title: "Crop Management 🌱",
    description: "Track all your crops",
    icon: Sprout,
    content: "Add crops with photos, planting dates, and harvest estimates. Monitor their health score and compare performance across crops.",
    tip: "Tap the Crops icon in the bottom bar to get started.",
  },
  {
    title: "Watering Schedule ⏰",
    description: "Never miss a watering session",
    icon: Calendar,
    content: "Create custom watering schedules for different days. Enable notifications so you never forget!",
    tip: "Tap the Schedule tab to create your first watering plan.",
  },
  {
    title: "Farm Map 🗺️",
    description: "Map your farmland boundaries",
    icon: Map,
    content: "Draw polygon boundaries on the satellite map to measure your farm area. Place markers for sensors, crops, and zones.",
    tip: "Access Farm Map from Quick Actions on the dashboard.",
  },
  {
    title: "IoT Sensors 📡",
    description: "Connect hardware sensors",
    icon: Wifi,
    content: "Pair moisture sensors by entering the sensor code or scanning its QR code. Sensors send data automatically to your dashboard.",
    tip: "Each sensor gets a unique code (e.g., AGRO-XXXX). Share this code to configure your hardware.",
  },
  {
    title: "AI & Pest Detection 🐛",
    description: "Smart farming insights",
    icon: Bug,
    content: "Get AI-powered recommendations based on your data. Take a photo of affected plants for instant pest/disease identification.",
    tip: "Ask 'Sprout' 🌱 (our AI chatbot) any farming question anytime!",
  },
  {
    title: "Leaderboard & Achievements 🏆",
    description: "Gamified farming experience",
    icon: Trophy,
    content: "Earn XP for adding readings, managing crops, and staying active. Climb the leaderboard and unlock achievement badges!",
    tip: "Check your rank on the Profile page.",
  },
];

const Onboarding = ({ open, onComplete }: OnboardingProps) => {
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  const handleSkip = () => handleComplete();

  const handleComplete = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("user_preferences").upsert({ user_id: user.id, onboarding_completed: true });
    if (error) toast.error("Failed to save onboarding progress");
    else onComplete();
  };

  const StepIcon = steps[currentStep].icon;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleSkip()}>
      <DialogContent className="max-w-sm rounded-3xl glass-card border-0">
        <div className="space-y-5">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2.5 bg-primary/10 rounded-2xl">
                  <StepIcon className="w-6 h-6 text-primary" />
                </div>
                <span className="text-xs text-muted-foreground font-medium">
                  {currentStep + 1} / {steps.length}
                </span>
              </div>
              <h2 className="text-xl font-bold">{steps[currentStep].title}</h2>
              <p className="text-xs text-muted-foreground mt-0.5">{steps[currentStep].description}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={handleSkip} className="shrink-0 rounded-full h-8 w-8">
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="bg-muted/50 rounded-2xl p-4">
            <p className="text-sm leading-relaxed">{steps[currentStep].content}</p>
          </div>

          <div className="bg-primary/5 rounded-2xl p-3 border border-primary/10">
            <p className="text-xs text-primary font-medium">💡 {steps[currentStep].tip}</p>
          </div>

          {/* Progress dots */}
          <div className="flex items-center justify-center gap-1.5">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  index === currentStep ? "w-6 bg-primary" : index < currentStep ? "w-1.5 bg-primary/50" : "w-1.5 bg-muted-foreground/20"
                }`}
              />
            ))}
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={handleBack} disabled={currentStep === 0} className="flex-1 rounded-2xl h-11">
              <ArrowLeft className="w-4 h-4 mr-1" /> Back
            </Button>
            <Button onClick={handleNext} className="flex-1 rounded-2xl h-11">
              {currentStep === steps.length - 1 ? "Get Started! 🚀" : <>Next <ArrowRight className="w-4 h-4 ml-1" /></>}
            </Button>
          </div>

          <button onClick={handleSkip} className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors">
            Skip tutorial
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default Onboarding;
