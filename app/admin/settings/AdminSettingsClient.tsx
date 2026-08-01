"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Pencil, Trash2, Check, X, Loader2, Music2, MapPin, Navigation,
  Mic2, Music, Headphones, Users, Smile, Wand2, Tv2, Volume2,
  Star, Award, Zap, Radio, Lightbulb, Mic, type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Combobox } from "@/components/ui/combobox";
import { Category, City, Area } from "@/types";
import { Settings } from "lucide-react";
import { db } from "@/lib/firebase/client";
import { collection, addDoc, updateDoc, deleteDoc, doc, setDoc, serverTimestamp } from "firebase/firestore";
import toast from "react-hot-toast";

const ICON_OPTIONS: { key: string; Icon: LucideIcon; label: string }[] = [
  { key: "Mic2",        Icon: Mic2,        label: "Singer"      },
  { key: "Mic",         Icon: Mic,         label: "Vocalist"    },
  { key: "Music",       Icon: Music,       label: "Music"       },
  { key: "Headphones",  Icon: Headphones,  label: "DJ"          },
  { key: "Radio",       Icon: Radio,       label: "Folk"        },
  { key: "Volume2",     Icon: Volume2,     label: "Instrumentalist" },
  { key: "Users",       Icon: Users,       label: "Band"        },
  { key: "Smile",       Icon: Smile,       label: "Comedian"    },
  { key: "Wand2",       Icon: Wand2,       label: "Magician"    },
  { key: "Tv2",         Icon: Tv2,         label: "Anchor/Host" },
  { key: "Lightbulb",   Icon: Lightbulb,   label: "Speaker"     },
  { key: "Zap",         Icon: Zap,         label: "Performer"   },
  { key: "Star",        Icon: Star,        label: "Celebrity"   },
  { key: "Award",       Icon: Award,       label: "Award"       },
  { key: "Music2",      Icon: Music2,      label: "Other"       },
];

const DEFAULT_ICON = "Mic2";

function resolveIcon(key: string): LucideIcon {
  return ICON_OPTIONS.find((o) => o.key === key)?.Icon ?? Mic2;
}

function CategoryIconDisplay({ iconKey }: { iconKey: string }) {
  const Icon = resolveIcon(iconKey);
  return (
    <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center">
      <Icon className="w-4 h-4 text-amber-600" />
    </div>
  );
}

function IconPicker({ value, onChange }: { value: string; onChange: (key: string) => void }) {
  return (
    <div className="grid grid-cols-5 gap-1.5">
      {ICON_OPTIONS.map(({ key, Icon, label }) => (
        <button
          key={key}
          type="button"
          title={label}
          onClick={() => onChange(key)}
          className={`flex flex-col items-center gap-1 p-2 rounded-lg border text-xs transition-all ${
            value === key
              ? "border-amber-500 bg-amber-50 text-amber-700"
              : "border-border hover:border-amber-300 hover:bg-accent/40 text-muted-foreground"
          }`}
        >
          <Icon className="w-4 h-4" />
          <span className="leading-none text-[9px]">{label}</span>
        </button>
      ))}
    </div>
  );
}

