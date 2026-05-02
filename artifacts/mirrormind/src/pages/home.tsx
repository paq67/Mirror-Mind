import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { useAnalyzeStore } from "@/lib/api-client";
import { useStore } from "@/lib/store-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle, ChevronDown, ChevronUp, Sparkles, Zap, Shield, KeyRound, CheckCircle2, XCircle, Info } from "lucide-react";

// Flag fetched at runtime — reflects whether SHOPIFY_ADMIN_TOKEN is set server-side

const EXAMPLE_STORES = [
  "myfrido.com",
  "allbirds.com",
  "gymshark.com",
];

const STEPS = [
  { key: "fetching_store", label: "Scanning store data..." },
  { key: "scoring", label: "Scoring AI representation..." },
  { key: "simulating_personas", label: "Simulating Deal Hunter, Trust Verifier, Lifestyle Matcher..." },
  { key: "detecting_drift", label: "Detecting temporal drift..." },
  { key: "complete", label: "Analysis complete!" },
];

const DIMENSIONS_INFO = [
  { name: "Content Clarity", desc: "Can AI understand what you sell and who it's for?" },
  { name: "Structured Data", desc: "Are Schema.org, OG tags, and meta tags present for AI to parse?" },
  { name: "Trust Signals", desc: "Can AI verify your store is legitimate and safe to recommend?" },
  { name: "Product Discovery", desc: "Can AI find and compare your products accurately?" },
  { name: "Brand Consistency", desc: "Does your messaging stay consistent across all AI touchpoints?" },
  { name: "Temporal Freshness", desc: "Is your content up-to-date and free of stale signals?" },
];

export default function Home() {
  const [, setLocation] = useLocation();
  const { storeDomain, adminToken, setStoreDomain, setAdminToken, setAnalysisData } = useStore();
  const [domain, setDomain] = useState(storeDomain);
  const [token, setToken] = useState(adminToken);
  const [serverTokenConfigured, setServerTokenConfigured] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState("fetching_store");
  const [dimensionOpen, setDimensionOpen] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((data) => setServerTokenConfigured(data.shopifyConfigured))
      .catch(() => setServerTokenConfigured(false));
  }, []);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const analyze = useAnalyzeStore({
    mutation: {
      onSuccess: (data: { jobId?: string }) => {
        if (data.jobId) {
          setJobId(data.jobId);
          setCurrentStep("fetching_store");
        }
      },
      onError: (err: unknown) => {
        stopPolling();
        setJobId(null);
        const raw = err instanceof Error ? err.message : "Analysis failed. Please try again.";
        setErrorMsg(raw);
      },
    },
  });

  // Poll progress endpoint when we have a jobId
  useEffect(() => {
    if (!jobId) return;
    stopPolling();
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/analyze/progress/${jobId}`);
        if (!res.ok) return;
        const data = await res.json();
        setCurrentStep(data.step ?? "fetching_store");
        if (data.status === "complete" && data.result) {
          stopPolling();
          setStoreDomain(domain.trim());
          setAdminToken(token.trim());
          setAnalysisData(data.result);
          setJobId(null);
          setLocation("/dashboard");
        } else if (data.status === "error") {
          stopPolling();
          setJobId(null);
          let parsed: { code?: string; message?: string } | null = null;
          try { parsed = JSON.parse(data.error); } catch { /* ignore */ }
          const code = parsed?.code ?? "";
          let msg = parsed?.message ?? data.error ?? "Analysis failed. Please try again.";
          if (code === "STORE_UNREACHABLE") msg = "Store not reachable. Check the domain and try again.";
          else if (code === "INVALID_TOKEN") msg = "Invalid Shopify Admin token. Check your token and try again.";
          else if (code === "SCRAPING_FAILED") msg = "Could not extract store data. The store may be password-protected.";
          setErrorMsg(msg);
        }
      } catch { /* ignore network blips */ }
    }, 800);
    return stopPolling;
  }, [jobId, stopPolling, domain, token, setStoreDomain, setAdminToken, setAnalysisData, setLocation]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const input = domain.trim();
    if (!input) return;
    analyze.mutate({ data: { storeDomain: input, adminToken: token.trim() || undefined } });
  };

  const handleRetry = () => {
    setErrorMsg(null);
    analyze.mutate({ data: { storeDomain: domain.trim(), adminToken: token.trim() || undefined } });
  };

  const currentStepIndex = STEPS.findIndex((s) => s.key === currentStep);

  return (
    <div className="relative z-10 min-h-screen flex flex-col">
      <header className="border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-mono font-bold text-sm">M</span>
          </div>
          <span className="font-semibold tracking-tight">MirrorMind</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground font-mono">AI Representation Optimizer</span>
          <span className="text-[10px] text-muted-foreground/60 font-mono border border-border/50 rounded px-1.5 py-0.5">$29/mo</span>
        </div>
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
            <p className="text-sm text-primary font-medium">
              SEO tools optimize for Google. MirrorMind optimizes for AI agents.
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

            {/* Dimension explanation */}
            <div className="border border-border/50 rounded-md">
              <button
                type="button"
                onClick={() => setDimensionOpen(!dimensionOpen)}
                className="w-full flex items-center justify-between px-3 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <span className="flex items-center gap-1"><Info className="h-3 w-3" /> Why these 6 dimensions?</span>
                {dimensionOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>
              {dimensionOpen && (
                <div className="px-3 pb-3 space-y-1.5 border-t border-border/50 pt-2">
                  {DIMENSIONS_INFO.map((d) => (
                    <div key={d.name} className="flex items-start gap-2 text-xs">
                      <span className="text-primary font-medium min-w-[110px]">{d.name}</span>
                      <span className="text-muted-foreground">{d.desc}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {errorMsg && (
              <Alert variant="destructive" data-testid="alert-error">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="flex items-center justify-between gap-3">
                  <span>{errorMsg}</span>
                  <Button type="button" variant="outline" size="sm" onClick={handleRetry} className="border-destructive/50 text-destructive hover:bg-destructive/10">
                    Retry
                  </Button>
                </AlertDescription>
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
                  {STEPS.find((s) => s.key === currentStep)?.label ?? "Analyzing..."}
                </>
              ) : (
                <>
                  Analyze Store
                  <span className="ml-2 text-[10px] opacity-60 font-normal">(10–20s)</span>
                </>
              )}
            </Button>

            {/* Step progress */}
            {analyze.isPending && (
              <div className="space-y-1.5 pt-1" data-testid="progress-steps">
                {STEPS.slice(0, -1).map((step, i) => {
                  const isActive = i === currentStepIndex;
                  const isDone = i < currentStepIndex;
                  return (
                    <div key={step.key} className="flex items-center gap-2 text-xs">
                      {isDone ? (
                        <CheckCircle2 className="h-3 w-3 text-primary flex-shrink-0" />
                      ) : isActive ? (
                        <Loader2 className="h-3 w-3 animate-spin text-primary flex-shrink-0" />
                      ) : (
                        <div className="h-3 w-3 rounded-full border border-muted-foreground/30 flex-shrink-0" />
                      )}
                      <span className={isDone ? "text-primary/70" : isActive ? "text-primary" : "text-muted-foreground/50"}>
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
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
  );
}
