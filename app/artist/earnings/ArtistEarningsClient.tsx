"use client";

import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/dashboard/StatCard";
import { IndianRupee, TrendingUp, Calendar, CheckCircle2 } from "lucide-react";
import { formatCurrency, formatDate, getStatusColor, getStatusLabel } from "@/lib/utils";
import { format, subMonths } from "date-fns";
import { Payment } from "@/types";

interface Props {
  payments: Payment[];
  bookings: {
    id: string;
    event_date: string;
    total_amount: number;
    status: string;
    venue: string;
    city: string;
  }[];
}

export function ArtistEarningsClient({ payments, bookings }: Props) {
  const paidPayments = payments.filter((p) => p.status === "paid");
  const totalEarned = paidPayments.reduce((s, p) => s + p.amount, 0);
  const pendingPayments = payments.filter((p) => p.status === "pending");
  const pendingAmount = pendingPayments.reduce((s, p) => s + p.amount, 0);

  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const month = subMonths(new Date(), 5 - i);
    const amount = paidPayments
      .filter((p) => {
        if (!p.paid_at) return false;
        const d = new Date(p.paid_at);
        return d.getMonth() === month.getMonth() && d.getFullYear() === month.getFullYear();
      })
      .reduce((s, p) => s + p.amount, 0);
    return { month: format(month, "MMM"), amount };
  });

  const completedCount = bookings.filter((b) => b.status === "completed").length;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Earned" value={formatCurrency(totalEarned)} icon={IndianRupee} color="gold" index={0} />
        <StatCard title="Pending Settlement" value={formatCurrency(pendingAmount)} icon={TrendingUp} color="blue" index={1} />
        <StatCard title="Events Completed" value={completedCount} icon={CheckCircle2} color="green" index={2} />
        <StatCard title="Avg per Event" value={completedCount ? formatCurrency(totalEarned / completedCount) : "₹0"} icon={Calendar} color="purple" index={3} />
      </div>

      <Card>
        <CardHeader><CardTitle>Monthly Earnings</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v) => [formatCurrency(Number(v)), "Earnings"]} />
              <Bar dataKey="amount" fill="#f59e0b" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Payment History</CardTitle></CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <p className="text-center py-10 text-muted-foreground text-sm">No payment records yet</p>
          ) : (
            <div className="space-y-2">
              {payments.map((p, i) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center justify-between p-4 rounded-xl border hover:bg-accent/30 transition-colors"
                >
                  <div>
                    <p className="font-medium text-sm">Artist Settlement</p>
                    <p className="text-xs text-muted-foreground">
                      {p.paid_at ? formatDate(p.paid_at) : "Pending"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm text-emerald-600">{formatCurrency(p.amount)}</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${getStatusColor(p.status)}`}>
                      {getStatusLabel(p.status)}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
