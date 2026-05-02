import { useStore } from "@/lib/store-context";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { RadialBarChart, RadialBar, ResponsiveContainer, Cell } from "recharts";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { GradientCard } from "@/components/ui/gradient-card";
import { AlertTriangle, CheckCircle, Info, Clock, ShoppingBag, ShieldCheck, Sparkles } from "lucide-react";
import { useState } from "react";

const SEVERITY_CONFIG = {
  critical: { color: "destructive" as const, icon: AlertTriangle, label: "Critical" },
  high: { color: "destructive" as const, icon: AlertTriangle, label: "High" },
  medium: { color: "secondary" as const, icon: Info, label: "Medium" },
  low: { color: "secondary" as const, icon: CheckCircle, label: "Low" },
};

const PERSONA_CONFIG = {
  dealHunter: { label: "Deal Hunter", icon: ShoppingBag, description: "Value & pricing agent" },
  trustVerifier: { label: "Trust Verifier", icon: ShieldCheck, description: "Credibility & policy agent" },
  lifestyleMatcher: { label: "Lifestyle Matcher", icon: Sparkles, description: "Brand & identity agent" },
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
        <span className="text-xs text-white/50">/ 100</span>
      </div>
    </div>
  );
}

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const color = confidence >= 80
    ? "bg-primary/20 text-primary border-primary/30"
    : confidence >= 60
    ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
    : "bg-red-500/20 text-red-400 border-red-500/30";
  return (
    <span className={`text-xs px-2.5 py-1 rounded-full border font-mono ${color}`}>
      {confidence}% confidence
    </span>
  );
}

