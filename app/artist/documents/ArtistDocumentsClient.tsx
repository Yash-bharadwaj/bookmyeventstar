"use client";

import { motion } from "framer-motion";
import { Upload, FileText, CheckCircle2, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArtistDocument } from "@/types";
import { formatDate } from "@/lib/utils";

const DOC_TYPES = [
  { type: "Aadhaar Card", desc: "Government ID proof" },
  { type: "PAN Card", desc: "Tax identification" },
  { type: "Bank Details", desc: "Account for payments" },
  { type: "Performance Agreement", desc: "Standard contract" },
];

export function ArtistDocumentsClient({
  artistProfileId,
  documents,
}: {
  artistProfileId: string;
  documents: ArtistDocument[];
}) {
  const uploadedTypes = new Set(documents.map((d) => d.type));

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
      <Card>
        <CardHeader><CardTitle>Required Documents</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {DOC_TYPES.map((doc) => {
            const uploaded = uploadedTypes.has(doc.type);
            const existing = documents.find((d) => d.type === doc.type);
            return (
              <motion.div
                key={doc.type}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center justify-between p-4 rounded-xl border"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${uploaded ? "bg-emerald-100" : "bg-muted"}`}>
                    <FileText className={`w-5 h-5 ${uploaded ? "text-emerald-600" : "text-muted-foreground"}`} />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{doc.type}</p>
                    <p className="text-xs text-muted-foreground">{doc.desc}</p>
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
                    <Button size="sm" variant="outline">
                      <Upload className="w-3.5 h-3.5 mr-1.5" />
                      Upload
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
