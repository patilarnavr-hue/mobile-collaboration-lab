import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Edit2, Sprout, Camera, Download, BarChart3 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";
import { exportToPDF } from "@/utils/exportPDF";
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
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCrop, setEditingCrop] = useState<Crop | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    name: "",
    crop_type: "",
    location: "",
    planting_date: "",
    expected_harvest_date: "",
    notes: ""
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchCrops();
  }, []);

  const fetchCrops = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('crops')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (data) setCrops(data);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async (cropId: string) => {
    if (!imageFile) return null;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const fileExt = imageFile.name.split('.').pop();
    const fileName = `${user.id}/${cropId}_${Date.now()}.${fileExt}`;

    const { error: uploadError, data } = await supabase.storage
      .from('crop_images')
      .upload(fileName, imageFile);

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return null;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('crop_images')
      .getPublicUrl(fileName);

    return publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    let imageUrl = editingCrop?.image_url || null;

    if (editingCrop) {
      // Upload new image if selected
      if (imageFile) {
        imageUrl = await uploadImage(editingCrop.id);
      }

      const { error } = await supabase
        .from('crops')
        .update({ ...formData, image_url: imageUrl })
        .eq('id', editingCrop.id);

      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
        return;
      }
      toast({ title: "Success", description: "Crop updated successfully" });
    } else {
      // Create crop first
      const { data: newCrop, error } = await supabase
        .from('crops')
        .insert({ ...formData, user_id: user.id })
        .select()
        .single();

      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
        return;
      }

      // Upload image if selected
      if (imageFile && newCrop) {
        imageUrl = await uploadImage(newCrop.id);
        await supabase
          .from('crops')
          .update({ image_url: imageUrl })
          .eq('id', newCrop.id);
      }

      toast({ title: "Success", description: "Crop added successfully" });
    }

    setFormData({
      name: "",
      crop_type: "",
      location: "",
      planting_date: "",
      expected_harvest_date: "",
      notes: ""
    });
    setImageFile(null);
    setImagePreview(null);
    setEditingCrop(null);
    setIsDialogOpen(false);
    fetchCrops();
  };

  const handleExport = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const pdf = exportToPDF({
      title: 'Crops Report',
      date: new Date().toLocaleDateString(),
      crops: crops.map(c => ({
        name: c.name,
        type: c.crop_type,
        status: c.is_active ? 'Active' : 'Inactive'
      }))
    });

    pdf.save(`crops-report-${new Date().toISOString().split('T')[0]}.pdf`);
    toast({ title: "Success", description: "Report exported successfully" });
  };

  const handleEdit = (crop: Crop) => {
    setEditingCrop(crop);
    setFormData({
      name: crop.name,
      crop_type: crop.crop_type,
      location: crop.location || "",
      planting_date: crop.planting_date || "",
      expected_harvest_date: crop.expected_harvest_date || "",
      notes: crop.notes || ""
    });
    setImagePreview(crop.image_url);
    setImageFile(null);
    setIsDialogOpen(true);
  };

  const handleDelete = async (cropId: string) => {
    const { error } = await supabase
      .from('crops')
      .delete()
      .eq('id', cropId);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Success", description: "Crop deleted successfully" });
    fetchCrops();
  };

  const toggleActive = async (crop: Crop) => {
    const { error } = await supabase
      .from('crops')
      .update({ is_active: !crop.is_active })
      .eq('id', crop.id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    fetchCrops();
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="bg-primary text-primary-foreground p-6 shadow-lg">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Sprout className="w-8 h-8" />
          Crop Management
        </h1>
        <p className="text-sm opacity-90">Manage your crops and zones</p>
      </header>

      <main className="p-4 space-y-4 max-w-4xl mx-auto">
        <div className="flex gap-2">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex-1" onClick={() => {
                setEditingCrop(null);
                setImageFile(null);
                setImagePreview(null);
                setFormData({
                  name: "",
                  crop_type: "",
                  location: "",
                  planting_date: "",
                  expected_harvest_date: "",
                  notes: ""
                });
              }}>
                <Plus className="w-4 h-4 mr-2" />
                Add New Crop
              </Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingCrop ? 'Edit Crop' : 'Add New Crop'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Crop Photo</Label>
                <div className="flex gap-2 items-center">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full"
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    {imagePreview ? 'Change Photo' : 'Add Photo'}
                  </Button>
                </div>
                {imagePreview && (
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="mt-2 w-full h-40 object-cover rounded-lg"
                  />
                )}
              </div>
              <div>
                <Label htmlFor="name">Crop Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="crop_type">Crop Type *</Label>
                <Input
                  id="crop_type"
                  value={formData.crop_type}
                  onChange={(e) => setFormData({ ...formData, crop_type: e.target.value })}
                  placeholder="e.g., Tomato, Wheat, Corn"
                  required
                />
              </div>
              <div>
                <Label htmlFor="location">Location/Zone</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="e.g., North Field, Greenhouse A"
                />
              </div>
              <div>
                <Label htmlFor="planting_date">Planting Date</Label>
                <Input
                  id="planting_date"
                  type="date"
                  value={formData.planting_date}
                  onChange={(e) => setFormData({ ...formData, planting_date: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="expected_harvest_date">Expected Harvest</Label>
                <Input
                  id="expected_harvest_date"
                  type="date"
                  value={formData.expected_harvest_date}
                  onChange={(e) => setFormData({ ...formData, expected_harvest_date: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional information..."
                />
              </div>
              <Button type="submit" className="w-full">
                {editingCrop ? 'Update Crop' : 'Add Crop'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
        <Button variant="outline" onClick={() => navigate('/crop-comparison')}>
          <BarChart3 className="w-4 h-4 mr-2" />
          Compare
        </Button>
        <Button variant="outline" onClick={handleExport}>
          <Download className="w-4 h-4 mr-2" />
          Export
        </Button>
        </div>

        <div className="grid gap-4">
          {crops.map((crop) => (
            <Card key={crop.id} className={!crop.is_active ? 'opacity-60' : ''}>
              {crop.image_url && (
                <img
                  src={crop.image_url}
                  alt={crop.name}
                  className="w-full h-48 object-cover rounded-t-lg"
                />
              )}
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{crop.name}</span>
                  <div className="flex gap-2">
                    <Button size="icon" variant="ghost" onClick={() => handleEdit(crop)}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => handleDelete(crop.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Type:</span>
                    <p className="font-medium">{crop.crop_type}</p>
                  </div>
                  {crop.location && (
                    <div>
                      <span className="text-muted-foreground">Location:</span>
                      <p className="font-medium">{crop.location}</p>
                    </div>
                  )}
                  {crop.planting_date && (
                    <div>
                      <span className="text-muted-foreground">Planted:</span>
                      <p className="font-medium">{new Date(crop.planting_date).toLocaleDateString()}</p>
                    </div>
                  )}
                  {crop.expected_harvest_date && (
                    <div>
                      <span className="text-muted-foreground">Harvest:</span>
                      <p className="font-medium">{new Date(crop.expected_harvest_date).toLocaleDateString()}</p>
                    </div>
                  )}
                </div>
                {crop.notes && (
                  <div className="pt-2 border-t">
                    <span className="text-muted-foreground text-sm">Notes:</span>
                    <p className="text-sm">{crop.notes}</p>
                  </div>
                )}
                <Button
                  variant={crop.is_active ? "outline" : "default"}
                  size="sm"
                  className="w-full mt-2"
                  onClick={() => toggleActive(crop)}
                >
                  {crop.is_active ? 'Deactivate' : 'Activate'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default Crops;