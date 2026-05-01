import { useState } from "react";
import { useSimulatePersona } from "@/lib/api-client";
import type { PersonaSimulation } from "@/lib/api-client";
import { useStore } from "@/lib/store-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle, CheckCircle, XCircle, MessageSquare } from "lucide-react";

const PERSONAS = [
  {
    id: "chatgpt" as const,
    name: "ChatGPT Shopping",
    desc: "GPT-4o powered shopping recommendations",
    color: "#10a37f",
  },
  {
    id: "perplexity" as const,
    name: "Perplexity",
    desc: "Web-first discovery engine",
    color: "#6b66ff",
  },
  {
    id: "google" as const,
    name: "Google Shopping AI",
    desc: "Schema-driven ranking system",
    color: "#4285f4",
  },
];

function SimulationResult({ result }: { result: PersonaSimulation }) {
  const persona = PERSONAS.find((p) => p.id === result.persona);

  return (
    <div className="space-y-4" data-testid="simulation-result">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {result.wouldRecommend ? (
            <CheckCircle className="h-6 w-6 text-primary" />
          ) : (
            <XCircle className="h-6 w-6 text-destructive" />
          )}
          <div>
            <p className="font-semibold" data-testid="text-recommendation-status">
              {result.wouldRecommend ? "Would recommend" : "Would not recommend"}
            </p>
            <p className="text-xs text-muted-foreground">{persona?.name}</p>
          </div>
        </div>
        <div className="text-right">
          <div
            className="text-2xl font-bold font-mono"
            style={{ color: result.confidenceScore >= 70 ? "#00cccc" : result.confidenceScore >= 50 ? "#f59e0b" : "#ef4444" }}
            data-testid="text-confidence-score"
          >
            {result.confidenceScore}%
          </div>
          <div className="text-xs text-muted-foreground">confidence</div>
        </div>
      </div>

      <Card className="bg-secondary/30 border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs text-muted-foreground flex items-center gap-2">
            <MessageSquare className="h-3 w-3" />
            Simulated AI Response to: "{result.query}"
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm italic" data-testid="text-simulated-response">"{result.simulatedResponse}"</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs text-muted-foreground">Why this decision was made</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm" data-testid="text-reasoning">{result.reasoning}</p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground">Strengths detected</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1">
              {result.strengths.map((s, i) => (
                <li key={i} className="text-sm flex items-start gap-2" data-testid={`strength-${i}`}>
                  <CheckCircle className="h-3 w-3 text-primary mt-0.5 flex-shrink-0" />
                  {s}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground">Weaknesses detected</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1">
              {result.weaknesses.map((w, i) => (
                <li key={i} className="text-sm flex items-start gap-2" data-testid={`weakness-${i}`}>
                  <XCircle className="h-3 w-3 text-destructive mt-0.5 flex-shrink-0" />
                  {w}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {result.missingSignals.length > 0 && (
        <Card className="border-amber-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground">Missing signals this agent looks for</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {result.missingSignals.map((s, i) => (
                <Badge key={i} variant="secondary" className="text-xs" data-testid={`missing-signal-${i}`}>
                  {s}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function Simulate() {
  const { storeDomain, adminToken } = useStore();
  const [selectedPersona, setSelectedPersona] = useState<"chatgpt" | "perplexity" | "google">("chatgpt");
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<PersonaSimulation | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const simulate = useSimulatePersona({
    mutation: {
      onSuccess: (data) => {
        setResult(data);
        setErrorMsg(null);
      },
      onError: (err: unknown) => {
        setErrorMsg(err instanceof Error ? err.message : "Simulation failed");
      },
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeDomain || !query.trim()) return;
    simulate.mutate({
      data: {
        storeDomain,
        adminToken: adminToken || undefined,
        persona: selectedPersona,
        query: query.trim(),
      },
    });
  };

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">AI Persona Simulator</h1>
        <p className="text-muted-foreground text-sm mt-1">
          See exactly what each AI shopping agent would say about your store
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Select AI Agent</Label>
              <div className="grid grid-cols-3 gap-2">
                {PERSONAS.map((persona) => (
                  <button
                    key={persona.id}
                    type="button"
                    onClick={() => setSelectedPersona(persona.id)}
                    data-testid={`persona-${persona.id}`}
                    className={`p-3 rounded-md border text-left transition-all ${
                      selectedPersona === persona.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-muted-foreground"
                    }`}
                  >
                    <div className="font-medium text-sm">{persona.name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{persona.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="shopping-query">Shopping Query</Label>
              <Input
                id="shopping-query"
                data-testid="input-shopping-query"
                placeholder='e.g. "best running shoes under $150" or "eco-friendly home decor"'
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                disabled={simulate.isPending}
              />
              <p className="text-xs text-muted-foreground">
                Enter a realistic query a shopper might ask the AI agent
              </p>
            </div>

            {!storeDomain && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Please analyze your store first on the home page before simulating.
                </AlertDescription>
              </Alert>
            )}

            {errorMsg && (
              <Alert variant="destructive" data-testid="alert-error">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{errorMsg}</AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              disabled={simulate.isPending || !storeDomain || !query.trim()}
              data-testid="button-simulate"
            >
              {simulate.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Simulating...
                </>
              ) : (
                "Run Simulation"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {result && <SimulationResult result={result} />}
    </div>
  );
}
