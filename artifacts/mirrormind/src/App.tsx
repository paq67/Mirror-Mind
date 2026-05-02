import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { StoreProvider } from "@/lib/store-context";
import { Layout } from "@/components/layout";
import { EntropyBackground } from "@/components/ui/entropy-background";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Dashboard from "@/pages/dashboard";
import Simulate from "@/pages/simulate";
import Compare from "@/pages/compare";
import Fix from "@/pages/fix";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
    },
  },
});

function AppRouter() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/dashboard">
        <Layout><Dashboard /></Layout>
      </Route>
      <Route path="/simulate">
        <Layout><Simulate /></Layout>
      </Route>
      <Route path="/compare">
        <Layout><Compare /></Layout>
      </Route>
      <Route path="/fix">
        <Layout><Fix /></Layout>
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <StoreProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <EntropyBackground />
            <AppRouter />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </StoreProvider>
    </QueryClientProvider>
  );
}

export default App;
