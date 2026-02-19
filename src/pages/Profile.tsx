import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User, LogOut, Mail, Download, Bell, Trash2, Globe, Camera, MapPin, CalendarDays, Activity, Moon, Sun, Languages, Info, Shield, HelpCircle } from "lucide-react";
import ProfileRankCard from "@/components/ProfileRankCard";
import { toast } from "sonner";
import { useTheme } from "@/components/ThemeProvider";
import BottomNav from "@/components/BottomNav";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

const Profile = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { theme, setTheme } = useTheme();
  const { t, i18n } = useTranslation();
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [notificationSettings, setNotificationSettings] = useState({
    enabled: true, moisture: true, schedule: true, alerts: true
  });
  const [userId, setUserId] = useState("");
  const [userStats, setUserStats] = useState({ daysActive: 0, totalReadings: 0, totalCrops: 0 });

  useEffect(() => {
    Promise.all([fetchProfile(), fetchUserStats(), checkNotificationPermission()]).then(() => setLoading(false));
  }, []);

  const fetchProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);
    setEmail(user.email || "");
    const { data: profile } = await supabase.from("profiles").select("full_name, bio, location, avatar_url").eq("id", user.id).maybeSingle();
    if (profile) {
      setFullName(profile.full_name || "");
      setBio(profile.bio || "");
      setLocation(profile.location || "");
      setAvatarUrl(profile.avatar_url || "");
    }
    const { data: prefs } = await supabase.from("user_preferences").select("*").eq("user_id", user.id).single();
    if (prefs) {
      setNotificationSettings({
        enabled: prefs.notifications_enabled ?? true,
        moisture: prefs.notification_moisture ?? true,
        schedule: prefs.notification_schedule ?? true,
        alerts: prefs.notification_alerts ?? true,
      });
    }
  };

  const fetchUserStats = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const [moistureData, fertilityData, cropsData, profileData] = await Promise.all([
      supabase.from("moisture_readings").select("id", { count: "exact" }).eq("user_id", user.id),
      supabase.from("fertility_readings").select("id", { count: "exact" }).eq("user_id", user.id),
      supabase.from("crops").select("id", { count: "exact" }).eq("user_id", user.id),
      supabase.from("profiles").select("created_at").eq("id", user.id).single(),
    ]);
    const totalReadings = (moistureData.count || 0) + (fertilityData.count || 0);
    let daysActive = 0;
    if (profileData.data?.created_at) {
      daysActive = Math.floor((Date.now() - new Date(profileData.data.created_at).getTime()) / 86400000);
    }
    setUserStats({ daysActive, totalReadings, totalCrops: cropsData.count || 0 });
  };

  const checkNotificationPermission = async () => {
    if ("Notification" in window) setNotificationsEnabled(Notification.permission === "granted");
  };

  const requestNotificationPermission = async () => {
    if (!("Notification" in window)) { toast.error("Notifications not supported"); return; }
    const permission = await Notification.requestPermission();
    if (permission === "granted") { setNotificationsEnabled(true); toast.success("Notifications enabled"); }
    else toast.error("Permission denied");
  };

  const exportData = async () => {
    setSaving(true);
    try {
      const [moistureData, fertilityData, schedulesData, cropsData] = await Promise.all([
        supabase.from("moisture_readings").select("*").eq("user_id", userId),
        supabase.from("fertility_readings").select("*").eq("user_id", userId),
        supabase.from("watering_schedules").select("*").eq("user_id", userId),
        supabase.from("crops").select("*").eq("user_id", userId),
      ]);
      const exportPayload = {
        exported_at: new Date().toISOString(),
        moisture_readings: moistureData.data || [],
        fertility_readings: fertilityData.data || [],
        watering_schedules: schedulesData.data || [],
        crops: cropsData.data || [],
      };
      const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `agroeye-data-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Data exported! Check your Downloads folder for the JSON file.");
    } catch { toast.error("Failed to export data"); }
    setSaving(false);
  };

  const clearAllData = async () => {
    setSaving(true);
    try {
      await Promise.all([
        supabase.from("moisture_readings").delete().eq("user_id", userId),
        supabase.from("fertility_readings").delete().eq("user_id", userId),
        supabase.from("watering_schedules").delete().eq("user_id", userId),
        supabase.from("alerts").delete().eq("user_id", userId),
        supabase.from("health_scores").delete().eq("user_id", userId),
      ]);
      toast.success("All data cleared");
    } catch { toast.error("Failed to clear data"); }
    setSaving(false);
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      const file = event.target.files?.[0];
      if (!file) return;
      if (!file.type.startsWith("image/")) { toast.error("Please upload an image file"); return; }
      const fileExt = file.name.split(".").pop();
      const fileName = `${userId}/${Math.random()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from("avatars").upload(fileName, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(fileName);
      await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("id", userId);
      setAvatarUrl(publicUrl);
      toast.success("Avatar updated!");
    } catch { toast.error("Failed to upload avatar"); }
    finally { setUploading(false); }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("profiles").update({ full_name: fullName, bio, location }).eq("id", user.id);
    await supabase.from("user_preferences").upsert({
      user_id: user.id,
      notifications_enabled: notificationSettings.enabled,
      notification_moisture: notificationSettings.moisture,
      notification_schedule: notificationSettings.schedule,
      notification_alerts: notificationSettings.alerts,
    }, { onConflict: "user_id" });
    toast.success("Profile updated!");
    setSaving(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate("/auth");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <header className="glass-header text-primary-foreground p-6">
          <div className="flex items-center gap-3"><User className="w-8 h-8" /><div><h1 className="text-2xl font-bold">{t("profile.title")}</h1></div></div>
        </header>
        <main className="p-4 space-y-4 max-w-lg mx-auto">
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-32 w-full rounded-2xl" />
          <Skeleton className="h-48 w-full rounded-2xl" />
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="glass-header text-primary-foreground p-6">
        <div className="flex items-center gap-3">
          <User className="w-8 h-8" />
          <div>
            <h1 className="text-2xl font-bold">{t("profile.title")}</h1>
            <p className="text-xs opacity-80">{t("profile.account")}</p>
          </div>
        </div>
      </header>

      <main className="p-4 space-y-4 max-w-lg mx-auto animate-fade-in">
        {/* Stats */}
        <Card className="glass-card">
          <CardContent className="pt-5 grid grid-cols-3 gap-4">
            <div className="text-center">
              <CalendarDays className="w-5 h-5 mx-auto mb-1 text-primary" />
              <p className="text-xl font-bold">{userStats.daysActive}</p>
              <p className="text-[10px] text-muted-foreground">Days Active</p>
            </div>
            <div className="text-center">
              <Activity className="w-5 h-5 mx-auto mb-1 text-primary" />
              <p className="text-xl font-bold">{userStats.totalReadings}</p>
              <p className="text-[10px] text-muted-foreground">Readings</p>
            </div>
            <div className="text-center">
              <Globe className="w-5 h-5 mx-auto mb-1 text-primary" />
              <p className="text-xl font-bold">{userStats.totalCrops}</p>
              <p className="text-[10px] text-muted-foreground">Crops</p>
            </div>
          </CardContent>
        </Card>

        <ProfileRankCard />

        {/* Avatar */}
        <Card className="glass-card">
          <CardContent className="pt-5 flex flex-col items-center gap-3">
            <Avatar className="w-20 h-20">
              <AvatarImage src={avatarUrl} alt={fullName} />
              <AvatarFallback className="text-xl">{fullName.split(" ").map(n => n[0]).join("").toUpperCase() || "U"}</AvatarFallback>
            </Avatar>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
            <Button variant="outline" size="sm" className="rounded-xl" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
              <Camera className="w-4 h-4 mr-1" /> {uploading ? "Uploading..." : "Change Avatar"}
            </Button>
          </CardContent>
        </Card>

        {/* Account Form */}
        <Card className="glass-card">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Account Information</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleUpdate} className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">Full Name</Label>
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} className="rounded-xl h-10" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Email</Label>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <Input value={email} disabled className="flex-1 rounded-xl h-10" />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Location</Label>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Your farm location" className="flex-1 rounded-xl h-10" />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Bio</Label>
                <Textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell us about your farm..." rows={2} className="rounded-xl" />
              </div>
              <Button type="submit" className="w-full rounded-xl h-10" disabled={saving}>
                {saving ? "Saving..." : "Update Profile"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Settings */}
        <Card className="glass-card">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Settings</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {theme === "dark" ? <Moon className="w-4 h-4 text-muted-foreground" /> : <Sun className="w-4 h-4 text-muted-foreground" />}
                <Label className="text-sm">{t("profile.theme")}</Label>
              </div>
              <Switch checked={theme === "dark"} onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")} />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Languages className="w-4 h-4 text-muted-foreground" />
                <Label className="text-sm">{t("profile.language")}</Label>
              </div>
              <Select value={i18n.language} onValueChange={(v) => i18n.changeLanguage(v)}>
                <SelectTrigger className="w-28 h-9 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="hi">हिन्दी</SelectItem>
                  <SelectItem value="mr">मराठी</SelectItem>
                  <SelectItem value="ur">اردو</SelectItem>
                  <SelectItem value="ta">தமிழ்</SelectItem>
                  <SelectItem value="te">తెలుగు</SelectItem>
                  <SelectItem value="kn">ಕನ್ನಡ</SelectItem>
                  <SelectItem value="bn">বাংলা</SelectItem>
                  <SelectItem value="es">Español</SelectItem>
                  <SelectItem value="fr">Français</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-muted-foreground" />
                <Label className="text-sm">{t("profile.notifications")}</Label>
              </div>
              <Switch checked={notificationsEnabled} onCheckedChange={(checked) => { if (checked) requestNotificationPermission(); else toast.info("Disable in browser settings"); }} />
            </div>

            <div className="pt-3 border-t border-border/50">
              <h3 className="font-semibold mb-2 text-xs text-muted-foreground uppercase tracking-wider">Notification Preferences</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">{t("profile.notificationsEnabled")}</Label>
                  <Switch checked={notificationSettings.enabled} onCheckedChange={(c) => setNotificationSettings({ ...notificationSettings, enabled: c })} />
                </div>
                {notificationSettings.enabled && (
                  <>
                    <div className="flex items-center justify-between pl-3">
                      <Label className="text-xs">{t("profile.moistureAlerts")}</Label>
                      <Switch checked={notificationSettings.moisture} onCheckedChange={(c) => setNotificationSettings({ ...notificationSettings, moisture: c })} />
                    </div>
                    <div className="flex items-center justify-between pl-3">
                      <Label className="text-xs">{t("profile.scheduleReminders")}</Label>
                      <Switch checked={notificationSettings.schedule} onCheckedChange={(c) => setNotificationSettings({ ...notificationSettings, schedule: c })} />
                    </div>
                    <div className="flex items-center justify-between pl-3">
                      <Label className="text-xs">{t("profile.generalAlerts")}</Label>
                      <Switch checked={notificationSettings.alerts} onCheckedChange={(c) => setNotificationSettings({ ...notificationSettings, alerts: c })} />
                    </div>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Data Management */}
        <Card className="glass-card">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Data Management</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="bg-primary/5 rounded-xl p-3 border border-primary/10">
              <p className="text-xs text-muted-foreground">
                <strong className="text-foreground">Export:</strong> Downloads all your readings, schedules, and crop data as a JSON file. Open it in any text editor or import into spreadsheet software.
              </p>
            </div>
            <Button variant="outline" className="w-full rounded-xl" onClick={exportData} disabled={saving}>
              <Download className="w-4 h-4 mr-2" /> Export All Data
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="w-full rounded-xl text-destructive hover:text-destructive">
                  <Trash2 className="w-4 h-4 mr-2" /> Clear All Data
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="rounded-3xl">
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete all your moisture readings, fertility data, schedules, and alerts. This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={clearAllData} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl">Delete All</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>

        {/* App Info */}
        <Card className="glass-card">
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Info className="w-4 h-4" />App Information</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">App Name</span><span className="font-medium">AgroEye</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Version</span><span className="font-medium">2.0.0</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Platform</span><span className="font-medium">PWA (Mobile)</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Languages</span><span className="font-medium">10 supported</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Data Security</span><span className="font-medium flex items-center gap-1"><Shield className="w-3 h-3 text-primary" />RLS Protected</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Features</span><span className="font-medium">AI, IoT, Maps</span></div>
            <div className="pt-2 border-t border-border/50">
              <p className="text-xs text-muted-foreground">AgroEye helps farmers monitor crops, soil, and weather with smart analytics. Built with ❤️ for sustainable farming.</p>
            </div>
          </CardContent>
        </Card>

        <Button variant="destructive" className="w-full rounded-xl h-11" onClick={handleSignOut}>
          <LogOut className="w-5 h-5 mr-2" /> Sign Out
        </Button>
      </main>

      <BottomNav />
    </div>
  );
};

export default Profile;
