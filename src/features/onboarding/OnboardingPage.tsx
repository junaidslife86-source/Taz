import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useFinanceStore } from "../../lib/storage";
import { PRIVACY_STATEMENT } from "../../types/finance";

const steps = [
  {
    title: "Welcome to Taz",
    body: "Your friendly personal finance companion. Track spending, assets, and net worth — all in one place, right in your browser.",
    icon: "👋",
  },
  {
    title: "Privacy-first and offline",
    body: PRIVACY_STATEMENT,
    icon: "🔒",
  },
  {
    title: "What you can track",
    body: "Import bank statements (CSV, XLSX, or PDF), auto-categorise transactions with local rules, add assets like property and superannuation, track liabilities, and watch your net worth grow over time.",
    icon: "📊",
  },
  {
    title: "Start using the app",
    body: "Remember to back up your data regularly from Settings. You can export everything as a JSON file and restore it anytime.",
    icon: "🚀",
  },
];

export function OnboardingPage() {
  const [step, setStep] = useState(0);
  const navigate = useNavigate();
  const setOnboardingComplete = useFinanceStore((s) => s.setOnboardingComplete);

  const current = steps[step];
  const isLast = step === steps.length - 1;

  const finish = async () => {
    await setOnboardingComplete(true);
    navigate("/", { replace: true });
  };

  return (
    <div className="onboarding">
      <div className="onboarding-card">
        <div className="onboarding-progress">
          {steps.map((_, i) => (
            <span
              key={i}
              className={`onboarding-dot${i <= step ? " active" : ""}`}
            />
          ))}
        </div>
        <span className="onboarding-icon" aria-hidden="true">
          {current.icon}
        </span>
        <h1>{current.title}</h1>
        <p>{current.body}</p>
        <div className="onboarding-actions">
          {step > 0 && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setStep((s) => s - 1)}
            >
              Back
            </button>
          )}
          {!isLast ? (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setStep((s) => s + 1)}
            >
              Next
            </button>
          ) : (
            <button type="button" className="btn btn-primary" onClick={finish}>
              Get started
            </button>
          )}
        </div>
        {!isLast && (
          <button type="button" className="btn-link" onClick={finish}>
            Skip onboarding
          </button>
        )}
      </div>
    </div>
  );
}
