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
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/dashboard/StatCard";
import { FileText, TrendingUp, DollarSign, Calendar, UserCog, Award, Printer, Download } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { motion } from "framer-motion";
import { format, subMonths, startOfMonth } from "date-fns";

interface CoordinatorStat {
  name: string;
  total: number;
  confirmed: number;
  completed: number;
  conversion: number;
}

interface ReportsProps {
  enquiries: { status: string; source: string; created_at: string; city: string }[];
  bookings: { status: string; event_date: string; total_amount: number; city: string }[];
  payments: { type: string; amount: number; status: string; paid_at: string | null }[];
  coordinatorStats: CoordinatorStat[];
}

const COLORS = ["#f59e0b", "#3b82f6", "#10b981", "#8b5cf6", "#ef4444", "#ec4899"];

export function AdminReportsClient({ enquiries, bookings, payments, coordinatorStats }: ReportsProps) {
  const handlePrint = () => window.print();

  const handleDownloadCSV = () => {
    const today = format(new Date(), "yyyy-MM-dd");

    const sections: string[] = [];

    // Summary
    const totalRevenue = payments.filter((p) => p.status === "paid").reduce((s, p) => s + p.amount, 0);
    const completedBookings = bookings.filter((b) => b.status === "completed").length;
    sections.push("SUMMARY");
    sections.push(["Total Enquiries", "Total Revenue (₹)", "Completed Events", "Conversion Rate (%)"].join(","));
    sections.push([
      enquiries.length,
      totalRevenue,
      completedBookings,
      enquiries.length ? Math.round((completedBookings / enquiries.length) * 100) : 0,
    ].join(","));
    sections.push("");

    // Monthly data
    const monthlyRows = Array.from({ length: 6 }, (_, i) => {
      const month = subMonths(new Date(), 5 - i);
      const label = format(month, "MMM yyyy");
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
      return [label, count, revenue].join(",");
    });
    sections.push("MONTHLY ENQUIRIES & REVENUE");
    sections.push("Month,Enquiries,Revenue (₹)");
    sections.push(...monthlyRows);
    sections.push("");

    // City breakdown
    sections.push("TOP CITIES");
    sections.push("City,Enquiries");
    Array.from(
      enquiries.reduce((acc, e) => { acc.set(e.city, (acc.get(e.city) ?? 0) + 1); return acc; }, new Map<string, number>())
    ).sort((a, b) => b[1] - a[1]).slice(0, 10)
      .forEach(([city, count]) => sections.push(`${city},${count}`));
    sections.push("");

    // Coordinator performance
    if (coordinatorStats.length > 0) {
      sections.push("COORDINATOR PERFORMANCE");
      sections.push("Coordinator,Total Enquiries,Confirmed,Completed,Conversion Rate (%)");
      coordinatorStats.forEach((c) =>
        sections.push([c.name, c.total, c.confirmed, c.completed, c.conversion].join(","))
      );
    }

    const csv = sections.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bookmyeventstar-report-${today}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

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
    <div className="p-4 md:p-6 space-y-6 print:p-0">
      {/* Toolbar */}
      <div className="flex items-center justify-between print:hidden">
        <p className="text-sm text-muted-foreground">
          Showing data for all time · Generated {format(new Date(), "dd MMM yyyy")}
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleDownloadCSV}>
            <Download className="w-4 h-4 mr-1.5" />Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-1.5" />Print / PDF
          </Button>
        </div>
      </div>

      {/* Print header — only visible when printing */}
      <div className="hidden print:block mb-6">
        <h1 className="text-2xl font-bold">BookMyEventStar — Analytics Report</h1>
        <p className="text-sm text-gray-500 mt-1">Generated on {format(new Date(), "dd MMMM yyyy")}</p>
      </div>

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

      {/* Coordinator Performance */}
      {coordinatorStats.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCog className="w-5 h-5 text-indigo-500" />Coordinator Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-xl border overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      {["Coordinator", "Total Enquiries", "Confirmed", "Completed", "Conversion Rate", "Performance"].map((h) => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {coordinatorStats.map((c, i) => (
                      <motion.tr
                        key={c.name}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 + i * 0.06 }}
                        className="border-b last:border-0 hover:bg-accent/20"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm">
                              {c.name[0]?.toUpperCase()}
                            </div>
                            <span className="font-medium text-sm">{c.name}</span>
                            {i === 0 && <Award className="w-4 h-4 text-amber-500" />}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold">{c.total}</td>
                        <td className="px-4 py-3 text-sm text-blue-700 font-medium">{c.confirmed}</td>
                        <td className="px-4 py-3 text-sm text-emerald-700 font-medium">{c.completed}</td>
                        <td className="px-4 py-3">
                          <span className={`text-sm font-bold ${c.conversion >= 50 ? "text-emerald-600" : c.conversion >= 25 ? "text-amber-600" : "text-red-600"}`}>
                            {c.conversion}%
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="w-24">
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{
                                  width: `${c.total ? Math.min(100, (c.confirmed / c.total) * 100) : 0}%`,
                                  background: "linear-gradient(to right, #6366f1, #8b5cf6)",
                                }}
                              />
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              {c.total ? Math.round((c.confirmed / c.total) * 100) : 0}% confirmed
                            </p>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
