"use client";

import { SignInButton, SignUpButton, useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { 
  Zap, 
  Globe, 
  TrendingUp, 
  Shield, 
  CheckCircle,
  ArrowRight,
  ChevronDown,
} from "lucide-react";

// Sistine logo as data URI
const SISTINE_LOGO = `data:image/webp;base64,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`;

function FAQ({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-gray-200 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between py-4 text-left"
      >
        <span className="font-medium text-gray-900">{question}</span>
        <ChevronDown className={`h-5 w-5 text-gray-500 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <p className="pb-4 text-gray-600">{answer}</p>}
    </div>
  );
}

export default function LandingPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();

  // Redirect to dashboard if already signed in
  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.push("/dashboard");
    }
  }, [isLoaded, isSignedIn, router]);

  // Show loading state while checking auth
  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Navigation */}
      <nav className="fixed top-0 z-50 w-full border-b border-gray-200 bg-white/80 backdrop-blur-lg">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <img src={SISTINE_LOGO} alt="Sistine" className="h-9 w-9 rounded-lg" />
            <span className="text-lg font-bold tracking-tight text-gray-900">Sistine Research</span>
          </div>
          <div className="flex items-center gap-3">
            <SignInButton mode="modal">
              <button className="text-sm text-gray-600 hover:text-gray-900">Sign in</button>
            </SignInButton>
            <SignUpButton mode="modal">
              <button className="rounded-full bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800">
                Get Started
              </button>
            </SignUpButton>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden pt-32 pb-12">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-50 via-transparent to-transparent" />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 h-[500px] w-[500px] rounded-full bg-indigo-100 blur-[120px]" />
        
        <div className="relative mx-auto max-w-4xl px-6 text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-1.5 text-sm shadow-sm">
            <Zap className="h-4 w-4 text-amber-500" />
            Live Market Intelligence Feed
          </div>
          
          <h1 className="mb-6 text-5xl font-bold leading-tight tracking-tight md:text-6xl text-gray-900">
            Stop missing market-moving{" "}
            <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              news
            </span>
          </h1>
          
          <p className="mx-auto mb-8 max-w-2xl text-lg text-gray-600">
            Sistine Research monitors global news and instantly analyzes market impact 
            across crypto, equities, energy, metals, and FX. Know what matters before the market moves.
          </p>
          
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <SignUpButton mode="modal">
              <button className="group inline-flex items-center gap-2 rounded-full bg-gray-900 px-6 py-3 text-base font-medium text-white hover:bg-gray-800 shadow-lg shadow-gray-900/20">
                Start Free Trial
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </button>
            </SignUpButton>
            <p className="text-sm text-gray-500">7-day free trial • Cancel anytime</p>
          </div>
        </div>
      </section>

      {/* Dashboard Preview */}
      <section className="relative py-12">
        <div className="mx-auto max-w-6xl px-6">
          <div className="relative rounded-2xl border border-gray-200 bg-white p-2 shadow-2xl shadow-gray-200/50">
            {/* Browser-like header */}
            <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-3">
              <div className="flex gap-1.5">
                <div className="h-3 w-3 rounded-full bg-red-400"></div>
                <div className="h-3 w-3 rounded-full bg-amber-400"></div>
                <div className="h-3 w-3 rounded-full bg-green-400"></div>
              </div>
              <div className="ml-4 flex-1 rounded-lg bg-gray-100 px-3 py-1 text-xs text-gray-500">
                sistine.ai/dashboard
              </div>
            </div>
            {/* Screenshot */}
            <img 
              src="/dashboard-preview.png" 
              alt="Sistine Research Dashboard" 
              className="w-full rounded-b-xl"
            />
          </div>
          {/* Glow effect */}
          <div className="absolute inset-0 -z-10 mx-auto max-w-4xl translate-y-1/4 bg-indigo-100 blur-[100px]"></div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-gray-50">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold text-gray-900">Everything you need to stay ahead</h2>
            <p className="text-gray-600">Professional-grade intelligence, simplified.</p>
          </div>
          
          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                icon: Globe,
                title: "Global Coverage",
                description: "Monitor news from Reuters, Bloomberg, WSJ, and 50+ sources worldwide in real-time.",
              },
              {
                icon: TrendingUp,
                title: "Impact Analysis",
                description: "Instant AI analysis of how news affects specific assets with directional insights.",
              },
              {
                icon: Shield,
                title: "First & Second Order",
                description: "See beyond the headline with cascading market effects most traders miss.",
              },
            ].map((feature, i) => (
              <div
                key={i}
                className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
              >
                <div className="mb-4 inline-flex rounded-xl bg-indigo-50 p-3">
                  <feature.icon className="h-6 w-6 text-indigo-600" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-gray-900">{feature.title}</h3>
                <p className="text-sm text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20" id="pricing">
        <div className="mx-auto max-w-xl px-6">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold text-gray-900">Simple, transparent pricing</h2>
            <p className="text-gray-600">One plan. Everything included.</p>
          </div>
          
          <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-lg">
            <div className="mb-6 text-center">
              <div className="mb-2 text-sm font-medium text-indigo-600">PRO</div>
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-5xl font-bold text-gray-900">$49</span>
                <span className="text-gray-500">/month</span>
              </div>
            </div>
            
            <ul className="mb-8 space-y-3">
              {[
                "Unlimited real-time news monitoring",
                "Instant market impact analysis",
                "All asset classes (Crypto, Equities, Energy, Metals, FX)",
                "First, second & third order effects",
                "Share insights to social media",
                "Cancel anytime",
              ].map((feature, i) => (
                <li key={i} className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 flex-shrink-0 text-green-500" />
                  <span className="text-gray-700">{feature}</span>
                </li>
              ))}
            </ul>
            
            <SignUpButton mode="modal">
              <button className="w-full rounded-full bg-gray-900 py-3 font-medium text-white hover:bg-gray-800">
                Start 7-Day Free Trial
              </button>
            </SignUpButton>
            
            <p className="mt-4 text-center text-sm text-gray-500">
              No credit card required to start
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 bg-gray-50">
        <div className="mx-auto max-w-2xl px-6">
          <h2 className="mb-8 text-center text-3xl font-bold text-gray-900">Frequently asked questions</h2>
          
          <div className="rounded-2xl border border-gray-200 bg-white px-6 shadow-sm">
            <FAQ
              question="How do I cancel my subscription?"
              answer="You can cancel anytime from your billing settings. Click the 'Billing' button in the dashboard header to manage your subscription. Your access continues until the end of your billing period."
            />
            <FAQ
              question="What sources do you monitor?"
              answer="We monitor major financial news sources including Reuters, Bloomberg, Financial Times, WSJ, CNBC, and dozens of specialized feeds covering crypto, commodities, and global markets."
            />
            <FAQ
              question="How fast is the analysis?"
              answer="News appears in your dashboard within seconds of publication. Our AI analysis is generated in real-time, so you see market impact assessments almost instantly."
            />
            <FAQ
              question="Can I get a refund?"
              answer="If you're not satisfied within the first 7 days of your paid subscription, contact us and we'll issue a full refund. No questions asked."
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="mb-4 text-3xl font-bold text-gray-900">Ready to get ahead of the market?</h2>
          <p className="mb-8 text-gray-600">
            Join traders who use Sistine to catch market-moving news before it moves.
          </p>
          <SignUpButton mode="modal">
            <button className="inline-flex items-center gap-2 rounded-full bg-gray-900 px-6 py-3 font-medium text-white hover:bg-gray-800 shadow-lg shadow-gray-900/20">
              Start Your Free Trial
              <ArrowRight className="h-4 w-4" />
            </button>
          </SignUpButton>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-8 bg-gray-50">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <img src={SISTINE_LOGO} alt="Sistine" className="h-6 w-6 rounded" />
            <span className="text-sm text-gray-500">© 2025 Sistine.ai</span>
          </div>
          <div className="flex gap-6 text-sm text-gray-500">
            <a href="mailto:support@sistine.ai" className="hover:text-gray-900">Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
