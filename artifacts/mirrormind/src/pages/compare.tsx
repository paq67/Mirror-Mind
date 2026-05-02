import { useState } from "react";
import { useLocation } from "wouter";
import { useCompareCompetitors } from "@/lib/api-client";
import type { CompetitorComparison } from "@/lib/api-client";
import { useStore } from "@/lib/store-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Empty, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import { Loader2, AlertCircle, Plus, X, Trophy, TrendingUp, Sparkles } from "lucide-react";

function ComparisonResult({ result, yourDomain }: { result: CompetitorComparison; yourDomain: string }) {
  const allStores = [
    { domain: yourDomain, name: "Your Store", score: result.yourScore, isYou: true },
    ...result.competitors.map((c) => ({ domain: c.domain, name: c.name, score: c.overallScore, isYou: false })),
  ].sort((a, b) => b.score - a.score);

  const dimensionNames = result.competitors[0]?.dimensions.map((d) => d.name) ?? [];

  return (
    <div className="space-y-4" data-testid="comparison-result">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="text-3xl font-bold font-mono text-primary" data-testid="text-your-score">{result.yourScore}</div>
            <div className="text-xs text-muted-foreground mt-1">Your AI Score</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="text-3xl font-bold font-mono" data-testid="text-avg-score">{result.averageCompetitorScore}</div>
            <div className="text-xs text-muted-foreground mt-1">Competitor Average</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="flex items-center justify-center gap-2">
              <Trophy className={`h-5 w-5 ${result.rankPosition === 1 ? "text-amber-400" : "text-muted-foreground"}`} />
              <div className="text-3xl font-bold font-mono" data-testid="text-rank-position">#{result.rankPosition}</div>
            </div>
            <div className="text-xs text-muted-foreground mt-1">of {allStores.length} stores</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground">Score Rankings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {allStores.map((store, i) => (
            <div
              key={store.domain}
              className={`flex items-center gap-3 p-2 rounded-md ${store.isYou ? "bg-primary/5 border border-primary/20" : ""}`}
              data-testid={`ranking-${i}`}
            >
              <span className="text-sm font-mono text-muted-foreground w-4">#{i + 1}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium truncate">{store.name}</span>
                  {store.isYou && <Badge variant="secondary" className="text-xs">You</Badge>}
                </div>
                <span className="text-xs text-muted-foreground">{store.domain}</span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="w-24 h-1.5 rounded-full bg-secondary overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${store.score}%`,
                      backgroundColor: store.isYou ? "#00cccc" : "#6b7280",
                    }}
                  />
                </div>
                <span
                  className="text-sm font-mono w-6 text-right"
                  style={{ color: store.isYou ? "#00cccc" : undefined }}
                >
                  {store.score}
                </span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {dimensionNames.length > 0 && result.competitors.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Dimension Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 pr-4 text-muted-foreground font-normal">Dimension</th>
                    <th className="text-center py-2 px-2 text-primary font-medium">You</th>
                    {result.competitors.map((c) => (
                      <th key={c.domain} className="text-center py-2 px-2 text-muted-foreground font-normal truncate max-w-24">
                        {c.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dimensionNames.map((dimName) => {
                    return (
                      <tr key={dimName} className="border-b border-border/50">
                        <td className="py-2 pr-4 text-xs">{dimName}</td>
                        <td className="text-center py-2 px-2 font-mono text-xs text-primary">—</td>
                        {result.competitors.map((c) => {
                          const dim = c.dimensions.find((d) => d.name === dimName);
                          return (
                            <td key={c.domain} className="text-center py-2 px-2 font-mono text-xs">
                              {dim?.score ?? "—"}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {result.topOpportunities.length > 0 && (
        <Card className="border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Top Opportunities
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {result.topOpportunities.map((opp, i) => (
              <div key={i} className="flex items-start gap-2 text-sm" data-testid={`opportunity-${i}`}>
                <span className="text-primary font-mono text-xs mt-0.5">{i + 1}.</span>
                <span>{opp}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function Compare() {
  const [, setLocation] = useLocation();
  const { storeDomain, adminToken } = useStore();
  const [competitors, setCompetitors] = useState<string[]>([""]);
  const [result, setResult] = useState<CompetitorComparison | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const compare = useCompareCompetitors({
    mutation: {
      onSuccess: (data) => {
        setResult(data);
        setErrorMsg(null);
      },
      onError: (err: unknown) => {
        setErrorMsg(err instanceof Error ? err.message : "Comparison failed");
      },
    },
  });

  const addCompetitor = () => {
    if (competitors.length < 3) {
      setCompetitors([...competitors, ""]);
    }
  };

  const removeCompetitor = (index: number) => {
    setCompetitors(competitors.filter((_, i) => i !== index));
  };

  const updateCompetitor = (index: number, value: string) => {
    const updated = [...competitors];
    updated[index] = value;
    setCompetitors(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validCompetitors = competitors.filter((c) => c.trim());
    if (!storeDomain || validCompetitors.length === 0) return;
    compare.mutate({
      data: {
        storeDomain,
        adminToken: adminToken || undefined,
        competitorDomains: validCompetitors,
      },
    });
  };

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Competitor Comparison</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Compare your store's AI representation score against competitors
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {storeDomain && (
              <div className="p-3 rounded-md bg-primary/5 border border-primary/20">
                <div className="text-xs text-muted-foreground mb-1">Your store</div>
                <div className="text-sm font-mono">{storeDomain}</div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Competitor Domains (up to 3)</Label>
              {competitors.map((c, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    data-testid={`input-competitor-${i}`}
                    placeholder="competitor.myshopify.com or competitor.com"
                    value={c}
                    onChange={(e) => updateCompetitor(i, e.target.value)}
                    disabled={compare.isPending}
                    className="font-mono"
                  />
                  {competitors.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeCompetitor(i)}
                      data-testid={`remove-competitor-${i}`}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              {competitors.length < 3 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={addCompetitor}
                  className="text-muted-foreground"
                  data-testid="button-add-competitor"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add competitor
                </Button>
              )}
            </div>

            {!storeDomain && (
              <Empty data-testid="empty-no-store">
                <EmptyMedia>
                  <Sparkles className="h-8 w-8 text-primary" />
                </EmptyMedia>
                <EmptyTitle>No store analyzed yet</EmptyTitle>
                <EmptyDescription>
                  Run an analysis first to unlock competitor comparison.
                </EmptyDescription>
                <Button onClick={() => setLocation("/")} data-testid="button-go-analyze">
                  Analyze a Store
                </Button>
              </Empty>
            )}

            {errorMsg && (
              <Alert variant="destructive" data-testid="alert-error">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{errorMsg}</AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              disabled={compare.isPending || !storeDomain || competitors.every((c) => !c.trim())}
              data-testid="button-compare"
            >
              {compare.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Comparing stores...
                </>
              ) : (
                "Compare Stores"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {result && <ComparisonResult result={result} yourDomain={storeDomain} />}
    </div>
  );
}
