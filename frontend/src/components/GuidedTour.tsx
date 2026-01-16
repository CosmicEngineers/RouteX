'use client';

import React, { useState, useEffect } from 'react';
import { X, CaretRight } from 'phosphor-react';

interface TourStep {
  target: string;
  title: string;
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

const tourSteps: TourStep[] = [
  {
    target: 'optimization-panel',
    title: '🎯 Run Optimization',
    content: 'Start here! Set your parameters and click "Run Optimization" to find the best routes for your fleet.',
    position: 'right'
  },
  {
    target: 'solver-preset',
    title: '⚡ Solver Presets',
    content: 'Choose Quick (30s) for demos, Balanced (2min) for daily use, or Thorough (5min) for best results.',
    position: 'right'
  },
  {
    target: 'kpi-section',
    title: '📊 Key Performance Indicators',
    content: 'See your optimization results here: cost savings, fleet utilization, and demand satisfaction.',
    position: 'bottom'
  },
  {
    target: 'map-playback',
    title: '🗺️ Route Visualization',
    content: 'Watch your optimized routes on the map. Use playback controls to step through each vessel\'s journey.',
    position: 'bottom'
  },
  {
    target: 'comparison-view',
    title: '📈 Compare Results',
    content: 'See how AI optimization beats manual planning with side-by-side comparisons and savings projections.',
    position: 'top'
  }
];

export function GuidedTour() {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [hasSeenTour, setHasSeenTour] = useState(false);

  useEffect(() => {
    // Initialize from localStorage on client side only
    const completed = typeof window !== 'undefined' ? localStorage.getItem('hpcl-tour-completed') : null;
    setHasSeenTour(!!completed);
    
    // Check if user has seen the tour
    if (!completed) {
      // Show tour after a brief delay
      setTimeout(() => setIsActive(true), 1500);
    }
  }, []);

  const handleNext = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      completeTour();
    }
  };

  const handleSkip = () => {
    completeTour();
  };

  const completeTour = () => {
    localStorage.setItem('hpcl-tour-completed', 'true');
    setIsActive(false);
    setCurrentStep(0);
  };

  const restartTour = () => {
    setCurrentStep(0);
    setIsActive(true);
  };

  if (!isActive) {
    return hasSeenTour ? (
      <button
        onClick={restartTour}
        className="fixed bottom-6 right-6 z-50 px-4 py-2 bg-cyan-500/10 border border-cyan-500/30 rounded-lg text-cyan-300 hover:bg-cyan-500/20 transition-all text-sm"
      >
        🎓 Restart Tour
      </button>
    ) : null;
  }

  const step = tourSteps[currentStep];

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" onClick={handleSkip} />

      {/* Tour Tooltip */}
      <div className="fixed bottom-6 right-6 z-50 w-96">
        <div className="glass-card rounded-xl border border-cyan-500/30 p-6 shadow-2xl">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="text-sm text-cyan-400 mb-1">
                Step {currentStep + 1} of {tourSteps.length}
              </div>
              <h3 className="text-lg font-semibold text-slate-100">{step.title}</h3>
            </div>
            <button
              onClick={handleSkip}
              className="text-slate-400 hover:text-slate-200 transition-colors"
            >
              <X size={20} weight="bold" />
            </button>
          </div>

          <p className="text-slate-300 text-sm mb-6">{step.content}</p>

          <div className="flex items-center justify-between">
            <div className="flex space-x-1">
              {tourSteps.map((_, idx) => (
                <div
                  key={idx}
                  className={`h-1.5 rounded-full transition-all ${
                    idx === currentStep ? 'w-6 bg-cyan-400' : 'w-1.5 bg-slate-600'
                  }`}
                />
              ))}
            </div>

            <div className="flex space-x-2">
              {currentStep < tourSteps.length - 1 && (
                <button
                  onClick={handleSkip}
                  className="px-4 py-2 text-slate-400 hover:text-slate-200 transition-colors text-sm"
                >
                  Skip Tour
                </button>
              )}
              <button
                onClick={handleNext}
                className="flex items-center px-4 py-2 bg-cyan-500 hover:bg-cyan-600 rounded-lg text-white font-medium transition-all text-sm"
              >
                {currentStep < tourSteps.length - 1 ? (
                  <>
                    Next <CaretRight size={16} weight="bold" className="ml-1" />
                  </>
                ) : (
                  'Finish'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
