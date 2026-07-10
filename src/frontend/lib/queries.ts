import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api, extractErrorMessage } from "./api";

export function useAuthStatus() {
	return useQuery({
		queryKey: ["auth", "status"],
		queryFn: async () => {
			const res = await api.auth.status.$get();
			if (!res.ok) throw new Error("Failed to load auth status");
			return res.json();
		},
	});
}

export function useLogin() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (input: { password: string }) => {
			const res = await api.auth.login.$post({ json: input });
			if (!res.ok) {
				throw new Error(
					await extractErrorMessage(res as Response, "Failed to log in")
				);
			}
			return res.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["auth", "status"] });
		},
	});
}

export function useLogout() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async () => {
			const res = await api.auth.logout.$post();
			if (!res.ok) throw new Error("Failed to log out");
			return res.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["auth", "status"] });
		},
	});
}

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
				throw new Error(
					await extractErrorMessage(res as Response, "Failed to create")
				);
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
				throw new Error(
					await extractErrorMessage(res as Response, "Failed to rename")
				);
			}
			return res.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["tree"] });
		},
	});
}

export function usePropertiesQuery(path: string, enabled: boolean) {
	return useQuery({
		queryKey: ["properties", path],
		queryFn: async () => {
			const res = await api.properties.$get({ query: { path } });
			if (!res.ok) throw new Error("Failed to load properties");
			return res.json();
		},
		enabled,
	});
}

export function useUpdatePropertiesMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (input: {
			path: string;
			mode?: number;
			uid?: number;
			gid?: number;
		}) => {
			const { path, ...json } = input;
			const res = await api.properties.$patch({
				query: { path },
				json,
			});
			if (!res.ok) {
				throw new Error(
					await extractErrorMessage(
						res as Response,
						"Failed to update properties"
					)
				);
			}
			return res.json();
		},
		onSuccess: (_data, variables) => {
			queryClient.invalidateQueries({
				queryKey: ["properties", variables.path],
			});
		},
	});
}

export function useFileContent(path: string | null) {
	return useQuery({
		queryKey: ["file", path],
		queryFn: async () => {
			const res = await api.file.$get({ query: { path: path! } });
			if (!res.ok) {
				throw new Error(
					await extractErrorMessage(res as Response, "Failed to load file")
				);
			}
			return res.json();
		},
		enabled: !!path,
		// Every failure mode here (413 too large, 415 binary, 404, 403) is
		// deterministic -- retrying can't turn a "this file is binary" error
		// into a success, it just delays the placeholder showing up.
		retry: false,
	});
}

export function useSaveFile() {
	return useMutation({
		mutationFn: async (input: { path: string; content: string }) => {
			const res = await api.file.$put({
				query: { path: input.path },
				json: { content: input.content },
			});
			if (!res.ok) {
				throw new Error(
					await extractErrorMessage(res as Response, "Failed to save file")
				);
			}
			return res.json();
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
				throw new Error(
					await extractErrorMessage(res as Response, "Failed to delete")
				);
			}
			return res.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["tree"] });
		},
	});
}
