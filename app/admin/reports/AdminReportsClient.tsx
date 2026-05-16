"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { StatCard } from "@/components/dashboard/StatCard";
import { FileText, TrendingUp, DollarSign, Calendar } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { motion } from "framer-motion";
import { format, subMonths, startOfMonth } from "date-fns";

interface ReportsProps {
  enquiries: { status: string; source: string; created_at: string; city: string }[];
  bookings: { status: string; event_date: string; total_amount: number; city: string }[];
  payments: { type: string; amount: number; status: string; paid_at: string | null }[];
}

const COLORS = ["#f59e0b", "#3b82f6", "#10b981", "#8b5cf6", "#ef4444", "#ec4899"];

export function AdminReportsClient({ enquiries, bookings, payments }: ReportsProps) {
  // Monthly enquiries (last 6 months)
  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const month = subMonths(new Date(), 5 - i);
    const monthStart = startOfMonth(month);
    const monthLabel = format(month, "MMM");
    const count = enquiries.filter((e) => {
      const d = new Date(e.created_at);
      return d.getMonth() === month.getMonth() && d.getFullYear() === month.getFullYear();
    }).length;
    const revenue = payments
      .filter((p) => {
        if (!p.paid_at) return false;
        const d = new Date(p.paid_at);
        return d.getMonth() === month.getMonth() && d.getFullYear() === month.getFullYear() && p.status === "paid";
      })
      .reduce((sum, p) => sum + p.amount, 0);
    return { month: monthLabel, enquiries: count, revenue };
  });

  // Source distribution
  const sourceData = ["website", "whatsapp", "email", "instagram", "referral", "walk_in"].map((src) => ({
    name: src.replace("_", " "),
    value: enquiries.filter((e) => e.source === src).length,
  })).filter((d) => d.value > 0);

  // City distribution
  const cityData = Array.from(
    enquiries.reduce((acc, e) => {
      acc.set(e.city, (acc.get(e.city) ?? 0) + 1);
      return acc;
    }, new Map<string, number>())
  )
    .map(([city, count]) => ({ city, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const totalRevenue = payments.filter((p) => p.status === "paid").reduce((s, p) => s + p.amount, 0);
  const completedBookings = bookings.filter((b) => b.status === "completed").length;

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Enquiries" value={enquiries.length} icon={FileText} color="gold" index={0} />
        <StatCard title="Total Revenue" value={formatCurrency(totalRevenue)} icon={DollarSign} color="green" index={1} />
        <StatCard title="Completed Events" value={completedBookings} icon={Calendar} color="purple" index={2} />
        <StatCard title="Conversion Rate" value={`${enquiries.length ? Math.round((completedBookings / enquiries.length) * 100) : 0}%`} icon={TrendingUp} color="blue" index={3} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly enquiries & revenue */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card>
            <CardHeader><CardTitle>Monthly Enquiries & Revenue</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(value, name) => [
                      name === "revenue" ? formatCurrency(Number(value)) : value,
                      name === "revenue" ? "Revenue" : "Enquiries",
                    ]}
                  />
                  <Bar dataKey="enquiries" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="revenue" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* Source Distribution */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card>
            <CardHeader><CardTitle>Enquiry Source Distribution</CardTitle></CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="55%" height={200}>
                  <PieChart>
                    <Pie data={sourceData} dataKey="value" cx="50%" cy="50%" outerRadius={80} paddingAngle={3}>
                      {sourceData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2">
                  {sourceData.map((item, i) => (
                    <div key={item.name} className="flex items-center gap-2 text-sm">
                      <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="capitalize flex-1 text-muted-foreground">{item.name}</span>
                      <span className="font-semibold">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Top Cities */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <Card>
          <CardHeader><CardTitle>Top Cities by Enquiries</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={cityData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis dataKey="city" type="category" tick={{ fontSize: 12 }} width={90} />
                <Tooltip />
                <Bar dataKey="count" fill="#f59e0b" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
