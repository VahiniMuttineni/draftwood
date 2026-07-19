"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RichTextEditor } from "@/components/editor/RichTextEditor";
import { useCreatePaper, useTransitionPaper, useUpdatePaper } from "@/lib/hooks";
import { toast } from "sonner";
import { ArrowLeft, Save, Send, Loader2, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useSession } from "@/lib/session";
import { useDebounce } from "@/lib/use-debounce";

export default function NewDocumentPage() {
  const router = useRouter();
  const { user } = useSession();
  
  const [content, setContent] = useState<any>("");
  const [modalOpen, setModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [saveAction, setSaveAction] = useState<"draft" | "submit" | null>(null);
  
  const [createdDocId, setCreatedDocId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const debouncedContent = useDebounce(content, 1500);

  const createDoc = useCreatePaper();
  const updateDoc = useUpdatePaper();
  const transitionDoc = useTransitionPaper();

  // Basic mock departments list for the dropdown
  // In a real app this would come from an API endpoint
  const departments = [
    { id: "15eb1549-2634-492d-a77f-0416eb99b339", name: "Engineering" },
    { id: "25eb1549-2634-492d-a77f-0416eb99b339", name: "HR" },
    { id: "35eb1549-2634-492d-a77f-0416eb99b339", name: "Finance" },
  ];

  useEffect(() => {
    // Basic check to see if content is empty TipTap structure
    if (!content) return;
    const isActuallyEmpty = typeof content === 'object' && content.content?.length === 1 && !content.content[0].content;
    if (isActuallyEmpty && !createdDocId) return;

    const autoSave = async () => {
      setSaveStatus("saving");
      try {
        if (!createdDocId) {
          const res = await createDoc.mutateAsync({
            title: title || "Untitled Document",
            body: debouncedContent,
            departmentId: departmentId || undefined,
          });
          setCreatedDocId(res.data.id);
          window.history.replaceState(null, '', `/papers/${res.data.id}?edit=true`);
        } else {
          await updateDoc.mutateAsync({
            id: createdDocId,
            data: { body: debouncedContent, title: title || "Untitled Document", currentVersion: 1 }
          });
        }
        setSaveStatus("saved");
      } catch (e) {
        setSaveStatus("idle");
      }
    };
    
    autoSave();
  }, [debouncedContent]);

  useEffect(() => {
    if (saveStatus === "saved") setSaveStatus("idle");
  }, [content, title]);

  const handleSaveIntent = (action: "draft" | "submit") => {
    setSaveAction(action);
    setModalOpen(true);
  };

  const executeSave = async () => {
    if (!title) {
      toast.error("Document title is required");
      return;
    }

    try {
      let docId = createdDocId;
      // 1. Create document (starts as Draft) if it doesn't exist
      if (!docId) {
        const res = await createDoc.mutateAsync({
          title,
          body: content,
          departmentId: departmentId || undefined, // Fallback to user's dept in backend if omitted
        });
        docId = res.data.id;
      } else {
        await updateDoc.mutateAsync({
          id: docId,
          data: { title, body: content, currentVersion: 1 }
        });
      }

      // 2. If action is submit, transition it to Submitted
      if (saveAction === "submit") {
        if (!docId) {
          toast.error("Failed to save document before submitting");
          return;
        }
        const { api } = await import("@/lib/api-client");
        await api.post(`/papers/${docId}/submit`, { optimisticVersion: 1 });
        toast.success("Paper submitted for review!");
        router.push("/papers");
      } else {
        toast.success("Draft saved successfully!");
        router.push("/papers");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to save document");
    } finally {
      setModalOpen(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-6rem)] flex-col">
      <div className="mb-4 flex items-center justify-between">
        <Link href="/papers" className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-heading">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to library
        </Link>
        <div className="flex gap-2 items-center">
          {saveStatus === "saving" && <span className="text-xs text-muted-foreground mr-2 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin"/> Auto-saving...</span>}
          {saveStatus === "saved" && <span className="text-xs text-green-600 mr-2 flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> Saved to drafts</span>}
          <Button variant="outline" onClick={() => handleSaveIntent("draft")} className="gap-1.5 h-9">
            <Save className="h-4 w-4" /> Save as Draft
          </Button>
          <Button onClick={() => handleSaveIntent("submit")} className="gap-1.5 h-9 bg-primary hover:bg-primary-hover text-white">
            <Send className="h-4 w-4" /> Submit for Review
          </Button>
        </div>
      </div>

      <div className="flex-1 bg-white dark:bg-zinc-950 rounded-lg shadow-sm border border-border">
        <RichTextEditor content={content} onChange={setContent} />
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Document</DialogTitle>
            <DialogDescription>
              Provide the document details before saving.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-heading">Document Name</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter a descriptive title..."
                className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-heading">Department (Optional)</label>
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20"
              >
                <option value="">Use my department</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button 
              onClick={executeSave}
              disabled={!title || createDoc.isPending || transitionDoc.isPending}
              className="bg-primary hover:bg-primary-hover text-white"
            >
              {createDoc.isPending || transitionDoc.isPending ? "Saving..." : saveAction === "draft" ? "Save Draft" : "Submit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