function PersonaCard({
  key: _key,
  personaKey,
  persona,
}: {
  key: string;
  personaKey: keyof typeof PERSONA_CONFIG;
  persona: {
    score: number;
    perceptionSummary: string;
    strengths: string[];
    weaknesses: string[];
    recommendationLikelihood: string;
    wouldRecommend: boolean;
  };
}) {
  const [expanded, setExpanded] = useState(false);
  const config = PERSONA_CONFIG[personaKey];
  const Icon = config.icon;
  const scoreColor = persona.score >= 70 ? "#00cccc" : persona.score >= 45 ? "#f59e0b" : "#ef4444";
  const recLabel = persona.wouldRecommend ? "Would Recommend" : "Would Not Recommend";
  const recColor = persona.wouldRecommend ? "text-primary" : "text-destructive";

  const truncate = (text: string, max: number) => {
    const words = text.split(/\s+/).filter(Boolean);
    if (words.length <= max) return text;
    return words.slice(0, max).join(" ") + "...";
  };

  return (
    <GradientCard>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Icon className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm font-medium text-white/90">{config.label}</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-white/50">{config.description}</span>
              <span className="text-lg font-bold font-mono" style={{ color: scoreColor }}>
                {persona.score}
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-white/70 leading-relaxed">
            {expanded ? persona.perceptionSummary : truncate(persona.perceptionSummary, 30)}
          </p>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-medium ${recColor}`}>{recLabel}</span>
            <span className="text-xs text-white/50">
              Likelihood: <span className="font-medium text-white/70">{persona.recommendationLikelihood}</span>
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-xs font-medium text-primary mb-1">Strengths</p>
              {persona.strengths.slice(0, 3).map((s, i) => (
                <p key={i} className="text-xs text-white/70">• {expanded ? s : truncate(s, 5)}</p>
              ))}
            </div>
            <div>
              <p className="text-xs font-medium text-destructive mb-1">Weaknesses</p>
              {persona.weaknesses.slice(0, 3).map((w, i) => (
                <p key={i} className="text-xs text-white/70">• {expanded ? w : truncate(w, 5)}</p>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-cyan-400 underline cursor-pointer hover:text-cyan-300 transition-colors"
          >
            {expanded ? "Collapse ↑" : "See full analysis ↓"}
          </button>
        </CardContent>
      </motion.div>
    </GradientCard>
  );
}

const cardVariants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease: "easeOut" as const },
};

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
        <GradientCard className="w-[420px]">
          <motion.div {...cardVariants}>
            <div className="flex flex-col items-center justify-center text-center py-8">
              <AlertTriangle className="h-10 w-10 text-white/30 mb-3" />
              <p className="text-sm text-white/70 font-medium">No analysis data</p>
              <p className="text-xs text-white/50 mt-1">Run an analysis first.</p>
            </div>
          </motion.div>
        </GradientCard>
      </div>
    );
  }

  const {
    storeName, overallScore, dimensions, topProducts, gaps,
    storeDescription, analysisTimestamp, productCount,
    confidence, confidenceExplanation, personas, temporal, enhancedAnalysis,
  } = analysisData;

  const criticalGaps = gaps.filter((g) => g.severity === "critical" || g.severity === "high");

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white/90" data-testid="text-store-name">{storeName}</h1>
          <p className="text-white/70 text-sm mt-1">{storeDescription}</p>
          <p className="text-xs text-white/50 mt-1 font-mono">
            {productCount} products · analyzed {new Date(analysisTimestamp).toLocaleDateString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {enhancedAnalysis && (
            <Badge className="text-xs bg-primary/20 text-primary border-primary/30 flex items-center gap-1">
              <CheckCircle className="h-3 w-3" /> Enhanced Analysis
            </Badge>
          )}
          {confidence != null && <ConfidenceBadge confidence={confidence} />}
        </div>
      </div>

      {/* Score + Dimensions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <GradientCard className="md:col-span-1">
          <motion.div {...cardVariants}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-white/50">AI Representation Score</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center pt-0">
              <ScoreRing score={overallScore} />
              <p className="text-xs text-white/70 mt-2 text-center">
                {overallScore >= 75
                  ? "Strong AI representation"
                  : overallScore >= 50
                  ? "Room for improvement"
                  : "Needs urgent attention"}
              </p>
              {confidenceExplanation && (
                <p className="text-xs text-white/50 mt-2 text-center italic leading-relaxed">
                  {confidenceExplanation}
                </p>
              )}
            </CardContent>
          </motion.div>
        </GradientCard>

        <GradientCard className="md:col-span-2">
          <motion.div {...cardVariants} transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-white/50">6-Dimension Readiness</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {dimensions.map((dim) => (
                <div key={dim.name} data-testid={`dimension-${dim.name.toLowerCase().replace(/[^a-z]/g, "-")}`}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium text-white/90">{dim.name}</span>
                    <span
                      className="text-sm font-mono font-bold"
                      style={{ color: dim.score >= 70 ? "#00cccc" : dim.score >= 50 ? "#f59e0b" : "#ef4444" }}
                    >
                      {dim.score}
                    </span>
                  </div>
                  <Progress value={dim.score} className="h-1.5" />
                  <p className="text-xs text-white/70 mt-1">{dim.explanation}</p>
                </div>
              ))}
            </CardContent>
          </motion.div>
        </GradientCard>
      </div>

      {/* Critical Gaps */}
      {criticalGaps.length > 0 && (
        <GradientCard className="border-destructive/40">
          <motion.div {...cardVariants} transition={{ duration: 0.5, delay: 0.15, ease: "easeOut" }}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2 text-white/90">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                Top Gaps ({gaps.length} total, showing critical/high)
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
                        <span className="text-sm font-medium text-white/90">{gap.title}</span>
                        <Badge variant={config.color} className="text-xs">{gap.category}</Badge>
                        {gap.affectedCount > 0 && (
                          <span className="text-xs text-white/50">{gap.affectedCount} affected</span>
                        )}
                      </div>
                      <p className="text-xs text-white/70 mt-0.5">{gap.impact}</p>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </motion.div>
        </GradientCard>
      )}

      {/* 3-Persona AI Simulator */}
      {personas && (
        <div>
          <h2 className="text-sm font-semibold text-white/50 mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            3-Persona AI Simulator
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(Object.entries(personas) as Array<[keyof typeof PERSONA_CONFIG, typeof personas[keyof typeof personas]]>).map(
              ([key, persona]) => (
                <PersonaCard key={key} personaKey={key} persona={persona} />
              ),
            )}
          </div>
        </div>
      )}

      {/* Temporal Drift */}
      {temporal && (
        <GradientCard className={temporal.stalenessScore > 30 ? "border-amber-500/40" : ""}>
          <motion.div {...cardVariants} transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2 text-white/90">
                  <Clock className="h-4 w-4 text-amber-500" />
                  Temporal Drift Detection
                </CardTitle>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-white/50">Staleness risk:</span>
                  <span
                    className="text-sm font-mono font-bold"
                    style={{ color: temporal.stalenessScore > 50 ? "#ef4444" : temporal.stalenessScore > 20 ? "#f59e0b" : "#00cccc" }}
                  >
                    {temporal.stalenessScore}/100
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-white/70 mb-3">{temporal.summary}</p>
              {temporal.staleSignals.length > 0 ? (
                <div className="space-y-2">
                  {temporal.staleSignals.map((signal, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-md bg-amber-500/5 border border-amber-500/20">
                      <Clock className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-medium text-white/90">{signal.text}</p>
                        <p className="text-xs text-white/70 mt-0.5">{signal.reason}</p>
                        <span className={`text-xs mt-1 inline-block font-medium ${
                          signal.risk === "High" ? "text-destructive" : signal.risk === "Medium" ? "text-amber-500" : "text-white/50"
                        }`}>
                          {signal.risk} risk
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-primary flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" /> No temporal inconsistencies detected.
                </p>
              )}
            </CardContent>
          </motion.div>
        </GradientCard>
      )}

      {/* Product AI Scores */}
      {topProducts.length > 0 && (
        <GradientCard>
          <motion.div {...cardVariants} transition={{ duration: 0.5, delay: 0.25, ease: "easeOut" }}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-white/50">Product AI Scores</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {topProducts.slice(0, 8).map((product) => (
                  <div key={product.id} className="flex items-center gap-3" data-testid={`product-${product.id}`}>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm truncate block text-white/90">{product.title}</span>
                      {product.issues.length > 0 && (
                        <span className="text-xs text-white/50 truncate block">
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
                        style={{ color: product.aiScore >= 70 ? "#00cccc" : product.aiScore >= 50 ? "#f59e0b" : "#ef4444" }}
                      >
                        {product.aiScore}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </motion.div>
        </GradientCard>
      )}
    </div>
  );
}
