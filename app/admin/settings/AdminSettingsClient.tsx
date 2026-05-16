"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Pencil, Trash2, Check, X, Loader2, Music2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Category, City } from "@/types";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";

export function AdminSettingsClient({
  categories: initialCategories,
  cities: initialCities,
}: {
  categories: Category[];
  cities: City[];
}) {
  const [categories, setCategories] = useState(initialCategories);
  const [cities, setCities] = useState(initialCities);

  // Category form state
  const [newCatName, setNewCatName] = useState("");
  const [newCatIcon, setNewCatIcon] = useState("");
  const [newCatDesc, setNewCatDesc] = useState("");
  const [addingCat, setAddingCat] = useState(false);
  const [editingCat, setEditingCat] = useState<string | null>(null);
  const [editCatName, setEditCatName] = useState("");
  const [editCatIcon, setEditCatIcon] = useState("");
  const [savingCat, setSavingCat] = useState(false);
  const [deletingCat, setDeletingCat] = useState<string | null>(null);
  const [showAddCat, setShowAddCat] = useState(false);

  // City form state
  const [newCityName, setNewCityName] = useState("");
  const [newCityState, setNewCityState] = useState("");
  const [addingCity, setAddingCity] = useState(false);
  const [editingCity, setEditingCity] = useState<string | null>(null);
  const [editCityName, setEditCityName] = useState("");
  const [editCityState, setEditCityState] = useState("");
  const [savingCity, setSavingCity] = useState(false);
  const [deletingCity, setDeletingCity] = useState<string | null>(null);
  const [showAddCity, setShowAddCity] = useState(false);

  // --- Categories ---
  const addCategory = async () => {
    if (!newCatName.trim()) { toast.error("Category name required"); return; }
    setAddingCat(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("categories")
      .insert({ name: newCatName.trim(), icon: newCatIcon.trim() || "🎵", description: newCatDesc.trim() })
      .select().single();
    if (error) { toast.error("Failed to add category"); }
    else {
      setCategories((prev) => [...prev, data as Category]);
      setNewCatName(""); setNewCatIcon(""); setNewCatDesc("");
      setShowAddCat(false);
      toast.success("Category added!");
    }
    setAddingCat(false);
  };

  const startEditCat = (cat: Category) => {
    setEditingCat(cat.id);
    setEditCatName(cat.name);
    setEditCatIcon(cat.icon);
  };

  const saveEditCat = async (id: string) => {
    setSavingCat(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("categories").update({ name: editCatName.trim(), icon: editCatIcon.trim() }).eq("id", id);
    if (error) { toast.error("Failed to update"); }
    else {
      setCategories((prev) => prev.map((c) => c.id === id ? { ...c, name: editCatName.trim(), icon: editCatIcon.trim() } : c));
      setEditingCat(null);
      toast.success("Category updated!");
    }
    setSavingCat(false);
  };

  const deleteCategory = async (id: string) => {
    if (!confirm("Delete this category?")) return;
    setDeletingCat(id);
    const supabase = createClient();
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) { toast.error("Failed to delete"); }
    else {
      setCategories((prev) => prev.filter((c) => c.id !== id));
      toast.success("Category deleted");
    }
    setDeletingCat(null);
  };

  // --- Cities ---
  const addCity = async () => {
    if (!newCityName.trim() || !newCityState.trim()) { toast.error("City name and state required"); return; }
    setAddingCity(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("cities")
      .insert({ name: newCityName.trim(), state: newCityState.trim() })
      .select().single();
    if (error) { toast.error("Failed to add city"); }
    else {
      setCities((prev) => [...prev, data as City]);
      setNewCityName(""); setNewCityState("");
      setShowAddCity(false);
      toast.success("City added!");
    }
    setAddingCity(false);
  };

  const startEditCity = (city: City) => {
    setEditingCity(city.id);
    setEditCityName(city.name);
    setEditCityState(city.state);
  };

  const saveEditCity = async (id: string) => {
    setSavingCity(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("cities").update({ name: editCityName.trim(), state: editCityState.trim() }).eq("id", id);
    if (error) { toast.error("Failed to update"); }
    else {
      setCities((prev) => prev.map((c) => c.id === id ? { ...c, name: editCityName.trim(), state: editCityState.trim() } : c));
      setEditingCity(null);
      toast.success("City updated!");
    }
    setSavingCity(false);
  };

  const deleteCity = async (id: string) => {
    if (!confirm("Delete this city?")) return;
    setDeletingCity(id);
    const supabase = createClient();
    const { error } = await supabase.from("cities").delete().eq("id", id);
    if (error) { toast.error("Failed to delete"); }
    else {
      setCities((prev) => prev.filter((c) => c.id !== id));
      toast.success("City deleted");
    }
    setDeletingCity(null);
  };

  return (
    <div className="p-4 md:p-6 max-w-4xl">
      <Tabs defaultValue="categories">
        <TabsList>
          <TabsTrigger value="categories">
            <Music2 className="w-4 h-4 mr-1.5" />Artist Categories ({categories.length})
          </TabsTrigger>
          <TabsTrigger value="cities">
            <MapPin className="w-4 h-4 mr-1.5" />Cities ({cities.length})
          </TabsTrigger>
        </TabsList>

        {/* Categories Tab */}
        <TabsContent value="categories" className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{categories.length} categories configured</p>
            <Button size="sm" onClick={() => setShowAddCat((v) => !v)}>
              <Plus className="w-4 h-4 mr-1.5" />Add Category
            </Button>
          </div>

          <AnimatePresence>
            {showAddCat && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="rounded-xl border p-4 bg-muted/20 space-y-3">
                  <p className="text-sm font-semibold">New Category</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Name *</Label>
                      <Input placeholder="e.g. Beatboxer" value={newCatName} onChange={(e) => setNewCatName(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Icon (emoji)</Label>
                      <Input placeholder="e.g. 🎤" value={newCatIcon} onChange={(e) => setNewCatIcon(e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Description (optional)</Label>
                    <Input placeholder="Short description" value={newCatDesc} onChange={(e) => setNewCatDesc(e.target.value)} />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button size="sm" variant="outline" onClick={() => setShowAddCat(false)}>Cancel</Button>
                    <Button size="sm" onClick={addCategory} loading={addingCat}>Add Category</Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="rounded-2xl border overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Icon</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Name</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Description</th>
                  <th className="px-4 py-3 w-24" />
                </tr>
              </thead>
              <tbody>
                {categories.map((cat, i) => (
                  <motion.tr
                    key={cat.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                    className="border-b last:border-0 hover:bg-accent/20"
                  >
                    <td className="px-4 py-3 text-xl">
                      {editingCat === cat.id ? (
                        <Input value={editCatIcon} onChange={(e) => setEditCatIcon(e.target.value)} className="w-16 text-center" />
                      ) : cat.icon}
                    </td>
                    <td className="px-4 py-3 font-medium text-sm">
                      {editingCat === cat.id ? (
                        <Input value={editCatName} onChange={(e) => setEditCatName(e.target.value)} className="max-w-[200px]" />
                      ) : cat.name}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{cat.description ?? "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        {editingCat === cat.id ? (
                          <>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-emerald-600" onClick={() => saveEditCat(cat.id)} disabled={savingCat}>
                              {savingCat ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingCat(null)}>
                              <X className="w-3.5 h-3.5" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEditCat(cat)}>
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500 hover:text-red-600" onClick={() => deleteCategory(cat.id)} disabled={deletingCat === cat.id}>
                              {deletingCat === cat.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))}
                {categories.length === 0 && (
                  <tr><td colSpan={4} className="py-8 text-center text-muted-foreground text-sm">No categories yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* Cities Tab */}
        <TabsContent value="cities" className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{cities.length} cities covered</p>
            <Button size="sm" onClick={() => setShowAddCity((v) => !v)}>
              <Plus className="w-4 h-4 mr-1.5" />Add City
            </Button>
          </div>

          <AnimatePresence>
            {showAddCity && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="rounded-xl border p-4 bg-muted/20 space-y-3">
                  <p className="text-sm font-semibold">New City</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">City Name *</Label>
                      <Input placeholder="e.g. Jaipur" value={newCityName} onChange={(e) => setNewCityName(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">State *</Label>
                      <Input placeholder="e.g. Rajasthan" value={newCityState} onChange={(e) => setNewCityState(e.target.value)} />
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button size="sm" variant="outline" onClick={() => setShowAddCity(false)}>Cancel</Button>
                    <Button size="sm" onClick={addCity} loading={addingCity}>Add City</Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="rounded-2xl border overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">City</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">State</th>
                  <th className="px-4 py-3 w-24" />
                </tr>
              </thead>
              <tbody>
                {cities.map((city, i) => (
                  <motion.tr
                    key={city.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    className="border-b last:border-0 hover:bg-accent/20"
                  >
                    <td className="px-4 py-3 font-medium text-sm">
                      {editingCity === city.id ? (
                        <Input value={editCityName} onChange={(e) => setEditCityName(e.target.value)} className="max-w-[200px]" />
                      ) : city.name}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {editingCity === city.id ? (
                        <Input value={editCityState} onChange={(e) => setEditCityState(e.target.value)} className="max-w-[200px]" />
                      ) : city.state}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        {editingCity === city.id ? (
                          <>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-emerald-600" onClick={() => saveEditCity(city.id)} disabled={savingCity}>
                              {savingCity ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingCity(null)}>
                              <X className="w-3.5 h-3.5" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEditCity(city)}>
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500 hover:text-red-600" onClick={() => deleteCity(city.id)} disabled={deletingCity === city.id}>
                              {deletingCity === city.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))}
                {cities.length === 0 && (
                  <tr><td colSpan={3} className="py-8 text-center text-muted-foreground text-sm">No cities yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
