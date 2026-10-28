// frontend/src/components/common/ReportModal.jsx
import React, { useState } from 'react';

const REPORT_REASONS = [
  'Inappropriate content',
  'Wrong paper',
  'Blurry / unreadable',
  'Incorrect semester / branch',
  'Outdated syllabus',
  'Other',
];

export default function ReportModal({ document, onClose, onReportSuccess }) {
  const [selectedReason, setSelectedReason] = useState(REPORT_REASONS[0]);
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg('');

    try {
      const res = await fetch('http://localhost:3000/reports/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          documentId: document._id,
          reason: selectedReason,
          additionalDetails: details.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        if (onReportSuccess) onReportSuccess();
        onClose();
      } else {
        setErrorMsg(data.message || 'Failed to submit report.');
      }
    } catch (err) {
      setErrorMsg('Network error while submitting report.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2 text-rose-400">
            <span className="text-lg">🚩</span>
            <h3 className="text-base font-bold text-white">Report Document</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 text-sm cursor-pointer"
          >
            ✕
          </button>
        </div>

        <p className="text-xs text-slate-300 mt-3 mb-4 leading-relaxed">
          Help us keep CanReal accurate. Flagging <strong className="text-white">"{document.title}"</strong> notifies the contributor and administrators.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400 mb-1.5">
              Reason for Report
            </label>
            <select
              value={selectedReason}
              onChange={(e) => setSelectedReason(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-rose-500"
            >
              {REPORT_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400 mb-1.5">
              Additional Notes (Optional)
            </label>
            <textarea
              rows={3}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="e.g. Page 2 is upside down, or this is Dec 2023 instead of Dec 2024..."
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-rose-500"
            />
          </div>

          {errorMsg && <p className="text-xs text-rose-400 font-medium">{errorMsg}</p>}

          <div className="flex gap-2 justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-xl transition cursor-pointer shadow-lg shadow-rose-600/30 disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Submit Report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}