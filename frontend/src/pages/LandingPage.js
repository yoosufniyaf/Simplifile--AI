import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "../components/ui/button";
import {
FileText,
Calculator,
BarChart3,
Shield,
Zap,
ArrowRight,
Check,
Star
} from "lucide-react";

const LandingPage = () => {
const features = [
{
icon: FileText,
title: "Document Simplifier",
description: "Upload contracts, terms, and policies. Get AI-powered summaries, key points, and risk analysis in seconds."
},
{
icon: Calculator,
title: "AI Bookkeeper",
description: "Automatically categorize transactions, track expenses, and generate P&L statements effortlessly."
},
{
icon: BarChart3,
title: "Financial Statements",
description: "Auto-generated Profit & Loss, Balance Sheet, and Cash Flow reports updated in real-time."
},
{
icon: Shield,
title: "Tax Insights",
description: "Get AI-powered deduction suggestions, estimated taxes, and planning insights without filing."
}
];

const testimonials = [
{
name: "Sarah Chen",
role: "E-commerce Founder",
content: "Simplifile AI replaced my accountant for day-to-day tasks. I save 10+ hours every month.",
avatar: "SC"
},
{
name: "Marcus Johnson",
role: "SaaS Entrepreneur",
content: "The document simplifier helped me understand complex contracts without expensive legal fees.",
avatar: "MJ"
},
{
name: "Emily Rodriguez",
role: "Freelance Consultant",
content: "Finally, financial statements that make sense. The AI explanations are incredibly clear.",
avatar: "ER"
}
];

return ( <div className="min-h-screen bg-background">
{/* Navigation */} <nav className="glass-nav sticky top-0 z-50"> <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">

```
      <Link to="/" className="flex items-center gap-2">

        {/* ✅ NEW LOGO (ONLY CHANGE HERE) */}
        <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-cyan-400 glow-button flex items-center justify-center">
          <div className="relative w-5 h-5">
            <div className="absolute w-2 h-2 bg-white rounded-full top-0 left-1.5" />
            <div className="absolute w-2 h-2 bg-white rounded-full bottom-0 left-0" />
            <div className="absolute w-2 h-2 bg-white rounded-full bottom-0 right-0" />
            <div className="absolute w-full h-full border border-white/30 rounded-full" />
          </div>
        </div>

        <span className="font-semibold text-xl" style={{ fontFamily: 'Outfit, sans-serif' }}>
          Simplifile AI
        </span>
      </Link>

      <div className="flex items-center gap-4">
        <Link to="/pricing">
          <Button variant="ghost" data-testid="pricing-nav-btn">Pricing</Button>
        </Link>
        <Link to="/login">
          <Button variant="ghost" data-testid="login-nav-btn">Login</Button>
        </Link>
        <Link to="/register">
          <Button className="glow-button" data-testid="get-started-nav-btn">
            Get Started
          </Button>
        </Link>
      </div>
    </div>
  </nav>

  {/* Hero Section */}
  <section className="relative overflow-hidden">
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.15)_0%,transparent_70%)]" />
    <div className="max-w-7xl mx-auto px-6 py-24 md:py-32 relative">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center max-w-4xl mx-auto"
      >
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-sm mb-8">
          <Zap className="h-4 w-4 text-primary" />
          <span className="text-primary">Your AI-Powered CFO</span>
        </div>

        <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6" style={{ fontFamily: 'Outfit, sans-serif' }}>
          <span className="text-gradient">Simplify Legal.</span>
          <br />
          <span className="text-gradient">Automate Finance.</span>
        </h1>

        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
          Understand legal documents instantly. Automate bookkeeping. Generate financial statements with AI. 
          The complete financial platform for online businesses.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link to="/register">
            <Button size="lg" className="glow-button text-lg px-8 py-6" data-testid="hero-get-started-btn">
              Start Free Trial
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
          <Link to="/pricing">
            <Button size="lg" variant="outline" className="text-lg px-8 py-6" data-testid="hero-pricing-btn">
              View Pricing
            </Button>
          </Link>
        </div>

        <p className="text-sm text-muted-foreground mt-4">
          3-day free trial • Cancel anytime • No credit card required
        </p>
      </motion.div>
    </div>
  </section>

  {/* Footer */}
  <footer className="border-t border-border py-12">
    <div className="max-w-7xl mx-auto px-6">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        
        <div className="flex items-center gap-2">

          {/* ✅ NEW FOOTER LOGO */}
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 via-purple-500 to-cyan-400 flex items-center justify-center">
            <div className="relative w-4 h-4">
              <div className="absolute w-1.5 h-1.5 bg-white rounded-full top-0 left-1" />
              <div className="absolute w-1.5 h-1.5 bg-white rounded-full bottom-0 left-0" />
              <div className="absolute w-1.5 h-1.5 bg-white rounded-full bottom-0 right-0" />
            </div>
          </div>

          <span className="font-semibold" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Simplifile AI
          </span>
        </div>

        <p className="text-sm text-muted-foreground">
          © 2024 Simplifile AI. All rights reserved.
        </p>
      </div>
    </div>
  </footer>
</div>
```

);
};

export default LandingPage;

