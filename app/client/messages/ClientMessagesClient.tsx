"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { createClient } from "@/lib/supabase/client";
import { formatDateTime, getInitials, cn } from "@/lib/utils";

interface Message {
  id: string;
  enquiry_id: string;
  sender_id: string;
  sender_name: string;
  content: string;
  created_at: string;
}

interface Props {
  enquiries: {
    id: string;
    event_type: string;
    coordinator: { id: string; name: string; avatar_url?: string } | null;
  }[];
  currentUserId: string;
  currentUserName: string;
}

export function ClientMessagesClient({ enquiries, currentUserId, currentUserName }: Props) {
  const [selectedEnquiry, setSelectedEnquiry] = useState(enquiries[0]?.id ?? null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!selectedEnquiry) return;
    const supabase = createClient();

    const fetchMessages = async () => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("enquiry_id", selectedEnquiry)
        .order("created_at");
      if (data) setMessages(data);
    };

    fetchMessages();

    const channel = supabase
      .channel(`messages:${selectedEnquiry}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `enquiry_id=eq.${selectedEnquiry}` },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selectedEnquiry]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedEnquiry) return;
    setSending(true);
    const supabase = createClient();
    await supabase.from("messages").insert({
      enquiry_id: selectedEnquiry,
      sender_id: currentUserId,
      sender_name: currentUserName,
      content: newMessage.trim(),
    });
    setNewMessage("");
    setSending(false);
  };

  const selectedEnquiryData = enquiries.find((e) => e.id === selectedEnquiry);

  return (
    <div className="h-[calc(100vh-8rem)] flex overflow-hidden border rounded-2xl m-4">
      {/* Sidebar */}
      <div className="w-64 flex-shrink-0 border-r overflow-y-auto">
        <div className="p-4 border-b">
          <h2 className="font-semibold text-sm">Conversations</h2>
        </div>
        {enquiries.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            No active conversations
          </div>
        ) : (
          enquiries.map((e) => (
            <button
              key={e.id}
              onClick={() => setSelectedEnquiry(e.id)}
              className={cn(
                "w-full text-left p-4 border-b hover:bg-accent/30 transition-colors",
                selectedEnquiry === e.id && "bg-gold-50 border-l-2 border-l-gold-500"
              )}
            >
              <p className="font-medium text-sm truncate">{e.event_type}</p>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                with {e.coordinator?.name ?? "Coordinator"}
              </p>
            </button>
          ))
        )}
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col">
        {selectedEnquiry ? (
          <>
            {/* Chat header */}
            <div className="p-4 border-b flex items-center gap-3">
              <Avatar>
                <AvatarFallback>{getInitials(selectedEnquiryData?.coordinator?.name ?? "C")}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold text-sm">{selectedEnquiryData?.coordinator?.name ?? "Coordinator"}</p>
                <p className="text-xs text-muted-foreground">{selectedEnquiryData?.event_type}</p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                  <div className="text-center">
                    <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p>No messages yet. Say hello!</p>
                  </div>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMe = msg.sender_id === currentUserId;
                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn("flex gap-2", isMe ? "flex-row-reverse" : "flex-row")}
                    >
                      <Avatar className="h-7 w-7 flex-shrink-0">
                        <AvatarFallback className="text-[10px]">
                          {getInitials(msg.sender_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div
                        className={cn(
                          "max-w-[70%] rounded-2xl px-4 py-2.5 text-sm",
                          isMe
                            ? "gold-gradient text-navy-900 rounded-tr-sm"
                            : "bg-muted text-foreground rounded-tl-sm"
                        )}
                      >
                        <p>{msg.content}</p>
                        <p className={cn("text-[10px] mt-1", isMe ? "text-navy-700" : "text-muted-foreground")}>
                          {formatDateTime(msg.created_at)}
                        </p>
                      </div>
                    </motion.div>
                  );
                })
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t flex gap-2">
              <Input
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                className="flex-1"
              />
              <Button
                size="icon"
                onClick={sendMessage}
                disabled={!newMessage.trim() || sending}
                loading={sending}
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>Select a conversation to start messaging</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
