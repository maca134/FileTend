import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "./api";

export function useTreeQuery(path?: string, enabled = true) {
	return useQuery({
		queryKey: ["tree", path],
		queryFn: async () => {
			const res = await api.tree.$get({
				query: {
					path,
				},
			});
			if (!res.ok) throw new Error("Failed to load file tree");
			return res.json();
		},
		enabled,
	});
}

export function useCreateNode() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (input: {
			parentPath: string | undefined;
			name: string;
			type: "file" | "directory";
		}) => {
			const res = await api.file.$post({
				json: input,
			});
			if (!res.ok) {
				const message = await (res as Response).text().catch(() => "");
				throw new Error(message || "Failed to create");
			}
			return res.json();
		},
		onSuccess: (_data, variables) => {
			queryClient.invalidateQueries({
				queryKey: ["tree", variables.parentPath],
			});
		},
	});
}

export function useRenameNode() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (input: { path: string; name: string }) => {
			const res = await api.rename.$post({
				json: input,
			});
			if (!res.ok) {
				const message = await (res as Response).text().catch(() => "");
				throw new Error(message || "Failed to rename");
			}
			return res.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["tree"] });
		},
	});
}

export function useDeleteNode() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (input: { path: string }) => {
			const res = await api.file.$delete({
				query: input,
			});
			if (!res.ok) {
				const message = await (res as Response).text().catch(() => "");
				throw new Error(message || "Failed to delete");
			}
			return res.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["tree"] });
		},
	});
}
