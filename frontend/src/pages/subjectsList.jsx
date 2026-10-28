// frontend/src/pages/subjectsList.jsx
import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import Navbar from '../components/common/navbar';

export default function SubjectsListPage() {
  const [searchParams] = useSearchParams();
  const course = searchParams.get('course') || '';
  const branch = searchParams.get('branch') || '';
  const semester = searchParams.get('semester') || '';

  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    fetch(
      `http://localhost:3000/subjects?course=${encodeURIComponent(course)}&branch=${encodeURIComponent(branch)}&semester=${encodeURIComponent(semester)}&format=json`,
      {
        headers: {
          Accept: 'application/json',
        },
      }
    )
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch subjects list.');
        return res.json();
      })
      .then((data) => {
        if (data.success) {
          setSubjects(data.subjects || []);
        } else {
          throw new Error(data.message || 'Error retrieving subjects.');
        }
      })
      .catch((err) => {
        console.error(err);
        setError(err.message);
      })
      .finally(() => setLoading(false));
  }, [course, branch, semester]);

  return (
    <div className="min-h-screen bg-[#020617] text-slate-50 flex flex-col justify-between selection:bg-indigo-500 selection:text-white relative overflow-x-hidden">
      {/* Ambient background glows */}
      <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-indigo-600/10 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-[500px] right-10 w-[400px] h-[300px] bg-cyan-500/10 rounded-full blur-3xl pointer-events-none -z-10" />

      <Navbar />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8">
        {/* Header Breadcrumb */}
        <div className="mb-8">
          <Link
            to="/"
            className="inline-flex items-center text-xs font-medium text-slate-400 hover:text-indigo-300 transition mb-4"
          >
            &larr; Back to Search
          </Link>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 mb-2">
                {course} &bull; {branch} &bull; Sem {semester}
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Available Subjects
              </h1>
            </div>

            <span className="text-xs text-slate-400 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl self-start sm:self-auto">
              {subjects.length} Subject{subjects.length === 1 ? '' : 's'} Found
            </span>
          </div>
        </div>

        {/* Content State */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-sm text-slate-400">Loading syllabus and subjects...</p>
          </div>
        ) : error ? (
          <div className="text-center py-16 bg-slate-900/40 border border-slate-800 rounded-2xl p-6">
            <p className="text-rose-400 text-sm font-semibold mb-2">Unable to load subjects</p>
            <p className="text-xs text-slate-400 mb-4">{error}</p>
            <Link
              to="/"
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-full border border-slate-700"
            >
              Try Another Selection
            </Link>
          </div>
        ) : subjects.length === 0 ? (
          <div className="text-center py-16 bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl p-6">
            <p className="text-slate-300 text-sm font-semibold mb-1">No subjects found</p>
            <p className="text-xs text-slate-500">
              No subjects have been indexed for {course} - {branch} (Semester {semester}) yet.
            </p>
          </div>
        ) : (
          /* Subject Cards Grid */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {subjects.map((sub) => {
              // Find the course code mapping for this branch
              const mapping =
                sub.branchMappings?.find((m) => m.branch === branch) ||
                sub.branchMappings?.[0];
              const code = mapping?.courseCode || sub.code || 'N/A';

              return (
                <Link
                  key={sub._id}
                  to={`/subjects/${encodeURIComponent(code)}/resources`}
                  className="group relative overflow-hidden bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/30 border border-slate-800 hover:border-indigo-500/50 rounded-2xl p-5 flex flex-col justify-between transition-all duration-200 shadow-lg hover:shadow-indigo-500/10"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                        {code}
                      </span>
                      <span className="text-[11px] text-slate-500">RGPV</span>
                    </div>

                    <h3 className="text-base font-bold text-white group-hover:text-indigo-300 transition line-clamp-2">
                      {sub.title || sub.name}
                    </h3>
                  </div>

                  <div className="mt-6 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-medium text-indigo-400 group-hover:text-indigo-300">
                    <span>View Notes & PYQs</span>
                    <span className="transition-transform group-hover:translate-x-1">&rarr;</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>

      <footer className="border-t border-slate-800/80 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span>&copy; {new Date().getFullYear()} CanReal &bull; Open Academic Archive</span>
          <span>Colours are not Real</span>
        </div>
      </footer>
    </div>
  );
}