"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, MessageSquare, ChevronLeft, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { db } from "@/lib/firebase/client";
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, Timestamp } from "firebase/firestore";
import { formatDateTime, getInitials, cn } from "@/lib/utils";
import { requestMessageNotificationPermission } from "@/lib/incoming-message-alert";
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
  client: { id: string; name: string; avatar_url?: string } | null;
}

interface Props {
  enquiries: Enquiry[];
  currentUserId: string;
  currentUserName: string;
}

export function CoordinatorMessagesClient({ enquiries, currentUserId, currentUserName }: Props) {
  const [selectedEnquiryId, setSelectedEnquiryId] = useState<string | null>(
    enquiries[0]?.id ?? null
  );
  const [messagesByEnquiry, setMessagesByEnquiry] = useState<Record<string, Message[]>>({});
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [convSearch, setConvSearch] = useState("");
  // track which enquiry IDs have unread messages (new since page load)
  const [unreadIds, setUnreadIds] = useState<Set<string>>(new Set());
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const selectedRef = useRef<string | null>(selectedEnquiryId);
  const initializedRef = useRef<Set<string>>(new Set()); // skip the unread bump on each listener's first (backlog) snapshot

  const selectedEnquiry = enquiries.find((e) => e.id === selectedEnquiryId) ?? null;
  const messages = useMemo(
    () => messagesByEnquiry[selectedEnquiryId ?? ""] ?? [],
    [messagesByEnquiry, selectedEnquiryId]
  );
  const loading = selectedEnquiryId != null && !(selectedEnquiryId in messagesByEnquiry);

  selectedRef.current = selectedEnquiryId;

  useEffect(() => {
    requestMessageNotificationPermission();
  }, []);

  // One live listener per conversation — nesting messages under their
  // enquiry means each listener is naturally scoped by the security rules,
  // so there's no need for a table-wide subscription filtered client-side.
  useEffect(() => {
    const unsubscribes = enquiries.map((e) => {
      const q = query(collection(db, "enquiries", e.id, "messages"), orderBy("created_at"));
      return onSnapshot(q, (snap) => {
        const data: Message[] = snap.docs.map((d) => {
          const m = d.data() as any;
          const createdAt: Timestamp | string | undefined = m.created_at;
          return {
            id: d.id,
            enquiry_id: e.id,
            sender_id: m.sender_id,
            sender_name: m.sender_name,
            content: m.content,
            created_at: createdAt && typeof (createdAt as Timestamp).toDate === "function"
              ? (createdAt as Timestamp).toDate().toISOString()
              : String(createdAt ?? ""),
          } as Message;
        });

        const isFirstLoad = !initializedRef.current.has(e.id);
        initializedRef.current.add(e.id);

        if (!isFirstLoad) {
          const previous = messagesByEnquiry[e.id] ?? [];
          const hasNewFromOther = data.slice(previous.length).some((m) => m.sender_id !== currentUserId);
          if (hasNewFromOther && selectedRef.current !== e.id) {
            setUnreadIds((prev) => new Set(prev).add(e.id));
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
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const selectConversation = (id: string) => {
    setSelectedEnquiryId(id);
    // on mobile, hide sidebar after selecting
    if (window.innerWidth < 768) setShowSidebar(false);
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedEnquiryId) return;
    setSending(true);
    try {
      await addDoc(collection(db, "enquiries", selectedEnquiryId, "messages"), {
        sender_id: currentUserId,
        sender_name: currentUserName,
        content: newMessage.trim(),
        created_at: serverTimestamp(),
      });
      // The onSnapshot listener above picks this up automatically. The
      // persistent notification below is separate — it's what lets the
      // client find out even if they aren't on the messages page right now.
      if (selectedEnquiry?.client?.id) {
        notifyUser(selectedEnquiry.client.id, {
          title: `New message from ${currentUserName}`,
          message: newMessage.trim(),
          type: "info",
          link: "/client/messages",
        }).catch(() => {});
      }
    } catch (error) {
      console.error("Send error:", error);
    }
    setNewMessage("");
    setSending(false);
    inputRef.current?.focus();
  };

  return (
    <div className="h-[calc(100dvh-5rem)] flex overflow-hidden rounded-2xl border m-2 md:m-4 shadow-sm">

      {/* ── Conversation list sidebar ── */}
      <AnimatePresence initial={false}>
        {(showSidebar || enquiries.length === 0) && (
          <motion.div
            key="sidebar"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: "100%", maxWidth: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex-shrink-0 border-r bg-card flex flex-col overflow-hidden md:max-w-[260px]"
          >
            <div className="p-4 border-b flex-shrink-0 space-y-2">
              <h2 className="font-semibold text-sm text-foreground">Client Conversations</h2>
              <Input
                placeholder="Search by name or event…"
                value={convSearch}
                onChange={(e) => setConvSearch(e.target.value)}
                className="h-7 text-xs"
              />
            </div>

            <div className="flex-1 overflow-y-auto">
              {enquiries.length === 0 ? (
                <div className="p-8 text-center">
                  <User className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">No assigned enquiries yet</p>
                </div>
              ) : (
                enquiries
                .filter((e) => {
                  const q = convSearch.toLowerCase();
                  return !q || (e.client?.name ?? "").toLowerCase().includes(q) || e.event_type.toLowerCase().includes(q);
                })
                .map((e) => {
                  const isSelected = selectedEnquiryId === e.id;
                  const hasUnread = unreadIds.has(e.id);
                  return (
                    <button
                      key={e.id}
                      onClick={() => selectConversation(e.id)}
                      className={cn(
                        "w-full text-left px-4 py-3.5 border-b transition-colors flex items-center gap-3",
                        isSelected
                          ? "bg-navy-50 border-l-2 border-l-navy-500"
                          : "hover:bg-accent/30"
                      )}
                    >
                      <Avatar className="h-9 w-9 flex-shrink-0">
                        <AvatarFallback className={cn(
                          "text-xs font-semibold",
                          isSelected ? "bg-navy-100 text-navy-700" : "bg-muted"
                        )}>
                          {getInitials(e.client?.name ?? "C")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className={cn("text-sm truncate", isSelected || hasUnread ? "font-semibold" : "font-medium")}>
                            {e.client?.name ?? "Client"}
                          </p>
                          {hasUnread && (
                            <span className="w-2 h-2 rounded-full bg-navy-500 flex-shrink-0 ml-1" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{e.event_type}</p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Chat pane ── */}
      <div className="flex-1 flex flex-col min-w-0 bg-background">
        {selectedEnquiry ? (
          <>
            {/* Chat header */}
            <div className="px-4 py-3 border-b flex items-center gap-3 flex-shrink-0 bg-card">
              {/* Mobile back button */}
              {!showSidebar && (
                <button
                  onClick={() => setShowSidebar(true)}
                  className="md:hidden p-1 rounded-lg hover:bg-accent transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              )}
              <Avatar>
                <AvatarFallback className="bg-navy-100 text-navy-700 font-semibold">
                  {getInitials(selectedEnquiry.client?.name ?? "C")}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{selectedEnquiry.client?.name ?? "Client"}</p>
                <p className="text-xs text-muted-foreground truncate">{selectedEnquiry.event_type}</p>
              </div>
            </div>

            {/* Messages area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center text-muted-foreground">
                    <div className="w-6 h-6 border-2 border-navy-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <p className="text-xs">Loading messages…</p>
                  </div>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center text-muted-foreground">
                    <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-25" />
                    <p className="font-medium text-sm">No messages yet</p>
                    <p className="text-xs mt-1">Start the conversation with {selectedEnquiry.client?.name}</p>
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
                              isMe ? "bg-navy-100 text-navy-700" : "bg-muted"
                            )}>
                              {getInitials(msg.sender_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className={cn("max-w-[72%]", isMe ? "items-end" : "items-start", "flex flex-col gap-0.5")}>
                            <div className={cn(
                              "rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                              isMe
                                ? "bg-navy-800 text-white rounded-tr-sm"
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
                  <div ref={bottomRef} />
                </>
              )}
            </div>

            {/* Quick templates */}
            <div className="px-3 pt-2 border-t flex-shrink-0 flex gap-1.5 flex-wrap">
              {[
                "Hi! I've reviewed your enquiry and will share artist options shortly.",
                "Your proposal is ready — please check it in your dashboard.",
                "Could you confirm the exact venue address and expected guest count?",
                "We've shortlisted 3 artists for your event — proposal coming in 2 hours.",
                "Your booking is confirmed! We'll send artist details shortly.",
              ].map((t) => (
                <button
                  key={t}
                  onClick={() => setNewMessage(t)}
                  className="text-[10px] px-2 py-1 rounded-lg border bg-muted hover:bg-navy-50 hover:border-navy-300 text-muted-foreground hover:text-navy-700 transition-colors truncate max-w-[160px]"
                  title={t}
                >
                  {t.slice(0, 28)}…
                </button>
              ))}
            </div>
            {/* Input bar */}
            <div className="p-3 flex gap-2 flex-shrink-0 bg-card">
              <Input
                ref={inputRef}
                placeholder={`Message ${selectedEnquiry.client?.name ?? "client"}…`}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                className="flex-1 rounded-xl"
              />
              <Button
                size="icon"
                variant="secondary"
                className="rounded-xl flex-shrink-0"
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
              <p className="text-sm mt-1">Choose a client enquiry from the sidebar</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
