// frontend/src/components/home/searchBox.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MagnifyingGlassIcon, ChevronDownIcon } from "@heroicons/react/16/solid";

export default function SearchBox() {
  const navigate = useNavigate();
  const [coursesData, setCoursesData] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedCourse, setSelectedCourse] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("");
  const [selectedSem, setSelectedSem] = useState("");

  useEffect(() => {
    fetch("http://localhost:3000/courses/public")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setCoursesData(data.courses);
        }
      })
      .catch((err) => console.error("Error fetching courses:", err))
      .finally(() => setLoading(false));
  }, []);

  const activeCourse = coursesData.find((c) => c.name === selectedCourse);
  const availableBranches = activeCourse ? activeCourse.branches : [];

  let availableSemesters = [];
  if (activeCourse) {
    if (selectedBranch === "COMMON") {
      availableSemesters = [1, 2];
    } else if (activeCourse.name === "B.Tech" && selectedBranch !== "") {
      availableSemesters = Array.from(
        { length: activeCourse.totalSemesters - 2 },
        (_, i) => i + 3
      );
    } else {
      availableSemesters = Array.from(
        { length: activeCourse.totalSemesters },
        (_, i) => i + 1
      );
    }
  }

  const handleCourseChange = (e) => {
    const courseName = e.target.value;
    setSelectedCourse(courseName);
    setSelectedSem("");
    const found = coursesData.find((c) => c.name === courseName);
    if (found && found.branches.length === 1) {
      setSelectedBranch(found.branches[0].code);
    } else {
      setSelectedBranch("");
    }
  };

  const handleBranchChange = (e) => {
    setSelectedBranch(e.target.value);
    setSelectedSem("");
  };

  const handleSearch = () => {
    if (!selectedCourse || !selectedBranch || !selectedSem) {
      alert("Please select Course, Branch, and Semester.");
      return;
    }
    navigate(
      `/subjects?course=${encodeURIComponent(selectedCourse)}&branch=${encodeURIComponent(selectedBranch)}&semester=${encodeURIComponent(selectedSem)}`
    );
  };

  return (
    <div className="w-full max-w-4xl px-4 my-8">
      {/* Search Container Card */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/40 border border-slate-700/80 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-44 h-44 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="text-center mb-6">
          <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
            Find Your Course Resources
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Choose your degree, department, and semester to filter papers instantly
          </p>
        </div>

        {/* 3 Dropdown Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 relative z-10">
          {/* 1. COURSE SELECT */}
          <div className="relative">
            <select
              value={selectedCourse}
              onChange={handleCourseChange}
              disabled={loading}
              className="w-full appearance-none cursor-pointer rounded-xl bg-slate-950/80 border border-slate-700 text-slate-100 text-sm font-medium py-3 pl-4 pr-10 hover:border-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition disabled:opacity-50"
            >
              <option value="" disabled className="bg-slate-950 text-slate-400">
                {loading ? "Loading..." : "1. Select Degree"}
              </option>
              {coursesData.map((c) => (
                <option key={c._id} value={c.name} className="bg-slate-900 text-slate-100">
                  {c.name}
                </option>
              ))}
            </select>
            <ChevronDownIcon className="absolute right-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
          </div>

          {/* 2. BRANCH SELECT */}
          <div className="relative">
            <select
              value={selectedBranch}
              onChange={handleBranchChange}
              disabled={!selectedCourse}
              className="w-full appearance-none cursor-pointer rounded-xl bg-slate-950/80 border border-slate-700 text-slate-100 text-sm font-medium py-3 pl-4 pr-10 hover:border-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <option value="" disabled className="bg-slate-950 text-slate-400">
                {selectedCourse ? "2. Select Branch" : "Pick Degree First"}
              </option>
              {availableBranches.map((b) => (
                <option key={b.code} value={b.code} className="bg-slate-900 text-slate-100">
                  {b.name} ({b.code})
                </option>
              ))}
            </select>
            <ChevronDownIcon className="absolute right-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
          </div>

          {/* 3. SEMESTER SELECT */}
          <div className="relative">
            <select
              value={selectedSem}
              onChange={(e) => setSelectedSem(e.target.value)}
              disabled={!selectedBranch}
              className="w-full appearance-none cursor-pointer rounded-xl bg-slate-950/80 border border-slate-700 text-slate-100 text-sm font-medium py-3 pl-4 pr-10 hover:border-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <option value="" disabled className="bg-slate-950 text-slate-400">
                {selectedBranch ? "3. Select Semester" : "Pick Branch First"}
              </option>
              {availableSemesters.map((num) => (
                <option key={num} value={num} className="bg-slate-900 text-slate-100">
                  Semester {num}
                </option>
              ))}
            </select>
            <ChevronDownIcon className="absolute right-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* SEARCH ACTION BUTTON */}
        <div className="mt-6 flex justify-center relative z-10">
          <button
            type="button"
            onClick={handleSearch}
            className="inline-flex items-center gap-2 rounded-full bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-600/30 transition cursor-pointer"
          >
            <span>Browse Available Materials</span>
            <MagnifyingGlassIcon className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}