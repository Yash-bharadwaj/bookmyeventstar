"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Calendar, MapPin, User, Phone, Mail, Mic2,
  IndianRupee, CreditCard, Pencil, Trash2, AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatDate, formatCurrency, getStatusColor, getStatusLabel, getInitials } from "@/lib/utils";
import { summarizePayments } from "@/lib/payments";
import { db } from "@/lib/firebase/client";
import { doc, updateDoc, addDoc, deleteDoc, collection, serverTimestamp } from "firebase/firestore";
import toast from "react-hot-toast";

type PaymentType = "advance" | "final" | "artist_settlement";
type PaymentStatus = "pending" | "paid" | "failed";

interface PaymentRow {
  id: string;
  type: PaymentType;
  amount: number;
  status: PaymentStatus;
  notes?: string | null;
  paid_at?: string | null;
}

const TYPE_LABELS: Record<PaymentType, string> = {
  advance: "Advance",
  final: "Final Balance",
  artist_settlement: "Artist Settlement",
};

export function AdminBookingDetail({ booking, artistSharePct }: { booking: any; artistSharePct: number }) {
  const router = useRouter();
  const [payments, setPayments] = useState<PaymentRow[]>(booking.payments ?? []);

  const [dialogMode, setDialogMode] = useState<"add" | "edit" | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formType, setFormType] = useState<PaymentType>("advance");
  const [formAmount, setFormAmount] = useState("");
  const [formStatus, setFormStatus] = useState<PaymentStatus>("paid");
  const [formNotes, setFormNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const summary = summarizePayments(booking.total_amount, payments);
  const settlementPaid = payments
    .filter((p) => p.type === "artist_settlement" && p.status === "paid")
    .reduce((s, p) => s + p.amount, 0);

  const openAdd = () => {
    setDialogMode("add");
    setEditingId(null);
    setFormType("advance");
    setFormAmount("");
    setFormStatus("paid");
    setFormNotes("");
  };

  const openEdit = (p: PaymentRow) => {
    setDialogMode("edit");
    setEditingId(p.id);
    setFormType(p.type);
    setFormAmount(String(p.amount));
    setFormStatus(p.status);
    setFormNotes(p.notes ?? "");
  };

  const savePayment = async () => {
    const amount = Number(formAmount);
    if (!amount || amount <= 0) { toast.error("Enter a valid amount"); return; }
    setSaving(true);
    try {
      if (dialogMode === "add") {
        const docRef = await addDoc(collection(db, "bookings", booking.id, "payments"), {
          type: formType,
          amount,
          status: formStatus,
          notes: formNotes.trim() || null,
          paid_at: formStatus === "paid" ? serverTimestamp() : null,
          created_at: serverTimestamp(),
        });
        setPayments((prev) => [
          ...prev,
          { id: docRef.id, type: formType, amount, status: formStatus, notes: formNotes.trim() || null, paid_at: formStatus === "paid" ? new Date().toISOString() : null },
        ]);
        toast.success("Payment added.");
      } else if (dialogMode === "edit" && editingId) {
        await updateDoc(doc(db, "bookings", booking.id, "payments", editingId), {
          type: formType,
          amount,
          status: formStatus,
          notes: formNotes.trim() || null,
          paid_at: formStatus === "paid" ? serverTimestamp() : null,
          updated_at: serverTimestamp(),
        });
        setPayments((prev) =>
          prev.map((p) =>
            p.id === editingId
              ? { ...p, type: formType, amount, status: formStatus, notes: formNotes.trim() || null, paid_at: formStatus === "paid" ? (p.paid_at ?? new Date().toISOString()) : null }
              : p
          )
        );
        toast.success("Payment updated.");
      }
      setDialogMode(null);
      router.refresh();
    } catch {
      toast.error("Something went wrong — please try again.");
    }
    setSaving(false);
  };

  const confirmDelete = async () => {
    if (!deletingId) return;
    setDeleting(true);
    try {
      await deleteDoc(doc(db, "bookings", booking.id, "payments", deletingId));
      setPayments((prev) => prev.filter((p) => p.id !== deletingId));
      toast.success("Payment removed.");
      setDeletingId(null);
      router.refresh();
    } catch {
      toast.error("Something went wrong — please try again.");
    }
    setDeleting(false);
  };

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      <Link href="/admin/bookings">
        <Button variant="ghost" size="sm" className="gap-2 -ml-2">
          <ArrowLeft className="w-4 h-4" />Back to Bookings
        </Button>
      </Link>

      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">{booking.enquiry?.event_type ?? "Booking"}</h1>
          <p className="text-muted-foreground text-sm mt-1">Booking #{booking.id.slice(0, 8).toUpperCase()}</p>
        </div>
        <span className={`px-3 py-1.5 rounded-full text-sm font-semibold ${getStatusColor(booking.status)}`}>
          {getStatusLabel(booking.status)}
        </span>
      </div>

      {/* Event details */}
      <div className="rounded-2xl border p-5">
        <h2 className="font-semibold text-sm mb-4 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-blue-500" />Event Details
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div><p className="text-muted-foreground text-xs">Date</p><p className="font-medium mt-0.5">{formatDate(booking.event_date)}</p></div>
          <div><p className="text-muted-foreground text-xs">Venue</p><p className="font-medium mt-0.5">{booking.venue}</p></div>
          <div><p className="text-muted-foreground text-xs">City</p><p className="font-medium mt-0.5">{booking.city}</p></div>
          <div><p className="text-muted-foreground text-xs">Coordinator</p><p className="font-medium mt-0.5">{booking.coordinator?.name ?? "Unassigned"}</p></div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="rounded-2xl border p-5 space-y-3">
          <h2 className="font-semibold text-sm flex items-center gap-2"><User className="w-4 h-4 text-navy-600" />Client</h2>
          {booking.enquiry?.client ? (
            <div className="space-y-2 text-sm">
              <p className="font-medium">{booking.enquiry.client.name}</p>
              <a href={`tel:${booking.enquiry.client.phone}`} className="flex items-center gap-2 text-muted-foreground"><Phone className="w-3.5 h-3.5" />{booking.enquiry.client.phone}</a>
              <a href={`mailto:${booking.enquiry.client.email}`} className="flex items-center gap-2 text-muted-foreground"><Mail className="w-3.5 h-3.5" />{booking.enquiry.client.email}</a>
            </div>
          ) : <p className="text-sm text-muted-foreground">No client info</p>}
        </div>

        <div className="rounded-2xl border p-5 space-y-3">
          <h2 className="font-semibold text-sm flex items-center gap-2"><Mic2 className="w-4 h-4 text-gold-600" />Artist</h2>
          {booking.artist ? (
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gold-100 flex items-center justify-center text-gold-700 font-bold text-sm">
                  {getInitials(booking.artist.user?.name ?? "A")}
                </div>
                <div>
                  <p className="font-medium">{booking.artist.user?.name}</p>
                  <div className="flex gap-1 mt-0.5">
                    {(booking.artist.categories ?? []).slice(0, 2).map((c: string) => (
                      <Badge key={c} variant="secondary" className="text-[10px]">{c}</Badge>
                    ))}
                  </div>
                </div>
              </div>
              <a href={`tel:${booking.artist.user?.phone}`} className="flex items-center gap-2 text-muted-foreground"><Phone className="w-3.5 h-3.5" />{booking.artist.user?.phone}</a>
            </div>
          ) : <p className="text-sm text-muted-foreground">No artist assigned</p>}
        </div>
      </div>

      {/* Payments */}
      <div className="rounded-2xl border p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-sm flex items-center gap-2"><CreditCard className="w-4 h-4 text-blue-500" />Payments</h2>
          <Button size="sm" onClick={openAdd}>
            <CreditCard className="w-3.5 h-3.5 mr-1.5" />Add Payment
          </Button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-xs">
          <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-100">
            <p className="text-blue-500 font-medium">Total</p>
            <p className="font-bold text-blue-700 mt-0.5">{formatCurrency(booking.total_amount)}</p>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-100">
            <p className="text-emerald-500 font-medium">Paid So Far</p>
            <p className="font-bold text-emerald-700 mt-0.5">{formatCurrency(summary.paidTotal)}</p>
          </div>
          <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-100">
            <p className="text-amber-500 font-medium">Pending</p>
            <p className="font-bold text-amber-700 mt-0.5">{formatCurrency(summary.pendingBalance)}</p>
          </div>
          <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-100">
            <p className="text-gray-500 font-medium">Artist Payout (~{artistSharePct}%)</p>
            <p className="font-bold text-gray-700 mt-0.5">{formatCurrency(settlementPaid)}</p>
          </div>
        </div>

        {payments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
        ) : (
          <div className="space-y-1.5">
            {payments.map((p) => (
              <div key={p.id} className="flex items-center justify-between text-sm p-2.5 rounded-lg bg-muted/30">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${p.status === "paid" ? "bg-emerald-500" : p.status === "failed" ? "bg-red-500" : "bg-amber-500"}`} />
                  <span className="font-medium">{TYPE_LABELS[p.type]}</span>
                  {p.notes && <span className="text-xs text-muted-foreground truncate">· {p.notes}</span>}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <p className="font-medium">{formatCurrency(p.amount)}</p>
                    {p.paid_at && <p className="text-xs text-muted-foreground">{formatDate(p.paid_at)}</p>}
                  </div>
                  <button onClick={() => openEdit(p)} className="text-muted-foreground hover:text-navy-900 p-1">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setDeletingId(p.id)} className="text-muted-foreground hover:text-red-600 p-1">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Payment Dialog */}
      <Dialog open={dialogMode !== null} onOpenChange={(o) => !o && setDialogMode(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{dialogMode === "edit" ? "Edit Payment" : "Add Payment"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Type</Label>
              <Select value={formType} onValueChange={(v) => setFormType(v as PaymentType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="advance">Advance</SelectItem>
                  <SelectItem value="final">Final Balance</SelectItem>
                  <SelectItem value="artist_settlement">Artist Settlement</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Amount (₹)</Label>
              <div className="relative">
                <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input type="number" className="pl-8 font-semibold" value={formAmount} onChange={(e) => setFormAmount(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Status</Label>
              <Select value={formStatus} onValueChange={(v) => setFormStatus(v as PaymentStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Notes (optional)</Label>
              <Input placeholder="e.g. Cash received, UPI ref #12345" value={formNotes} onChange={(e) => setFormNotes(e.target.value)} />
            </div>
            <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
              <Button variant="outline" className="w-full sm:w-auto" onClick={() => setDialogMode(null)}>Cancel</Button>
              <Button className="w-full sm:w-auto" onClick={savePayment} loading={saving}>Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deletingId} onOpenChange={(o) => !o && setDeletingId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600"><AlertTriangle className="w-5 h-5" />Remove Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <p className="text-sm text-muted-foreground">Remove this payment record? This can't be undone.</p>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setDeletingId(null)}>Cancel</Button>
              <Button variant="destructive" loading={deleting} onClick={confirmDelete}>Remove</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
