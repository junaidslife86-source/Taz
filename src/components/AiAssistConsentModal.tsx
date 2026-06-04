import { useState } from "react";
import { AI_ASSIST_CONSENT_TEXT } from "../types/finance";

type AiAssistConsentModalProps = {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function AiAssistConsentModal({
  open,
  onConfirm,
  onCancel,
}: AiAssistConsentModalProps) {
  const [acknowledged, setAcknowledged] = useState(false);

  if (!open) return null;

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="ai-consent-title">
      <div className="modal-card">
        <h2 id="ai-consent-title">Enable AI Assist?</h2>
        <p className="alert alert-warning">{AI_ASSIST_CONSENT_TEXT}</p>
        <ul className="ai-assist-consent-list">
          <li>This is <strong>not</strong> offline or private mode.</li>
          <li>
            Date, redacted description, and amount may be sent to{" "}
            <strong>Google Gemini</strong> from your browser.
          </li>
          <li>Only used when local categorisation rules do not match.</li>
          <li>Your API key stays on this device but is sent to Google with each request.</li>
        </ul>
        <label className="toggle-field">
          <input
            type="checkbox"
            checked={acknowledged}
            onChange={(e) => setAcknowledged(e.target.checked)}
          />
          <span>I understand and want to enable AI Assist</span>
        </label>
        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={!acknowledged}
            onClick={() => {
              setAcknowledged(false);
              onConfirm();
            }}
          >
            Enable AI Assist
          </button>
        </div>
      </div>
    </div>
  );
}
