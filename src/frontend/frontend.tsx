/**
 * This file is the entry point for the React app, it sets up the root
 * element and renders the App component to the DOM.
 *
 * It is included in `src/index.html`.
 */
import { loader } from "@monaco-editor/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./App";
import { AuthGate } from "./components/auth-gate";
import { Toaster } from "./components/ui/sonner";

loader.config({ paths: { vs: "/monaco-vs" } });

const queryClient = new QueryClient();

const elem = document.getElementById("root")!;
const app = (
	<StrictMode>
		<QueryClientProvider client={queryClient}>
			<AuthGate>
				<App />
			</AuthGate>
			<Toaster />
		</QueryClientProvider>
	</StrictMode>
);

// https://bun.com/docs/bundler/hot-reloading#import-meta-hot-data
(import.meta.hot.data.root ??= createRoot(elem)).render(app);
