import { useState } from "react";
import { toast } from "sonner";

import { formatBytes } from "../lib/format";
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

type Ownership = { mode: number; uid: number; gid: number };

function toOwnership(data: {
	permissions: { mode: number };
	owner: { uid: number };
	group: { gid: number };
}): Ownership {
	return {
		mode: data.permissions.mode,
		uid: data.owner.uid,
		gid: data.group.gid,
	};
}

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
	const location = path.slice(0, path.lastIndexOf("/")) || "/";

	// Unsaved edits; null means "show the server's current values".
	const [edits, setEdits] = useState<Ownership | null>(null);
	const local = edits ?? (data ? toOwnership(data) : null);
	const current = data ? toOwnership(data) : null;
	const changes: Partial<Ownership> = {};
	if (edits && current) {
		if (edits.mode !== current.mode) changes.mode = edits.mode;
		if (edits.uid !== current.uid) changes.uid = edits.uid;
		if (edits.gid !== current.gid) changes.gid = edits.gid;
	}
	const isDirty = Object.keys(changes).length > 0;

	function handleOpenChange(next: boolean) {
		if (!next) setEdits(null);
		onOpenChange(next);
	}

	function handleSave() {
		if (!isDirty) return;

		updateProperties.mutate(
			{ path, ...changes },
			{
				onSuccess: () => {
					toast.success("Properties updated");
					setEdits(null);
				},
				onError: (err) => {
					toast.error(err.message);
					// mode and uid/gid are applied server-side as two separate
					// operations, so a failure may mean one of them already
					// took effect. Refetch and resync to the server's actual
					// values rather than leaving this dialog showing edits that
					// only partially applied.
					void refetch().then(() => setEdits(null));
				},
			}
		);
	}

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
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

				{data && local && (
					<div className="flex flex-col gap-3">
						<div className="flex flex-col gap-1.5">
							<Row label="Location" value={location} />
							<Row
								label="Type"
								value={type === "directory" ? "Folder" : "File"}
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
								mode={local.mode}
								onChange={(mode) =>
									setEdits({ ...local, mode })
								}
								disabled={permissions?.canChmod === false}
							/>
						</div>

						<div className="grid grid-cols-[7rem_1fr] items-center gap-2 text-sm">
							<span className="text-muted-foreground">Owner</span>
							<div className="flex flex-col gap-0.5">
								<Input
									type="number"
									min={0}
									className="h-7 w-24"
									value={local.uid}
									disabled={permissions?.canChown === false}
									onChange={(e) =>
										setEdits({
											...local,
											uid: Number(e.target.value),
										})
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
							<span className="text-muted-foreground">Group</span>
							<div className="flex flex-col gap-0.5">
								<Input
									type="number"
									min={0}
									className="h-7 w-24"
									value={local.gid}
									disabled={permissions?.canChown === false}
									onChange={(e) =>
										setEdits({
											...local,
											gid: Number(e.target.value),
										})
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
