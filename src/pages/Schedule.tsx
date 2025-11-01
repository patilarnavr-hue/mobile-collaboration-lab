import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Calendar, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import BottomNav from "@/components/BottomNav";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import EmptyState from "@/components/EmptyState";

interface Schedule {
  id: string;
  title: string;
  days_of_week: string[];
  time_of_day: string;
  is_enabled: boolean;
  created_at: string;
}

const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const Schedule = () => {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [title, setTitle] = useState("");
  const [timeOfDay, setTimeOfDay] = useState("");
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    fetchSchedules();

    const channel = supabase
      .channel("schedules_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "watering_schedules",
        },
        () => {
          fetchSchedules();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchSchedules = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("watering_schedules")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to fetch schedules");
    } else {
      setSchedules(data || []);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedDays.length === 0) {
      toast.error("Please select at least one day");
      return;
    }

    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("watering_schedules").insert({
      user_id: user.id,
      title,
      days_of_week: selectedDays,
      time_of_day: timeOfDay,
      is_enabled: true,
    });

    if (error) {
      toast.error("Failed to create schedule");
    } else {
      toast.success("Schedule created successfully");
      setTitle("");
      setTimeOfDay("");
      setSelectedDays([]);
      setDialogOpen(false);
    }
    setLoading(false);
  };

  const toggleDay = (day: string) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const toggleSchedule = async (id: string, currentState: boolean) => {
    const { error } = await supabase
      .from("watering_schedules")
      .update({ is_enabled: !currentState })
      .eq("id", id);

    if (error) {
      toast.error("Failed to update schedule");
    } else {
      const message = currentState ? "Schedule disabled" : "Schedule enabled";
      toast.success(message);
      
      // Request notification permission if enabling schedule
      if (!currentState && "Notification" in window && Notification.permission === "default") {
        const permission = await Notification.requestPermission();
        if (permission === "granted") {
          toast.success("Notifications enabled for this schedule");
        }
      }
    }
  };

  const deleteSchedule = async (id: string) => {
    const { error } = await supabase
      .from("watering_schedules")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Failed to delete schedule");
    } else {
      toast.success("Schedule deleted");
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="bg-primary text-primary-foreground p-6 shadow-lg">
        <div className="flex items-center gap-3">
          <Calendar className="w-8 h-8" />
          <div>
            <h1 className="text-2xl font-bold">Watering Schedule</h1>
            <p className="text-sm opacity-90">Manage your watering times</p>
          </div>
        </div>
      </header>

      <main className="p-4 space-y-4 max-w-lg mx-auto">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full" size="lg">
              <Plus className="w-5 h-5 mr-2" />
              Add New Schedule
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Watering Schedule</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Schedule Name</Label>
                <Input
                  id="title"
                  placeholder="e.g., Morning Watering"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="time">Time</Label>
                <Input
                  id="time"
                  type="time"
                  value={timeOfDay}
                  onChange={(e) => setTimeOfDay(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Days of Week</Label>
                <div className="flex flex-wrap gap-2">
                  {daysOfWeek.map((day) => (
                    <Button
                      key={day}
                      type="button"
                      variant={selectedDays.includes(day) ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleDay(day)}
                    >
                      {day}
                    </Button>
                  ))}
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Creating..." : "Create Schedule"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {schedules.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="No Watering Schedules"
            description="Create your first watering schedule to never miss a watering session. Get timely notifications."
            actionLabel="Create Schedule"
            onAction={() => setDialogOpen(true)}
          />
        ) : (
          <div className="space-y-3">
            {schedules.map((schedule) => (
              <Card key={schedule.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{schedule.title}</CardTitle>
                    <Switch
                      checked={schedule.is_enabled}
                      onCheckedChange={() =>
                        toggleSchedule(schedule.id, schedule.is_enabled)
                      }
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-2xl font-bold text-primary">
                      {schedule.time_of_day}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {schedule.days_of_week.map((day) => (
                        <span
                          key={day}
                          className="px-2 py-1 bg-secondary text-secondary-foreground rounded text-xs font-medium"
                        >
                          {day}
                        </span>
                      ))}
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="w-full mt-4"
                      onClick={() => deleteSchedule(schedule.id)}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Schedule
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
};

export default Schedule;
