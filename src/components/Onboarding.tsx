import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Droplet, Sprout, Calendar, Leaf, ArrowRight, ArrowLeft, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface OnboardingProps {
  open: boolean;
  onComplete: () => void;
}

const steps = [
  {
    title: "Welcome to AgroEye",
    description: "Your smart agricultural monitoring companion",
    icon: Leaf,
    content: "Track soil moisture, fertility, and manage watering schedules all in one place. Let's get you started!",
  },
  {
    title: "Monitor Soil Moisture",
    description: "Keep your crops perfectly hydrated",
    icon: Droplet,
    content: "Add moisture readings manually or connect sensors for automatic monitoring. Get alerts when levels are low.",
  },
  {
    title: "Track Soil Fertility",
    description: "Optimize NPK levels for healthy growth",
    icon: Sprout,
    content: "Log nitrogen, phosphorus, and potassium levels. Get recommendations based on your readings.",
  },
  {
    title: "Schedule Watering",
    description: "Never miss a watering session",
    icon: Calendar,
    content: "Create custom watering schedules and receive timely notifications. Manage multiple crops with ease.",
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
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleComplete = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("user_preferences")
      .upsert({
        user_id: user.id,
        onboarding_completed: true,
      });

    if (error) {
      toast.error("Failed to save onboarding progress");
    } else {
      onComplete();
    }
  };

  const StepIcon = steps[currentStep].icon;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleSkip()}>
      <DialogContent className="max-w-md">
        <div className="space-y-6">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <StepIcon className="w-6 h-6 text-primary" />
                </div>
                <span className="text-sm text-muted-foreground">
                  Step {currentStep + 1} of {steps.length}
                </span>
              </div>
              <h2 className="text-2xl font-bold">{steps[currentStep].title}</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {steps[currentStep].description}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSkip}
              className="shrink-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          <Card className="bg-muted/50">
            <CardContent className="pt-6">
              <p className="text-center">{steps[currentStep].content}</p>
            </CardContent>
          </Card>

          <div className="flex items-center justify-center gap-2">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`h-2 rounded-full transition-all ${
                  index === currentStep
                    ? "w-8 bg-primary"
                    : "w-2 bg-muted-foreground/30"
                }`}
              />
            ))}
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 0}
              className="flex-1"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <Button onClick={handleNext} className="flex-1">
              {currentStep === steps.length - 1 ? (
                "Get Started"
              ) : (
                <>
                  Next
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </div>

          <button
            onClick={handleSkip}
            className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Skip tutorial
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default Onboarding;
