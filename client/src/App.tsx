import { Switch, Route, Router } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import EdgeConflictPage from "@/pages/edge-conflict";
import DatabasePage from "@/pages/database";

function AppRouter() {
  // Remove trailing slash from base URL for wouter
  const base = import.meta.env.BASE_URL.replace(/\/$/, "") || "";
  
  return (
    <Router base={base}>
      <Switch>
        <Route path="/" component={EdgeConflictPage} />
        <Route path="/database" component={DatabasePage} />
        <Route>
          <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">404 - Page Not Found</h1>
              <p className="text-gray-600">The page you're looking for doesn't exist.</p>
            </div>
          </div>
        </Route>
      </Switch>
    </Router>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <AppRouter />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