export function AdminSettingsClient({
  categories: initialCategories,
  cities: initialCities,
  areas: initialAreas,
  platformSettings,
}: {
  categories: Category[];
  cities: City[];
  areas: Area[];
  platformSettings?: { artist_share_pct: number; coordinator_workload_max: number; advance_payment_pct: number };
}) {
  const [categories, setCategories] = useState(initialCategories);
  const [cities, setCities] = useState(initialCities);
  const [areas, setAreas] = useState(initialAreas);

  // Category form state
  const [newCatName, setNewCatName] = useState("");
  const [newCatIcon, setNewCatIcon] = useState(DEFAULT_ICON);
  const [newCatDesc, setNewCatDesc] = useState("");
  const [addingCat, setAddingCat] = useState(false);
  const [editingCat, setEditingCat] = useState<string | null>(null);
  const [editCatName, setEditCatName] = useState("");
  const [editCatIcon, setEditCatIcon] = useState(DEFAULT_ICON);
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

  // Area form state
  const [newAreaName, setNewAreaName] = useState("");
  const [newAreaCity, setNewAreaCity] = useState("");
  const [addingArea, setAddingArea] = useState(false);
  const [editingArea, setEditingArea] = useState<string | null>(null);
  const [editAreaName, setEditAreaName] = useState("");
  const [editAreaCity, setEditAreaCity] = useState("");
  const [savingArea, setSavingArea] = useState(false);
  const [deletingArea, setDeletingArea] = useState<string | null>(null);
  const [showAddArea, setShowAddArea] = useState(false);
  const [areaCityFilter, setAreaCityFilter] = useState("");

  const cityOptions = useMemo(() => cities.map((c) => ({ value: c.name, label: `${c.name}, ${c.state}` })), [cities]);
  const visibleAreas = useMemo(
    () => (areaCityFilter ? areas.filter((a) => a.city === areaCityFilter) : areas),
    [areas, areaCityFilter]
  );

  // --- Categories ---
  const addCategory = async () => {
    if (!newCatName.trim()) { toast.error("Category name required"); return; }
    setAddingCat(true);
    try {
      const ref = await addDoc(collection(db, "categories"), {
        name: newCatName.trim(),
        icon: newCatIcon,
        description: newCatDesc.trim(),
        created_at: serverTimestamp(),
      });
      setCategories((prev) => [...prev, { id: ref.id, name: newCatName.trim(), icon: newCatIcon, description: newCatDesc.trim() } as Category]);
      setNewCatName(""); setNewCatIcon(DEFAULT_ICON); setNewCatDesc("");
      setShowAddCat(false);
      toast.success("Category added!");
    } catch {
      toast.error("Failed to add category");
    }
    setAddingCat(false);
  };

  const startEditCat = (cat: Category) => {
    setEditingCat(cat.id);
    setEditCatName(cat.name);
    setEditCatIcon(ICON_OPTIONS.find((o) => o.key === cat.icon) ? cat.icon : DEFAULT_ICON);
  };

  const saveEditCat = async (id: string) => {
    setSavingCat(true);
    try {
      await updateDoc(doc(db, "categories", id), { name: editCatName.trim(), icon: editCatIcon });
      setCategories((prev) => prev.map((c) => c.id === id ? { ...c, name: editCatName.trim(), icon: editCatIcon } : c));
      setEditingCat(null);
      toast.success("Category updated!");
    } catch {
      toast.error("Failed to update");
    }
    setSavingCat(false);
  };

  const deleteCategory = (id: string) => {
    const target = categories.find((c) => c.id === id);
    if (!target) return;
    // Optimistic remove
    setCategories((prev) => prev.filter((c) => c.id !== id));
    let cancelled = false;
    const tid = window.setTimeout(async () => {
      if (cancelled) return;
      try {
        await deleteDoc(doc(db, "categories", id));
      } catch {
        toast.error("Failed to delete category");
        setCategories((prev) => [...prev, target].sort((a, b) => a.name.localeCompare(b.name)));
      }
    }, 5000);
    toast(
      (t) => (
        <span className="flex items-center gap-3 text-sm">
          &ldquo;{target.name}&rdquo; deleted
          <button
            className="font-semibold text-navy-600 underline"
            onClick={() => { cancelled = true; clearTimeout(tid); toast.dismiss(t.id); setCategories((prev) => [...prev, target].sort((a, b) => a.name.localeCompare(b.name))); }}
          >
            Undo
          </button>
        </span>
      ),
      { duration: 5000 }
    );
  };

  // --- Cities ---
  const addCity = async () => {
    if (!newCityName.trim() || !newCityState.trim()) { toast.error("City name and state required"); return; }
    setAddingCity(true);
    try {
      const ref = await addDoc(collection(db, "cities"), {
        name: newCityName.trim(),
        state: newCityState.trim(),
        created_at: serverTimestamp(),
      });
      setCities((prev) => [...prev, { id: ref.id, name: newCityName.trim(), state: newCityState.trim() } as City]);
      setNewCityName(""); setNewCityState("");
      setShowAddCity(false);
      toast.success("City added!");
    } catch {
      toast.error("Failed to add city");
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
    try {
      await updateDoc(doc(db, "cities", id), { name: editCityName.trim(), state: editCityState.trim() });
      setCities((prev) => prev.map((c) => c.id === id ? { ...c, name: editCityName.trim(), state: editCityState.trim() } : c));
      setEditingCity(null);
      toast.success("City updated!");
    } catch {
      toast.error("Failed to update");
    }
    setSavingCity(false);
  };

  const deleteCity = (id: string) => {
    const target = cities.find((c) => c.id === id);
    if (!target) return;
    setCities((prev) => prev.filter((c) => c.id !== id));
    let cancelled = false;
    const tid = window.setTimeout(async () => {
      if (cancelled) return;
      try {
        await deleteDoc(doc(db, "cities", id));
      } catch {
        toast.error("Failed to delete city");
        setCities((prev) => [...prev, target].sort((a, b) => a.name.localeCompare(b.name)));
      }
    }, 5000);
    toast(
      (t) => (
        <span className="flex items-center gap-3 text-sm">
          &ldquo;{target.name}&rdquo; deleted
          <button
            className="font-semibold text-navy-600 underline"
            onClick={() => { cancelled = true; clearTimeout(tid); toast.dismiss(t.id); setCities((prev) => [...prev, target].sort((a, b) => a.name.localeCompare(b.name))); }}
          >
            Undo
          </button>
        </span>
      ),
      { duration: 5000 }
    );
  };

  // --- Areas ---
  const addArea = async () => {
    if (!newAreaName.trim() || !newAreaCity.trim()) { toast.error("Area name and city required"); return; }
    setAddingArea(true);
    try {
      const ref = await addDoc(collection(db, "areas"), {
        name: newAreaName.trim(),
        city: newAreaCity.trim(),
        created_at: serverTimestamp(),
      });
      setAreas((prev) => [...prev, { id: ref.id, name: newAreaName.trim(), city: newAreaCity.trim() } as Area]);
      setNewAreaName(""); setNewAreaCity("");
      setShowAddArea(false);
      toast.success("Area added!");
    } catch {
      toast.error("Failed to add area");
    }
    setAddingArea(false);
  };

  const startEditArea = (area: Area) => {
    setEditingArea(area.id);
    setEditAreaName(area.name);
    setEditAreaCity(area.city);
  };

  const saveEditArea = async (id: string) => {
    setSavingArea(true);
    try {
      await updateDoc(doc(db, "areas", id), { name: editAreaName.trim(), city: editAreaCity.trim() });
      setAreas((prev) => prev.map((a) => a.id === id ? { ...a, name: editAreaName.trim(), city: editAreaCity.trim() } : a));
      setEditingArea(null);
      toast.success("Area updated!");
    } catch {
      toast.error("Failed to update");
    }
    setSavingArea(false);
  };

  const deleteArea = (id: string) => {
    const target = areas.find((a) => a.id === id);
    if (!target) return;
    setAreas((prev) => prev.filter((a) => a.id !== id));
    let cancelled = false;
    const tid = window.setTimeout(async () => {
      if (cancelled) return;
      try {
        await deleteDoc(doc(db, "areas", id));
      } catch {
        toast.error("Failed to delete area");
        setAreas((prev) => [...prev, target].sort((a, b) => a.name.localeCompare(b.name)));
      }
    }, 5000);
    toast(
      (t) => (
        <span className="flex items-center gap-3 text-sm">
          &ldquo;{target.name}&rdquo; deleted
          <button
            className="font-semibold text-navy-600 underline"
            onClick={() => { cancelled = true; clearTimeout(tid); toast.dismiss(t.id); setAreas((prev) => [...prev, target].sort((a, b) => a.name.localeCompare(b.name))); }}
          >
            Undo
          </button>
        </span>
      ),
      { duration: 5000 }
    );
  };

  const [artistShare, setArtistShare] = useState(platformSettings?.artist_share_pct ?? 70);
  const [workloadMax, setWorkloadMax] = useState(platformSettings?.coordinator_workload_max ?? 8);
  const [advancePct, setAdvancePct] = useState(platformSettings?.advance_payment_pct ?? 30);
  const [savingPlatform, setSavingPlatform] = useState(false);

  const platformShare = 100 - artistShare;

  const savePlatformSettings = async () => {
    setSavingPlatform(true);
    try {
      await Promise.all([
        setDoc(doc(db, "settings", "artist_share_pct"), { value: artistShare }, { merge: true }),
        setDoc(doc(db, "settings", "coordinator_workload_max"), { value: workloadMax }, { merge: true }),
        setDoc(doc(db, "settings", "advance_payment_pct"), { value: advancePct }, { merge: true }),
      ]);
      toast.success("Platform settings saved");
    } catch {
      toast.error("Failed to save platform settings");
    } finally {
      setSavingPlatform(false);
    }
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
          <TabsTrigger value="areas">
            <Navigation className="w-4 h-4 mr-1.5" />Areas ({areas.length})
          </TabsTrigger>
          <TabsTrigger value="platform">
            <Settings className="w-4 h-4 mr-1.5" />Platform
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
                <div className="rounded-xl border p-4 bg-muted/20 space-y-4">
                  <p className="text-sm font-semibold">New Category</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Name *</Label>
                      <Input placeholder="e.g. Beatboxer" value={newCatName} onChange={(e) => setNewCatName(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Description (optional)</Label>
                      <Input placeholder="Short description" value={newCatDesc} onChange={(e) => setNewCatDesc(e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Icon</Label>
                    <IconPicker value={newCatIcon} onChange={setNewCatIcon} />
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
                    <td className="px-4 py-3">
                      {editingCat === cat.id ? (
                        <IconPicker value={editCatIcon} onChange={setEditCatIcon} />
                      ) : (
                        <CategoryIconDisplay iconKey={cat.icon} />
                      )}
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

        {/* Areas Tab */}
        <TabsContent value="areas" className="mt-6 space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="text-sm text-muted-foreground">{areas.length} localities configured</p>
            <div className="flex items-center gap-2">
              <div className="w-48">
                <Combobox
                  options={cityOptions}
                  value={areaCityFilter}
                  onValueChange={setAreaCityFilter}
                  placeholder="Filter by city"
                  searchPlaceholder="Search cities..."
                />
              </div>
              {areaCityFilter && (
                <Button variant="ghost" size="sm" onClick={() => setAreaCityFilter("")}>Clear</Button>
              )}
              <Button size="sm" onClick={() => setShowAddArea((v) => !v)}>
                <Plus className="w-4 h-4 mr-1.5" />Add Area
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground -mt-2">
            Optional per-city localities artists can pick from at signup — if a city has none listed yet, artists can type their own.
          </p>

          <AnimatePresence>
            {showAddArea && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="rounded-xl border p-4 bg-muted/20 space-y-3">
                  <p className="text-sm font-semibold">New Area</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Area Name *</Label>
                      <Input placeholder="e.g. Koramangala" value={newAreaName} onChange={(e) => setNewAreaName(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">City *</Label>
                      <Combobox
                        options={cityOptions}
                        value={newAreaCity}
                        onValueChange={setNewAreaCity}
                        placeholder="Select city"
                        searchPlaceholder="Search cities..."
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button size="sm" variant="outline" onClick={() => setShowAddArea(false)}>Cancel</Button>
                    <Button size="sm" onClick={addArea} loading={addingArea}>Add Area</Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="rounded-2xl border overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Area</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">City</th>
                  <th className="px-4 py-3 w-24" />
                </tr>
              </thead>
              <tbody>
                {visibleAreas.map((area, i) => (
                  <motion.tr
                    key={area.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    className="border-b last:border-0 hover:bg-accent/20"
                  >
                    <td className="px-4 py-3 font-medium text-sm">
                      {editingArea === area.id ? (
                        <Input value={editAreaName} onChange={(e) => setEditAreaName(e.target.value)} className="max-w-[200px]" />
                      ) : area.name}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {editingArea === area.id ? (
                        <div className="max-w-[220px]">
                          <Combobox options={cityOptions} value={editAreaCity} onValueChange={setEditAreaCity} placeholder="Select city" />
                        </div>
                      ) : area.city}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        {editingArea === area.id ? (
                          <>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-emerald-600" onClick={() => saveEditArea(area.id)} disabled={savingArea}>
                              {savingArea ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingArea(null)}>
                              <X className="w-3.5 h-3.5" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEditArea(area)}>
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500 hover:text-red-600" onClick={() => deleteArea(area.id)} disabled={deletingArea === area.id}>
                              {deletingArea === area.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))}
                {visibleAreas.length === 0 && (
                  <tr><td colSpan={3} className="py-8 text-center text-muted-foreground text-sm">
                    {areaCityFilter ? "No areas for this city yet" : "No areas yet"}
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* Platform Tab */}
        <TabsContent value="platform" className="mt-6 space-y-6 max-w-md">
          <div className="rounded-2xl border p-5 space-y-5">
            <h3 className="font-semibold text-sm">Revenue Split</h3>
            <div className="space-y-2">
              <Label>Artist share (%)</Label>
              <div className="flex items-center gap-3">
                <Input
                  type="number" min={50} max={95} value={artistShare}
                  onChange={(e) => setArtistShare(Number(e.target.value))}
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground">
                  Platform keeps <strong>{platformShare}%</strong> · Artist gets <strong>{artistShare}%</strong>
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Advance payment (%)</Label>
              <div className="flex items-center gap-3">
                <Input
                  type="number" min={10} max={80} value={advancePct}
                  onChange={(e) => setAdvancePct(Number(e.target.value))}
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground">of total booking amount</span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border p-5 space-y-4">
            <h3 className="font-semibold text-sm">Coordinator Workload</h3>
            <div className="space-y-2">
              <Label>Max recommended active enquiries per coordinator</Label>
              <div className="flex items-center gap-3">
                <Input
                  type="number" min={1} max={30} value={workloadMax}
                  onChange={(e) => setWorkloadMax(Number(e.target.value))}
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground">Above this = shown as "Overloaded"</span>
              </div>
            </div>
          </div>

          <Button onClick={savePlatformSettings} disabled={savingPlatform}>
            {savingPlatform ? "Saving…" : "Save Platform Settings"}
          </Button>
        </TabsContent>
      </Tabs>
    </div>
  );
}
