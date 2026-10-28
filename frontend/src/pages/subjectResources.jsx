// frontend/src/pages/subjectResources.jsx
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Navbar from '../components/common/navbar';
import ReportModal from '../components/common/ReportModal';

export default function SubjectResources() {
  const { courseCode } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Reporting State
  const [reportingDoc, setReportingDoc] = useState(null);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    fetch(`http://localhost:3000/subjects/${encodeURIComponent(courseCode)}/resources`, {
      headers: {
        Accept: 'application/json',
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Subject not found or failed to load.');
        return res.json();
      })
      .then((resData) => {
        if (resData.success) {
          setData(resData);
        } else {
          throw new Error(resData.message || 'Failed to retrieve data.');
        }
      })
      .catch((err) => {
        console.error(err);
        setError(err.message);
      })
      .finally(() => setLoading(false));
  }, [courseCode]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020617] text-slate-50 flex flex-col justify-between">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-sm text-slate-400">Loading subject materials...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#020617] text-slate-50 flex flex-col justify-between">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center px-4 text-center">
          <p className="text-rose-400 font-semibold mb-2">Error</p>
          <h2 className="text-xl font-bold text-white mb-4">{error || 'Could not load resources'}</h2>
          <Link
            to="/"
            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-full text-xs font-semibold text-slate-200 transition"
          >
            &larr; Back to Home
          </Link>
        </div>
      </div>
    );
  }

  const { subject, unitwise = [], notes = [], pyqs = [] } = data;

  return (
    <div className="min-h-screen bg-[#020617] text-slate-50 flex flex-col justify-between selection:bg-indigo-500 selection:text-white relative overflow-x-hidden">
      {/* Ambient background glows */}
      <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[650px] h-[350px] bg-indigo-600/10 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-[600px] right-10 w-[450px] h-[350px] bg-cyan-500/10 rounded-full blur-3xl pointer-events-none -z-10" />

      <Navbar />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8">
        {/* Top Header & Breadcrumb */}
        <div className="mb-8">
          <Link
            to="/"
            className="inline-flex items-center text-xs font-medium text-slate-400 hover:text-indigo-300 transition mb-4"
          >
            &larr; Back to Subjects Search
          </Link>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 mb-2">
                {courseCode}
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                {subject?.title}
              </h1>
            </div>

            {/* Quick Metrics */}
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
              <span className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800">
                <strong className="text-white">{unitwise.length}</strong> Unit-wise PYQs
              </span>
              <span className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800">
                <strong className="text-white">{notes.length}</strong> Notes
              </span>
              <span className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800">
                <strong className="text-white">{pyqs.length}</strong> Full Papers
              </span>
            </div>
          </div>
        </div>

        {/* Success Alert Banner */}
        {toastMessage && (
          <div className="mb-6 p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs rounded-xl flex items-center justify-between">
            <span>{toastMessage}</span>
            <button onClick={() => setToastMessage('')} className="text-emerald-400 font-bold ml-2">
              ✕
            </button>
          </div>
        )}

        {/* ======================================================== */}
        {/* 1. SECTION: UNIT-WISE PYQS & CHAPTERWISE MATERIAL        */}
        {/* ======================================================== */}
        <section className="mb-12">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span>📋</span> Unit-wise PYQs & Questions
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Previous year questions organized unit-by-unit for focused revision
            </p>
          </div>

          {unitwise.length === 0 ? (
            <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/20 border border-dashed border-slate-800 rounded-2xl p-7 text-center">
              <div className="w-10 h-10 rounded-full bg-slate-800/80 border border-slate-700 flex items-center justify-center mx-auto text-base mb-2">
                📂
              </div>
              <h3 className="text-sm font-semibold text-slate-200">No Unit-wise PYQs Uploaded Yet</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                Unit-by-unit curated questions will appear here once published by faculty or student admins.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {unitwise.map((doc) => {
                const uploaderRole = doc.uploadedBy?.role;
                return (
                  <div
                    key={doc._id}
                    className="bg-slate-900/90 border border-slate-800 hover:border-amber-500/50 rounded-2xl p-5 flex flex-col justify-between transition group shadow-lg"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                          Unit-wise PYQ
                        </span>

                        {uploaderRole === 'teacher' ? (
                          <span className="text-[10px] font-bold text-emerald-400">
                            ✓ Faculty Verified
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400">
                            Student Contributor
                          </span>
                        )}
                      </div>

                      <h3 className="text-sm font-semibold text-white group-hover:text-amber-300 transition line-clamp-2">
                        {doc.title}
                      </h3>
                      {doc.academicYear && (
                        <p className="text-[11px] font-mono text-slate-500 mt-1">Session: {doc.academicYear}</p>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => setReportingDoc(doc)}
                        className="text-[11px] font-medium text-slate-400 hover:text-rose-400 transition cursor-pointer flex items-center gap-1"
                      >
                        <span>🚩</span> Report
                      </button>

                      <a
                        href={`http://localhost:3000/documents/${doc._id}/view`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white font-medium text-xs rounded-lg transition"
                      >
                        Open PDF
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ======================================================== */}
        {/* 2. SECTION: GENERAL LECTURE NOTES & STUDY MATERIAL       */}
        {/* ======================================================== */}
        <section className="mb-12">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span>📚</span> Lecture Notes & Handouts
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Faculty lecture slides, handwritten notes, and reference reading materials
            </p>
          </div>

          {notes.length === 0 ? (
            <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/20 border border-dashed border-slate-800 rounded-2xl p-7 text-center">
              <div className="w-10 h-10 rounded-full bg-slate-800/80 border border-slate-700 flex items-center justify-center mx-auto text-base mb-2">
                📝
              </div>
              <h3 className="text-sm font-semibold text-slate-200">No Lecture Notes Uploaded Yet</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                Faculty-contributed lecture notes for this course will appear here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {notes.map((doc) => {
                const uploaderRole = doc.uploadedBy?.role;
                return (
                  <div
                    key={doc._id}
                    className="bg-slate-900/90 border border-slate-800 hover:border-indigo-500/50 rounded-2xl p-5 flex flex-col justify-between transition group shadow-lg"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                          Notes
                        </span>

                        {uploaderRole === 'teacher' ? (
                          <span className="text-[10px] font-bold text-emerald-400">
                            ✓ Faculty Verified
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400">
                            Student Contributor
                          </span>
                        )}
                      </div>

                      <h3 className="text-sm font-semibold text-white group-hover:text-indigo-300 transition line-clamp-2">
                        {doc.title}
                      </h3>
                      {doc.academicYear && (
                        <p className="text-[11px] font-mono text-slate-500 mt-1">Year: {doc.academicYear}</p>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => setReportingDoc(doc)}
                        className="text-[11px] font-medium text-slate-400 hover:text-rose-400 transition cursor-pointer flex items-center gap-1"
                      >
                        <span>🚩</span> Report
                      </button>

                      <a
                        href={`http://localhost:3000/documents/${doc._id}/view`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs rounded-lg transition"
                      >
                        Open PDF
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ======================================================== */}
        {/* 3. SECTION: PREVIOUS YEAR PAPERS (PYQs)                  */}
        {/* ======================================================== */}
        <section className="mb-12">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span>📄</span> Semester Exam Papers (Full PYQs)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Complete semester question papers from previous university examination sessions
            </p>
          </div>

          {pyqs.length === 0 ? (
            <div className="bg-slate-900/60 border border-dashed border-slate-800 rounded-2xl p-6 text-center text-xs text-slate-500">
              No previous year papers uploaded for this subject yet.
            </div>
          ) : (
            <div className="overflow-hidden bg-slate-900 border border-slate-800 rounded-2xl shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/80 text-slate-400 uppercase font-semibold tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Paper Title</th>
                      <th className="py-3 px-4">Session / Year</th>
                      <th className="py-3 px-4">Contributor</th>
                      <th className="py-3 px-4 text-center">Flag</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    {pyqs.map((doc) => {
                      const isTeacher = doc.uploadedBy?.role === 'teacher';
                      return (
                        <tr key={doc._id} className="hover:bg-slate-800/40 transition">
                          <td className="py-3.5 px-4 font-medium text-white">{doc.title}</td>
                          <td className="py-3.5 px-4 font-mono text-slate-400">
                            {doc.academicYear || 'All Sessions'}
                          </td>
                          <td className="py-3.5 px-4">
                            {isTeacher ? (
                              <span className="inline-block px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                                ✓ Faculty Verified
                              </span>
                            ) : (
                              <span className="inline-block px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 text-[10px] font-medium border border-indigo-500/30">
                                Student
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => setReportingDoc(doc)}
                              className="px-2 py-1 bg-slate-800 hover:bg-rose-950/60 border border-slate-700 text-slate-400 hover:text-rose-300 rounded text-[11px] cursor-pointer"
                            >
                              🚩 Report
                            </button>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <a
                              href={`http://localhost:3000/documents/${doc._id}/view`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-block px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white font-medium rounded-lg text-xs transition"
                            >
                              View PDF
                            </a>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

        {/* ======================================================== */}
        {/* 4. SECTION: OFFICIAL UNIVERSITY SYLLABUS                 */}
        {/* ======================================================== */}
        <section className="mb-12">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span>📖</span> Official University Syllabus
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Unit-by-unit curriculum topics officially prescribed by the university
            </p>
          </div>

          {!subject?.syllabus || subject.syllabus.length === 0 ? (
            <div className="bg-slate-900/60 border border-dashed border-slate-800 rounded-2xl p-6 text-center text-xs text-slate-500">
              Syllabus topics have not been indexed for this course yet.
            </div>
          ) : (
            <div className="space-y-3">
              {subject.syllabus.map((unit) => (
                <div
                  key={unit.unitNumber}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 hover:border-slate-700 transition"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      Unit {unit.unitNumber}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    {Array.isArray(unit.topics) ? unit.topics.join(' • ') : unit.topics}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Interactive Report Modal */}
      {reportingDoc && (
        <ReportModal
          document={reportingDoc}
          onClose={() => setReportingDoc(null)}
          onReportSuccess={() => {
            setToastMessage('Thank you! Your report has been dispatched to the uploader and moderators.');
          }}
        />
      )}

      <footer className="border-t border-slate-800/80 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span>&copy; {new Date().getFullYear()} CanReal &bull; Open Academic Archive</span>
          <span>Colours are not Real</span>
        </div>
      </footer>
    </div>
  );
}