"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { Upload, FileText, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/firebase/client";
import { doc, collection, setDoc, getDoc, getDocs, updateDoc, serverTimestamp } from "firebase/firestore";
import { uploadDocument } from "@/lib/firebase/storage-client";
import { aggregateCompletionFromStoredProfile } from "@/lib/artist-profile-completion";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { ArtistDocument } from "@/types";
import { formatDate } from "@/lib/utils";

const DOC_TYPES = [
  { type: "Aadhaar Card", desc: "Government ID proof — required for verification" },
  { type: "PAN Card", desc: "Tax identification" },
  { type: "Bank Details", desc: "Account for payments" },
  { type: "Performance Agreement", desc: "Standard contract" },
];

/** Only Aadhaar feeds into is_profile_complete (see lib/artist-profile-completion.ts) — the
 * others are useful to have on file but aren't part of the verification checklist. */
const COMPLETION_AFFECTING_TYPES = new Set(["Aadhaar Card"]);

export function ArtistDocumentsClient({
  artistProfileId,
  documents: initialDocuments,
  embedded = false,
}: {
  artistProfileId: string;
  documents: ArtistDocument[];
  /** Set when rendered inside another page's own padded container (the
   * artist profile page, after Photos & Videos) — skips this component's
   * own page-level padding/max-width so it doesn't double up. */
  embedded?: boolean;
}) {
  const router = useRouter();
  const [documents, setDocuments] = useState(initialDocuments);
  const [uploadingType, setUploadingType] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingTypeRef = useRef<string | null>(null);

  const uploadedTypes = new Set(documents.map((d) => d.type));

  const triggerUpload = (type: string) => {
    pendingTypeRef.current = type;
    fileInputRef.current?.click();
  };

  /** Re-checks completeness against Firestore directly (not stale props) after
   * an Aadhaar upload — mirrors ArtistProfileClient.tsx's flushProfileCompleteToDb,
   * since this page can independently flip is_profile_complete from false to
   * true (or resolve a rejection) without the artist ever visiting /artist/profile. */
  const recomputeProfileCompletion = async () => {
    const [profileSnap, mediaSnap] = await Promise.all([
      getDoc(doc(db, "artistProfiles", artistProfileId)),
      getDocs(collection(db, "artistProfiles", artistProfileId, "media")),
    ]);
    if (!profileSnap.exists()) return;
    const profile = profileSnap.data();
    const photoCount = mediaSnap.docs.filter((d) => d.data().type === "photo").length;
    const wasComplete = profile.is_profile_complete === true;
    const wasRejected = !!profile.rejection_reason;

    const { isComplete } = aggregateCompletionFromStoredProfile(
      profile as any,
      photoCount,
      !!profile.avatar_url,
      true // Aadhaar just got uploaded
    );

    await updateDoc(doc(db, "artistProfiles", artistProfileId), {
      is_profile_complete: isComplete,
      rejection_reason: null,
    });

    if (isComplete && (!wasComplete || wasRejected)) {
      fetch("/api/notifications/profile-complete", { method: "POST" }).catch(() => {});
    }
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const type = pendingTypeRef.current;
    e.target.value = ""; // allow re-selecting the same file later
    if (!file || !type) return;

    setUploadingType(type);
    try {
      const docId = doc(collection(db, "artistProfiles", artistProfileId, "documents")).id;
      const { url, path } = await uploadDocument(artistProfileId, docId, file);
      await setDoc(doc(db, "artistProfiles", artistProfileId, "documents", docId), {
        type,
        url,
        storage_path: path,
        is_verified: false,
        created_at: serverTimestamp(),
      });
      setDocuments((prev) => [
        { id: docId, artist_id: artistProfileId, type, url, storage_path: path, is_verified: false, created_at: new Date().toISOString() },
        ...prev,
      ]);
      toast.success(`${type} uploaded!`);

      if (COMPLETION_AFFECTING_TYPES.has(type)) {
        await recomputeProfileCompletion();
      }
    } catch {
      toast.error(`Failed to upload ${type}`);
    }
    setUploadingType(null);
    router.refresh();
  };

  return (
    <div className={embedded ? "space-y-6" : "p-4 md:p-6 max-w-3xl mx-auto space-y-6"}>
      <input ref={fileInputRef} type="file" accept="image/*,.pdf" className="hidden" onChange={handleFileSelected} />

      <Card>
        <CardHeader><CardTitle>Required Documents</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {DOC_TYPES.map((docType) => {
            const uploaded = uploadedTypes.has(docType.type);
            const existing = documents.find((d) => d.type === docType.type);
            const uploading = uploadingType === docType.type;
            return (
              <motion.div
                key={docType.type}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center justify-between p-4 rounded-xl border"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${uploaded ? "bg-emerald-100" : "bg-muted"}`}>
                    <FileText className={`w-5 h-5 ${uploaded ? "text-emerald-600" : "text-muted-foreground"}`} />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{docType.type}</p>
                    <p className="text-xs text-muted-foreground">{docType.desc}</p>
                    {existing && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Uploaded {formatDate(existing.created_at)}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {existing?.is_verified ? (
                    <div className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                      <CheckCircle2 className="w-4 h-4" />
                      Verified
                    </div>
                  ) : uploaded ? (
                    <div className="flex items-center gap-1 text-xs text-amber-600 font-medium">
                      <XCircle className="w-4 h-4" />
                      Pending Review
                    </div>
                  ) : (
                    <Button type="button" size="sm" variant="outline" disabled={uploading} onClick={() => triggerUpload(docType.type)}>
                      {uploading ? (
                        <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      ) : (
                        <Upload className="w-3.5 h-3.5 mr-1.5" />
                      )}
                      {uploading ? "Uploading…" : "Upload"}
                    </Button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </CardContent>
      </Card>

      {documents.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Uploaded Documents</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {documents.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between py-2 border-b last:border-0">
                <div>
                  <p className="font-medium text-sm">{doc.type}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(doc.created_at)}</p>
                </div>
                <div className="flex items-center gap-2">
                  {doc.is_verified ? (
                    <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Verified
                    </span>
                  ) : (
                    <span className="text-xs text-amber-600 font-medium">Under Review</span>
                  )}
                  <Button size="sm" variant="outline" className="text-xs h-7" asChild>
                    <a href={doc.url} target="_blank" rel="noopener noreferrer">View</a>
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
