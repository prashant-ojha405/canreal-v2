// frontend/src/pages/adminDashboard.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/common/navbar';
import ReportModal from '../components/common/ReportModal';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Tabs: 'uploads' | 'reports' | 'addResource' | 'invite' | 'curriculum' | 'faculty' | 'students'
  const [activeTab, setActiveTab] = useState('uploads');

  // Filter for Uploads: 'all' | 'admin' | 'teacher' | 'student'
  const [uploaderFilter, setUploaderFilter] = useState('all');

  // Drill-down User Drawer State
  const [inspectedUser, setInspectedUser] = useState(null);

  // Reporting Modal State
  const [reportingDoc, setReportingDoc] = useState(null);

  // ----------------------------------------------------
  // INVITE TOKEN GENERATOR STATES
  // ----------------------------------------------------
  const [inviteTargetRole, setInviteTargetRole] = useState('teacher');
  const [generatedToken, setGeneratedToken] = useState('');
  const [tokenStatus, setTokenStatus] = useState('');
  const [activeTokens, setActiveTokens] = useState([]);

  // ----------------------------------------------------
  // UPLOAD FORM STATES
  // ----------------------------------------------------
  const [coursesData, setCoursesData] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedSem, setSelectedSem] = useState('');
  const [availableSubjects, setAvailableSubjects] = useState([]);
  const [loadingSubjects, setLoadingSubjects] = useState(false);

  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadCategory, setUploadCategory] = useState('pyq');
  const [selectedSubjectCode, setSelectedSubjectCode] = useState('');
  const [uploadYear, setUploadYear] = useState('');
  const [sessionTerm, setSessionTerm] = useState('Winter');
  const [uploadFiles, setUploadFiles] = useState([]);
  const [uploadStatus, setUploadStatus] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Quota Modals
  const [conflictModalData, setConflictModalData] = useState(null);
  const [notesCapAlert, setNotesCapAlert] = useState(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const fileInputRef = useRef(null);

  // ----------------------------------------------------
  // CURRICULUM BUILDER STATES
  // ----------------------------------------------------
  const [newCourseName, setNewCourseName] = useState('');
  const [newCourseTotalSem, setNewCourseTotalSem] = useState(8);
  const [branchInputs, setBranchInputs] = useState([{ name: '', code: '' }]);
  const [subjectInputs, setSubjectInputs] = useState([
    { title: '', courseCode: '', branch: '', semester: 1 },
  ]);
  const [courseCreateStatus, setCourseCreateStatus] = useState('');
  const [isCreatingCourse, setIsCreatingCourse] = useState(false);

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

  // ----------------------------------------------------
  // DATA FETCHING
  // ----------------------------------------------------
  const fetchDashboardData = async () => {
    try {
      const res = await fetch('http://localhost:3000/dashboard/api/admin', {
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
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPublicCourses = () => {
    fetch('http://localhost:3000/courses/public')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setCoursesData(data.courses);
      })
      .catch((err) => console.error('Error fetching courses:', err));
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
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setAvailableSubjects(data.subjects || []);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoadingSubjects(false));
  }, [selectedCourse, selectedBranch, selectedSem]);

  // ----------------------------------------------------
  // INVITE CODE GENERATOR
  // ----------------------------------------------------
  const handleGenerateInviteToken = async () => {
    setTokenStatus('Generating secure 8-digit OTP...');
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
        setTokenStatus(`Single-use code for ${inviteTargetRole.toUpperCase()} ready.`);
        setActiveTokens((prev) => [
          { token: json.token, targetRole: inviteTargetRole, createdAt: new Date() },
          ...prev,
        ]);
      } else {
        setTokenStatus(json.message || 'Generation failed.');
      }
    } catch (err) {
      setTokenStatus('Server error.');
    }
  };

  // ----------------------------------------------------
  // UPLOAD HANDLER
  // ----------------------------------------------------
  const confirmAndExecuteUpload = async (forcedReplaceId = null) => {
    setIsPreviewOpen(false);
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
    uploadFiles.forEach((file) => formData.append('files', file));

    try {
      const res = await fetch('http://localhost:3000/documents/upload', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      const resData = await res.json();

      if (res.status === 409 && resData.conflict) {
        setConflictModalData(resData);
        setIsUploading(false);
        setUploadStatus('');
        return;
      }

      if (res.status === 409 && resData.quotaExceeded) {
        setNotesCapAlert(resData.message);
        setIsUploading(false);
        setUploadStatus('');
        return;
      }

      if (res.ok && resData.success) {
        setUploadStatus('Resource published successfully!');
        setUploadTitle('');
        setUploadYear('');
        setUploadFiles([]);
        setConflictModalData(null);
        fetchDashboardData();
      } else {
        setUploadStatus(resData.message || 'Upload failed.');
      }
    } catch (err) {
      setUploadStatus('Network error.');
    } finally {
      setIsUploading(false);
    }
  };

  // ----------------------------------------------------
  // REPORT RESOLUTION
  // ----------------------------------------------------
  const handleResolveReport = async (reportId, action) => {
    try {
      const res = await fetch(`http://localhost:3000/reports/${reportId}/resolve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action }),
      });
      const json = await res.json();
      if (res.ok && json.success) fetchDashboardData();
      else alert(json.message);
    } catch (err) {
      alert('Error updating report.');
    }
  };

  // ----------------------------------------------------
  // ADMINISTRATIVE CASCADE DELETIONS
  // ----------------------------------------------------
  const handleDeleteCourse = async (courseId, name) => {
    if (!window.confirm(`⚠️ DANGER: Delete course "${name}"? This removes all associated branches, subjects, and uploaded files permanently!`)) return;
    try {
      const res = await fetch(`http://localhost:3000/courses/admin/course/${courseId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        fetchPublicCourses();
        fetchDashboardData();
      } else alert(data.message);
    } catch (err) {
      alert('Deletion error.');
    }
  };

  const handleDeleteBranch = async (courseId, branchCode) => {
    if (!window.confirm(`Delete branch "${branchCode}" and unlink its subjects?`)) return;
    try {
      const res = await fetch(`http://localhost:3000/courses/admin/${courseId}/branch/${branchCode}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        fetchPublicCourses();
        fetchDashboardData();
      } else alert(data.message);
    } catch (err) {
      alert('Deletion error.');
    }
  };

  const handleDeleteDocument = async (docId, title) => {
    if (!window.confirm(`Delete "${title}" permanently?`)) return;
    try {
      const res = await fetch(`http://localhost:3000/documents/${docId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const resData = await res.json();
      if (res.ok && resData.success) fetchDashboardData();
      else alert(resData.message || 'Failed to delete.');
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveUser = async (userId, name, role) => {
    if (!window.confirm(`Delete ${role} "${name}" and all their uploads?`)) return;
    try {
      const res = await fetch(`http://localhost:3000/dashboard/users/${userId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const resData = await res.json();
      if (res.ok && resData.success) {
        if (inspectedUser?._id === userId) setInspectedUser(null);
        fetchDashboardData();
      } else alert(resData.message || 'Failed to remove user.');
    } catch (err) {
      console.error(err);
    }
  };

  // ----------------------------------------------------
  // CURRICULUM FORM ACTIONS
  // ----------------------------------------------------
  const handleAddBranchRow = () => setBranchInputs([...branchInputs, { name: '', code: '' }]);
  const handleRemoveBranchRow = (idx) =>
    setBranchInputs(branchInputs.filter((_, i) => i !== idx));

  const handleAddSubjectRow = () =>
    setSubjectInputs([
      ...subjectInputs,
      { title: '', courseCode: '', branch: branchInputs[0]?.code || '', semester: 1 },
    ]);
  const handleRemoveSubjectRow = (idx) =>
    setSubjectInputs(subjectInputs.filter((_, i) => i !== idx));

  const handleCreateCourseSubmit = async (e) => {
    e.preventDefault();
    setIsCreatingCourse(true);
    setCourseCreateStatus('Initializing course...');

    try {
      const res = await fetch('http://localhost:3000/courses/admin/complete-setup', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCourseName.trim(),
          totalSemesters: Number(newCourseTotalSem),
          branches: branchInputs.filter((b) => b.name && b.code),
          subjects: subjectInputs.filter((s) => s.title && s.courseCode && s.branch),
        }),
      });

      const resData = await res.json();
      if (res.ok && resData.success) {
        setCourseCreateStatus(resData.message);
        setNewCourseName('');
        setBranchInputs([{ name: '', code: '' }]);
        setSubjectInputs([{ title: '', courseCode: '', branch: '', semester: 1 }]);
        fetchPublicCourses();
        fetchDashboardData();
      } else {
        setCourseCreateStatus(resData.message || 'Failed to initialize course.');
      }
    } catch (err) {
      setCourseCreateStatus('Error creating course.');
    } finally {
      setIsCreatingCourse(false);
    }
  };

  const handleAddBranchToCourse = async (e) => {
    e.preventDefault();
    if (!targetCourseId || !newBranchName || !newBranchCode) return;
    setBranchAddStatus('Adding branch...');

    try {
      const res = await fetch(`http://localhost:3000/courses/admin/${targetCourseId}/branches`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newBranchName.trim(),
          code: newBranchCode.trim().toUpperCase(),
        }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setBranchAddStatus('Branch added!');
        setNewBranchName('');
        setNewBranchCode('');
        fetchPublicCourses();
      } else {
        setBranchAddStatus(json.message || 'Failed.');
      }
    } catch (err) {
      setBranchAddStatus('Network error.');
    }
  };

  const handleAddSubjectToBranch = async (e) => {
    e.preventDefault();
    setSubAddStatus('Adding subject...');

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
        setSubAddStatus(json.message);
        setSubTitle('');
        setSubCode('');
        fetchDashboardData();
      } else {
        setSubAddStatus(json.message || 'Failed.');
      }
    } catch (err) {
      setSubAddStatus('Network error.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020617] text-slate-50 flex flex-col justify-between">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-sm text-slate-400">Loading Control Center...</p>
        </div>
      </div>
    );
  }

  const {
    metrics = {},
    teachers = [],
    students = [],
    recentDocuments = [],
    pendingReports = [],
  } = data || {};

  const filteredDocuments = recentDocuments.filter((doc) => {
    const role = doc.uploadedBy?.role || 'admin';
    if (uploaderFilter === 'admin') return role === 'admin';
    if (uploaderFilter === 'teacher') return role === 'teacher';
    if (uploaderFilter === 'student') return role === 'student';
    return true;
  });

  return (
    <div className="min-h-screen bg-[#020617] text-slate-50 flex flex-col justify-between relative overflow-x-hidden selection:bg-indigo-500 selection:text-white">
      <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-indigo-600/10 rounded-full blur-3xl pointer-events-none -z-10" />

      <Navbar />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8">
        {/* Top Header Card */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/40 border border-slate-700/80 rounded-2xl p-6 mb-8 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full text-xs font-mono font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30 mb-2">
                SUPER ADMIN LEVEL
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                CanReal Administration Center
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                Oversee academic uploads, automated indexing, one-time invite tokens, and user audit lineage.
              </p>
            </div>
            <button
              onClick={() => {
                fetch('http://localhost:3000/auth/logout', { method: 'POST', credentials: 'include' });
                localStorage.removeItem('user');
                navigate('/login');
              }}
              className="px-4 py-2 bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 text-rose-300 text-xs font-semibold rounded-full transition cursor-pointer self-start sm:self-auto"
            >
              Sign Out
            </button>
          </div>

          {/* Metric Tiles */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-6 pt-6 border-t border-slate-800">
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 text-center">
              <span className="text-2xl font-black text-indigo-400">{metrics.totalTeachers || 0}</span>
              <p className="text-[11px] text-slate-400 mt-0.5 font-medium">Faculty Members</p>
            </div>
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 text-center">
              <span className="text-2xl font-black text-cyan-400">{metrics.totalStudents || 0}</span>
              <p className="text-[11px] text-slate-400 mt-0.5 font-medium">Student Admins</p>
            </div>
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 text-center">
              <span className="text-2xl font-black text-emerald-400">{metrics.totalDocuments || 0}</span>
              <p className="text-[11px] text-slate-400 mt-0.5 font-medium">Total Uploads</p>
            </div>
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 text-center">
              <span className="text-2xl font-black text-amber-400">{metrics.subjectsCovered || 0}</span>
              <p className="text-[11px] text-slate-400 mt-0.5 font-medium">Active Subjects</p>
            </div>
            <div className="bg-slate-950/60 border border-rose-500/30 rounded-xl p-3 text-center">
              <span className="text-2xl font-black text-rose-400">{metrics.pendingReportsCount || 0}</span>
              <p className="text-[11px] text-rose-300 mt-0.5 font-medium">Flagged Reports</p>
            </div>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-3 mb-6">
          <button
            onClick={() => setActiveTab('uploads')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
              activeTab === 'uploads' ? 'bg-indigo-600 text-white' : 'bg-slate-900 border border-slate-800 text-slate-400'
            }`}
          >
            Manage Uploads ({recentDocuments.length})
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
              activeTab === 'reports' ? 'bg-rose-600 text-white' : 'bg-slate-900 border border-slate-800 text-slate-400'
            }`}
          >
            🚩 Flagged Reports ({pendingReports.length})
          </button>
          <button
            onClick={() => setActiveTab('addResource')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
              activeTab === 'addResource' ? 'bg-indigo-600 text-white' : 'bg-slate-900 border border-slate-800 text-slate-400'
            }`}
          >
            + Add Resource
          </button>
          <button
            onClick={() => setActiveTab('invite')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
              activeTab === 'invite' ? 'bg-indigo-600 text-white' : 'bg-slate-900 border border-slate-800 text-slate-400'
            }`}
          >
            🔐 Invite Codes (OTP)
          </button>
          <button
            onClick={() => setActiveTab('curriculum')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
              activeTab === 'curriculum' ? 'bg-indigo-600 text-white' : 'bg-slate-900 border border-slate-800 text-slate-400'
            }`}
          >
            ⚙ Curriculum & Cascade Deletions
          </button>
          <button
            onClick={() => setActiveTab('faculty')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
              activeTab === 'faculty' ? 'bg-indigo-600 text-white' : 'bg-slate-900 border border-slate-800 text-slate-400'
            }`}
          >
            Teachers ({teachers.length})
          </button>
          <button
            onClick={() => setActiveTab('students')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
              activeTab === 'students' ? 'bg-indigo-600 text-white' : 'bg-slate-900 border border-slate-800 text-slate-400'
            }`}
          >
            Students ({students.length})
          </button>
        </div>

        {/* ======================================================== */}
        {/* TAB 1: UPLOADS TABLE (WITH REPORT BUTTON)                 */}
        {/* ======================================================== */}
        {activeTab === 'uploads' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
              <div>
                <h2 className="text-base font-bold text-white">Repository Uploads</h2>
                <p className="text-xs text-slate-400">All materials uploaded across the repository.</p>
              </div>

              <div className="inline-flex rounded-xl bg-slate-950 p-1 border border-slate-800 text-xs">
                {['all', 'admin', 'teacher', 'student'].map((f) => (
                  <button
                    key={f}
                    onClick={() => setUploaderFilter(f)}
                    className={`px-3 py-1 rounded-lg capitalize transition cursor-pointer ${
                      uploaderFilter === f ? 'bg-indigo-600 text-white font-semibold' : 'text-slate-400'
                    }`}
                  >
                    {f === 'admin' ? 'Admin (Me)' : f}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 text-slate-400 uppercase font-semibold border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Title</th>
                    <th className="py-3 px-4">Subject</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Contributor Badge</th>
                  
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  {filteredDocuments.map((doc) => {
                    const uploaderRole = doc.uploadedBy?.role;
                    return (
                      <tr key={doc._id} className="hover:bg-slate-800/40 transition">
                        <td className="py-3 px-4 font-medium text-white max-w-xs truncate">{doc.title}</td>
                        <td className="py-3 px-4 font-mono text-slate-400">
                          {doc.subject?.code || doc.subject?.branchMappings?.[0]?.courseCode || 'N/A'}
                        </td>
                        <td className="py-3 px-4">
                          <span className="uppercase text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 border border-slate-700">
                            {doc.category === 'unitwise' ? 'Unit-wise PYQ' : doc.category}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {uploaderRole === 'teacher' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                              ✓ Faculty Verified
                            </span>
                          ) : uploaderRole === 'student' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                              Student Contributor
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30">
                              Admin Verified
                            </span>
                          )}
                        </td>
                        
                        <td className="py-3 px-4 text-right">
                          <div className="inline-flex items-center gap-2">
                            <a
                              href={doc.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-lg border border-slate-700"
                            >
                              View
                            </a>
                            <button
                              onClick={() => handleDeleteDocument(doc._id, doc.title)}
                              className="px-2.5 py-1 bg-rose-600/20 hover:bg-rose-600/40 text-rose-300 border border-rose-500/30 text-xs rounded-lg cursor-pointer"
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
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: PENDING REPORTS TRIAGE                            */}
        {/* ======================================================== */}
        {activeTab === 'reports' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <h2 className="text-base font-bold text-white mb-1">Reported Academic Documents</h2>
            <p className="text-xs text-slate-400 mb-5">
              Review flagged resources reported by students or teachers for inaccuracy, blurriness, or errors.
            </p>

            {pendingReports.length === 0 ? (
              <div className="text-center py-10 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-2xl block mb-1">🎉</span>
                <p className="text-xs text-slate-400">Zero active document reports. All files verified!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingReports.map((rep) => (
                  <div key={rep._id} className="p-4 bg-slate-950 border border-rose-500/30 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                          {rep.reason}
                        </span>
                        <span className="text-xs text-white font-semibold">"{rep.document?.title || 'Unknown Title'}"</span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Uploaded by <strong className="text-slate-200">{rep.uploader?.name}</strong> ({rep.uploader?.role}) &bull; Notes: {rep.additionalDetails || 'None'}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <a
                        href={rep.document?.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-xl border border-slate-700"
                      >
                        Inspect PDF
                      </a>
                      <button
                        onClick={() => handleResolveReport(rep._id, 'dismissed')}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs rounded-xl cursor-pointer"
                      >
                        Dismiss
                      </button>
                      <button
                        onClick={() => {
                          if (rep.document?._id) {
                            handleDeleteDocument(rep.document._id, rep.document.title);
                            handleResolveReport(rep._id, 'resolved');
                          }
                        }}
                        className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs rounded-xl font-semibold cursor-pointer shadow-lg shadow-rose-600/30"
                      >
                        Delete File & Resolve
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 3: ADD RESOURCE                                      */}
        {/* ======================================================== */}
        {activeTab === 'addResource' && (
          <div className="max-w-3xl mx-auto bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl">
            <h2 className="text-lg font-bold text-white mb-1">Upload New Academic Resource</h2>
            <p className="text-xs text-slate-400 mb-6">
              Pick your course, branch, and semester to automatically choose from verified subjects.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!uploadTitle || !selectedSubjectCode || uploadFiles.length === 0) {
                  alert('Please fill all required fields and add at least one file.');
                  return;
                }
                setIsPreviewOpen(true);
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">
                  Document Title
                </label>
                <input
                  type="text"
                  required
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  placeholder="e.g. End Semester Exam Questions 2024"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">
                  Category
                </label>
                <select
                  value={uploadCategory}
                  onChange={(e) => setUploadCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                >
                  <option value="pyq">PYQ (Rolling 10-Paper Window)</option>
                  <option value="notes">Notes (Max 5 Limit)</option>
                  <option value="unitwise">Unit-wise PYQ (Max 1)</option>
                  <option value="syllabus">Syllabus (Max 1)</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">Course</label>
                  <select
                    value={selectedCourse}
                    onChange={(e) => {
                      setSelectedCourse(e.target.value);
                      setSelectedSem('');
                      const found = coursesData.find((c) => c.name === e.target.value);
                      if (found?.branches.length === 1) setSelectedBranch(found.branches[0].code);
                      else setSelectedBranch('');
                    }}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100"
                  >
                    <option value="" disabled>Select Course</option>
                    {coursesData.map((c) => (
                      <option key={c._id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">Branch</label>
                  <select
                    value={selectedBranch}
                    onChange={(e) => setSelectedBranch(e.target.value)}
                    disabled={!selectedCourse}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 disabled:opacity-40"
                  >
                    <option value="" disabled>Select Branch</option>
                    {availableBranches.map((b) => (
                      <option key={b.code} value={b.code}>{b.name} ({b.code})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">Semester</label>
                  <select
                    value={selectedSem}
                    onChange={(e) => setSelectedSem(e.target.value)}
                    disabled={!selectedBranch}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 disabled:opacity-40"
                  >
                    <option value="" disabled>Select Sem</option>
                    {availableSemesters.map((num) => (
                      <option key={num} value={num}>Sem {num}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">
                  Subject Name & Code
                </label>
                <select
                  required
                  value={selectedSubjectCode}
                  onChange={(e) => setSelectedSubjectCode(e.target.value)}
                  disabled={loadingSubjects || availableSubjects.length === 0}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-indigo-500 disabled:opacity-40"
                >
                  <option value="" disabled>
                    {loadingSubjects
                      ? 'Fetching course subjects...'
                      : availableSubjects.length > 0
                      ? 'Select Subject'
                      : 'Pick Course, Branch & Sem First'}
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">
                    Academic Year
                  </label>
                  <input
                    type="number"
                    min="2000"
                    max="2099"
                    value={uploadYear}
                    onChange={(e) => setUploadYear(e.target.value)}
                    placeholder="2025"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>

                {(uploadCategory === 'pyq' || uploadCategory === 'unitwise') && (
                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">
                      Session Term
                    </label>
                    <select
                      value={sessionTerm}
                      onChange={(e) => setSessionTerm(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                    >
                      <option value="Winter">Winter (Nov - Dec Session)</option>
                      <option value="Summer">Summer (May - June Session)</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="border border-dashed border-slate-700 rounded-2xl p-4 bg-slate-950/60">
                <input
                  type="file"
                  ref={fileInputRef}
                  multiple
                  accept=".pdf,image/*"
                  onChange={(e) => setUploadFiles(Array.from(e.target.files))}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current.click()}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 cursor-pointer"
                >
                  📁 Browse Files / PDF
                </button>

                {uploadFiles.length > 0 && (
                  <div className="mt-3 space-y-1.5">
                    <p className="text-[11px] text-slate-400 font-semibold uppercase">Queued Documents ({uploadFiles.length}):</p>
                    {uploadFiles.map((f, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
                        <span className="truncate max-w-xs text-slate-300">{f.name}</span>
                        <button
                          type="button"
                          onClick={() => setUploadFiles(uploadFiles.filter((_, i) => i !== idx))}
                          className="text-rose-400 ml-2"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-sm transition shadow-lg shadow-indigo-600/30 cursor-pointer"
              >
                Preview & Confirm Upload
              </button>

              {uploadStatus && (
                <p className="text-center text-xs font-medium text-indigo-400 mt-2">{uploadStatus}</p>
              )}
            </form>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 4: INVITE TOKEN GENERATOR                            */}
        {/* ======================================================== */}
        {activeTab === 'invite' && (
          <div className="max-w-2xl mx-auto bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl">
            <h2 className="text-lg font-bold text-white mb-1">Generate Single-Use Invite Token</h2>
            <p className="text-xs text-slate-400 mb-6">
              Create an 8-digit one-time invitation code to onboard a new teacher or student representative.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-3 mb-5">
              <select
                value={inviteTargetRole}
                onChange={(e) => setInviteTargetRole(e.target.value)}
                className="w-full sm:w-auto px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100"
              >
                <option value="teacher">Faculty / Teacher</option>
                <option value="student">Student Representative</option>
              </select>
              <button
                type="button"
                onClick={handleGenerateInviteToken}
                className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition cursor-pointer shadow-lg shadow-indigo-600/30"
              >
                Generate 8-Digit OTP
              </button>
            </div>

            {generatedToken && (
              <div className="p-5 bg-slate-950 border border-indigo-500/40 rounded-xl text-center mb-6">
                <span className="text-xs text-slate-400 uppercase tracking-wider block mb-1">
                  Active One-Time Passkey:
                </span>
                <span className="text-3xl font-mono font-black text-indigo-400 tracking-widest select-all">
                  {generatedToken}
                </span>
                <p className="text-[11px] text-slate-500 mt-2">
                  Share this 8-digit code. It expires permanently after registration.
                </p>
              </div>
            )}
            {tokenStatus && <p className="text-xs text-indigo-400 mb-4">{tokenStatus}</p>}

            <div className="pt-4 border-t border-slate-800">
              <h3 className="text-xs uppercase font-bold text-slate-400 mb-3">Recently Generated Active Codes:</h3>
              {activeTokens.length === 0 ? (
                <p className="text-xs text-slate-500">No active codes in this session.</p>
              ) : (
                <div className="space-y-2">
                  {activeTokens.map((t, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs">
                      <span className="font-mono text-indigo-300 font-bold tracking-wider text-sm">{t.token}</span>
                      <span className="uppercase text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">
                        {t.targetRole}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 5: CURRICULUM BUILDER & CASCADE DELETIONS            */}
        {/* ======================================================== */}
        {activeTab === 'curriculum' && (
          <div className="max-w-4xl mx-auto space-y-8">
            {/* Existing Courses & Cascade Deletion Controls */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl">
              <h2 className="text-lg font-bold text-white mb-2">Existing Degrees & Cascade Controls</h2>
              <p className="text-xs text-slate-400 mb-5">
                Manage degrees or safely remove entire programs and branch mappings with one click.
              </p>

              <div className="space-y-4">
                {coursesData.map((course) => (
                  <div key={course._id} className="p-4 bg-slate-950 border border-slate-800 rounded-xl">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
                      <div>
                        <h3 className="text-sm font-bold text-white">{course.name}</h3>
                        <span className="text-xs text-slate-400">{course.totalSemesters} Semesters</span>
                      </div>
                      <button
                        onClick={() => handleDeleteCourse(course._id, course.name)}
                        className="px-3 py-1 bg-rose-600/20 hover:bg-rose-600/40 text-rose-300 border border-rose-500/30 rounded-lg text-xs cursor-pointer"
                      >
                        Delete Degree & All Linked Files
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {course.branches.map((b) => (
                        <div key={b.code} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-900 border border-slate-700 rounded-lg text-xs">
                          <span className="font-mono text-slate-200">{b.name} ({b.code})</span>
                          <button
                            onClick={() => handleDeleteBranch(course._id, b.code)}
                            className="text-rose-400 hover:text-rose-300 font-bold ml-1 cursor-pointer"
                            title="Remove branch"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Initialize New Course Form */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl">
              <h2 className="text-lg font-bold text-white mb-1">Initialize New Course / Degree</h2>
              <form onSubmit={handleCreateCourseSubmit} className="space-y-6 mt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-950/60 border border-slate-800 p-4 rounded-xl">
                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">Course Name</label>
                    <input
                      type="text"
                      required
                      value={newCourseName}
                      onChange={(e) => setNewCourseName(e.target.value)}
                      placeholder="e.g. M.Tech, B.Sc"
                      className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-300 mb-1">Total Semesters</label>
                    <input
                      type="number"
                      min="1"
                      max="12"
                      required
                      value={newCourseTotalSem}
                      onChange={(e) => setNewCourseTotalSem(e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-100 font-mono"
                    />
                  </div>
                </div>

                <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-xs font-semibold uppercase text-slate-300">Branches</label>
                    <button
                      type="button"
                      onClick={handleAddBranchRow}
                      className="text-xs text-indigo-400 font-medium cursor-pointer"
                    >
                      + Add Branch
                    </button>
                  </div>
                  <div className="space-y-2">
                    {branchInputs.map((b, idx) => (
                      <div key={idx} className="flex gap-2">
                        <input
                          type="text"
                          required
                          placeholder="Name (e.g. Mechanical)"
                          value={b.name}
                          onChange={(e) => {
                            const up = [...branchInputs];
                            up[idx].name = e.target.value;
                            setBranchInputs(up);
                          }}
                          className="flex-1 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-100"
                        />
                        <input
                          type="text"
                          required
                          placeholder="Code (e.g. ME)"
                          value={b.code}
                          onChange={(e) => {
                            const up = [...branchInputs];
                            up[idx].code = e.target.value.toUpperCase();
                            setBranchInputs(up);
                          }}
                          className="w-28 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono uppercase text-slate-100"
                        />
                        {branchInputs.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveBranchRow(idx)}
                            className="text-rose-400 px-2 cursor-pointer"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isCreatingCourse}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-sm transition cursor-pointer"
                >
                  {isCreatingCourse ? 'Setting Up...' : 'Initialize New Degree'}
                </button>
                {courseCreateStatus && <p className="text-center text-xs text-indigo-400">{courseCreateStatus}</p>}
              </form>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 6: FACULTY DIRECTORY (AUDIT PROFILE DRILL-DOWN)       */}
        {/* ======================================================== */}
        {activeTab === 'faculty' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <h2 className="text-base font-bold text-white mb-4">Faculty Directory (Click to Audit)</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 text-slate-400 uppercase font-semibold border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Faculty Member</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4">Phone</th>
                    <th className="py-3 px-4">Uploads</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  {teachers.map((t) => (
                    <tr
                      key={t._id}
                      onClick={() => setInspectedUser(t)}
                      className="hover:bg-slate-800/40 cursor-pointer transition"
                    >
                      <td className="py-3 px-4 font-semibold text-white flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-800 flex items-center justify-center text-xs shrink-0">
                          {t.avatarUrl ? <img src={t.avatarUrl} alt="" className="w-full h-full object-cover" /> : t.name?.charAt(0)}
                        </div>
                        {t.name}
                      </td>
                      <td className="py-3 px-4 font-mono">{t.email}</td>
                      <td className="py-3 px-4 font-mono">{t.mobileNumber || 'N/A'}</td>
                      <td className="py-3 px-4">{t.uploadCount || 0} files</td>
                      <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleRemoveUser(t._id, t.name, 'Teacher')}
                          className="px-3 py-1 bg-rose-600/20 text-rose-300 border border-rose-500/30 rounded-lg text-xs cursor-pointer"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 7: STUDENTS DIRECTORY (AUDIT PROFILE DRILL-DOWN)      */}
        {/* ======================================================== */}
        {activeTab === 'students' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <h2 className="text-base font-bold text-white mb-4">Student Administration (Click to Audit)</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 text-slate-400 uppercase font-semibold border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Student Member</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4">Admission Year</th>
                    <th className="py-3 px-4">Added By</th>
                    <th className="py-3 px-4">Uploads</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  {students.map((s) => (
                    <tr
                      key={s._id}
                      onClick={() => setInspectedUser(s)}
                      className="hover:bg-slate-800/40 cursor-pointer transition"
                    >
                      <td className="py-3 px-4 font-semibold text-white flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-800 flex items-center justify-center text-xs shrink-0">
                          {s.avatarUrl ? <img src={s.avatarUrl} alt="" className="w-full h-full object-cover" /> : s.name?.charAt(0)}
                        </div>
                        {s.name}
                      </td>
                      <td className="py-3 px-4 font-mono">{s.email}</td>
                      <td className="py-3 px-4 font-mono">{s.admissionYear || 'N/A'}</td>
                      <td className="py-3 px-4 text-slate-400">{s.addedBy?.name || 'Admin'}</td>
                      <td className="py-3 px-4">{s.uploadCount || 0} files</td>
                      <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleRemoveUser(s._id, s.name, 'Student')}
                          className="px-3 py-1 bg-rose-600/20 text-rose-300 border border-rose-500/30 rounded-lg text-xs cursor-pointer"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* ======================================================== */}
      {/* SUPER ADMIN DRILL-DOWN USER DRAWER / MODAL               */}
      {/* ======================================================== */}
      {inspectedUser && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-full overflow-hidden bg-slate-950 border border-slate-700 flex items-center justify-center text-lg font-bold shrink-0">
                  {inspectedUser.avatarUrl ? (
                    <img src={inspectedUser.avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    inspectedUser.name?.charAt(0)
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">{inspectedUser.name}</h3>
                  <span className="uppercase text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    {inspectedUser.role}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setInspectedUser(null)}
                className="text-slate-400 hover:text-slate-200 text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 py-4 text-xs border-b border-slate-800">
              <div>
                <span className="text-slate-500 uppercase block font-semibold">Email:</span>
                <span className="text-slate-200 font-mono">{inspectedUser.email}</span>
              </div>
              <div>
                <span className="text-slate-500 uppercase block font-semibold">Mobile:</span>
                <span className="text-slate-200 font-mono">{inspectedUser.mobileNumber || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-500 uppercase block font-semibold">Onboarded By:</span>
                <span className="text-slate-200">{inspectedUser.addedBy?.name || 'Direct / Master Key'}</span>
              </div>
              <div>
                <span className="text-slate-500 uppercase block font-semibold">Total Documents:</span>
                <span className="text-indigo-400 font-bold">{inspectedUser.uploadCount || 0}</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto pt-4">
              <h4 className="text-xs uppercase font-bold text-slate-400 mb-3">All Uploaded Files:</h4>
              {inspectedUser.uploads?.length === 0 ? (
                <p className="text-xs text-slate-500">No documents uploaded by this user.</p>
              ) : (
                <div className="space-y-2">
                  {inspectedUser.uploads?.map((doc) => (
                    <div key={doc._id} className="flex items-center justify-between p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs">
                      <div>
                        <strong className="text-white">{doc.title}</strong>
                        <span className="text-slate-500 ml-2 font-mono">({doc.subject?.code})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <a
                          href={doc.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded text-[11px]"
                        >
                          View
                        </a>
                        <button
                          onClick={() => handleDeleteDocument(doc._id, doc.title)}
                          className="px-2 py-0.5 bg-rose-600/20 text-rose-300 border border-rose-500/30 rounded text-[11px] cursor-pointer"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* REPORTING MODAL */}
      {reportingDoc && (
        <ReportModal
          document={reportingDoc}
          onClose={() => setReportingDoc(null)}
          onReportSuccess={() => {
            alert('Report submitted successfully! The contributor has been notified.');
            fetchDashboardData();
          }}
        />
      )}

      {/* REPLACEMENT & CAP MODALS */}
      {conflictModalData && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-2">Active Document Already Exists</h3>
            <p className="text-xs text-slate-300 mb-4">{conflictModalData.message}</p>
            <div className="flex flex-col gap-2 pt-2 border-t border-slate-800">
              <a
                href={conflictModalData.existingDocUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2 bg-slate-800 text-indigo-300 text-xs font-semibold rounded-xl text-center"
              >
                👁 Preview Existing PDF
              </a>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setConflictModalData(null)}
                  className="flex-1 py-2 bg-slate-800 text-slate-300 text-xs font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const id = conflictModalData.existingDocId;
                    setConflictModalData(null);
                    confirmAndExecuteUpload(id);
                  }}
                  className="flex-1 py-2 bg-rose-600 text-white text-xs font-semibold rounded-xl"
                >
                  Delete & Replace
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {notesCapAlert && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-500/50 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-2">Upload Limit Reached</h3>
            <p className="text-xs text-slate-300 mb-4">{notesCapAlert}</p>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setNotesCapAlert(null)}
                className="px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-xl"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}