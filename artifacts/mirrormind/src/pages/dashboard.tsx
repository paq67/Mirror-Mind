import { useStore } from "@/lib/store-context";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { RadialBarChart, RadialBar, ResponsiveContainer, Cell } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, CheckCircle, Info, TrendingDown } from "lucide-react";

const SEVERITY_CONFIG = {
  critical: { color: "destructive" as const, icon: AlertTriangle, label: "Critical" },
  high: { color: "destructive" as const, icon: AlertTriangle, label: "High" },
  medium: { color: "secondary" as const, icon: Info, label: "Medium" },
  low: { color: "secondary" as const, icon: CheckCircle, label: "Low" },
};

function ScoreRing({ score }: { score: number }) {
  const color = score >= 75 ? "#00cccc" : score >= 50 ? "#f59e0b" : "#ef4444";
  const data = [{ value: score, fill: color }, { value: 100 - score, fill: "transparent" }];

  return (
    <div className="relative w-40 h-40 flex items-center justify-center" data-testid="score-ring">
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart
          cx="50%"
          cy="50%"
          innerRadius="70%"
          outerRadius="90%"
          startAngle={90}
          endAngle={-270}
          data={data}
        >
          <RadialBar dataKey="value" cornerRadius={4} background={{ fill: "hsl(217 33% 17%)" }}>
            {data.map((_, index) => (
              <Cell key={index} fill={data[index]!.fill} />
            ))}
          </RadialBar>
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold font-mono" style={{ color }} data-testid="text-overall-score">
          {score}
        </span>
        <span className="text-xs text-muted-foreground">/ 100</span>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { analysisData, storeDomain } = useStore();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!analysisData && !storeDomain) {
      setLocation("/");
    }
  }, [analysisData, storeDomain, setLocation]);

  if (!analysisData) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="text-center space-y-3">
          <TrendingDown className="h-10 w-10 text-muted-foreground mx-auto" />
          <p className="text-muted-foreground">No analysis data. Run an analysis first.</p>
        </div>
      </div>
    );
  }

  const { storeName, overallScore, dimensions, topProducts, gaps, storeDescription, analysisTimestamp, productCount } = analysisData;

  const criticalGaps = gaps.filter((g) => g.severity === "critical" || g.severity === "high");

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-store-name">{storeName}</h1>
          <p className="text-muted-foreground text-sm mt-1">{storeDescription}</p>
          <p className="text-xs text-muted-foreground mt-1 font-mono">
            {productCount} products · analyzed {new Date(analysisTimestamp).toLocaleDateString()}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="md:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">AI Representation Score</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center pt-0">
            <ScoreRing score={overallScore} />
            <p className="text-xs text-muted-foreground mt-2 text-center">
              {overallScore >= 75
                ? "Strong AI representation"
                : overallScore >= 50
                ? "Room for improvement"
                : "Needs urgent attention"}
            </p>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Score Dimensions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {dimensions.map((dim) => (
              <div key={dim.name} data-testid={`dimension-${dim.name.toLowerCase().replace(/[^a-z]/g, "-")}`}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium">{dim.name}</span>
                  <span
                    className="text-sm font-mono font-bold"
                    style={{
                      color: dim.score >= 70 ? "#00cccc" : dim.score >= 50 ? "#f59e0b" : "#ef4444",
                    }}
                  >
                    {dim.score}
                  </span>
                </div>
                <Progress value={dim.score} className="h-1.5" />
                <p className="text-xs text-muted-foreground mt-1">{dim.explanation}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {criticalGaps.length > 0 && (
        <Card className="border-destructive/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              Critical Gaps ({criticalGaps.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {criticalGaps.map((gap, i) => {
              const config = SEVERITY_CONFIG[gap.severity];
              const Icon = config.icon;
              return (
                <div
                  key={i}
                  className="flex items-start gap-3 p-3 rounded-md bg-destructive/5 border border-destructive/20"
                  data-testid={`gap-${i}`}
                >
                  <Icon className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium">{gap.title}</span>
                      <Badge variant={config.color} className="text-xs">{gap.category}</Badge>
                      {gap.affectedCount > 0 && (
                        <span className="text-xs text-muted-foreground">{gap.affectedCount} products</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{gap.impact}</p>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {topProducts.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Product AI Scores</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {topProducts.slice(0, 8).map((product) => (
                <div key={product.id} className="flex items-center gap-3" data-testid={`product-${product.id}`}>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm truncate block">{product.title}</span>
                    {product.issues.length > 0 && (
                      <span className="text-xs text-muted-foreground truncate block">
                        {product.issues[0]}
                        {product.issues.length > 1 && ` +${product.issues.length - 1} more`}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="w-24">
                      <Progress value={product.aiScore} className="h-1.5" />
                    </div>
                    <span
                      className="text-xs font-mono w-7 text-right"
                      style={{
                        color: product.aiScore >= 70 ? "#00cccc" : product.aiScore >= 50 ? "#f59e0b" : "#ef4444",
                      }}
                    >
                      {product.aiScore}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
