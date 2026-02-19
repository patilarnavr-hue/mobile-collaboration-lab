import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Edit2, Sprout, Camera, Download, BarChart3 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";
import { exportToPDF } from "@/utils/exportPDF";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import BottomNav from "@/components/BottomNav";

interface Crop {
  id: string;
  name: string;
  crop_type: string;
  location: string;
  planting_date: string;
  expected_harvest_date: string;
  notes: string;
  is_active: boolean;
  image_url: string | null;
}

const Crops = () => {
  const navigate = useNavigate();
  const [crops, setCrops] = useState<Crop[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCrop, setEditingCrop] = useState<Crop | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    name: "", crop_type: "", location: "", planting_date: "", expected_harvest_date: "", notes: ""
  });

  useEffect(() => { fetchCrops(); }, []);

  const fetchCrops = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("crops").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    if (data) setCrops(data);
    setLoading(false);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async (cropId: string) => {
    if (!imageFile) return null;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const fileExt = imageFile.name.split(".").pop();
    const fileName = `${user.id}/${cropId}_${Date.now()}.${fileExt}`;
    const { error } = await supabase.storage.from("crop_images").upload(fileName, imageFile);
    if (error) return null;
    const { data: { publicUrl } } = supabase.storage.from("crop_images").getPublicUrl(fileName);
    return publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    let imageUrl = editingCrop?.image_url || null;

    if (editingCrop) {
      if (imageFile) imageUrl = await uploadImage(editingCrop.id);
      const { error } = await supabase.from("crops").update({ ...formData, image_url: imageUrl }).eq("id", editingCrop.id);
      if (error) { toast.error(error.message); return; }
      toast.success("Crop updated!");
    } else {
      const { data: newCrop, error } = await supabase.from("crops").insert({ ...formData, user_id: user.id }).select().single();
      if (error) { toast.error(error.message); return; }
      if (imageFile && newCrop) {
        imageUrl = await uploadImage(newCrop.id);
        await supabase.from("crops").update({ image_url: imageUrl }).eq("id", newCrop.id);
      }
      toast.success("Crop added!");
    }
    setFormData({ name: "", crop_type: "", location: "", planting_date: "", expected_harvest_date: "", notes: "" });
    setImageFile(null); setImagePreview(null); setEditingCrop(null); setIsDialogOpen(false);
    fetchCrops();
  };

  const handleExport = () => {
    const pdf = exportToPDF({
      title: "Crops Report", date: new Date().toLocaleDateString(),
      crops: crops.map(c => ({ name: c.name, type: c.crop_type, status: c.is_active ? "Active" : "Inactive" }))
    });
    pdf.save(`crops-report-${new Date().toISOString().split("T")[0]}.pdf`);
    toast.success("Report exported! Check your Downloads folder for the PDF file.");
  };

  const handleEdit = (crop: Crop) => {
    setEditingCrop(crop);
    setFormData({ name: crop.name, crop_type: crop.crop_type, location: crop.location || "", planting_date: crop.planting_date || "", expected_harvest_date: crop.expected_harvest_date || "", notes: crop.notes || "" });
    setImagePreview(crop.image_url); setImageFile(null); setIsDialogOpen(true);
  };

  const handleDelete = async (cropId: string) => {
    const { error } = await supabase.from("crops").delete().eq("id", cropId);
    if (error) toast.error(error.message);
    else { toast.success("Crop deleted"); fetchCrops(); }
  };

  const toggleActive = async (crop: Crop) => {
    await supabase.from("crops").update({ is_active: !crop.is_active }).eq("id", crop.id);
    fetchCrops();
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="glass-header text-primary-foreground p-6">
        <div className="flex items-center gap-3">
          <Sprout className="w-7 h-7" />
          <div>
            <h1 className="text-xl font-bold">Crop Management</h1>
            <p className="text-xs opacity-80">Manage your crops & zones</p>
          </div>
        </div>
      </header>

      <main className="p-4 space-y-4 max-w-lg mx-auto animate-fade-in">
        <div className="flex gap-2">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex-1 rounded-xl h-10" onClick={() => {
                setEditingCrop(null); setImageFile(null); setImagePreview(null);
                setFormData({ name: "", crop_type: "", location: "", planting_date: "", expected_harvest_date: "", notes: "" });
              }}>
                <Plus className="w-4 h-4 mr-1" /> Add Crop
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-3xl">
              <DialogHeader><DialogTitle>{editingCrop ? "Edit Crop" : "Add New Crop"}</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <Label className="text-xs">Crop Photo</Label>
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                  <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} className="w-full rounded-xl mt-1">
                    <Camera className="w-4 h-4 mr-1" /> {imagePreview ? "Change Photo" : "Add Photo"}
                  </Button>
                  {imagePreview && <img src={imagePreview} alt="Preview" className="mt-2 w-full h-32 object-cover rounded-xl" />}
                </div>
                <div><Label className="text-xs">Crop Name *</Label><Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required className="rounded-xl" /></div>
                <div><Label className="text-xs">Crop Type *</Label><Input value={formData.crop_type} onChange={(e) => setFormData({ ...formData, crop_type: e.target.value })} placeholder="e.g., Tomato, Wheat" required className="rounded-xl" /></div>
                <div><Label className="text-xs">Location</Label><Input value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} placeholder="e.g., North Field" className="rounded-xl" /></div>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label className="text-xs">Planted</Label><Input type="date" value={formData.planting_date} onChange={(e) => setFormData({ ...formData, planting_date: e.target.value })} className="rounded-xl" /></div>
                  <div><Label className="text-xs">Harvest</Label><Input type="date" value={formData.expected_harvest_date} onChange={(e) => setFormData({ ...formData, expected_harvest_date: e.target.value })} className="rounded-xl" /></div>
                </div>
                <div><Label className="text-xs">Notes</Label><Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={2} className="rounded-xl" /></div>
                <Button type="submit" className="w-full rounded-xl">{editingCrop ? "Update" : "Add Crop"}</Button>
              </form>
            </DialogContent>
          </Dialog>
          <Button variant="outline" size="sm" className="rounded-xl" onClick={() => navigate("/crop-comparison")}>
            <BarChart3 className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" className="rounded-xl" onClick={handleExport}>
            <Download className="w-4 h-4" />
          </Button>
        </div>

        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-32 w-full rounded-2xl" />
            <Skeleton className="h-32 w-full rounded-2xl" />
          </div>
        ) : crops.length === 0 ? (
          <Card className="glass-card">
            <CardContent className="pt-8 pb-8 text-center">
              <Sprout className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
              <p className="font-semibold">No Crops Yet</p>
              <p className="text-xs text-muted-foreground mt-1">Tap "Add Crop" to start managing your farm</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {crops.map((crop) => (
              <Card key={crop.id} className={`glass-card overflow-hidden ${!crop.is_active ? "opacity-60" : ""}`}>
                {crop.image_url && (
                  <img src={crop.image_url} alt={crop.name} className="w-full h-36 object-cover" />
                )}
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span>{crop.name}</span>
                      <Badge variant={crop.is_active ? "default" : "secondary"} className="text-[10px]">
                        {crop.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 rounded-full" onClick={() => handleEdit(crop)}>
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 rounded-full" onClick={() => handleDelete(crop.id)}>
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div><span className="text-muted-foreground">Type:</span><p className="font-medium">{crop.crop_type}</p></div>
                    {crop.location && <div><span className="text-muted-foreground">Location:</span><p className="font-medium">{crop.location}</p></div>}
                    {crop.planting_date && <div><span className="text-muted-foreground">Planted:</span><p className="font-medium">{new Date(crop.planting_date).toLocaleDateString()}</p></div>}
                    {crop.expected_harvest_date && <div><span className="text-muted-foreground">Harvest:</span><p className="font-medium">{new Date(crop.expected_harvest_date).toLocaleDateString()}</p></div>}
                  </div>
                  {crop.notes && (
                    <div className="pt-1.5 border-t border-border/50">
                      <p className="text-xs text-muted-foreground">{crop.notes}</p>
                    </div>
                  )}
                  <Button variant={crop.is_active ? "outline" : "default"} size="sm" className="w-full rounded-xl text-xs" onClick={() => toggleActive(crop)}>
                    {crop.is_active ? "Deactivate" : "Activate"}
                  </Button>
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

export default Crops;
