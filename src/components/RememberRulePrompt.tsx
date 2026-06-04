import { useState } from "react";

type RememberRulePromptProps = {
  label: string;
  onRemember: () => void;
  onDismiss: () => void;
};

export function RememberRulePrompt({
  label,
  onRemember,
  onDismiss,
}: RememberRulePromptProps) {
  return (
    <div className="remember-prompt">
      <p>{label}</p>
      <div className="form-actions">
        <button type="button" className="btn btn-primary btn-sm" onClick={onRemember}>
          Remember this rule
        </button>
        <button type="button" className="btn btn-secondary btn-sm" onClick={onDismiss}>
          Not now
        </button>
      </div>
    </div>
  );
}

export function useRememberRulePrompt() {
  const [pending, setPending] = useState<{
    keywords: string[];
    category: string;
    label: string;
  } | null>(null);

  return {
    pending,
    show: (data: { keywords: string[]; category: string; label: string }) =>
      setPending(data),
    dismiss: () => setPending(null),
  };
}
