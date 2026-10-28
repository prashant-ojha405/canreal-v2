// frontend/src/pages/teacherDashboard.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/common/navbar';

export default function TeacherDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Tabs: 'myUploads' | 'addResource' | 'invite' | 'myPeople' | 'curriculum'
  const [activeTab, setActiveTab] = useState('myUploads');

  // Hierarchy Data for Uploads & Curriculum
  const [coursesData, setCoursesData] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedSem, setSelectedSem] = useState('');
  const [availableSubjects, setAvailableSubjects] = useState([]);
  const [loadingSubjects, setLoadingSubjects] = useState(false);

  // Upload Form States
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadCategory, setUploadCategory] = useState('pyq');
  const [selectedSubjectCode, setSelectedSubjectCode] = useState('');
  const [uploadYear, setUploadYear] = useState('');
  const [sessionTerm, setSessionTerm] = useState('Winter');
  const [uploadFiles, setUploadFiles] = useState([]);
  const [uploadStatus, setUploadStatus] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Quota & Replacement Modal States
  const [conflictModalData, setConflictModalData] = useState(null); // { message, existingDocUrl, existingDocId, category }
  const [notesCapAlert, setNotesCapAlert] = useState(null);

  // Invite Token Generation States
  const [inviteTargetRole, setInviteTargetRole] = useState('student');
  const [generatedToken, setGeneratedToken] = useState('');
  const [tokenStatus, setTokenStatus] = useState('');

  // Curriculum States (Branch / Subject addition)
  const [targetCourseId, setTargetCourseId] = useState('');
  const [newBranchName, setNewBranchName] = useState('');
  const [newBranchCode, setNewBranchCode] = useState('');
  const [branchAddStatus, setBranchAddStatus] = useState('');

  const [subCourseName, setSubCourseName] = useState('');
  const [subBranchCode, setSubBranchCode] = useState('');
  const [subSemester, setSubSemester] = useState(1);
  const [subTitle, setSubTitle] = useState('');
  const [subCode, setSubCode] = useState('');
  const [subAddStatus, setSubAddStatus] = useState('');

  const fetchDashboardData = async () => {
    try {
      const res = await fetch('http://localhost:3000/dashboard/api/teacher', {
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

  // Compute branches and semesters for upload selector
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

  // Generate Single-Use 8-Digit Invite Token
  const handleGenerateToken = async () => {
    setTokenStatus('Generating token...');
    try {
      const res = await fetch('http://localhost:3000/auth/generate-invite-token', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetRole: inviteTargetRole }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setGeneratedToken(json.token);
        setTokenStatus(`Single-use OTP for ${inviteTargetRole.toUpperCase()} ready.`);
        fetchDashboardData();
      } else {
        setTokenStatus(json.message || 'Generation failed.');
      }
    } catch (err) {
      setTokenStatus('Server error.');
    }
  };

  // Upload Submission Handler with Quota Conflict Handling
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

      // Case 1: Unit-wise PYQ or Syllabus Conflict (1 already exists)
      if (res.status === 409 && json.conflict) {
        setConflictModalData(json);
        setIsUploading(false);
        setUploadStatus('');
        return;
      }

      // Case 2: Notes Hard Cap (5 already exist)
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
        setUploadStatus(json.error || json.message || 'Upload failed.');
      }
    } catch (err) {
      setUploadStatus('Network error.');
    } finally {
      setIsUploading(false);
    }
  };

  // Scoped Deletion
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

  // Add Branch to Existing Course
  const handleAddBranch = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`http://localhost:3000/courses/admin/${targetCourseId}/branches`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newBranchName.trim(), code: newBranchCode.trim().toUpperCase() }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setBranchAddStatus('Branch added!');
        setNewBranchName('');
        setNewBranchCode('');
        fetchPublicCourses();
      } else setBranchAddStatus(json.message);
    } catch (err) {
      setBranchAddStatus('Error adding branch.');
    }
  };

  // Add Subject to Existing Branch
  const handleAddSubject = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:3000/courses/admin/subject', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseName: subCourseName,
          branchCode: subBranchCode,
          semester: Number(subSemester),
          title: subTitle.trim(),
          courseCode: subCode.trim().toUpperCase(),
        }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setSubAddStatus('Subject added!');
        setSubTitle('');
        setSubCode('');
      } else setSubAddStatus(json.message);
    } catch (err) {
      setSubAddStatus('Error adding subject.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020617] text-slate-50 flex flex-col justify-between">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-sm text-slate-400">Loading Faculty Dashboard...</p>
        </div>
      </div>
    );
  }

  const { profile = {}, activeTokens = [], peopleAdded = [], myUploads = [] } = data || {};

  return (
    <div className="min-h-screen bg-[#020617] text-slate-50 flex flex-col justify-between relative overflow-x-hidden selection:bg-indigo-500 selection:text-white">
      <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-indigo-600/10 rounded-full blur-3xl pointer-events-none -z-10" />

      <Navbar />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8">
        {/* Header Profile Card */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/40 border border-slate-700/80 rounded-2xl p-6 mb-8 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-indigo-500/50 bg-slate-950 flex items-center justify-center text-xl font-bold text-white shrink-0">
              {profile.avatarUrl ? (
                <img src={profile.avatarUrl} alt={profile.name} className="w-full h-full object-cover" />
              ) : (
                profile.name?.charAt(0) || 'F'
              )}
            </div>
            <div>
              <span className="text-[10px] font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full uppercase">
                Faculty Member
              </span>
              <h1 className="text-2xl font-extrabold text-white mt-1">{profile.name}</h1>
              <p className="text-xs text-slate-400 font-mono">{profile.email}</p>
            </div>
          </div>
          <button
            onClick={() => {
              fetch('http://localhost:3000/auth/logout', { method: 'POST', credentials: 'include' });
              localStorage.removeItem('user');
              navigate('/login');
            }}
            className="px-4 py-2 bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 text-rose-300 text-xs font-semibold rounded-full transition self-start sm:self-auto cursor-pointer"
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
            onClick={() => setActiveTab('invite')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
              activeTab === 'invite' ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-slate-400'
            }`}
          >
            🔐 Invite Tokens ({activeTokens.length} Active)
          </button>
          <button
            onClick={() => setActiveTab('myPeople')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
              activeTab === 'myPeople' ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-slate-400'
            }`}
          >
            👥 People You Added ({peopleAdded.length})
          </button>
          <button
            onClick={() => setActiveTab('curriculum')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
              activeTab === 'curriculum' ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-slate-400'
            }`}
          >
            📚 Branch & Subject Setup
          </button>
        </div>

        {/* TAB 1: MY UPLOADS */}
        {activeTab === 'myUploads' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <h2 className="text-base font-bold text-white mb-4">Your Published Materials</h2>
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
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    {myUploads.map((d) => (
                      <tr key={d._id}>
                        <td className="py-3 px-4 text-white font-medium">{d.title}</td>
                        <td className="py-3 px-4 font-mono">{d.subject?.branchMappings?.[0]?.courseCode || 'N/A'}</td>
                        <td className="py-3 px-4 uppercase">{d.category}</td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleDeleteDoc(d._id, d.title)}
                            className="px-2.5 py-1 bg-rose-600/20 text-rose-300 border border-rose-500/30 rounded-lg text-xs cursor-pointer"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: UPLOAD RESOURCE */}
        {activeTab === 'addResource' && (
          <div className="max-w-3xl mx-auto bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <h2 className="text-base font-bold text-white mb-4">Publish Subject Resource</h2>
            <form onSubmit={handleUploadSubmit} className="space-y-4">
              <div>
                <label className="block text-xs uppercase text-slate-300 mb-1">Document Title</label>
                <input
                  type="text"
                  required
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  placeholder="e.g. Unit 3 Dynamic Programming Notes"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-100"
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
                    <option value="pyq">PYQ (Rolling 10 Window)</option>
                    <option value="notes">Notes (Max 5)</option>
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
                {isUploading ? 'Uploading...' : 'Publish Resource'}
              </button>
              {uploadStatus && <p className="text-center text-xs text-indigo-400 mt-2">{uploadStatus}</p>}
            </form>
          </div>
        )}

        {/* TAB 3: INVITE TOKEN GENERATOR */}
        {activeTab === 'invite' && (
          <div className="max-w-2xl mx-auto bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <h2 className="text-base font-bold text-white mb-1">Generate Single-Use Invite Code</h2>
            <p className="text-xs text-slate-400 mb-4">
              Create an 8-digit OTP passkey to securely register a new student representative or teacher without leaking permanent passwords.
            </p>

            <div className="flex gap-3 mb-4">
              <select
                value={inviteTargetRole}
                onChange={(e) => setInviteTargetRole(e.target.value)}
                className="px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100"
              >
                <option value="student">Student Representative</option>
                <option value="teacher">Teacher / Colleague</option>
              </select>
              <button
                type="button"
                onClick={handleGenerateToken}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                Generate 8-Digit Code
              </button>
            </div>

            {generatedToken && (
              <div className="p-4 bg-slate-950 border border-indigo-500/40 rounded-xl text-center mb-4">
                <span className="text-xs text-slate-400 uppercase tracking-wider block mb-1">
                  Active One-Time Passkey:
                </span>
                <span className="text-3xl font-mono font-black text-indigo-400 tracking-widest select-all">
                  {generatedToken}
                </span>
                <p className="text-[11px] text-slate-500 mt-1">
                  Share this code with the user. It will expire permanently after one registration.
                </p>
              </div>
            )}
            {tokenStatus && <p className="text-xs text-indigo-400">{tokenStatus}</p>}

            {/* List of Active Tokens */}
            <div className="mt-6 pt-4 border-t border-slate-800">
              <h3 className="text-xs uppercase font-bold text-slate-400 mb-2">Unused Active Codes:</h3>
              {activeTokens.length === 0 ? (
                <p className="text-xs text-slate-500">No active codes pending.</p>
              ) : (
                <div className="space-y-2">
                  {activeTokens.map((t) => (
                    <div key={t._id} className="flex items-center justify-between p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs">
                      <span className="font-mono text-indigo-300 font-bold tracking-wider">{t.token}</span>
                      <span className="uppercase text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-300">{t.targetRole}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: PEOPLE YOU ADDED & SCOPED MODERATION */}
        {activeTab === 'myPeople' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <h2 className="text-base font-bold text-white mb-1">People Added by Your Passkeys</h2>
            <p className="text-xs text-slate-400 mb-5">
              You can monitor and delete materials uploaded by your directly onboarded student representatives.
            </p>

            {peopleAdded.length === 0 ? (
              <p className="text-xs text-slate-500">You haven't onboarded any students or teachers yet.</p>
            ) : (
              <div className="space-y-6">
                {peopleAdded.map((person) => (
                  <div key={person._id} className="p-4 bg-slate-950 border border-slate-800 rounded-xl">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-800 flex items-center justify-center text-sm font-bold text-white shrink-0">
                          {person.avatarUrl ? (
                            <img src={person.avatarUrl} alt={person.name} className="w-full h-full object-cover" />
                          ) : (
                            person.name?.charAt(0)
                          )}
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-white">{person.name}</h3>
                          <span className="text-[11px] text-slate-400 font-mono">{person.email} &bull; {person.mobileNumber}</span>
                        </div>
                      </div>
                      <span className="uppercase text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                        {person.role}
                      </span>
                    </div>

                    {/* Their Uploads */}
                    <div>
                      <h4 className="text-[11px] uppercase font-bold text-slate-400 mb-2">Their Uploaded Documents:</h4>
                      {person.uploads?.length === 0 ? (
                        <p className="text-xs text-slate-600">No documents uploaded by this user yet.</p>
                      ) : (
                        <div className="space-y-1.5">
                          {person.uploads?.map((doc) => (
                            <div key={doc._id} className="flex items-center justify-between p-2 bg-slate-900 border border-slate-800/80 rounded-lg text-xs">
                              <div>
                                <strong className="text-slate-200">{doc.title}</strong>
                                <span className="text-slate-500 ml-2 font-mono">({doc.subject?.code})</span>
                              </div>
                              <button
                                onClick={() => handleDeleteDoc(doc._id, doc.title)}
                                className="px-2 py-0.5 bg-rose-600/20 text-rose-300 border border-rose-500/30 rounded text-[11px] cursor-pointer"
                              >
                                Delete
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 5: CURRICULUM SETUP (ATTACH BRANCH / SUBJECT) */}
        {activeTab === 'curriculum' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
              <h3 className="text-sm font-bold text-white mb-1">Add Branch to Existing Course</h3>
              <form onSubmit={handleAddBranch} className="space-y-3 mt-3">
                <select
                  required
                  value={targetCourseId}
                  onChange={(e) => setTargetCourseId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100"
                >
                  <option value="" disabled>Select Target Course</option>
                  {coursesData.map((c) => (
                    <option key={c._id} value={c._id}>{c.name}</option>
                  ))}
                </select>
                <input
                  type="text"
                  required
                  placeholder="Branch Name (e.g. Chemical Engineering)"
                  value={newBranchName}
                  onChange={(e) => setNewBranchName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100"
                />
                <input
                  type="text"
                  required
                  placeholder="Branch Code (e.g. CM)"
                  value={newBranchCode}
                  onChange={(e) => setNewBranchCode(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono uppercase text-slate-100"
                />
                <button type="submit" className="w-full py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold cursor-pointer">
                  Add Branch
                </button>
                {branchAddStatus && <p className="text-xs text-indigo-400 mt-1">{branchAddStatus}</p>}
              </form>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
              <h3 className="text-sm font-bold text-white mb-1">Add Subject to Existing Branch</h3>
              <form onSubmit={handleAddSubject} className="space-y-3 mt-3">
                <div className="grid grid-cols-2 gap-2">
                  <select
                    required
                    value={subCourseName}
                    onChange={(e) => {
                      setSubCourseName(e.target.value);
                      setSubBranchCode('');
                    }}
                    className="w-full px-2.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100"
                  >
                    <option value="" disabled>Course</option>
                    {coursesData.map((c) => (
                      <option key={c._id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                  <select
                    required
                    disabled={!subCourseName}
                    value={subBranchCode}
                    onChange={(e) => setSubBranchCode(e.target.value)}
                    className="w-full px-2.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100"
                  >
                    <option value="" disabled>Branch</option>
                    {coursesData.find((c) => c.name === subCourseName)?.branches.map((b) => (
                      <option key={b.code} value={b.code}>{b.code}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    min="1"
                    max="12"
                    value={subSemester}
                    onChange={(e) => setSubSemester(e.target.value)}
                    className="w-full px-2.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100"
                  />
                  <input
                    type="text"
                    required
                    placeholder="Code (e.g. CS-501)"
                    value={subCode}
                    onChange={(e) => setSubCode(e.target.value.toUpperCase())}
                    className="w-full px-2.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono uppercase text-slate-100"
                  />
                </div>
                <input
                  type="text"
                  required
                  placeholder="Subject Title (e.g. Theory of Computation)"
                  value={subTitle}
                  onChange={(e) => setSubTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100"
                />
                <button type="submit" className="w-full py-2 bg-cyan-600 text-white rounded-xl text-xs font-semibold cursor-pointer">
                  Add Subject
                </button>
                {subAddStatus && <p className="text-xs text-cyan-400 mt-1">{subAddStatus}</p>}
              </form>
            </div>
          </div>
        )}
      </main>

      {/* ======================================================== */}
      {/* 1. UNIT-WISE PYQ & SYLLABUS CONFLICT & REPLACE MODAL     */}
      {/* ======================================================== */}
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
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-indigo-300 hover:text-indigo-200 text-xs font-semibold rounded-xl text-center border border-slate-700 transition flex items-center justify-center gap-2"
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

      {/* ======================================================== */}
      {/* 2. NOTES HARD CAP MODAL (MAX 5 ALREADY EXIST)             */}
      {/* ======================================================== */}
      {notesCapAlert && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-500/50 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center gap-2 mb-2 text-rose-400">
              <span className="text-xl">⛔</span>
              <h3 className="text-base font-bold text-white">Upload Limit Reached</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              {notesCapAlert}
            </p>
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
        CanReal &bull; Faculty Dashboard
      </footer>
    </div>
  );
}