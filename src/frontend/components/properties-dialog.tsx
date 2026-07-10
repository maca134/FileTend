import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { formatBytes } from "../lib/format";
import { getAncestorPaths } from "../lib/path";
import {
	useAuthStatus,
	usePropertiesQuery,
	useUpdatePropertiesMutation,
} from "../lib/queries";
import { Button } from "./ui/button";
import { Checkbox } from "./ui/checkbox";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "./ui/dialog";
import { Input } from "./ui/input";

function Row({ label, value }: { label: string; value: string }) {
	return (
		<div className="grid grid-cols-[7rem_1fr] gap-2 text-sm">
			<span className="text-muted-foreground">{label}</span>
			<span className="truncate font-mono">{value}</span>
		</div>
	);
}

const PERMISSION_GROUPS = [
	{ label: "Owner", shift: 6 },
	{ label: "Group", shift: 3 },
	{ label: "Other", shift: 0 },
] as const;

const PERMISSION_BITS = [
	{ label: "Read", bit: 4 },
	{ label: "Write", bit: 2 },
	{ label: "Exec", bit: 1 },
] as const;

function PermissionsEditor({
	mode,
	onChange,
	disabled,
}: {
	mode: number;
	onChange: (mode: number) => void;
	disabled?: boolean;
}) {
	return (
		<div className="flex flex-col gap-1">
			<div className="grid grid-cols-[3.5rem_repeat(3,2.5rem)] gap-1 text-xs text-muted-foreground">
				<span />
				{PERMISSION_BITS.map((col) => (
					<span key={col.label} className="text-center">
						{col.label}
					</span>
				))}
			</div>
			{PERMISSION_GROUPS.map((group) => (
				<div
					key={group.label}
					className="grid grid-cols-[3.5rem_repeat(3,2.5rem)] items-center gap-1"
				>
					<span>{group.label}</span>
					{PERMISSION_BITS.map((col) => {
						const mask = col.bit << group.shift;
						return (
							<span
								key={col.label}
								className="flex justify-center"
							>
								<Checkbox
									checked={(mode & mask) !== 0}
									disabled={disabled}
									onCheckedChange={(checked) =>
										onChange(
											checked === true
												? mode | mask
												: mode & ~mask
										)
									}
								/>
							</span>
						);
					})}
				</div>
			))}
			<span className="text-xs text-muted-foreground">
				Octal:{" "}
				<span className="font-mono text-foreground">
					{(mode & 0o777).toString(8).padStart(3, "0")}
				</span>
			</span>
		</div>
	);
}

