"use client";

import React, { useState } from "react";
import Navbar from "./Navbar";
import Footer from "./Footer";
import TrialModal from "./TrialModal";

interface PageWrapperProps {
  children: React.ReactNode;
}

export default function PageWrapper({ children }: PageWrapperProps) {
  const [trialOpen, setTrialOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState("Growth Fine Dining");

  const handleOpenTrial = (planName?: string) => {
    if (planName) setSelectedPlan(planName);
    setTrialOpen(true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-navy-950 text-slate-100 selection:bg-gold selection:text-navy-950">
      <Navbar onOpenTrial={handleOpenTrial} />
      <main className="flex-1 pt-24 pb-16">{children}</main>
      <Footer />
      <TrialModal
        isOpen={trialOpen}
        onClose={() => setTrialOpen(false)}
        selectedPlan={selectedPlan}
      />
    </div>
  );
}
