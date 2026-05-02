import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useGenerateFixes } from "@/lib/api-client";
import type { FixPlan, Fix } from "@/lib/api-client";
import { useStore } from "@/lib/store-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Empty } from "@/components/ui/empty";
import { Loader2, AlertCircle, ChevronDown, ChevronUp, Zap, Target, Sparkles } from "lucide-react";
import { Empty, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty";

const PRIORITY_COLORS: Record<string, string> = {
  critical: "text-red-400",
  high: "text-orange-400",
  medium: "text-amber-400",
  low: "text-muted-foreground",
};

const EFFORT_LABELS: Record<string, string> = {
  low: "Quick",
  medium: "Moderate",
  high: "Involved",
};

const IMPACT_COLORS: Record<string, string> = {
  high: "text-primary",
  medium: "text-amber-400",
  low: "text-muted-foreground",
};

function FixCard({ fix, index }: { fix: Fix; index: number }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card data-testid={`fix-card-${index}`} className="transition-all">
      <CardHeader className="pb-2">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className={`text-xs font-medium uppercase tracking-wide ${PRIORITY_COLORS[fix.priority] ?? ""}`}>
                {fix.priority}
              </span>
              <Badge variant="secondary" className="text-xs">{fix.category}</Badge>
              <span className="text-xs text-muted-foreground">
                {EFFORT_LABELS[fix.effort] ?? fix.effort} effort ·{" "}
                <span className={IMPACT_COLORS[fix.impact] ?? ""}>{fix.impact} impact</span>
              </span>
            </div>
            <CardTitle className="text-sm font-semibold">{fix.title}</CardTitle>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="text-right">
              <span className="text-sm font-mono font-bold text-primary">+{fix.scoreGain}</span>
              <span className="text-xs text-muted-foreground block">pts</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setExpanded(!expanded)}
              data-testid={`expand-fix-${index}`}
            >
              {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </Button>
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="pt-0 space-y-3">
          <p className="text-sm text-muted-foreground">{fix.description}</p>

          <div>
            <p className="text-xs font-medium mb-2">Action steps:</p>
            <ol className="space-y-1">
              {fix.actionSteps.map((step, i) => (
                <li key={i} className="text-sm flex items-start gap-2" data-testid={`step-${index}-${i}`}>
                  <span className="text-primary font-mono text-xs mt-0.5 flex-shrink-0">{i + 1}.</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>

          {(fix.exampleBefore || fix.exampleAfter) && (
            <div className="grid grid-cols-2 gap-3">
              {fix.exampleBefore && (
                <div className="p-2 rounded bg-destructive/5 border border-destructive/20">
                  <p className="text-xs font-medium text-destructive mb-1">Before</p>
                  <p className="text-xs text-muted-foreground">{fix.exampleBefore}</p>
                </div>
              )}
              {fix.exampleAfter && (
                <div className="p-2 rounded bg-primary/5 border border-primary/20">
                  <p className="text-xs font-medium text-primary mb-1">After</p>
                  <p className="text-xs text-muted-foreground">{fix.exampleAfter}</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

function PriorityMatrix({ fixes }: { fixes: Fix[] }) {
  const quadrants = [
    { label: "Quick Wins", effort: "low", impact: "high", color: "border-primary/30 bg-primary/5" },
    { label: "Major Projects", effort: "high", impact: "high", color: "border-amber-400/30 bg-amber-400/5" },
    { label: "Fill-ins", effort: "low", impact: "low", color: "border-muted/30 bg-muted/5" },
    { label: "Avoid", effort: "high", impact: "low", color: "border-destructive/20 bg-destructive/5" },
  ];

  return (
    <div className="grid grid-cols-2 gap-3" data-testid="priority-matrix">
      {quadrants.map(({ label, effort, impact, color }) => {
        const matchingFixes = fixes.filter((f) => f.effort === effort && f.impact === impact);
        return (
          <div key={label} className={`p-3 rounded-md border ${color}`}>
            <p className="text-xs font-medium mb-2">{label}</p>
            {matchingFixes.length > 0 ? (
              <ul className="space-y-1">
                {matchingFixes.map((f) => (
                  <li key={f.id} className="text-xs text-muted-foreground">{f.title}</li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground/50">None</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function Fix() {
  const [, setLocation] = useLocation();
  const { storeDomain, adminToken, analysisData } = useStore();
  const [fixPlan, setFixPlan] = useState<FixPlan | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [autoTriggered, setAutoTriggered] = useState(false);

  const generateFixes = useGenerateFixes({
    mutation: {
      onSuccess: (data) => {
        setFixPlan(data);
        setErrorMsg(null);
      },
      onError: (err: unknown) => {
        setErrorMsg(err instanceof Error ? err.message : "Failed to generate fixes");
      },
    },
  });

  useEffect(() => {
    if (storeDomain && analysisData && !autoTriggered && !fixPlan) {
      setAutoTriggered(true);
      generateFixes.mutate({
        data: {
          storeDomain,
          adminToken: adminToken || undefined,
          analysisData: analysisData as unknown as Record<string, unknown>,
        },
      });
    }
  }, [storeDomain, analysisData, autoTriggered, fixPlan, adminToken, generateFixes]);

  const handleRegenerate = () => {
    if (!storeDomain) return;
    generateFixes.mutate({
      data: {
        storeDomain,
        adminToken: adminToken || undefined,
          analysisData: analysisData as unknown as Record<string, unknown> | undefined,
      },
    });
  };

  const quickWins = fixPlan?.fixes.filter((f) => f.effort === "low" && f.impact !== "low") ?? [];
  const otherFixes = fixPlan?.fixes.filter((f) => !(f.effort === "low" && f.impact !== "low")) ?? [];

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Fix Plan</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Ranked, actionable steps to improve your AI representation score
          </p>
        </div>
        {fixPlan && (
          <Button variant="secondary" size="sm" onClick={handleRegenerate} disabled={generateFixes.isPending} data-testid="button-regenerate">
            {generateFixes.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Regenerate"}
          </Button>
        )}
      </div>

      {generateFixes.isPending && !fixPlan && (
        <div className="flex flex-col items-center justify-center py-16 space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground text-sm">Generating your personalized fix plan...</p>
        </div>
      )}

      {!storeDomain && !generateFixes.isPending && (
        <Empty data-testid="empty-no-store">
          <EmptyMedia>
            <Sparkles className="h-8 w-8 text-primary" />
          </EmptyMedia>
          <EmptyTitle>No store analyzed yet</EmptyTitle>
          <EmptyDescription>
            Run an analysis first to unlock personalized fix plans.
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

      {fixPlan && (
        <>
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-4 text-center">
                <div className="text-2xl font-bold font-mono" data-testid="text-total-fixes">{fixPlan.totalFixes}</div>
                <div className="text-xs text-muted-foreground mt-1">Total fixes</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-center">
                <div className="text-2xl font-bold font-mono text-primary" data-testid="text-score-gain">+{fixPlan.estimatedScoreGain}</div>
                <div className="text-xs text-muted-foreground mt-1">Potential score gain</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-center">
                <div className="text-2xl font-bold font-mono text-amber-400" data-testid="text-quick-wins">{quickWins.length}</div>
                <div className="text-xs text-muted-foreground mt-1">Quick wins</div>
              </CardContent>
            </Card>
          </div>

          {quickWins.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-400" />
                Quick Wins — Do these first
              </h2>
              {quickWins.map((fix, i) => (
                <FixCard key={fix.id} fix={fix} index={i} />
              ))}
            </div>
          )}

          <div className="space-y-3">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <Target className="h-4 w-4 text-muted-foreground" />
              All Fixes
            </h2>
            {otherFixes.map((fix, i) => (
              <FixCard key={fix.id} fix={fix} index={quickWins.length + i} />
            ))}
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Effort vs. Impact Matrix</CardTitle>
            </CardHeader>
            <CardContent>
              <PriorityMatrix fixes={fixPlan.fixes} />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
