// frontend/src/pages/studentDashboard.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/common/navbar';

export default function StudentDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Tabs: 'myUploads' | 'addResource' | 'reports' | 'peers'
  const [activeTab, setActiveTab] = useState('myUploads');

  // Hierarchy Data for Uploads
  const [coursesData, setCoursesData] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedSem, setSelectedSem] = useState('');
  const [availableSubjects, setAvailableSubjects] = useState([]);
  const [loadingSubjects, setLoadingSubjects] = useState(false);

  // Upload Form States
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadCategory, setUploadCategory] = useState('notes');
  const [selectedSubjectCode, setSelectedSubjectCode] = useState('');
  const [uploadYear, setUploadYear] = useState('');
  const [sessionTerm, setSessionTerm] = useState('Winter');
  const [uploadFiles, setUploadFiles] = useState([]);
  const [uploadStatus, setUploadStatus] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Quota & Replacement Modal States
  const [conflictModalData, setConflictModalData] = useState(null);
  const [notesCapAlert, setNotesCapAlert] = useState(null);

  const fetchDashboardData = async () => {
    try {
      const res = await fetch('http://localhost:3000/dashboard/api/student', {
        credentials: 'include',
        headers: { Accept: 'application/json' },
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setData(json.data);
      } else {
        alert(json.message || 'Unauthorized');
        navigate('/login');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPublicCourses = () => {
    fetch('http://localhost:3000/courses/public')
      .then((r) => r.json())
      .then((d) => d.success && setCoursesData(d.courses));
  };

  useEffect(() => {
    fetchDashboardData();
    fetchPublicCourses();
  }, []);

  const activeCourse = coursesData.find((c) => c.name === selectedCourse);
  const availableBranches = activeCourse ? activeCourse.branches : [];
  let availableSemesters = [];
  if (activeCourse) {
    if (selectedBranch === 'COMMON') {
      availableSemesters = [1, 2];
    } else if (activeCourse.name === 'B.Tech' && selectedBranch !== '') {
      availableSemesters = Array.from({ length: activeCourse.totalSemesters - 2 }, (_, i) => i + 3);
    } else {
      availableSemesters = Array.from({ length: activeCourse.totalSemesters }, (_, i) => i + 1);
    }
  }

  useEffect(() => {
    if (!selectedCourse || !selectedBranch || !selectedSem) {
      setAvailableSubjects([]);
      setSelectedSubjectCode('');
      return;
    }
    setLoadingSubjects(true);
    fetch(
      `http://localhost:3000/subjects?course=${encodeURIComponent(selectedCourse)}&branch=${encodeURIComponent(selectedBranch)}&semester=${encodeURIComponent(selectedSem)}&format=json`,
      { headers: { Accept: 'application/json' } }
    )
      .then((r) => r.json())
      .then((d) => d.success && setAvailableSubjects(d.subjects || []))
      .finally(() => setLoadingSubjects(false));
  }, [selectedCourse, selectedBranch, selectedSem]);

  const handleUploadSubmit = async (e, forcedReplaceId = null) => {
    if (e && e.preventDefault) e.preventDefault();

    if (!uploadTitle || !selectedSubjectCode || uploadFiles.length === 0) {
      alert('Please fill all fields and attach at least one file.');
      return;
    }

    setIsUploading(true);
    setUploadStatus('Uploading resource...');

    const formData = new FormData();
    formData.append('title', uploadTitle.trim());
    formData.append('category', uploadCategory);
    formData.append('subjectCode', selectedSubjectCode.trim());
    if (uploadYear) formData.append('academicYear', uploadYear);
    if (uploadCategory === 'pyq' || uploadCategory === 'unitwise') {
      formData.append('sessionTerm', sessionTerm);
    }
    if (forcedReplaceId) {
      formData.append('replaceExistingId', forcedReplaceId);
    }
    uploadFiles.forEach((f) => formData.append('files', f));

    try {
      const res = await fetch('http://localhost:3000/documents/upload', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      const json = await res.json();

      if (res.status === 409 && json.conflict) {
        setConflictModalData(json);
        setIsUploading(false);
        setUploadStatus('');
        return;
      }

      if (res.status === 409 && json.quotaExceeded) {
        setNotesCapAlert(json.message);
        setIsUploading(false);
        setUploadStatus('');
        return;
      }

      if (res.ok && json.success) {
        setUploadStatus('Uploaded successfully!');
        setUploadTitle('');
        setUploadFiles([]);
        setConflictModalData(null);
        fetchDashboardData();
      } else {
        setUploadStatus(json.message || 'Upload failed.');
      }
    } catch (err) {
      setUploadStatus('Network error.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteDoc = async (docId, title) => {
    if (!confirm(`Delete "${title}"?`)) return;
    try {
      const res = await fetch(`http://localhost:3000/documents/${docId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const json = await res.json();
      if (res.ok && json.success) fetchDashboardData();
      else alert(json.message);
    } catch (err) {
      alert('Network error.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020617] text-slate-50 flex flex-col justify-between">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-sm text-slate-400">Loading Student Dashboard...</p>
        </div>
      </div>
    );
  }

  const { profile = {}, myUploads = [], notifications = [], peers = [] } = data || {};
  const addedByTeacher = profile.addedBy;

  return (
    <div className="min-h-screen bg-[#020617] text-slate-50 flex flex-col justify-between relative overflow-x-hidden selection:bg-indigo-500 selection:text-white">
      <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-indigo-600/10 rounded-full blur-3xl pointer-events-none -z-10" />

      <Navbar />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8">
        {/* Profile Card & Onboarding Lineage */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/40 border border-slate-700/80 rounded-2xl p-6 mb-8 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-indigo-500/50 bg-slate-950 flex items-center justify-center text-xl font-bold text-white shrink-0">
              {profile.avatarUrl ? (
                <img src={profile.avatarUrl} alt={profile.name} className="w-full h-full object-cover" />
              ) : (
                profile.name?.charAt(0) || 'S'
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full uppercase">
                  Student Contributor
                </span>
                {profile.currentYear && (
                  <span className="text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700 px-2 py-0.5 rounded-full">
                    Year {profile.currentYear}
                  </span>
                )}
              </div>
              <h1 className="text-2xl font-extrabold text-white mt-1">{profile.name}</h1>
              <p className="text-xs text-slate-400 font-mono">{profile.email}</p>
            </div>
          </div>

          {/* Onboarded by Faculty Mentor Box */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 sm:p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-800 border border-indigo-500/30 flex items-center justify-center text-xs font-bold text-indigo-300 shrink-0">
              {addedByTeacher?.avatarUrl ? (
                <img src={addedByTeacher.avatarUrl} alt={addedByTeacher.name} className="w-full h-full object-cover" />
              ) : (
                addedByTeacher?.name?.charAt(0) || '🎓'
              )}
            </div>
            <div>
              <span className="text-[10px] uppercase font-semibold text-slate-500 block">
                Onboarded & Verified By:
              </span>
              <p className="text-xs font-bold text-slate-200">
                {addedByTeacher ? addedByTeacher.name : 'System Administrator'}
              </p>
              <span className="text-[10px] text-slate-400 font-mono block">
                {addedByTeacher ? addedByTeacher.email : 'Master Token'}
              </span>
            </div>
          </div>

          <button
            onClick={() => {
              fetch('http://localhost:3000/auth/logout', { method: 'POST', credentials: 'include' });
              localStorage.removeItem('user');
              window.location.href = '/login';
            }}
            className="px-4 py-2 bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 text-rose-300 text-xs font-semibold rounded-full transition self-start md:self-center cursor-pointer"
          >
            Sign Out
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-3 mb-6">
          <button
            onClick={() => setActiveTab('myUploads')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
              activeTab === 'myUploads' ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-slate-400'
            }`}
          >
            My Uploads ({myUploads.length})
          </button>
          <button
            onClick={() => setActiveTab('addResource')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
              activeTab === 'addResource' ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-slate-400'
            }`}
          >
            + Upload Resource
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
              activeTab === 'reports' ? 'bg-rose-600 text-white' : 'bg-slate-900 text-slate-400'
            }`}
          >
            🚩 Flagged Reports ({notifications.length})
          </button>
          <button
            onClick={() => setActiveTab('peers')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
              activeTab === 'peers' ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-slate-400'
            }`}
          >
            👥 Peer Students ({peers.length})
          </button>
        </div>

        {/* TAB 1: MY UPLOADS */}
        {activeTab === 'myUploads' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <h2 className="text-base font-bold text-white mb-1">Your Published Study Materials</h2>
            <p className="text-xs text-slate-400 mb-4">
              Resources you contributed to CanReal. You can delete or replace them at any time.
            </p>

            {myUploads.length === 0 ? (
              <p className="text-xs text-slate-500">You haven't uploaded any documents yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/80 text-slate-400 uppercase font-semibold border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Title</th>
                      <th className="py-3 px-4">Subject</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    {myUploads.map((d) => {
                      const subjectTitle = d.subject?.title || d.subject?.name || 'Subject';
                      const subjectCode =
                        d.subject?.code || d.subject?.branchMappings?.[0]?.courseCode || 'N/A';
                      return (
                        <tr key={d._id}>
                          <td className="py-3 px-4 text-white font-medium max-w-xs truncate">{d.title}</td>
                          <td className="py-3 px-4">
                            <span className="text-slate-200">{subjectTitle}</span>{' '}
                            <span className="font-mono text-slate-400">({subjectCode})</span>
                          </td>
                          <td className="py-3 px-4 uppercase text-[10px] font-bold">
                            <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700">
                              {d.category === 'unitwise' ? 'Unit-wise PYQ' : d.category}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="inline-flex items-center gap-2">
                              <a
                                href={d.fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg"
                              >
                                View
                              </a>
                              <button
                                onClick={() => handleDeleteDoc(d._id, d.title)}
                                className="px-2.5 py-1 bg-rose-600/20 text-rose-300 border border-rose-500/30 rounded-lg text-xs cursor-pointer"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: UPLOAD RESOURCE */}
        {activeTab === 'addResource' && (
          <div className="max-w-3xl mx-auto bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <h2 className="text-base font-bold text-white mb-1">Contribute Resource</h2>
            <p className="text-xs text-slate-400 mb-5">
              Upload PDF documents or photo scans. Images are automatically auto-rotated, compressed, and converted into a multi-page PDF.
            </p>

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              <div>
                <label className="block text-xs uppercase text-slate-300 mb-1">Document Title</label>
                <input
                  type="text"
                  required
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  placeholder="e.g. Unit 2 Tree Traversal Handwritten Notes"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs uppercase text-slate-300 mb-1">Category</label>
                  <select
                    value={uploadCategory}
                    onChange={(e) => setUploadCategory(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100"
                  >
                    <option value="notes">Notes (Max 5/Subject)</option>
                    <option value="pyq">Full PYQ (Rolling 10 Window)</option>
                    <option value="unitwise">Unit-wise PYQ (Max 1)</option>
                    <option value="syllabus">Syllabus (Max 1)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs uppercase text-slate-300 mb-1">Session Term</label>
                  <select
                    value={sessionTerm}
                    onChange={(e) => setSessionTerm(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100"
                  >
                    <option value="Winter">Winter Session</option>
                    <option value="Summer">Summer Session</option>
                  </select>
                </div>
              </div>

              {/* Hierarchy Selectors */}
              <div className="grid grid-cols-3 gap-3">
                <select
                  value={selectedCourse}
                  onChange={(e) => setSelectedCourse(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100"
                >
                  <option value="" disabled>Course</option>
                  {coursesData.map((c) => (
                    <option key={c._id} value={c.name}>{c.name}</option>
                  ))}
                </select>

                <select
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                  disabled={!selectedCourse}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 disabled:opacity-40"
                >
                  <option value="" disabled>Branch</option>
                  {availableBranches.map((b) => (
                    <option key={b.code} value={b.code}>{b.code}</option>
                  ))}
                </select>

                <select
                  value={selectedSem}
                  onChange={(e) => setSelectedSem(e.target.value)}
                  disabled={!selectedBranch}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 disabled:opacity-40"
                >
                  <option value="" disabled>Sem</option>
                  {availableSemesters.map((num) => (
                    <option key={num} value={num}>Sem {num}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs uppercase text-slate-300 mb-1">Subject</label>
                <select
                  required
                  value={selectedSubjectCode}
                  onChange={(e) => setSelectedSubjectCode(e.target.value)}
                  disabled={loadingSubjects || availableSubjects.length === 0}
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-100 disabled:opacity-40"
                >
                  <option value="" disabled>
                    {loadingSubjects ? 'Loading subjects...' : 'Pick Subject'}
                  </option>
                  {availableSubjects.map((sub) => {
                    const code =
                      sub.branchMappings?.find((m) => m.branch === selectedBranch)?.courseCode ||
                      sub.code ||
                      'N/A';
                    return (
                      <option key={sub._id} value={code}>
                        {sub.title || sub.name} ({code})
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block text-xs uppercase text-slate-300 mb-1">Academic Year</label>
                <input
                  type="number"
                  min="2000"
                  max="2099"
                  value={uploadYear}
                  onChange={(e) => setUploadYear(e.target.value)}
                  placeholder="2025"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-100 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs uppercase text-slate-300 mb-1">Attach Files / Images</label>
                <input
                  type="file"
                  multiple
                  accept=".pdf,image/*"
                  onChange={(e) => setUploadFiles(Array.from(e.target.files))}
                  className="w-full text-xs text-slate-400 file:py-2 file:px-4 file:bg-slate-800 file:text-white file:border-0 file:rounded-xl file:mr-3 cursor-pointer"
                />
              </div>

              <button
                type="submit"
                disabled={isUploading}
                className="w-full py-3 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-500 transition cursor-pointer disabled:opacity-50"
              >
                {isUploading ? 'Compressing & Publishing...' : 'Publish Resource'}
              </button>
              {uploadStatus && <p className="text-center text-xs text-indigo-400 mt-2">{uploadStatus}</p>}
            </form>
          </div>
        )}

        {/* TAB 3: NOTIFICATIONS & REPORT ISSUES */}
        {activeTab === 'reports' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <h2 className="text-base font-bold text-white mb-1">Reports on Your Uploads</h2>
            <p className="text-xs text-slate-400 mb-4">
              Issues flagged by other students or teachers regarding readability or accuracy of your files.
            </p>

            {notifications.length === 0 ? (
              <div className="text-center py-8 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-2xl block mb-1">✨</span>
                <p className="text-xs text-slate-400">No active reports. All your materials are verified!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {notifications.map((rep) => (
                  <div key={rep._id} className="p-4 bg-slate-950 border border-rose-500/30 rounded-xl flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] uppercase font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                          {rep.reason}
                        </span>
                        <strong className="text-xs text-white">"{rep.document?.title}"</strong>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Details: {rep.additionalDetails || 'No additional note provided.'}
                      </p>
                    </div>

                    <a
                      href={rep.document?.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-lg"
                    >
                      Inspect File
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: PEER CONTRIBUTIONS */}
        {activeTab === 'peers' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <h2 className="text-base font-bold text-white mb-1">Fellow Student Contributors</h2>
            <p className="text-xs text-slate-400 mb-5">
              Explore resources uploaded by other authorized students across university batches.
            </p>

            {peers.length === 0 ? (
              <p className="text-xs text-slate-500">No other student contributors yet.</p>
            ) : (
              <div className="space-y-4">
                {peers.map((peer) => (
                  <div key={peer._id} className="p-4 bg-slate-950 border border-slate-800 rounded-xl">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full overflow-hidden bg-slate-800 flex items-center justify-center text-xs font-bold text-white shrink-0">
                          {peer.avatarUrl ? (
                            <img src={peer.avatarUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            peer.name?.charAt(0)
                          )}
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-white">{peer.name}</h3>
                          <span className="text-[11px] text-slate-400 font-mono">
                            Admitted: {peer.admissionYear || 'N/A'}
                          </span>
                        </div>
                      </div>
                      <span className="text-xs text-slate-400 font-medium">
                        {peer.documents?.length || 0} uploads
                      </span>
                    </div>

                    {peer.documents?.length > 0 ? (
                      <div className="space-y-1.5">
                        {peer.documents.map((doc) => (
                          <div key={doc._id} className="flex items-center justify-between text-xs p-2 bg-slate-900 rounded-lg">
                            <span className="text-slate-300 font-medium">{doc.title}</span>
                            <a
                              href={doc.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-indigo-400 hover:text-indigo-300 font-medium"
                            >
                              View PDF &rarr;
                            </a>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-600">No documents uploaded yet.</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* UNIT-WISE PYQ & SYLLABUS REPLACEMENT MODAL */}
      {conflictModalData && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center gap-2 mb-2 text-amber-400">
              <span className="text-xl">⚠️</span>
              <h3 className="text-base font-bold text-white">Active Document Already Exists</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              {conflictModalData.message}
            </p>

            <div className="flex flex-col gap-2 pt-2 border-t border-slate-800">
              <a
                href={conflictModalData.existingDocUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-indigo-300 hover:text-indigo-200 text-xs font-semibold rounded-xl text-center border border-slate-700 transition"
              >
                👁 Preview Existing PDF
              </a>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setConflictModalData(null)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const replaceId = conflictModalData.existingDocId;
                    setConflictModalData(null);
                    handleUploadSubmit(null, replaceId);
                  }}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-xl transition cursor-pointer shadow-lg shadow-rose-600/30"
                >
                  Delete & Replace
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* NOTES CAP (5 LIMIT) MODAL */}
      {notesCapAlert && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-500/50 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center gap-2 mb-2 text-rose-400">
              <span className="text-xl">⛔</span>
              <h3 className="text-base font-bold text-white">Upload Limit Reached</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed mb-4">{notesCapAlert}</p>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setNotesCapAlert(null)}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition cursor-pointer shadow-lg shadow-indigo-600/30"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="border-t border-slate-800/80 py-4 text-center text-xs text-slate-500">
        CanReal &bull; Student Contributor Dashboard
      </footer>
    </div>
  );
}