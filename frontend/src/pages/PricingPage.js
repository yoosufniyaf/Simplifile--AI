import React, { useState } from "react";

export default function PricingPage() {
  const [billing, setBilling] = useState("monthly");

  const plans = {
    monthly: [
      {
        name: "Basic",
        price: "$9.99",
        description: "Perfect for getting started with AI-powered financial help.",
        features: [
          "AI financial statement generation",
          "Basic document assistance",
          "Simple dashboard access",
          "3-day free trial",
        ],
        buttonText: "Start Basic Trial",
        link: "https://whop.com/checkout/plan_PPUUTjaMeSwJ2",
        popular: false,
      },
      {
        name: "Premium",
        price: "$19.99",
        description: "Best for growing businesses that need deeper automation.",
        features: [
          "Everything in Basic",
          "Advanced financial insights",
          "More AI-powered support",
          "Priority features",
          "3-day free trial",
        ],
        buttonText: "Start Premium Trial",
        link: "https://whop.com/checkout/plan_2oAqaWyrKqxEL",
        popular: true,
      },
      {
        name: "Enterprise",
        price: "$49.99",
        description: "For businesses that want the full Simplifile AI experience.",
        features: [
          "Everything in Premium",
          "Full financial automation",
          "Higher usage capacity",
          "Premium support",
          "3-day free trial",
        ],
        buttonText: "Start Enterprise Trial",
        link: "https://whop.com/checkout/plan_HxIPDg1O5ClHn",
        popular: false,
      },
    ],
    yearly: [
      {
        name: "Basic",
        price: "$89.91",
        description: "Save more with annual billing for Basic.",
        features: [
          "AI financial statement generation",
          "Basic document assistance",
          "Simple dashboard access",
          "3-day free trial",
        ],
        buttonText: "Start Basic Trial",
        link: "https://whop.com/checkout/plan_iwtWTjCmve5Xj",
        popular: false,
      },
      {
        name: "Premium",
        price: "$179.91",
        description: "Save more with annual billing for Premium.",
        features: [
          "Everything in Basic",
          "Advanced financial insights",
          "More AI-powered support",
          "Priority features",
          "3-day free trial",
        ],
        buttonText: "Start Premium Trial",
        link: "https://whop.com/checkout/plan_6T3qi11GRXcq4",
        popular: true,
      },
      {
        name: "Enterprise",
        price: "$449.91",
        description: "Save more with annual billing for Enterprise.",
        features: [
          "Everything in Premium",
          "Full financial automation",
          "Higher usage capacity",
          "Premium support",
          "3-day free trial",
        ],
        buttonText: "Start Enterprise Trial",
        link: "https://whop.com/checkout/plan_1nnO8tkh9GCCd",
        popular: false,
      },
    ],
  };

  const currentPlans = plans[billing];

  return (
    <div className="min-h-screen bg-black text-white px-6 py-16">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Simple pricing for every stage
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Choose the plan that fits your business. Start with a 3-day free
            trial.
          </p>

          <div className="mt-8 inline-flex bg-zinc-900 rounded-full p-1 border border-zinc-800">
            <button
              onClick={() => setBilling("monthly")}
              className={`px-6 py-2 rounded-full text-sm font-medium transition ${
                billing === "monthly"
                  ? "bg-blue-600 text-white"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBilling("yearly")}
              className={`px-6 py-2 rounded-full text-sm font-medium transition ${
                billing === "yearly"
                  ? "bg-blue-600 text-white"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Yearly
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {currentPlans.map((plan) => (
            <div
              key={`${billing}-${plan.name}`}
              className={`relative rounded-2xl border p-8 shadow-lg ${
                plan.popular
                  ? "border-blue-500 bg-zinc-900"
                  : "border-zinc-800 bg-zinc-950"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs font-semibold px-4 py-1 rounded-full">
                  Most Popular
                </div>
              )}

              <h2 className="text-2xl font-bold mb-2">{plan.name}</h2>
              <p className="text-gray-400 mb-6">{plan.description}</p>

              <div className="mb-6">
                <span className="text-4xl font-bold">{plan.price}</span>
                <span className="text-gray-400 ml-2">
                  / {billing === "monthly" ? "month" : "year"}
                </span>
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-3 text-gray-300">
                    <span className="text-blue-400 mt-0.5">✓</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <a
                href={plan.link}
                target="_blank"
                rel="noopener noreferrer"
                className={`block w-full text-center py-3 px-6 rounded-xl font-semibold transition ${
                  plan.popular
                    ? "bg-blue-600 hover:bg-blue-500 text-white"
                    : "bg-white text-black hover:bg-gray-200"
                }`}
              >
                {plan.buttonText}
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
