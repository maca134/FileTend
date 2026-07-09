import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLogin } from "@/lib/queries";

export function LoginScreen() {
	const [password, setPassword] = useState("");
	const login = useLogin();

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		login.mutate({ password });
	};

	return (
		<div className="flex h-full w-full items-center justify-center">
			<form
				onSubmit={handleSubmit}
				className="flex w-full max-w-xs flex-col gap-3 rounded-lg border p-6"
			>
				<h1 className="text-sm font-medium tracking-wide text-muted-foreground uppercase">
					FileTend
				</h1>
				<Input
					type="password"
					placeholder="Password"
					autoFocus
					value={password}
					onChange={(e) => setPassword(e.target.value)}
					aria-invalid={login.isError}
				/>
				{login.isError && (
					<p className="text-sm text-destructive">
						{login.error instanceof Error
							? login.error.message
							: "Failed to log in"}
					</p>
				)}
				<Button type="submit" disabled={login.isPending || !password}>
					{login.isPending ? "Logging in…" : "Log in"}
				</Button>
			</form>
		</div>
	);
}
