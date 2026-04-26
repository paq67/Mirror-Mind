import { useState } from "react";
import { useLocation } from "wouter";
import { useAnalyzeStore } from "@workspace/api-client-react";
import { useStore } from "@/lib/store-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";

export default function Home() {
  const [, setLocation] = useLocation();
  const { storeDomain, adminToken, setStoreDomain, setAdminToken, setAnalysisData } = useStore();
  const [domain, setDomain] = useState(storeDomain);
  const [token, setToken] = useState(adminToken);
  const [showToken, setShowToken] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const analyze = useAnalyzeStore({
    mutation: {
      onSuccess: (data) => {
        setStoreDomain(domain.trim());
        setAdminToken(token.trim());
        setAnalysisData(data);
        setLocation("/dashboard");
      },
      onError: (err: unknown) => {
        const msg = err instanceof Error ? err.message : "Analysis failed. Please try again.";
        setErrorMsg(msg);
      },
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!domain.trim()) return;
    analyze.mutate({ data: { storeDomain: domain.trim(), adminToken: token.trim() || undefined } });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-mono font-bold text-sm">M</span>
          </div>
          <span className="font-semibold tracking-tight">MirrorMind</span>
        </div>
        <span className="text-xs text-muted-foreground font-mono">AI Representation Optimizer</span>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-16">
        <div className="w-full max-w-xl space-y-8">
          <div className="text-center space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/5 text-primary text-xs font-medium font-mono mb-2">
              Hackathon Track 5 — Advanced AI
            </div>
            <h1 className="text-4xl font-bold tracking-tight">
              See your store through
              <br />
              <span className="text-primary">AI eyes</span>
            </h1>
            <p className="text-muted-foreground text-lg max-w-md mx-auto">
              Discover exactly how ChatGPT Shopping, Perplexity, and Google Shopping AI perceive your store — then fix it before you lose recommendations.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="store-domain">Shopify Store Domain</Label>
              <Input
                id="store-domain"
                data-testid="input-store-domain"
                type="text"
                placeholder="yourstore.myshopify.com"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                disabled={analyze.isPending}
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Public storefront is accessed automatically — no token required for basic analysis.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowToken(!showToken)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              data-testid="toggle-admin-token"
            >
              {showToken ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              {showToken ? "Hide" : "Add"} Admin API token for deeper analysis
            </button>

            {showToken && (
              <div className="space-y-2">
                <Label htmlFor="admin-token">Admin API Token (optional)</Label>
                <Input
                  id="admin-token"
                  data-testid="input-admin-token"
                  type="password"
                  placeholder="shpat_..."
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  disabled={analyze.isPending}
                  className="font-mono"
                />
              </div>
            )}

            {errorMsg && (
              <Alert variant="destructive" data-testid="alert-error">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{errorMsg}</AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={analyze.isPending || !domain.trim()}
              data-testid="button-analyze"
            >
              {analyze.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing AI representation...
                </>
              ) : (
                "Analyze Store"
              )}
            </Button>
          </form>

          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border">
            {[
              { label: "ChatGPT Shopping", desc: "GPT-4o powered agent" },
              { label: "Perplexity", desc: "Web-first discovery" },
              { label: "Google Shopping AI", desc: "Schema-driven ranking" },
            ].map(({ label, desc }) => (
              <div key={label} className="text-center space-y-1">
                <div className="text-xs font-medium text-foreground">{label}</div>
                <div className="text-xs text-muted-foreground">{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
