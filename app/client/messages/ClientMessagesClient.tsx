"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { motion } from "framer-motion";
import { Send, MessageSquare, ChevronLeft, Headphones } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { db } from "@/lib/firebase/client";
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, Timestamp } from "firebase/firestore";
import { formatDateTime, getInitials, cn } from "@/lib/utils";
import {
  requestMessageNotificationPermission,
  showIncomingMessageAlert,
} from "@/lib/incoming-message-alert";
import { notifyUser } from "@/lib/notifications/client";

interface Message {
  id: string;
  enquiry_id: string;
  sender_id: string;
  sender_name: string;
  content: string;
  created_at: string;
}

interface Enquiry {
  id: string;
  event_type: string;
  coordinator: { id: string; name: string; avatar_url?: string } | null;
}

interface Props {
  enquiries: Enquiry[];
  currentUserId: string;
  currentUserName: string;
}

export function ClientMessagesClient({ enquiries, currentUserId, currentUserName }: Props) {
  const [selectedEnquiryId, setSelectedEnquiryId] = useState<string | null>(
    enquiries[0]?.id ?? null
  );
  const [messagesByEnquiry, setMessagesByEnquiry] = useState<Record<string, Message[]>>({});
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  // Mobile-only pane routing — defaults to false (list view) both server-
  // and client-side, so there's no hydration mismatch and no dependency on
  // window.innerWidth. Purely a CSS `hidden md:flex` switch below; on desktop
  // both panes always show regardless of this value.
  const [mobileConversationOpen, setMobileConversationOpen] = useState(false);
  const [unreadIds, setUnreadIds] = useState<Set<string>>(new Set());
  // Scrolled directly (not via scrollIntoView, which bubbles up through
  // every scrollable ancestor — including the dashboard shell's own <main>
  // — and was nudging the whole page down, clipping this panel's header.
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const selectedRef = useRef<string | null>(selectedEnquiryId);
  const initializedRef = useRef<Set<string>>(new Set()); // skip the alert on each listener's first (backlog) snapshot

  const selectedEnquiry = enquiries.find((e) => e.id === selectedEnquiryId) ?? null;
  const messages = useMemo(
    () => messagesByEnquiry[selectedEnquiryId ?? ""] ?? [],
    [messagesByEnquiry, selectedEnquiryId]
  );
  const loadingMsgs = selectedEnquiryId != null && !(selectedEnquiryId in messagesByEnquiry);

  selectedRef.current = selectedEnquiryId;

  useEffect(() => {
    requestMessageNotificationPermission();
  }, []);

  // One live listener per conversation — nesting messages under their
  // enquiry means each listener is naturally scoped by the security rules
  // (a client only has read access to their own enquiries' messages), so
  // there's no need for a table-wide subscription filtered client-side.
  useEffect(() => {
    const unsubscribes = enquiries.map((e) => {
      const q = query(collection(db, "enquiries", e.id, "messages"), orderBy("created_at"));
      return onSnapshot(q, (snap) => {
        const data: Message[] = snap.docs.map((d) => {
          const raw = d.data() as any;
          const createdAt: Timestamp | undefined = raw.created_at;
          return {
            id: d.id,
            enquiry_id: e.id,
            sender_id: raw.sender_id,
            sender_name: raw.sender_name,
            content: raw.content,
            created_at: createdAt?.toDate ? createdAt.toDate().toISOString() : new Date().toISOString(),
          };
        });

        const isFirstLoad = !initializedRef.current.has(e.id);
        initializedRef.current.add(e.id);

        if (!isFirstLoad) {
          const previous = messagesByEnquiry[e.id] ?? [];
          const newOnes = data.slice(previous.length).filter((m) => m.sender_id !== currentUserId);
          for (const msg of newOnes) {
            if (selectedRef.current !== e.id) {
              setUnreadIds((prev) => new Set(prev).add(e.id));
            }
            showIncomingMessageAlert({
              title: msg.sender_name,
              body: msg.content,
              notificationTag: `msg-${e.id}`,
            });
          }
        }

        setMessagesByEnquiry((prev) => ({ ...prev, [e.id]: data }));
      });
    });

    return () => unsubscribes.forEach((unsub) => unsub());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enquiries.map((e) => e.id).join(","), currentUserId]);

  useEffect(() => {
    if (!selectedEnquiryId) return;
    setUnreadIds((prev) => {
      if (!prev.has(selectedEnquiryId)) return prev;
      const next = new Set(prev);
      next.delete(selectedEnquiryId);
      return next;
    });
  }, [selectedEnquiryId]);

  useEffect(() => {
    const el = messagesContainerRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const selectConversation = (id: string) => {
    setSelectedEnquiryId(id);
    setMobileConversationOpen(true);
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedEnquiryId) return;
    setSending(true);
    await addDoc(collection(db, "enquiries", selectedEnquiryId, "messages"), {
      sender_id: currentUserId,
      sender_name: currentUserName,
      content: newMessage.trim(),
      created_at: serverTimestamp(),
    });
    // The onSnapshot listener above picks this up automatically — no
    // optimistic append needed. The persistent notification below is
    // separate — it's what lets the coordinator find out even if they
    // aren't on the messages page right now.
    if (selectedEnquiry?.coordinator?.id) {
      notifyUser(selectedEnquiry.coordinator.id, {
        title: `New message from ${currentUserName}`,
        message: newMessage.trim(),
        type: "info",
        link: "/coordinator/messages",
      }).catch(() => {});
    }
    setNewMessage("");
    setSending(false);
    inputRef.current?.focus();
  };

  return (
    <div className="h-[calc(100dvh-5rem)] flex overflow-hidden rounded-2xl border m-2 md:m-4 shadow-sm">

      {/* ── Sidebar ── */}
      <div
        className={cn(
          "flex-shrink-0 border-r bg-card flex-col overflow-hidden w-full md:max-w-[260px]",
          mobileConversationOpen ? "hidden md:flex" : "flex"
        )}
      >
            <div className="p-4 border-b flex-shrink-0">
              <h2 className="font-semibold text-sm text-foreground">My Conversations</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Chat with your coordinator</p>
            </div>

            <div className="flex-1 overflow-y-auto">
              {enquiries.length === 0 ? (
                <div className="p-8 text-center">
                  <Headphones className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">No assigned coordinator yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Submit an enquiry to get started</p>
                </div>
              ) : (
                enquiries.map((e) => {
                  const isSelected = selectedEnquiryId === e.id;
                  const hasUnread = unreadIds.has(e.id);
                  return (
                    <button
                      key={e.id}
                      onClick={() => selectConversation(e.id)}
                      className={cn(
                        "w-full text-left px-4 py-3.5 border-b transition-colors flex items-center gap-3",
                        isSelected
                          ? "bg-gold-50 border-l-2 border-l-gold-500"
                          : "hover:bg-accent/30"
                      )}
                    >
                      <Avatar className="h-9 w-9 flex-shrink-0">
                        <AvatarFallback className={cn(
                          "text-xs font-semibold",
                          isSelected ? "bg-gold-100 text-gold-800" : "bg-muted"
                        )}>
                          {getInitials(e.coordinator?.name ?? "C")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className={cn(
                            "text-sm truncate",
                            isSelected || hasUnread ? "font-semibold" : "font-medium"
                          )}>
                            {e.coordinator?.name ?? "Coordinator"}
                          </p>
                          {hasUnread && (
                            <span className="w-2 h-2 rounded-full bg-gold-500 flex-shrink-0 ml-1" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{e.event_type}</p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
      </div>

      {/* ── Chat pane ── */}
      <div
        className={cn(
          "flex-1 flex-col min-w-0 bg-background",
          mobileConversationOpen ? "flex" : "hidden md:flex"
        )}
      >
        {selectedEnquiry ? (
          <>
            {/* Header */}
            <div className="px-4 py-3 border-b flex items-center gap-3 flex-shrink-0 bg-card">
              <button
                onClick={() => setMobileConversationOpen(false)}
                className="md:hidden p-1 rounded-lg hover:bg-accent transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <Avatar>
                <AvatarFallback className="bg-gold-100 text-gold-800 font-semibold">
                  {getInitials(selectedEnquiry.coordinator?.name ?? "C")}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">
                  {selectedEnquiry.coordinator?.name ?? "Coordinator"}
                </p>
                <p className="text-xs text-muted-foreground truncate">{selectedEnquiry.event_type}</p>
              </div>
            </div>

            {/* Messages */}
            <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-3">
              {loadingMsgs ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center text-muted-foreground">
                    <div className="w-6 h-6 border-2 border-gold-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <p className="text-xs">Loading messages…</p>
                  </div>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center text-muted-foreground">
                    <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-25" />
                    <p className="font-medium text-sm">No messages yet</p>
                    <p className="text-xs mt-1">
                      Say hello to {selectedEnquiry.coordinator?.name ?? "your coordinator"}!
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((msg, idx) => {
                    const isMe = msg.sender_id === currentUserId;
                    const prevMsg = messages[idx - 1];
                    const showDate =
                      !prevMsg ||
                      new Date(msg.created_at).toDateString() !==
                        new Date(prevMsg.created_at).toDateString();

                    return (
                      <div key={msg.id}>
                        {showDate && (
                          <div className="flex items-center gap-3 my-4">
                            <div className="flex-1 h-px bg-border" />
                            <span className="text-[10px] text-muted-foreground px-2 py-0.5 rounded-full bg-muted">
                              {new Date(msg.created_at).toLocaleDateString("en-IN", {
                                day: "numeric", month: "short", year: "numeric",
                              })}
                            </span>
                            <div className="flex-1 h-px bg-border" />
                          </div>
                        )}
                        <motion.div
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={cn("flex gap-2", isMe ? "flex-row-reverse" : "flex-row")}
                        >
                          <Avatar className="h-7 w-7 flex-shrink-0 mt-0.5">
                            <AvatarFallback className={cn(
                              "text-[10px] font-semibold",
                              isMe ? "bg-gold-100 text-gold-800" : "bg-muted"
                            )}>
                              {getInitials(msg.sender_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className={cn("max-w-[72%]", isMe ? "items-end" : "items-start", "flex flex-col gap-0.5")}>
                            <div className={cn(
                              "rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                              isMe
                                ? "gold-gradient text-white rounded-tr-sm"
                                : "bg-muted text-foreground rounded-tl-sm"
                            )}>
                              {msg.content}
                            </div>
                            <span className="text-[10px] text-muted-foreground px-1">
                              {formatDateTime(msg.created_at)}
                            </span>
                          </div>
                        </motion.div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>

            {/* Input */}
            <div className="p-3 border-t flex gap-2 flex-shrink-0 bg-card">
              <Input
                ref={inputRef}
                placeholder={`Message ${selectedEnquiry.coordinator?.name ?? "coordinator"}…`}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                className="flex-1 rounded-xl"
              />
              <Button
                size="icon"
                className="rounded-xl gold-gradient text-white hover:opacity-90 flex-shrink-0"
                onClick={sendMessage}
                disabled={!newMessage.trim() || sending}
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="font-medium">Select a conversation</p>
              <p className="text-sm mt-1">Choose an event to start chatting</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
