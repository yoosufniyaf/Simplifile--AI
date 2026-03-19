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

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="glass-nav sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-primary glow-button flex items-center justify-center">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <span className="font-semibold text-xl" style={{ fontFamily: 'Outfit, sans-serif' }}>Simplifile AI</span>
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

      {/* Features Section */}
      <section className="py-24 md:py-32 bg-card/30">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-semibold tracking-tight mb-4" style={{ fontFamily: 'Outfit, sans-serif' }}>
              Everything you need to manage finances
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              From document analysis to automated accounting, Simplifile AI handles it all.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="group relative overflow-hidden rounded-2xl border border-border bg-card p-8 hover:border-primary/50 transition-all duration-300"
                data-testid={`feature-${index}`}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-6">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3" style={{ fontFamily: 'Outfit, sans-serif' }}>{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-24 md:py-32">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-semibold tracking-tight mb-4" style={{ fontFamily: 'Outfit, sans-serif' }}>
              How it works
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Get started in minutes, not hours.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: "1", title: "Upload Documents", description: "Upload your contracts, bank statements, receipts, or connect your platforms." },
              { step: "2", title: "AI Analysis", description: "Our AI processes your data, categorizes transactions, and extracts key information." },
              { step: "3", title: "Get Insights", description: "View summaries, financial reports, and actionable insights instantly." }
            ].map((item, index) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="text-center"
              >
                <div className="h-16 w-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-2xl font-bold text-primary mx-auto mb-6">
                  {item.step}
                </div>
                <h3 className="text-xl font-semibold mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>{item.title}</h3>
                <p className="text-muted-foreground">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-24 md:py-32 bg-card/30">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-semibold tracking-tight mb-4" style={{ fontFamily: 'Outfit, sans-serif' }}>
              Loved by entrepreneurs
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Join thousands of business owners who simplified their finances.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={testimonial.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="rounded-2xl border border-border bg-card p-6"
              >
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                  ))}
                </div>
                <p className="text-muted-foreground mb-6">"{testimonial.content}"</p>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-sm font-medium text-primary">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <p className="font-medium">{testimonial.name}</p>
                    <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 md:py-32">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-5xl font-semibold tracking-tight mb-6" style={{ fontFamily: 'Outfit, sans-serif' }}>
              Ready to simplify your finances?
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Start your 3-day free trial today. No credit card required.
            </p>
            <Link to="/register">
              <Button size="lg" className="glow-button text-lg px-8 py-6" data-testid="cta-get-started-btn">
                Get Started Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                <FileText className="h-4 w-4 text-white" />
              </div>
              <span className="font-semibold" style={{ fontFamily: 'Outfit, sans-serif' }}>Simplifile AI</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2024 Simplifile AI. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
