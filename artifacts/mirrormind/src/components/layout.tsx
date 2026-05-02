import { Link, useLocation } from "wouter";
import { BarChart2, GitCompare, Home } from "lucide-react";
import { useStore } from "@/lib/store-context";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: BarChart2 },
  { href: "/compare", label: "Compare", icon: GitCompare },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { storeDomain } = useStore();

  return (
    <div className="relative z-10 min-h-screen flex">
      <aside className="w-56 border-r border-border flex-shrink-0 flex flex-col">
        <div className="p-4 border-b border-border">
          <Link href="/">
            <div className="flex items-center gap-2 cursor-pointer">
              <div className="w-7 h-7 rounded bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-mono font-bold text-xs">M</span>
              </div>
              <span className="font-semibold text-sm tracking-tight">MirrorMind</span>
            </div>
          </Link>
          {storeDomain && (
            <p className="text-xs text-muted-foreground mt-2 truncate" data-testid="nav-store-domain">
              {storeDomain}
            </p>
          )}
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href}>
              <div
                data-testid={`nav-${label.toLowerCase().replace(" ", "-")}`}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm cursor-pointer transition-colors",
                  location === href
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </div>
            </Link>
          ))}
        </nav>

        <div className="p-3 border-t border-border">
          <Link href="/">
            <div className="flex items-center gap-3 px-3 py-2 rounded-md text-sm cursor-pointer text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
              <Home className="h-4 w-4" />
              New Analysis
            </div>
          </Link>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
