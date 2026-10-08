import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useEditorStore } from "../store/editor-store";
import { api, unwrap } from "./api";

export function useAuthStatus() {
	return useQuery({
		queryKey: ["auth", "status"],
		queryFn: async () =>
			unwrap(await api.auth.status.$get(), "Failed to load auth status"),
	});
}

export function useLogin() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (input: { password: string }) =>
			unwrap(
				await api.auth.login.$post({ json: input }),
				"Failed to log in"
			),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["auth", "status"] });
		},
	});
}

export function useLogout() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async () =>
			unwrap(await api.auth.logout.$post(), "Failed to log out"),
		onSuccess: () => {
			useEditorStore.setState({ openTabs: [], activeTabPath: null });
			queryClient.invalidateQueries({ queryKey: ["auth", "status"] });
		},
	});
}

export function useTreeQuery(path?: string) {
	return useQuery({
		queryKey: ["tree", path],
		queryFn: async () =>
			unwrap(
				await api.tree.$get({ query: { path } }),
				"Failed to load file tree"
			),
	});
}

export function useCreateNode() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (input: {
			parentPath: string | undefined;
			name: string;
			type: "file" | "directory";
		}) => unwrap(await api.file.$post({ json: input }), "Failed to create"),
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
		mutationFn: async (input: { path: string; name: string }) =>
			unwrap(await api.rename.$post({ json: input }), "Failed to rename"),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["tree"] });
		},
	});
}

export function usePropertiesQuery(path: string, enabled: boolean) {
	return useQuery({
		queryKey: ["properties", path],
		queryFn: async () =>
			unwrap(
				await api.properties.$get({ query: { path } }),
				"Failed to load properties"
			),
		enabled,
	});
}

export function useUpdatePropertiesMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			path,
			...json
		}: {
			path: string;
			mode?: number;
			uid?: number;
			gid?: number;
		}) =>
			unwrap(
				await api.properties.$patch({ query: { path }, json }),
				"Failed to update properties"
			),
		// The response is the updated properties, so write it straight
		// into the cache rather than refetching.
		onSuccess: (data, variables) => {
			queryClient.setQueryData(["properties", variables.path], data);
		},
	});
}

export function useFileContent(path: string | null) {
	return useQuery({
		queryKey: ["file", path],
		queryFn: async () =>
			unwrap(
				await api.file.$get({ query: { path: path! } }),
				"Failed to load file"
			),
		enabled: !!path,
		// Every failure mode here (413 too large, 415 binary, 404, 403) is
		// deterministic -- retrying can't turn a "this file is binary" error
		// into a success, it just delays the placeholder showing up.
		retry: false,
	});
}

export function useSaveFile() {
	return useMutation({
		mutationFn: async ({
			path,
			content,
		}: {
			path: string;
			content: string;
		}) =>
			unwrap(
				await api.file.$put({ query: { path }, json: { content } }),
				"Failed to save file"
			),
	});
}

export function useDeleteNode() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (input: { path: string }) =>
			unwrap(
				await api.file.$delete({ query: input }),
				"Failed to delete"
			),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["tree"] });
		},
	});
}
