import { cn } from "../../lib/utils";
import { Loader2 } from "lucide-react";

// AI Section Card Component
export const AISection = ({ 
  title, 
  icon: Icon, 
  iconColor = "text-primary", 
  children, 
  variant = "default",
  className 
}) => {
  const variants = {
    default: "bg-card border-border",
    highlight: "bg-primary/5 border-primary/20",
    warning: "bg-amber-500/5 border-amber-500/20",
    success: "bg-green-500/5 border-green-500/20",
    danger: "bg-red-500/5 border-red-500/20"
  };

  return (
    <div className={cn(
      "rounded-xl border p-5 transition-all",
      variants[variant],
      className
    )}>
      {title && (
        <div className="flex items-center gap-2.5 mb-4">
          {Icon && <Icon className={cn("h-5 w-5", iconColor)} />}
          <h4 className="font-semibold text-foreground" style={{ fontFamily: 'Outfit, sans-serif' }}>
            {title}
          </h4>
        </div>
      )}
      {children}
    </div>
  );
};

// Bullet List Component
export const AIBulletList = ({ items, icon: Icon, iconColor = "text-primary", variant = "default" }) => {
  if (!items || items.length === 0) return null;

  const variants = {
    default: { bg: "bg-primary/10", text: "text-primary" },
    warning: { bg: "bg-amber-500/10", text: "text-amber-500" },
    success: { bg: "bg-green-500/10", text: "text-green-500" },
    danger: { bg: "bg-red-500/10", text: "text-red-500" },
    muted: { bg: "bg-muted", text: "text-muted-foreground" }
  };

  const style = variants[variant] || variants.default;

  return (
    <ul className="space-y-3">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-3">
          {Icon ? (
            <Icon className={cn("h-4 w-4 shrink-0 mt-0.5", iconColor)} />
          ) : (
            <span className={cn(
              "h-6 w-6 rounded-full flex items-center justify-center text-xs font-medium shrink-0",
              style.bg, style.text
            )}>
              {i + 1}
            </span>
          )}
          <span className="text-sm text-muted-foreground leading-relaxed">{item}</span>
        </li>
      ))}
    </ul>
  );
};

// What This Means For You Section
export const WhatThisMeansSection = ({ content, className }) => {
  if (!content) return null;

  return (
    <div className={cn(
      "relative rounded-xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 p-5 overflow-hidden",
      className
    )}>
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16" />
      <div className="relative">
        <div className="flex items-center gap-2.5 mb-3">
          <span className="text-lg">💡</span>
          <h4 className="font-semibold text-foreground" style={{ fontFamily: 'Outfit, sans-serif' }}>
            What This Means For You
          </h4>
        </div>
        <p className="text-sm text-foreground/90 leading-relaxed">
          {content}
        </p>
      </div>
    </div>
  );
};

// AI Loading State
export const AILoadingState = ({ message = "Analyzing your data..." }) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6">
      <div className="relative">
        <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
        <div className="relative h-16 w-16 rounded-2xl bg-card border border-border flex items-center justify-center">
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
        </div>
      </div>
      <p className="mt-6 text-sm text-muted-foreground animate-pulse">{message}</p>
    </div>
  );
};

// AI Empty State
export const AIEmptyState = ({ 
  icon: Icon, 
  title, 
  description, 
  action 
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="h-16 w-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-5">
        <Icon className="h-8 w-8 text-primary" />
      </div>
      <h3 className="text-lg font-semibold mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
        {title}
      </h3>
      <p className="text-muted-foreground text-sm max-w-sm mb-6">
        {description}
      </p>
      {action}
    </div>
  );
};

// AI Error State
export const AIErrorState = ({ 
  message = "Something went wrong. Please try again.",
  onRetry 
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
      <div className="h-14 w-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4">
        <span className="text-2xl">⚠️</span>
      </div>
      <p className="text-sm text-muted-foreground mb-4">{message}</p>
      {onRetry && (
        <button 
          onClick={onRetry}
          className="text-sm text-primary hover:underline"
        >
          Try again
        </button>
      )}
    </div>
  );
};

// AI Analysis Card (Full formatted AI response)
export const AIAnalysisCard = ({ content, title = "AI Analysis" }) => {
  if (!content) return null;

  // Parse markdown-style headers and format
  const formatContent = (text) => {
    const lines = text.split('\n');
    const sections = [];
    let currentSection = null;
    let currentContent = [];

    lines.forEach((line) => {
      if (line.startsWith('## ')) {
        if (currentSection) {
          sections.push({ title: currentSection, content: currentContent });
        }
        currentSection = line.replace('## ', '').trim();
        currentContent = [];
      } else if (line.trim()) {
        currentContent.push(line);
      }
    });

    if (currentSection) {
      sections.push({ title: currentSection, content: currentContent });
    }

    if (sections.length === 0) {
      return <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{text}</p>;
    }

    return (
      <div className="space-y-5">
        {sections.map((section, i) => (
          <div key={i}>
            <h5 className="font-medium text-foreground mb-2 text-sm">{section.title}</h5>
            <div className="text-sm text-muted-foreground space-y-1.5">
              {section.content.map((line, j) => (
                <p key={j} className="leading-relaxed">
                  {line.startsWith('- ') ? (
                    <span className="flex items-start gap-2">
                      <span className="text-primary mt-1.5">•</span>
                      <span>{line.substring(2)}</span>
                    </span>
                  ) : line}
                </p>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-5 py-4 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2.5">
          <span className="text-lg">🤖</span>
          <h4 className="font-semibold text-foreground" style={{ fontFamily: 'Outfit, sans-serif' }}>
            {title}
          </h4>
        </div>
      </div>
      <div className="p-5">
        {formatContent(content)}
      </div>
    </div>
  );
};

// Risk Item Component
export const RiskItem = ({ children }) => (
  <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/5 border border-amber-500/10">
    <span className="text-amber-500 mt-0.5">⚠️</span>
    <span className="text-sm text-muted-foreground leading-relaxed">{children}</span>
  </div>
);

// Insight Item Component  
export const InsightItem = ({ children, variant = "default" }) => {
  const styles = {
    default: "bg-primary/5 border-primary/10 text-primary",
    success: "bg-green-500/5 border-green-500/10 text-green-500",
    warning: "bg-amber-500/5 border-amber-500/10 text-amber-500"
  };

  return (
    <div className={cn(
      "flex items-start gap-3 p-3 rounded-lg border",
      styles[variant]
    )}>
      <span className="mt-0.5">✓</span>
      <span className="text-sm text-muted-foreground leading-relaxed">{children}</span>
    </div>
  );
};
