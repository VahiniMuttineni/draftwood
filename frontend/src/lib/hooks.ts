import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchPapers, fetchPaper, createPaper, updatePaper, transitionPaper, fetchAuditLogs, takeOwnership, deletePaper, assignReviewer, fetchReviewers, api } from "./api-client";

export function usePapers(params?: { q?: string; status?: string; excludeStatus?: string; departmentId?: string; page?: number; limit?: number }) {
  return useQuery({
    queryKey: ["papers", params],
    queryFn: () => fetchPapers(params),
  });
}

export function usePaper(id: string) {
  return useQuery({
    queryKey: ["paper", id],
    queryFn: () => fetchPaper(id),
    enabled: !!id,
  });
}

export function useReviewers(departmentId?: string) {
  return useQuery({
    queryKey: ["reviewers", departmentId],
    queryFn: () => fetchReviewers(departmentId),
  });
}

export function useAuditLogs(paperId?: string) {
  return useQuery({
    queryKey: ["auditLogs", paperId],
    queryFn: () => fetchAuditLogs(paperId),
  });
}

export function useCreatePaper() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createPaper,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["papers"] });
    },
  });
}

export function useUpdatePaper() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { title: string; body: string; currentVersion: number } }) => updatePaper(id, data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["papers"] });
      queryClient.invalidateQueries({ queryKey: ["paper", variables.id] });
    },
  });
}

export function useTransitionPaper() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { targetStatus: string; currentVersion: number; reason?: string } }) => transitionPaper(id, data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["papers"] });
      queryClient.invalidateQueries({ queryKey: ["paper", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["auditLogs", variables.id] });
    },
  });
}

export function useTakeOwnership() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, currentVersion }: { id: string; currentVersion: number }) => takeOwnership(id, { currentVersion }),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["papers"] });
      queryClient.invalidateQueries({ queryKey: ["paper", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["auditLogs", variables.id] });
    },
  });
}

export function useAssignReviewer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { reviewerId: string; currentVersion: number } }) => assignReviewer(id, data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["papers"] });
      queryClient.invalidateQueries({ queryKey: ["paper", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["auditLogs", variables.id] });
    },
  });
}

export function useDeletePaper() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deletePaper(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["papers"] });
    },
  });
}

// --- Requests ---
export function useRequests() {
  return useQuery({
    queryKey: ["requests"],
    queryFn: async () => {
      const data = await api.get("/requests");
      return data;
    },
  });
}

export function useSubmitRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { paperId: string, type: "EDIT" | "DELETE" | "FEEDBACK", reason: string }) => {
      const result = await api.post("/requests", data);
      return result;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["requests"] }),
  });
}

export function useApproveRejectRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { id: string, status: "APPROVED" | "REJECTED", decisionComment?: string }) => {
      const result = await api.post(`/requests/${data.id}/decision`, { status: data.status, decisionComment: data.decisionComment });
      return result;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["requests"] }),
  });
}