export function PropertiesDialog({
	path,
	name,
	type,
	open,
	onOpenChange,
}: {
	path: string;
	name: string;
	type: "file" | "directory";
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const { data, isLoading, isError, refetch } = usePropertiesQuery(
		path,
		open
	);
	const updateProperties = useUpdatePropertiesMutation();
	const { data: authStatus } = useAuthStatus();
	const permissions = authStatus?.permissions;
	const ancestors = getAncestorPaths(path);
	const location = ancestors[ancestors.length - 1] ?? "/";

	const [localMode, setLocalMode] = useState<number | null>(null);
	const [localUid, setLocalUid] = useState<number | null>(null);
	const [localGid, setLocalGid] = useState<number | null>(null);
	const initializedRef = useRef(false);

	useEffect(() => {
		if (!open) initializedRef.current = false;
	}, [open]);

	useEffect(() => {
		if (open && data && !initializedRef.current) {
			setLocalMode(parseInt(data.permissions.octal, 8));
			setLocalUid(data.owner.uid);
			setLocalGid(data.group.gid);
			initializedRef.current = true;
		}
	}, [open, data]);

	const isDirty =
		!!data &&
		localMode !== null &&
		localUid !== null &&
		localGid !== null &&
		(localMode !== parseInt(data.permissions.octal, 8) ||
			localUid !== data.owner.uid ||
			localGid !== data.group.gid);

	function handleSave() {
		if (
			!data ||
			localMode === null ||
			localUid === null ||
			localGid === null
		)
			return;

		const payload: {
			path: string;
			mode?: number;
			uid?: number;
			gid?: number;
		} = { path };
		if (localMode !== parseInt(data.permissions.octal, 8)) {
			payload.mode = localMode;
		}
		if (localUid !== data.owner.uid) payload.uid = localUid;
		if (localGid !== data.group.gid) payload.gid = localGid;

		updateProperties.mutate(payload, {
			onSuccess: (result) => {
				toast.success("Properties updated");
				setLocalMode(parseInt(result.permissions.octal, 8));
				setLocalUid(result.owner.uid);
				setLocalGid(result.group.gid);
			},
			onError: (err) => {
				toast.error(
					err instanceof Error
						? err.message
						: "Failed to update properties"
				);
				// mode and uid/gid are applied server-side as two separate
				// operations, so a failure may mean one of them already
				// took effect. Refetch and resync local state to the
				// server's actual values rather than leaving this dialog
				// showing edits that only partially applied.
				void refetch().then((result) => {
					if (!result.data) return;
					setLocalMode(parseInt(result.data.permissions.octal, 8));
					setLocalUid(result.data.owner.uid);
					setLocalGid(result.data.group.gid);
				});
			},
		});
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{name}</DialogTitle>
				</DialogHeader>

				{isLoading && (
					<p className="text-sm text-muted-foreground">Loading…</p>
				)}
				{isError && (
					<p className="text-sm text-destructive">
						Failed to load properties.
					</p>
				)}

				{data &&
					localMode !== null &&
					localUid !== null &&
					localGid !== null && (
						<div className="flex flex-col gap-3">
							<div className="flex flex-col gap-1.5">
								<Row label="Location" value={location} />
								<Row
									label="Type"
									value={
										type === "directory" ? "Folder" : "File"
									}
								/>
								{type === "file" && (
									<Row
										label="Size"
										value={formatBytes(data.size)}
									/>
								)}
								<Row
									label="Modified"
									value={new Date(
										data.modifiedAt
									).toLocaleString()}
								/>
								<Row
									label="Created"
									value={new Date(
										data.createdAt
									).toLocaleString()}
								/>
								<Row
									label="Accessed"
									value={new Date(
										data.accessedAt
									).toLocaleString()}
								/>
							</div>

							<div className="grid grid-cols-[7rem_1fr] items-start gap-2 text-sm">
								<span className="pt-1 text-muted-foreground">
									Permissions
								</span>
								<PermissionsEditor
									mode={localMode}
									onChange={setLocalMode}
									disabled={
										permissions
											? !permissions.canChmod
											: false
									}
								/>
							</div>

							<div className="grid grid-cols-[7rem_1fr] items-center gap-2 text-sm">
								<span className="text-muted-foreground">
									Owner
								</span>
								<div className="flex flex-col gap-0.5">
									<Input
										type="number"
										min={0}
										className="h-7 w-24"
										value={localUid}
										disabled={
											permissions
												? !permissions.canChown
												: false
										}
										onChange={(e) =>
											setLocalUid(
												e.target.value === ""
													? 0
													: Number(e.target.value)
											)
										}
									/>
									{data.owner.name && (
										<span className="text-xs text-muted-foreground">
											Currently: {data.owner.name}
										</span>
									)}
								</div>
							</div>

							<div className="grid grid-cols-[7rem_1fr] items-center gap-2 text-sm">
								<span className="text-muted-foreground">
									Group
								</span>
								<div className="flex flex-col gap-0.5">
									<Input
										type="number"
										min={0}
										className="h-7 w-24"
										value={localGid}
										disabled={
											permissions
												? !permissions.canChown
												: false
										}
										onChange={(e) =>
											setLocalGid(
												e.target.value === ""
													? 0
													: Number(e.target.value)
											)
										}
									/>
									{data.group.name && (
										<span className="text-xs text-muted-foreground">
											Currently: {data.group.name}
										</span>
									)}
								</div>
							</div>
						</div>
					)}

				<DialogFooter>
					<Button
						onClick={handleSave}
						disabled={!isDirty || updateProperties.isPending}
					>
						{updateProperties.isPending ? "Saving…" : "Save"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
