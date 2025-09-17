
import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import type { TutorialStep } from '../types';

interface TutorialProps {
    steps: TutorialStep[];
    onComplete: () => void;
}

const Tutorial: React.FC<TutorialProps> = ({ steps, onComplete }) => {
    const [stepIndex, setStepIndex] = useState(0);
    const [highlightBox, setHighlightBox] = useState({ top: 0, left: 0, width: 0, height: 0 });
    const [modalPosition, setModalPosition] = useState({ top: 0, left: 0 });
    const currentStep = steps[stepIndex];
    const modalRef = useRef<HTMLDivElement>(null);

    useLayoutEffect(() => {
        const currentStep = steps[stepIndex];
        if (!currentStep) return;

        currentStep.action?.();
        
        const timer = setTimeout(() => {
            try {
                const element = document.querySelector(currentStep.elementSelector);
                if (element) {
                    const rect = element.getBoundingClientRect();
                    setHighlightBox({
                        top: rect.top,
                        left: rect.left,
                        width: rect.width,
                        height: rect.height,
                    });
                } else {
                    // Fallback for elements not found
                     setHighlightBox({ top: window.innerHeight / 2, left: window.innerWidth / 2, width: 0, height: 0 });
                }
            } catch (e) {
                console.error("Tutorial element not found:", currentStep.elementSelector, e);
            }
        }, 150); // Delay to allow UI to update after an action

        return () => clearTimeout(timer);
    }, [stepIndex, steps]);
    
    useEffect(() => {
        if (!highlightBox.width || !modalRef.current) return;

        const modalRect = modalRef.current.getBoundingClientRect();
        const PADDING = 15;
        let pos = { top: 0, left: 0 };
        const position = currentStep.position || 'bottom';

        switch (position) {
            case 'top':
                pos.top = highlightBox.top - modalRect.height - PADDING;
                pos.left = highlightBox.left + highlightBox.width / 2 - modalRect.width / 2;
                break;
            case 'bottom':
                pos.top = highlightBox.top + highlightBox.height + PADDING;
                pos.left = highlightBox.left + highlightBox.width / 2 - modalRect.width / 2;
                break;
            case 'left':
                pos.top = highlightBox.top + highlightBox.height / 2 - modalRect.height / 2;
                pos.left = highlightBox.left - modalRect.width - PADDING;
                break;
            case 'right':
                pos.top = highlightBox.top + highlightBox.height / 2 - modalRect.height / 2;
                pos.left = highlightBox.left + highlightBox.width + PADDING;
                break;
        }
        
        // Adjust if off-screen
        if (pos.left < PADDING) pos.left = PADDING;
        if (pos.top < PADDING) pos.top = PADDING;
        if (pos.left + modalRect.width > window.innerWidth - PADDING) {
            pos.left = window.innerWidth - modalRect.width - PADDING;
        }
        if (pos.top + modalRect.height > window.innerHeight - PADDING) {
            pos.top = window.innerHeight - modalRect.height - PADDING;
        }

        setModalPosition(pos);

    }, [highlightBox, currentStep]);

    const handleNext = () => {
        if (stepIndex < steps.length - 1) {
            setStepIndex(stepIndex + 1);
        } else {
            onComplete();
        }
    };

    const handlePrev = () => {
        if (stepIndex > 0) {
            setStepIndex(stepIndex - 1);
        }
    };

    return (
        <div className="fixed inset-0 z-[1000]">
            {/* Overlay with hole */}
            <div
                className="fixed inset-0 transition-all duration-300"
                style={{
                    boxShadow: `0 0 0 5000px rgba(0, 0, 0, 0.7)`,
                    top: highlightBox.top - 4,
                    left: highlightBox.left - 4,
                    width: highlightBox.width + 8,
                    height: highlightBox.height + 8,
                    borderRadius: '8px',
                    pointerEvents: 'none',
                }}
            />

            {/* Modal */}
            <div
                ref={modalRef}
                className="fixed bg-slate-800 border border-slate-600 p-5 rounded-lg shadow-2xl w-full max-w-sm z-[1001] transition-all duration-300"
                style={{
                    top: modalPosition.top,
                    left: modalPosition.left,
                    opacity: highlightBox.width > 0 ? 1 : 0
                }}
            >
                <h3 className="text-lg font-bold text-blue-400 mb-2">{currentStep?.title}</h3>
                <p className="text-slate-300 text-sm mb-4">{currentStep?.content}</p>
                <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-400">{stepIndex + 1} / {steps.length}</span>
                    <div className="space-x-2">
                        <button
                            onClick={onComplete}
                            className="px-3 py-1 text-sm bg-transparent text-slate-400 hover:text-white rounded-md transition-colors"
                        >
                            Skip
                        </button>
                        {stepIndex > 0 && (
                            <button
                                onClick={handlePrev}
                                className="px-3 py-1 text-sm bg-slate-600 hover:bg-slate-700 rounded-md transition-colors"
                            >
                                Previous
                            </button>
                        )}
                        <button
                            onClick={handleNext}
                            className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
                        >
                            {stepIndex === steps.length - 1 ? 'Finish' : 'Next'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Tutorial;
