"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Edit2, Send, Eye } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Proposal } from "@/types";
import { formatDate, formatCurrency, getStatusColor, getStatusLabel } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

interface ProposalWithExtras extends Omit<Proposal, "enquiry"> {
  enquiry?: {
    event_type: string;
    event_date: string;
    city: string;
    client?: { name: string };
  };
}

interface Props {
  proposals: ProposalWithExtras[];
  coordinatorId: string;
}

export function CoordinatorProposalsClient({ proposals, coordinatorId }: Props) {
  const router = useRouter();
  const [sending, setSending] = useState<string | null>(null);

  const sendProposal = async (proposalId: string, enquiryId: string) => {
    setSending(proposalId);
    const supabase = createClient();
    await supabase
      .from("proposals")
      .update({ status: "sent" })
      .eq("id", proposalId);
    await supabase
      .from("enquiries")
      .update({ status: "proposal_sent" })
      .eq("id", enquiryId);

    const { data: enquiry } = await supabase
      .from("enquiries")
      .select("client_id, event_type")
      .eq("id", enquiryId)
      .single();

    if (enquiry?.client_id) {
      await supabase.from("notifications").insert({
        user_id: enquiry.client_id,
        title: "Proposal Ready for Review",
        message: `Your proposal for ${enquiry.event_type} is ready. Please review the artist options.`,
        type: "success",
        link: "/client/proposals",
      });
    }

    toast.success("Proposal sent to client!");
    setSending(null);
    router.refresh();
  };

  const drafts = proposals.filter((p) => p.status === "draft");
  const sent = proposals.filter((p) => p.status === "sent");
  const accepted = proposals.filter((p) => p.status === "accepted");

  const ProposalCard = ({ p }: { p: ProposalWithExtras }) => (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border overflow-hidden hover:shadow-md transition-all"
    >
      <div className="p-4 border-b bg-muted/20 flex items-center justify-between flex-wrap gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">{p.enquiry?.event_type ?? "Event"}</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${getStatusColor(p.status)}`}>
              {getStatusLabel(p.status)}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {p.enquiry?.client?.name} · {p.enquiry?.city} · {formatDate(p.enquiry?.event_date ?? "")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <p className="font-bold">{formatCurrency(p.quoted_price)}</p>
          {p.status === "draft" && (
            <Button size="sm" loading={sending === p.id} onClick={() => sendProposal(p.id, p.enquiry_id)}>
              <Send className="w-3.5 h-3.5 mr-1.5" />
              Send
            </Button>
          )}
        </div>
      </div>
      <div className="p-4">
        <p className="text-sm text-muted-foreground line-clamp-2">{p.content || "No description added."}</p>
        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <span>
            {((p.artists_proposed as unknown[]) ?? []).length} artist(s) proposed
          </span>
          {p.validity_date && <span>· Valid till {formatDate(p.validity_date)}</span>}
        </div>
      </div>
    </motion.div>
  );

  return (
    <div className="p-4 md:p-6">
      <Tabs defaultValue="drafts">
        <TabsList>
          <TabsTrigger value="drafts">Drafts ({drafts.length})</TabsTrigger>
          <TabsTrigger value="sent">Sent ({sent.length})</TabsTrigger>
          <TabsTrigger value="accepted">Accepted ({accepted.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="drafts" className="mt-6 space-y-4">
          {drafts.length === 0 ? (
            <p className="text-center py-12 text-muted-foreground text-sm">No draft proposals</p>
          ) : (
            drafts.map((p) => <ProposalCard key={p.id} p={p} />)
          )}
        </TabsContent>
        <TabsContent value="sent" className="mt-6 space-y-4">
          {sent.map((p) => <ProposalCard key={p.id} p={p} />)}
        </TabsContent>
        <TabsContent value="accepted" className="mt-6 space-y-4">
          {accepted.map((p) => <ProposalCard key={p.id} p={p} />)}
        </TabsContent>
      </Tabs>
    </div>
  );
}
