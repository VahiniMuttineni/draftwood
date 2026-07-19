"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePapers } from "@/lib/hooks";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { LayoutGrid, List, Plus, Search, FileText, Clock, Type, AlignLeft } from "lucide-react";
import { useSession } from "@/lib/session";
import { generateDocumentPreviewHTML, estimateWordCount, estimateReadingTime } from "@/lib/preview";

export default function DraftsPage() {
  const router = useRouter();
  const { user } = useSession();
  const [view, setView] = useState<"grid" | "list">("grid");
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<"recent" | "alpha">("recent");

  // Fetch all drafts for this user (status=Draft)
  const { data, isLoading } = usePapers({
    status: "Draft",
    // We don't want pagination for the Google Docs experience on personal drafts initially
    limit: 100, 
  });

  const drafts = useMemo(() => {
    let arr = data?.data || [];
    
    // Client-side search for instantaneous feedback
    if (query) {
      const lower = query.toLowerCase();
      arr = arr.filter(d => (d.title || d.currentVersion?.title || "").toLowerCase().includes(lower));
    }
    
    // Client-side sorting
    arr = [...arr].sort((a, b) => {
      if (sortBy === "recent") {
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      } else {
        return a.title.localeCompare(b.title);
      }
    });

    return arr;
  }, [data?.data, query, sortBy]);

  return (
    <div className="max-w-[1600px] mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="text-4xl font-semibold tracking-tight text-heading flex items-center gap-3">
          Drafts
          <span className="bg-primary/10 text-primary text-xs font-bold px-2 py-0.5 rounded-full align-middle">
            {drafts.length}
          </span>
        </h1>
        <p className="mt-2 text-base text-body max-w-xl">Your personal workspace. Only you can view these unfinished documents.</p>
      </div>
      
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          <div className="relative flex-grow lg:flex-grow-0">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search your drafts..."
              className="h-10 w-full lg:w-72 rounded-full border border-border bg-card pl-10 pr-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-sm transition-shadow"
            />
          </div>
          
          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value as any)}
            className="h-10 rounded-full border border-border bg-card px-4 py-0 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-sm cursor-pointer"
          >
            <option value="recent">Recently Edited</option>
            <option value="alpha">Alphabetical</option>
          </select>

          <div className="flex items-center rounded-full border border-border bg-card p-1 shadow-sm">
            <button
              onClick={() => setView("grid")}
              className={`rounded-full p-1.5 transition-colors ${view === "grid" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-heading hover:bg-muted/50"}`}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setView("list")}
              className={`rounded-full p-1.5 transition-colors ${view === "list" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-heading hover:bg-muted/50"}`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
        
        <Button asChild className="h-10 rounded-full px-5 gap-2 bg-primary hover:bg-primary-hover shadow-sm hover:shadow-md transition-all">
          <Link href="/papers/new">
            <Plus className="h-4 w-4" /> Blank document
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="py-32 flex flex-col items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="mt-4 text-sm text-muted-foreground">Loading your workspace...</p>
        </div>
      ) : drafts.length === 0 ? (
        <div className="py-32 flex flex-col items-center justify-center bg-card rounded-2xl border border-border shadow-sm">
          <div className="relative mb-6">
            <div className="absolute -inset-4 bg-primary/5 rounded-full blur-xl" />
            <div className="relative h-24 w-24 bg-gradient-to-tr from-primary/20 to-primary/5 rounded-2xl border border-primary/20 flex items-center justify-center rotate-3 hover:rotate-6 transition-transform cursor-pointer">
              <FileText className="h-10 w-10 text-primary" />
            </div>
          </div>
          <h2 className="text-2xl font-semibold text-heading">Start your first document</h2>
          <p className="mt-2 text-body max-w-sm text-center">Drafts are your private sandbox. Ideas live here until you're ready to submit them for review.</p>
          <Button asChild className="mt-8 rounded-full shadow-sm hover:shadow-md px-6">
            <Link href="/papers/new">
              <Plus className="h-4 w-4 mr-2" /> Blank document
            </Link>
          </Button>
        </div>
      ) : view === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
          {drafts.map((doc: any) => {
            const wordCount = estimateWordCount(doc.body);
            return (
              <Link
                key={doc.id}
                href={`/papers/${doc.id}?edit=true`}
                className="group flex flex-col rounded-xl border border-border bg-card shadow-sm hover:shadow-xl hover:-translate-y-1 hover:border-primary/30 transition-all duration-300 outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                {/* HTML Preview Area */}
                <div className="aspect-[3/4] p-6 bg-white border-b border-border overflow-hidden relative rounded-t-xl select-none">
                  {/* Subtle fade out at bottom of preview */}
                  <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-white to-transparent z-10" />
                  
                  <div 
                    className="prose prose-sm prose-p:my-1 prose-headings:my-1 max-w-none origin-top-left scale-[0.6] sm:scale-[0.65] w-[160%] sm:w-[150%] h-[160%] opacity-90 group-hover:opacity-100 transition-opacity"
                    dangerouslySetInnerHTML={{ __html: generateDocumentPreviewHTML(doc.body, 7) }}
                  />
                </div>
                
                {/* Metadata Area */}
                <div className="p-4 bg-card rounded-b-xl flex flex-col gap-2">
                  <div className="font-semibold text-sm text-heading truncate group-hover:text-primary transition-colors">
                    {doc.title}
                  </div>
                  <div className="flex items-center text-[11px] text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{new Date(doc.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-panel">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                <th className="px-5 py-4">Document Title</th>
                <th className="px-5 py-4">Department</th>
                <th className="px-5 py-4">Word Count</th>
                <th className="px-5 py-4">Reading Time</th>
                <th className="px-5 py-4">Last Edited</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {drafts.map((d: any) => {
                const wordCount = estimateWordCount(d.body);
                return (
                  <tr key={d.id} className="group hover:bg-muted/40 transition-colors cursor-pointer" onClick={() => router.push(`/papers/${d.id}?edit=true`)}>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="grid h-8 w-8 place-items-center rounded bg-primary/10 text-primary">
                          <FileText className="w-4 h-4" />
                        </div>
                        <span className="font-medium text-heading group-hover:text-primary transition-colors">{d.title}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-body">{d.departmentId.slice(0, 8)}...</td>
                    <td className="px-5 py-4 text-body">{wordCount} words</td>
                    <td className="px-5 py-4 text-body">{estimateReadingTime(wordCount)}</td>
                    <td className="px-5 py-4 text-muted-foreground">
                      {new Date(d.updatedAt).toLocaleDateString()} at {new Date(d.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
