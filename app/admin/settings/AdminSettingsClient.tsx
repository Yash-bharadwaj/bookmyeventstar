"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Category, City } from "@/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function AdminSettingsClient({
  categories,
  cities,
}: {
  categories: Category[];
  cities: City[];
}) {
  return (
    <div className="p-4 md:p-6 max-w-4xl">
      <Tabs defaultValue="categories">
        <TabsList>
          <TabsTrigger value="categories">Artist Categories ({categories.length})</TabsTrigger>
          <TabsTrigger value="cities">Cities ({cities.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="categories" className="mt-6">
          <Card>
            <CardHeader><CardTitle>Artist Categories</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <div key={cat.id} className="flex items-center gap-2 px-4 py-2 rounded-xl border">
                    <span className="text-lg">{cat.icon}</span>
                    <span className="font-medium text-sm">{cat.name}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="cities" className="mt-6">
          <Card>
            <CardHeader><CardTitle>Covered Cities</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {cities.map((city) => (
                  <div key={city.id} className="flex flex-col p-3 rounded-xl border">
                    <span className="font-medium text-sm">{city.name}</span>
                    <span className="text-xs text-muted-foreground">{city.state}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
