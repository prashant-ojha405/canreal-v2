// frontend/src/App.jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomePage from './pages/home';
import LoginForm from './pages/login';
import RegistrationForm from './pages/registration';
import SubjectsListPage from './pages/subjectsList';
import SubjectResources from './pages/subjectResources';
import AdminDashboard from './pages/adminDashboard'; 
import TeacherDashboard from './pages/teacherDashboard';
import StudentDashboard from './pages/studentDashboard';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginForm />} />
        <Route path="/register" element={<RegistrationForm />} />
        <Route path="/subjects" element={<SubjectsListPage />} />
        <Route path="/subjects/:courseCode/resources" element={<SubjectResources />} />
        <Route path="/dashboard/admin" element={<AdminDashboard />} />
        <Route path="/dashboard/teacher" element={<TeacherDashboard />} />
        <Route path="/dashboard/student" element={<StudentDashboard />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;