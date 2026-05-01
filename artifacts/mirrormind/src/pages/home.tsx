import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAnalyzeStore } from "@/lib/api-client";
import { useStore } from "@/lib/store-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle, ChevronDown, ChevronUp, Sparkles, Zap, Shield, KeyRound } from "lucide-react";
import { Entropy } from "@/components/ui/entropy";

// Flag fetched at runtime — reflects whether SHOPIFY_ADMIN_TOKEN is set server-side

const EXAMPLE_STORES = [
  "myfrido.com",
  "allbirds.com",
  "gymshark.com",
];

export default function Home() {
  const [, setLocation] = useLocation();
  const { storeDomain, adminToken, setStoreDomain, setAdminToken, setAnalysisData } = useStore();
  const [domain, setDomain] = useState(storeDomain);
  const [token, setToken] = useState(adminToken);
  const [serverTokenConfigured, setServerTokenConfigured] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [size, setSize] = useState(800);
  useEffect(() => {
    setSize(Math.max(window.innerWidth, window.innerHeight));
    fetch("/api/config")
      .then((r) => r.json())
      .then((data) => setServerTokenConfigured(data.shopifyConfigured))
      .catch(() => setServerTokenConfigured(false));
  }, []);

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
    const input = domain.trim();
    if (!input) return;
    // Strip protocol if user pastes a full URL — backend handles both
    analyze.mutate({ data: { storeDomain: input, adminToken: token.trim() || undefined } });
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-black">
      <div className="absolute inset-0 flex items-center justify-center">
        <Entropy size={size} />
      </div>
      <div className="relative z-10 min-h-screen bg-background/30 backdrop-blur-[1px] flex flex-col">
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
              <Label htmlFor="store-domain">Store URL or Domain</Label>
              <Input
                id="store-domain"
                data-testid="input-store-domain"
                type="text"
                placeholder="https://myfrido.com or mystore.myshopify.com"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                disabled={analyze.isPending}
                className="font-mono"
              />
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-xs text-muted-foreground">
                  Works with any public store — no API token needed for basic analysis. Try:
                </p>
                {EXAMPLE_STORES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => { setDomain(s); setErrorMsg(null); }}
                    className="text-xs text-primary hover:underline font-mono disabled:opacity-50"
                    disabled={analyze.isPending}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowToken(!showToken)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              data-testid="toggle-admin-token"
            >
              {showToken ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              {showToken ? "Hide" : "Add"} Shopify Admin API token for deeper analysis
              {serverTokenConfigured && (
                <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                  <KeyRound className="h-3 w-3" /> configured
                </span>
              )}
            </button>

            {showToken && (
              <div className="space-y-2">
                <Label htmlFor="admin-token">Admin API Token (optional)</Label>
                {serverTokenConfigured && !token && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-primary/5 border border-primary/20 text-xs text-primary">
                    <KeyRound className="h-3 w-3 flex-shrink-0" />
                    A Shopify Admin token is already configured server-side — full API access is active by default.
                    Enter a different token below to override it.
                  </div>
                )}
                <Input
                  id="admin-token"
                  data-testid="input-admin-token"
                  type="password"
                  placeholder={serverTokenConfigured ? "Using server token — enter here to override" : "shpat_..."}
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  disabled={analyze.isPending}
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  Unlocks full product data, policies, and metafield analysis via the Shopify Admin API.
                </p>
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
                  Analyzing AI representation… (10–20s)
                </>
              ) : (
                "Analyze Store"
              )}
            </Button>
          </form>

          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border">
            {[
              { label: "ChatGPT Shopping", desc: "GPT-4o powered agent", Icon: Sparkles },
              { label: "Perplexity", desc: "Web-first discovery", Icon: Zap },
              { label: "Google Shopping AI", desc: "Schema-driven ranking", Icon: Shield },
            ].map(({ label, desc, Icon }) => (
              <div key={label} className="text-center space-y-1">
                <Icon className="h-4 w-4 mx-auto text-primary mb-1" />
                <div className="text-xs font-medium text-foreground">{label}</div>
                <div className="text-xs text-muted-foreground">{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
    </div>
  );
}
