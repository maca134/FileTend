import { useAuthStatus } from "@/lib/queries";

import { LoginScreen } from "./login-screen";

export function AuthGate({ children }: { children: React.ReactNode }) {
	const { data, isLoading } = useAuthStatus();

	if (isLoading) {
		return <div className="h-full w-full" />;
	}

	if (data?.authEnabled && !data.authed) {
		return <LoginScreen />;
	}

	return children;
}
