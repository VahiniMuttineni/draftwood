"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Plus, Filter, Download, Search, MoreHorizontal, Trash, Edit, Eye } from "lucide-react";
import { useState } from "react";
import type { Status } from "@/lib/types";
import { useSession } from "@/lib/session";
import { usePapers, useCreatePaper, useDeletePaper } from "@/lib/hooks";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const FILTERS: (Status | "All")[] = ["All", "Draft", "Pending Review", "Under Review", "Review Completed", "Published", "Rejected"];

export default function DocumentsPage() {
  const { user } = useSession();
  const router = useRouter();
  const [filter, setFilter] = useState<Status | "All">("All");
  const [query, setQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  const { data, isLoading } = usePapers({ 
    status: filter !== "All" ? filter : undefined,
    q: query || undefined,
  });
  const rows = data?.data || [];
  const meta = data?.meta;

  const createDoc = useCreatePaper();
  const deleteDoc = useDeletePaper();

  const [bulkDeleteModal, setBulkDeleteModal] = useState<boolean>(false);

  const handleSelectAll = () => {
    if (selectedIds.size === rows.length && rows.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(rows.map(r => r.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleBulkDelete = async () => {
    const ids = rows.filter(r => selectedIds.has(r.id)).map(r => r.id);
    if (!confirm(`Are you sure you want to delete ${ids.length} document(s)?`)) return;
    try {
      await Promise.all(ids.map(id => deleteDoc.mutateAsync(id)));
      toast.success(`${ids.length} document(s) deleted`);
      setSelectedIds(new Set());
      setBulkDeleteModal(false);
    } catch (e: any) {
      toast.error(e.message || "Failed to delete documents");
    }
  };

  const handleSingleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this document?")) return;
    try {
      await deleteDoc.mutateAsync(id);
      toast.success("Document deleted");
      setSelectedIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } catch (e: any) {
      toast.error(e.message || "Failed to delete document");
    }
  };

  const handleCreate = () => {
    createDoc.mutate({
      title: "Untitled Document",
      body: "Start writing here...",
    });
  };

  return (
    <div>
      <div className="mb-8 flex items-end justify-between">
        <div>
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Library</div>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-heading">My Documents</h1>
          <p className="mt-2 text-sm text-body">All documents you own or collaborate on across the organization.</p>
        </div>
        {(user?.role === "Author" || user?.role === "Admin") && (
          <Button asChild className="h-9 gap-1.5 bg-primary hover:bg-primary-hover">
            <Link href="/papers/new">
              <Plus className="h-4 w-4" /> New document
            </Link>
          </Button>
        )}
      </div>

      {/* Filter bar */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-1 shadow-sm">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                filter === f ? "bg-foreground text-background" : "text-body hover:bg-muted"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="relative ml-auto">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search…"
            className="h-9 w-56 rounded-md border border-border bg-card pl-8 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
          />
        </div>
        {selectedIds.size > 0 && (
          <Button variant="destructive" size="sm" className="ml-auto h-9 gap-1.5" onClick={handleBulkDelete}>
            <Trash className="h-3.5 w-3.5" /> Delete Selected ({selectedIds.size})
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-panel">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              <th className="w-8 px-4 py-3">
                <input 
                  type="checkbox" 
                  className="rounded border-border accent-primary" 
                  checked={rows.length > 0 && selectedIds.size === rows.length}
                  onChange={handleSelectAll}
                />
              </th>
              <th className="px-2 py-3">Document</th>
              <th className="px-2 py-3">Status</th>
              <th className="px-2 py-3">Owner</th>
              <th className="px-2 py-3">Reviewer</th>
              <th className="px-2 py-3">Updated</th>
              <th className="w-10 px-2 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading && (
              <tr>
                <td colSpan={7} className="px-6 py-16 text-center text-sm text-muted-foreground">Loading documents...</td>
              </tr>
            )}
            {!isLoading && rows.map((d) => (
              <tr key={d.id} className="group hover:bg-muted/40">
                <td className="px-4 py-4">
                  <input 
                    type="checkbox" 
                    className="rounded border-border accent-primary" 
                    checked={selectedIds.has(d.id)}
                    onChange={() => toggleSelect(d.id)}
                  />
                </td>
                <td className="px-2 py-4">
                  <Link href={`/papers/${d.id}`} className="block">
                    <div className="font-medium text-heading group-hover:text-primary">{d.title}</div>
                  </Link>
                </td>
                <td className="px-2 py-4"><StatusBadge status={d.status} /></td>
                <td className="px-2 py-4">
                  <div className="flex items-center gap-2">
                    <div className="grid h-6 w-6 place-items-center rounded-full text-[9px] font-semibold text-white" style={{ background: "oklch(0.72 0.14 258)" }}>
                      {d.owner?.name.split(" ").map((s: string) => s[0]).join("") || "?"}
                    </div>
                    <span className="text-xs text-body">{d.owner?.name || "Unknown"}</span>
                  </div>
                </td>
                <td className="px-2 py-4 text-xs text-body">{d.reviewer?.name || "—"}</td>
                <td className="px-2 py-4 text-xs text-muted-foreground">{new Date(d.updatedAt).toLocaleDateString()}</td>
                <td className="px-2 py-4">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="rounded-md p-1 text-muted-foreground hover:bg-muted transition-colors">
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={() => router.push(`/papers/${d.id}`)}>
                        <Eye className="mr-2 h-4 w-4" /> View Details
                      </DropdownMenuItem>
                      {(user?.id === d.ownerId || user?.role === "Admin") && (
                        <DropdownMenuItem onClick={() => router.push(`/papers/${d.id}`)}>
                          <Edit className="mr-2 h-4 w-4" /> Edit
                        </DropdownMenuItem>
                      )}
                      {(user?.id === d.ownerId || user?.role === "Admin") && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => handleSingleDelete(d.id)} 
                            className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                          >
                            <Trash className="mr-2 h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!isLoading && rows.length === 0 && (
          <div className="px-6 py-16 text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-muted"><Search className="h-5 w-5 text-muted-foreground" /></div>
            <div className="mt-4 text-sm font-medium text-heading">No documents match your filter</div>
            <div className="mt-1 text-xs text-muted-foreground">Try adjusting your search terms or filter selection.</div>
          </div>
        )}
        <div className="flex items-center justify-between border-t border-border px-6 py-3 text-xs text-muted-foreground">
          <div>Showing {rows.length} of {meta?.total || 0} documents</div>
          <div className="flex items-center gap-2">
            <button className="rounded border border-border px-2 py-1 hover:bg-muted" disabled={meta?.page === 1}>Previous</button>
            <button className="rounded border border-border px-2 py-1 hover:bg-muted" disabled={!meta || rows.length < meta.limit}>Next</button>
          </div>
        </div>
      </div>


    </div>
  );
}
