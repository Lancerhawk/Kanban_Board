import React, { useState, useEffect, createContext, useContext, useRef } from 'react';
import axios from 'axios';
import './App.css';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import logo from './assets/logoicon.png';
import debounce from 'lodash.debounce';
import CustomSelect from './Components/CustomSelect';
import CalendarPage from './Components/CalendarPage';
import FeatureModal from './Components/FeatureModal';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || window.location.origin;
const API = `${BACKEND_URL}/api`;

const AuthContext = createContext();

const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchUser();
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchUser = async () => {
    try {
      const response = await axios.get(`${API}/auth/me`);
      setUser(response.data);
    } catch (error) {
      console.error('Failed to fetch user:', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const response = await axios.post(`${API}/auth/login`, { email, password });
      const { access_token, user: userData } = response.data;
      
      setToken(access_token);
      setUser(userData);
      localStorage.setItem('token', access_token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Login failed' 
      };
    }
  };

  const register = async (name, email, password) => {
    try {
      const response = await axios.post(`${API}/auth/register`, { name, email, password });
      const { access_token, user: userData } = response.data;
      
      setToken(access_token);
      setUser(userData);
      localStorage.setItem('token', access_token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Registration failed' 
      };
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading, token }}>
      {children}
    </AuthContext.Provider>
  );
};

const AuthForm = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const [touched, setTouched] = useState({ password: false, confirmPassword: false });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [otpStep, setOtpStep] = useState(0); 
  const [otpToken, setOtpToken] = useState('');
  const [otp, setOtp] = useState('');

  const passwordRules = [
    {
      label: 'At least 8 characters',
      test: (pw) => pw.length >= 8,
    },
    {
      label: 'One capital letter',
      test: (pw) => /[A-Z]/.test(pw),
    },
    {
      label: 'One or more numbers',
      test: (pw) => /[0-9]/.test(pw),
    },
    {
      label: 'Four or more lowercase letters',
      test: (pw) => (pw.match(/[a-z]/g) || []).length >= 4,
    },
  ];

  const passwordValid = passwordRules.every(rule => rule.test(formData.password));
  const passwordsMatch = formData.password === formData.confirmPassword;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!isLogin) {
      if (!passwordValid) {
        setError('Password does not meet requirements.');
        setLoading(false);
        return;
      }
      if (!passwordsMatch) {
        setError('Passwords do not match.');
        setLoading(false);
        return;
      }
      try {
        const res = await axios.post(`${API}/auth/register-request-otp`, {
          name: formData.name,
          email: formData.email,
          password: formData.password
        });
        setOtpToken(res.data.otp_token);
        setOtpStep(1);
        setError('');
      } catch (err) {
        setError(err.response?.data?.detail || 'Registration failed');
      }
      setLoading(false);
      return;
    }

    const result = await login(formData.email, formData.password);
    if (!result.success) {
      setError(result.error);
    }
    setLoading(false);
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await axios.post(`${API}/auth/register-verify-otp`, {
        email: formData.email,
        otp,
        otp_token: otpToken
      });
      const { access_token, user: userData } = res.data;
      localStorage.setItem('token', access_token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      window.location.reload(); 
    } catch (err) {
      setError(err.response?.data?.detail || 'OTP verification failed');
    }
    setLoading(false);
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleBlur = (e) => {
    setTouched({ ...touched, [e.target.name]: true });
  };

  const [showForgot, setShowForgot] = useState(false);

  if (showForgot) {
    return <ForgotPassword onBackToLogin={() => setShowForgot(false)} />;
  }

  if (otpStep === 1) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 min-h-90 max-h-[35rem] overflow-y-auto">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center">
              <img src={logo} alt="logo" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Verify Email</h2>
            <p className="text-gray-600">Enter the OTP sent to your email address</p>
          </div>
          <form onSubmit={handleOtpSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">OTP</label>
              <input
                type="text"
                required
                value={otp}
                onChange={e => setOtp(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition duration-200"
                placeholder="Enter the OTP"
              />
              <p className="text-xs text-gray-500 mt-2">Didn't get the email? Please check your <span className='font-semibold'>Spam</span> or <span className='font-semibold'>Promotions</span> folder in Gmail.</p>
            </div>
            {error && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm">{error}</div>}
            <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 text-white py-3 px-4 rounded-xl font-medium hover:from-purple-600 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition duration-200 disabled:opacity-50">{loading ? 'Please wait...' : 'Verify OTP & Create Account'}</button>
            <button type="button" onClick={() => { setOtpStep(0); setOtp(''); setOtpToken(''); }} className="w-full text-blue-600 hover:text-black-700 font-medium p-2 no-gradient">Back</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 min-h-90 max-h-[40rem] overflow-y-auto">
        <div className="text-center mb-8">
        <div className="w-16 h-16  rounded-full mx-auto mb-4 flex items-center justify-center">
<img src={logo} />
</div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </h2>
          <p className="text-gray-600">
            {isLogin ? 'Sign in to access your tasks' : 'Join us to manage your tasks'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
              <input
                type="text"
                name="name"
                required={!isLogin}
                value={formData.name}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition duration-200"
                placeholder="Enter your name"
              />
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
            <input
              type="email"
              name="email"
              required
              value={formData.email}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition duration-200"
              placeholder="Enter your email"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                required
                value={formData.password}
                onChange={handleChange}
                onBlur={handleBlur}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition duration-200 pr-12"
                placeholder="Enter your password"
                autoComplete="new-password"
              />
              <button
                type="button"
                tabIndex={-1}
                className="absolute right-3 top-4 text-gray-400 hover:text-gray-700 focus:outline-none"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-5.523 0-10-4.477-10-10 0-1.657.402-3.22 1.125-4.575m2.1-2.1A9.956 9.956 0 0112 3c5.523 0 10 4.477 10 10 0 1.657-.402 3.22-1.125 4.575m-2.1 2.1A9.956 9.956 0 0112 21c-5.523 0-10-4.477-10-10 0-1.657.402-3.22 1.125-4.575" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-5.523 0-10-4.477-10-10 0-1.657.402-3.22 1.125-4.575m2.1-2.1A9.956 9.956 0 0112 3c5.523 0 10 4.477 10 10 0 1.657-.402 3.22-1.125 4.575m-2.1 2.1A9.956 9.956 0 0112 21c-5.523 0-10-4.477-10-10 0-1.657.402-3.22 1.125-4.575" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18" /></svg>
                )}
              </button>
            </div>
            {!isLogin && (touched.password || formData.password) && (
              <ul className="mt-2 space-y-1 text-sm">
                {passwordRules.map((rule, idx) => (
                  <li key={idx} className="flex items-center gap-2">
                    <span className={rule.test(formData.password) ? 'text-green-600' : 'text-gray-400'}>
                      {rule.test(formData.password) ? (
                        <svg className="inline w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                      ) : (
                        <svg className="inline w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      )}
                    </span>
                    <span className={rule.test(formData.password) ? 'text-gray-800' : 'text-gray-500'}>{rule.label}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Confirm Password</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition duration-200 pr-12"
                  placeholder="Re-enter your password"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  className="absolute right-3 top-4 text-gray-400 hover:text-gray-700 focus:outline-none"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-5.523 0-10-4.477-10-10 0-1.657.402-3.22 1.125-4.575m2.1-2.1A9.956 9.956 0 0112 3c5.523 0 10 4.477 10 10 0 1.657-.402 3.22-1.125 4.575m-2.1 2.1A9.956 9.956 0 0112 21c-5.523 0-10-4.477-10-10 0-1.657.402-3.22 1.125-4.575" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-5.523 0-10-4.477-10-10 0-1.657.402-3.22 1.125-4.575m2.1-2.1A9.956 9.956 0 0112 3c5.523 0 10 4.477 10 10 0 1.657-.402 3.22-1.125 4.575m-2.1 2.1A9.956 9.956 0 0112 21c-5.523 0-10-4.477-10-10 0-1.657.402-3.22 1.125-4.575" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18" /></svg>
                  )}
                </button>
              </div>
              {touched.confirmPassword && formData.confirmPassword && !passwordsMatch && (
                <div className="text-red-600 text-xs mt-1">Passwords do not match</div>
              )}
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || (!isLogin && (!passwordValid || !passwordsMatch))}
            className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 text-white py-3 px-4 rounded-xl font-medium hover:from-purple-600 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition duration-200 disabled:opacity-50"
          >
            {loading ? 'Please wait...' : (isLogin ? 'Sign In' : 'Create Account')}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => { setIsLogin(!isLogin); setError(''); setFormData({ name: '', email: '', password: '', confirmPassword: '' }); setTouched({ password: false, confirmPassword: false }); }}
            className="text-blue-600 hover:text-black-700 font-medium p-2 no-gradient"
          >
            {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
          </button>
          {isLogin && (
            <button
              type="button"
              onClick={() => setShowForgot(true)}
              className="text-purple-600 hover:text-black-700 font-medium p-2 no-gradient block w-full"
            >
              Forgot Password?
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const App = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="App modern-cozy-bg">
      {!user ? <AuthForm /> : <Dashboard />}
      <FeatureModal />
    </div>
  );
};

const Dashboard = () => {
  const [currentView, setCurrentView] = useState('dashboard');
  const [stats, setStats] = useState({});
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [statsRes, projectsRes, tasksRes] = await Promise.all([
        axios.get(`${API}/dashboard/stats`),
        axios.get(`${API}/projects`),
        axios.get(`${API}/tasks`)
      ]);
      
      setStats(statsRes.data);
      setProjects(projectsRes.data);
      setTasks(tasksRes.data);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    }
  };

  const renderContent = () => {
    switch (currentView) {
      case 'tasks':
        return <TaskManager tasks={tasks} setTasks={setTasks} fetchDashboardData={fetchDashboardData} />;
      case 'projects':
        return <ProjectManager projects={projects} setProjects={setProjects} fetchDashboardData={fetchDashboardData} />;
      case 'collaboration':
        return <Collaboration setCurrentView={setCurrentView} />;
      case 'notifications':
        return <Notifications setCurrentView={setCurrentView} />;
      case 'calendar':
        return <CalendarPage />;
      default:
        return <DashboardHome stats={stats} projects={projects} tasks={tasks} setCurrentView={setCurrentView} />;
    }
  };

  useEffect(() => {
    if (!sidebarOpen) return;
    const handleClick = (e) => {
      if (e.target.closest('.mobile-sidebar') || e.target.closest('.burger-btn')) return;
      setSidebarOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [sidebarOpen]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">TaskFlow</h1>
            </div>
            <nav className="hidden lg:flex items-center ml-16">
              <a
                href="#"
                onClick={e => { e.preventDefault(); setCurrentView('dashboard'); }}
                className={`nav-item${currentView === 'dashboard' ? ' nav-item-active' : ' nav-item-inactive'}`}
                aria-current={currentView === 'dashboard' ? 'page' : undefined}
              >
                Dashboard
              </a>
              <a
                href="#"
                onClick={e => { e.preventDefault(); setCurrentView('tasks'); }}
                className={`nav-item${currentView === 'tasks' ? ' nav-item-active' : ' nav-item-inactive'}`}
                aria-current={currentView === 'tasks' ? 'page' : undefined}
              >
                Tasks
              </a>
              <a
                href="#"
                onClick={e => { e.preventDefault(); setCurrentView('projects'); }}
                className={`nav-item${currentView === 'projects' ? ' nav-item-active' : ' nav-item-inactive'}`}
                aria-current={currentView === 'projects' ? 'page' : undefined}
              >
                Projects
              </a>
              <a
                href="#"
                onClick={e => { e.preventDefault(); setCurrentView('collaboration'); }}
                className={`nav-item${currentView === 'collaboration' ? ' nav-item-active' : ' nav-item-inactive'}`}
                aria-current={currentView === 'collaboration' ? 'page' : undefined}
              >
                Collaboration
              </a>
              <a
                href="#"
                onClick={e => { e.preventDefault(); setCurrentView('notifications'); }}
                className={`nav-item${currentView === 'notifications' ? ' nav-item-active' : ' nav-item-inactive'}`}
                aria-current={currentView === 'notifications' ? 'page' : undefined}
              >
                Notifications
              </a>
              <a
                href="#"
                onClick={e => { e.preventDefault(); setCurrentView('calendar'); }}
                className={`nav-item${currentView === 'calendar' ? ' nav-item-active' : ' nav-item-inactive'}`}
                aria-current={currentView === 'calendar' ? 'page' : undefined}
              >
                Calendar
              </a>
            </nav>
            <div className="hidden lg:flex items-center space-x-4">
              <span className="text-gray-700">Hi, {user.name}</span>
              <button
                onClick={logout}
                className="navbar-logout-btn"
                title="Logout"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
            <button
              className="lg:hidden burger-btn p-2 rounded focus:outline-none focus:ring-2 focus:ring-purple-400"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open navigation menu"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </header>
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black bg-opacity-30 transition-opacity"></div>
          <aside className="mobile-sidebar ml-auto w-64 max-w-full h-full bg-white shadow-xl p-6 flex flex-col animate-slide-in">
            <div className="flex flex-col flex-1 min-h-0">
              <div className="flex items-center justify-between mb-8">
                <span className="font-bold text-lg text-gray-900">Hi, {user.name}</span>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-2 rounded hover:bg-gray-100 focus:outline-none"
                  aria-label="Close navigation menu"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <nav className="flex flex-col gap-2 mb-8">
                <a
                  href="#"
                  onClick={e => { e.preventDefault(); setCurrentView('dashboard'); setSidebarOpen(false); }}
                  className={`nav-item${currentView === 'dashboard' ? ' nav-item-active' : ' nav-item-inactive'}`}
                  aria-current={currentView === 'dashboard' ? 'page' : undefined}
                >
                  Dashboard
                </a>
                <a
                  href="#"
                  onClick={e => { e.preventDefault(); setCurrentView('tasks'); setSidebarOpen(false); }}
                  className={`nav-item${currentView === 'tasks' ? ' nav-item-active' : ' nav-item-inactive'}`}
                  aria-current={currentView === 'tasks' ? 'page' : undefined}
                >
                  Tasks
                </a>
                <a
                  href="#"
                  onClick={e => { e.preventDefault(); setCurrentView('projects'); setSidebarOpen(false); }}
                  className={`nav-item${currentView === 'projects' ? ' nav-item-active' : ' nav-item-inactive'}`}
                  aria-current={currentView === 'projects' ? 'page' : undefined}
                >
                  Projects
                </a>
                <a
                  href="#"
                  onClick={e => { e.preventDefault(); setCurrentView('collaboration'); setSidebarOpen(false); }}
                  className={`nav-item${currentView === 'collaboration' ? ' nav-item-active' : ' nav-item-inactive'}`}
                  aria-current={currentView === 'collaboration' ? 'page' : undefined}
                >
                  Collaboration
                </a>
                <a
                  href="#"
                  onClick={e => { e.preventDefault(); setCurrentView('notifications'); setSidebarOpen(false); }}
                  className={`nav-item${currentView === 'notifications' ? ' nav-item-active' : ' nav-item-inactive'}`}
                  aria-current={currentView === 'notifications' ? 'page' : undefined}
                >
                  Notifications
                </a>
                <a
                  href="#"
                  onClick={e => { e.preventDefault(); setCurrentView('calendar'); setSidebarOpen(false); }}
                  className={`nav-item${currentView === 'calendar' ? ' nav-item-active' : ' nav-item-inactive'}`}
                  aria-current={currentView === 'calendar' ? 'page' : undefined}
                >
                  Calendar
                </a>
              </nav>
              <div className="flex-1"></div>
              <button
                onClick={() => { logout(); setSidebarOpen(false); }}
                className="navbar-logout-btn w-full justify-center mt-4"
                title="Logout"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Logout
              </button>
            </div>
          </aside>
        </div>
      )}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderContent()}
      </main>
    </div>
  );
};

const DashboardInfoCard = ({ title, icon, count, onOpenModal }) => {
  return (
    <div className="bg-white shadow-lg rounded-2xl p-6 flex flex-col items-center justify-center text-center h-48">
      <div className="flex items-center mb-3">
        <span className="mr-2 text-lg">{icon}</span>
        <span className="font-bold text-lg text-neutral-900">{title}</span>
      </div>
      <div className="text-4xl font-bold text-blue-500 flex-grow flex items-center">{count}</div>
      <button
        onClick={onOpenModal}
        className="mt-auto bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition duration-200"
      >
        View Details
      </button>
    </div>
  );
};

const DetailsModal = ({ isOpen, onClose, title, data, columns }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-bold text-gray-900">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition duration-200">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="overflow-x-auto max-h-[60vh]">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-neutral-500 text-xs font-semibold bg-gray-50">
                {columns.map((col, index) => (
                  <th key={index} className="px-4 py-2 text-left">{col.header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.length > 0 ? data.map((item, rowIndex) => (
                <tr key={rowIndex} className="hover:bg-neutral-100 transition group border-b">
                  {columns.map((col, colIndex) => (
                    <td key={colIndex} className="px-4 py-3 text-neutral-900">
                      {col.accessor(item)}
                    </td>
                  ))}
                </tr>
              )) : (
                <tr>
                  <td colSpan={columns.length} className="text-center py-8 text-gray-500">No data available.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const DashboardHome = ({ stats, projects, tasks, setCurrentView }) => {
  const [modalData, setModalData] = useState({ isOpen: false, title: '', data: [], columns: [] });
  const today = new Date();
  const productivityScore = stats.total_tasks > 0 ? Math.round((stats.completed_tasks / stats.total_tasks) * 100) : 0;
  const completedThisWeek = tasks.filter(task => task.status === 'done' && new Date(task.updated_at) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length;
  const highPriorityTasks = tasks.filter(task => task.priority === 'high' && task.status !== 'done');
  const activeProjects = projects.filter(p => tasks.some(t => t.project_id === p.id && t.status !== 'done')).length;
  const recentTasks = [...tasks].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5);
  const upcomingDeadlines = tasks.filter(task => task.status !== 'done' && task.due_date && new Date(task.due_date) >= today && new Date(task.due_date) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)).sort((a, b) => new Date(a.due_date) - new Date(b.due_date));
  const overdueTasks = tasks.filter(task => task.status !== 'done' && task.due_date && new Date(task.due_date) < today);
  const projectStats = projects.map(p => ({
    ...p,
    completed: tasks.filter(t => t.project_id === p.id && t.status === 'done' && new Date(t.updated_at) >= new Date(Date.now() - 7*24*60*60*1000)).length
  }));
  const mostActiveProject = projectStats.sort((a, b) => b.completed - a.completed)[0];
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'text-red-800 bg-red-100 dark:text-red-200 dark:bg-red-900';
      case 'medium': return 'text-yellow-800 bg-yellow-100 dark:text-yellow-200 dark:bg-yellow-900';
      case 'low': return 'text-green-800 bg-green-100 dark:text-green-200 dark:bg-green-900';
      default: return 'text-gray-800 bg-gray-100 dark:text-gray-200 dark:bg-gray-800';
    }
  };
  const getStatusColor = (status) => {
    switch (status) {
      case 'done': return 'text-green-800 bg-green-100 dark:text-green-200 dark:bg-green-900';
      case 'in_progress': return 'text-blue-800 bg-blue-100 dark:text-blue-200 dark:bg-blue-900';
      case 'todo': return 'text-gray-800 bg-gray-100 dark:text-gray-200 dark:bg-gray-800';
      default: return 'text-gray-800 bg-gray-100 dark:text-gray-200 dark:bg-gray-800';
    }
  };
  const motivationalQuotes = [
    'The secret of getting ahead is getting started.',
    'It always seems impossible until it\'s done.',
    "Don't watch the clock; do what it does. Keep going.",
    'Success is the sum of small efforts, repeated day in and day out.',
    'The future depends on what you do today.'
  ];
  const motivationalAuthors = [
    'Mark Twain',
    'Nelson Mandela',
    'Sam Levenson',
    'Robert Collier',
    'Mahatma Gandhi'
  ];
  return (
    <div className="space-y-8 animate-fade-in">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <div className="stat-card stat-blue">
          <span className="font-bold text-3xl mb-1">{stats.total_tasks || 0}</span>
          <div className="text-lg font-semibold">Total Tasks</div>
          <div className="text-sm mt-1">{completedThisWeek} completed this week</div>
        </div>
        <div className="stat-card stat-green">
          <span className="font-bold text-3xl mb-1">{stats.completed_tasks || 0}</span>
          <div className="text-lg font-semibold">Completed</div>
          <div className="text-sm mt-1">{productivityScore}% completion rate</div>
        </div>
        <div className="stat-card stat-yellow">
          <span className="font-bold text-3xl mb-1">{stats.in_progress_tasks || 0}</span>
          <div className="text-lg font-semibold">In Progress</div>
          <div className="text-sm mt-1">{highPriorityTasks.length} high priority</div>
        </div>
        <div className="stat-card stat-purple">
          <span className="font-bold text-3xl mb-1">{stats.total_projects || 0}</span>
          <div className="text-lg font-semibold">Projects</div>
          <div className="text-sm mt-1">{activeProjects} active</div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <DashboardInfoCard
          title="Recent Activity"
          icon="⚡"
          count={recentTasks.length}
          onOpenModal={() => setModalData({
            isOpen: true,
            title: 'Recent Activity',
            data: recentTasks,
            columns: [
              { header: 'Status', accessor: item => <span className={`mx-auto w-2 h-2 rounded-full inline-block ${item.status === 'done' ? 'bg-green-500' : item.status === 'in_progress' ? 'bg-blue-500' : 'bg-gray-400'}`}></span> },
              { header: 'Title', accessor: item => item.title },
              { header: 'Priority', accessor: item => <span className={`px-2 py-0 rounded-full text-xs font-medium ${getPriorityColor(item.priority)} whitespace-nowrap`}>{item.priority}</span> },
              { header: 'Status', accessor: item => <span className={`px-2 py-0 rounded-full text-xs font-medium ${getStatusColor(item.status)} whitespace-nowrap`}>{item.status.replace('_', ' ')}</span> },
              { header: 'Date', accessor: item => new Date(item.created_at).toLocaleDateString() }
            ]
          })}
        />
        <DashboardInfoCard
          title="Upcoming Deadlines"
          icon="⏰"
          count={upcomingDeadlines.length}
          onOpenModal={() => setModalData({
            isOpen: true,
            title: 'Upcoming Deadlines',
            data: upcomingDeadlines,
            columns: [
              { header: 'Title', accessor: item => item.title },
              { header: 'Priority', accessor: item => <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(item.priority)}`}>{item.priority}</span> },
              { header: 'Due Date', accessor: item => new Date(item.due_date).toLocaleDateString() }
            ]
          })}
        />
        <DashboardInfoCard
          title="Overdue Tasks"
          icon="⚠️"
          count={overdueTasks.length}
          onOpenModal={() => setModalData({
            isOpen: true,
            title: 'Overdue Tasks',
            data: overdueTasks,
            columns: [
              { header: 'Title', accessor: item => item.title },
              { header: 'Priority', accessor: item => <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(item.priority)}`}>{item.priority}</span> },
              { header: 'Overdue By', accessor: item => `${Math.ceil((today - new Date(item.due_date)) / (1000 * 60 * 60 * 24))} days` }
            ]
          })}
        />
        <DashboardInfoCard
          title="High Priority"
          icon="🔥"
          count={highPriorityTasks.length}
          onOpenModal={() => setModalData({
            isOpen: true,
            title: 'High Priority Tasks',
            data: highPriorityTasks,
            columns: [
              { header: 'Title', accessor: item => item.title },
              { header: 'Status', accessor: item => <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>{item.status.replace('_', ' ')}</span> },
              { header: 'Due Date', accessor: item => item.due_date ? new Date(item.due_date).toLocaleDateString() : 'No due date' }
            ]
          })}
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="card p-4 flex flex-col items-center justify-center">
          <div className="text-3xl">📈</div>
          <div className="font-bold text-neutral-900 text-lg mt-2">{productivityScore}% Productivity</div>
          <div className="text-neutral-600 text-sm">Keep up the great work!</div>
        </div>
        <div className="card p-4 flex flex-col items-center justify-center">
          <div className="text-3xl">🏆</div>
          <div className="font-bold text-neutral-900 text-lg mt-2">{mostActiveProject?.name || 'N/A'}</div>
          <div className="text-neutral-600 text-xs">{mostActiveProject ? mostActiveProject.completed : 0} tasks completed this week</div>
        </div>
        <div className="card p-4 flex flex-col items-center justify-center">
          <div className="italic text-neutral-900 text-center">"{motivationalQuotes[today.getDate() % motivationalQuotes.length]}"</div>
          <div className="text-neutral-600 text-xs mt-2">— {motivationalAuthors[today.getDate() % motivationalAuthors.length]}</div>
        </div>
      </div>
      <DetailsModal
        isOpen={modalData.isOpen}
        onClose={() => setModalData({ ...modalData, isOpen: false })}
        title={modalData.title}
        data={modalData.data}
        columns={modalData.columns}
      />
    </div>
  );
};

const TaskManager = ({ tasks, setTasks, fetchDashboardData }) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    due_date: '',
    project_id: ''
  });
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const response = await axios.get(`${API}/projects`);
      setProjects(response.data);
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const taskData = {
        ...formData,
        due_date: formData.due_date ? new Date(formData.due_date + 'T12:00:00Z').toISOString() : null,
        project_id: formData.project_id || null
      };

      if (editingTask) {
        await axios.put(`${API}/tasks/${editingTask.id}`, taskData);
      } else {
        await axios.post(`${API}/tasks`, taskData);
      }

      await fetchDashboardData();
      resetForm();
    } catch (error) {
      console.error('Failed to save task:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (task) => {
    setEditingTask(task);
    setFormData({
      title: task.title,
      description: task.description || '',
      priority: task.priority,
      due_date: task.due_date ? new Date(task.due_date).toISOString().split('T')[0] : '',
      project_id: task.project_id || ''
    });
    setShowCreateModal(true);
  };

  const handleDelete = async (taskId) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      try {
        await axios.delete(`${API}/tasks/${taskId}`);
        await fetchDashboardData();
      } catch (error) {
        console.error('Failed to delete task:', error);
      }
    }
  };

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      const updatedTasks = tasks.map(task => 
        task.id === taskId ? { ...task, status: newStatus } : task
      );
      setTasks(updatedTasks);

      await axios.put(`${API}/tasks/${taskId}`, { status: newStatus });
    } catch (error) {
      console.error('Failed to update task status:', error);
      await fetchDashboardData();
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      priority: 'medium',
      due_date: '',
      project_id: ''
    });
    setEditingTask(null);
    setShowCreateModal(false);
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'done': return 'text-green-600 bg-green-50';
      case 'in_progress': return 'text-blue-600 bg-blue-50';
      case 'todo': return 'text-gray-600 bg-gray-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'No due date';
    return new Date(dateString).toLocaleDateString();
  };

  const isOverdue = (dueDate, status) => {
    if (!dueDate || status === 'done') return false;
    return new Date(dueDate) < new Date();
  };

  const filteredTasks = tasks.filter(task => {
    const statusMatch = statusFilter === 'all' || task.status === statusFilter;
    const priorityMatch = priorityFilter === 'all' || task.priority === priorityFilter;
    return statusMatch && priorityMatch;
  });

  const onDragEnd = async (result) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const task = tasks.find((t) => t.id === draggableId);
    if (!task) return;

    const newTasks = Array.from(tasks);
    const [removed] = newTasks.splice(source.index, 1);
    newTasks.splice(destination.index, 0, removed);
    
    setTasks(newTasks);

  };

  return (
    <div className="space-y-6 tasker">
      <div className="flex justify-between items-center task-header">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Task Manager</h2>
          <p className="text-gray-600">Manage your tasks and track progress</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-tasker bg-gradient-to-r from-purple-500 to-indigo-600 text-white px-6 py-3 rounded-xl font-medium hover:from-purple-600 hover:to-indigo-700 transition duration-200 flex items-center space-x-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          <span>Add Task</span>
        </button>
      </div>

      <div className="flex flex-wrap gap-4 mb-4">
        <div>
          <label className="mr-2 font-medium">Status:</label>
          <CustomSelect
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            options={[
              { value: 'all', label: 'All' },
              { value: 'todo', label: 'Todo' },
              { value: 'in_progress', label: 'In Progress' },
              { value: 'done', label: 'Done' }
            ]}
            className="w-32"
          />
        </div>
        <div>
          <label className="mr-2 font-medium">Priority:</label>
          <CustomSelect
            value={priorityFilter}
            onChange={e => setPriorityFilter(e.target.value)}
            options={[
              { value: 'all', label: 'All' },
              { value: 'low', label: 'Low' },
              { value: 'medium', label: 'Medium' },
              { value: 'high', label: 'High' }
            ]}
            className="w-32"
          />
        </div>
      </div>

      <div className="grid gap-4">
        {filteredTasks.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full mx-auto mb-4 flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h11a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No tasks yet</h3>
            <p className="text-gray-600 mb-4">Create your first task to get started</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600 transition duration-200"
            >
              Create Task
            </button>
          </div>
        ) : (
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="task-list">
              {(provided) => (
                <div className="grid gap-4" ref={provided.innerRef} {...provided.droppableProps}>
                  {filteredTasks.map((task, index) => {
                    const originalIndex = tasks.findIndex(t => t.id === task.id);
                    return (
                      <Draggable key={task.id} draggableId={task.id} index={originalIndex}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`card p-6 hover:shadow-lg transition duration-200 ${snapshot.isDragging ? 'ring-2 ring-purple-400' : ''}`}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                              <div className="flex justify-end sm:order-2 mb-2 sm:mb-0">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEdit(task);
                                  }}
                                  className="task-action-btn text-gray-400 hover:text-gray-600 transition duration-200"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDelete(task.id);
                                  }}
                                  className="task-action-btn text-gray-400 hover:text-red-600 transition duration-200 ml-2"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                              <div className="flex flex-col items-center sm:items-start sm:flex-1">
                                <h3 className={`text-lg font-semibold text-center sm:text-left ${task.status === 'done' ? 'line-through text-gray-500' : 'text-gray-900'}`}>{task.title}</h3>
                                <div className="flex flex-row gap-2 mt-1">
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>{task.priority}</span>
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>{task.status.replace('_', ' ')}</span>
                                </div>
                              </div>
                              <div className="mt-2 sm:mt-0 sm:ml-4">
                                <CustomSelect
                                  value={task.status}
                                  onChange={(e) => handleStatusChange(task.id, e.target.value)}
                                  options={[
                                    { value: 'todo', label: 'Todo' },
                                    { value: 'in_progress', label: 'In Progress' },
                                    { value: 'done', label: 'Done' }
                                  ]}
                                  className="w-40"
                                />
                              </div>
                            </div>
                            {task.description && (
                              <p className={`text-gray-600 my-2 ${task.status === 'done' ? 'line-through' : ''}`}>{task.description}</p>
                            )}
                            <div className="border-t border-gray-200 mt-2 pt-2 text-xs text-gray-500 flex flex-col gap-1">
                              <span>Due: {formatDate(task.due_date)}</span>
                              {task.project_id && (
                                <span>Project: {projects.find(p => p.id === task.project_id)?.name || 'Unknown'}</span>
                              )}
                              <span>Created: {new Date(task.created_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    );
                  })}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        )}
      </div>

      {showCreateModal && (
        <div className="modal-overlay fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">
                {editingTask ? 'Edit Task' : 'Create New Task'}
              </h3>
              <button
                onClick={resetForm}
                className="text-gray-400 hover:text-gray-600 transition duration-200"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Title *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition duration-200"
                  placeholder="Enter task title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition duration-200"
                  placeholder="Enter task description"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                  <CustomSelect
                    value={formData.priority}
                    onChange={(e) => setFormData({...formData, priority: e.target.value})}
                    options={[
                      { value: 'low', label: 'Low' },
                      { value: 'medium', label: 'Medium' },
                      { value: 'high', label: 'High' }
                    ]}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Due Date</label>
                  <input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({...formData, due_date: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition duration-200"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Project (Optional)</label>
                <CustomSelect
                  value={formData.project_id}
                  onChange={(e) => setFormData({...formData, project_id: e.target.value})}
                  placeholder="No Project"
                  options={[
                    { value: '', label: 'No Project' },
                    ...projects.map(project => ({
                      value: project.id,
                      label: project.name
                    }))
                  ]}
                  className="w-full"
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-purple-500 to-indigo-600 text-white py-3 px-4 rounded-xl font-medium hover:from-purple-600 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition duration-200 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : (editingTask ? 'Update Task' : 'Create Task')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const ProjectManager = ({ projects, setProjects, fetchDashboardData }) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#6366f1'
  });
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedProject) {
      fetchProjectTasks();
    }
  }, [selectedProject]);

  const fetchProjectTasks = async () => {
    if (!selectedProject) return;
    try {
      const response = await axios.get(`${API}/projects/${selectedProject.id}`);
      setTasks(response.data.tasks || []);
    } catch (error) {
      console.error('Failed to fetch project tasks:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingProject) {
        await axios.put(`${API}/projects/${editingProject.id}`, formData);
      } else {
        await axios.post(`${API}/projects`, formData);
      }

      await fetchDashboardData();
      resetForm();
    } catch (error) {
      console.error('Failed to save project:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (project) => {
    setEditingProject(project);
    setFormData({
      name: project.name,
      description: project.description || '',
      color: project.color
    });
    setShowCreateModal(true);
  };

  const handleDelete = async (projectId) => {
    if (window.confirm('Are you sure you want to delete this project? All associated tasks will also be deleted.')) {
      try {
        await axios.delete(`${API}/projects/${projectId}`);
        await fetchDashboardData();
        if (selectedProject && selectedProject.id === projectId) {
          setSelectedProject(null);
          setTasks([]);
        }
      } catch (error) {
        console.error('Failed to delete project:', error);
      }
    }
  };

  const handleTaskStatusChange = async (taskId, newStatus) => {
    try {
      const updatedTasks = tasks.map(task => 
        task.id === taskId ? { ...task, status: newStatus } : task
      );
      setTasks(updatedTasks);

      await axios.put(`${API}/tasks/${taskId}`, { status: newStatus });
      await fetchProjectTasks();
    } catch (error) {
      console.error('Failed to update task status:', error);
      await fetchProjectTasks();
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      color: '#6366f1'
    });
    setEditingProject(null);
    setShowCreateModal(false);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'done': return 'text-green-600 bg-green-50';
      case 'in_progress': return 'text-blue-600 bg-blue-50';
      case 'todo': return 'text-gray-600 bg-gray-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'No due date';
    return new Date(dateString).toLocaleDateString();
  };

  const isOverdue = (dueDate, status) => {
    if (!dueDate || status === 'done') return false;
    return new Date(dueDate) < new Date();
  };

  const columns = [
    { id: 'todo', title: 'To Do', color: 'bg-gray-100' },
    { id: 'in_progress', title: 'In Progress', color: 'bg-blue-100' },
    { id: 'done', title: 'Done', color: 'bg-green-100' }
  ];

  const onDragEnd = async (result) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const task = tasks.find((t) => t.id === draggableId);
    if (!task) return;

    let newTasks = [...tasks];
    newTasks = newTasks.filter((t) => t.id !== draggableId);
    const destTasks = newTasks.filter((t) => t.status === destination.droppableId);
    const otherTasks = newTasks.filter((t) => t.status !== destination.droppableId);
    const updatedTask = { ...task, status: destination.droppableId };
    destTasks.splice(destination.index, 0, updatedTask);
    setTasks([...otherTasks, ...destTasks]);

    try {
      await axios.put(`${API}/tasks/${task.id}`, { status: destination.droppableId });
      await fetchProjectTasks();
    } catch (error) {
      console.error('Failed to update task status:', error);
      await fetchProjectTasks();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center task-header">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Project Manager</h2>
          <p className="text-gray-600">Manage your projects and view Kanban boards</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-tasker bg-gradient-to-r from-purple-500 to-indigo-600 text-white px-6 py-3 rounded-xl font-medium hover:from-purple-600 hover:to-indigo-700 transition duration-200 flex items-center space-x-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          <span>Add Project</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full mx-auto mb-4 flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No projects yet</h3>
            <p className="text-gray-600 mb-4">Create your first project to get started</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600 transition duration-200"
            >
              Create Project
            </button>
          </div>
        ) : (
          projects.map(project => (
            <div 
              key={project.id} 
              className={`card p-6 hover:shadow-lg transition duration-200 cursor-pointer ${
                selectedProject?.id === project.id ? 'ring-2 ring-purple-500' : ''
              }`}
              onClick={() => setSelectedProject(project)}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div 
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: project.color }}
                  ></div>
                  <h3 className="text-lg font-semibold text-gray-900">{project.name}</h3>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEdit(project);
                    }}
                    className="task-action-btn text-gray-400 hover:text-gray-600 transition duration-200"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(project.id);
                    }}
                    className="task-action-btn text-gray-400 hover:text-red-600 transition duration-200"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
              
              {project.description && (
                <p className="text-gray-600 mb-4">{project.description}</p>
              )}
              
              <div className="text-sm text-gray-500">
                Created: {new Date(project.created_at).toLocaleDateString()}
              </div>
            </div>
          ))
        )}
      </div>

      {selectedProject && (
        <div className="mt-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div 
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: selectedProject.color }}
              ></div>
              <h3 className="text-xl font-bold text-gray-900">{selectedProject.name} - Kanban Board</h3>
            </div>
            <button
              onClick={() => setSelectedProject(null)}
              className="text-gray-500 hover:text-gray-700 transition duration-200"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <DragDropContext onDragEnd={onDragEnd}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {columns.map((column) => {
                const columnTasks = tasks.filter((task) => task.status === column.id);
                return (
                  <Droppable droppableId={column.id} key={column.id}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`${column.color} rounded-xl p-4 min-h-96`}
                      >
                        <h4 className="font-semibold text-gray-900 mb-4">
                          {column.title} ({columnTasks.length})
                        </h4>
                        <div className="space-y-3">
                          {columnTasks.map((task, index) => (
                            <Draggable key={task.id} draggableId={task.id} index={index}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className={`bg-white rounded-lg p-4 shadow-sm mb-2 ${snapshot.isDragging ? 'ring-2 ring-purple-400' : ''}`}
                                >
                                  <div className="flex items-start justify-between mb-2">
                                    <h5 className={`font-medium ${task.status === 'done' ? 'line-through text-gray-500' : 'text-gray-900'}`}>{task.title}</h5>
                                    <CustomSelect
                                      value={task.status}
                                      onChange={(e) => handleTaskStatusChange(task.id, e.target.value)}
                                      options={[
                                        { value: 'todo', label: 'Todo' },
                                        { value: 'in_progress', label: 'In Progress' },
                                        { value: 'done', label: 'Done' }
                                      ]}
                                      className="w-40"
                                    />
                                  </div>
                                  {task.description && (
                                    <p className={`text-sm text-gray-600 mb-2 ${task.status === 'done' ? 'line-through' : ''}`}>{task.description}</p>
                                  )}
                                  <div className="flex items-center space-x-2 mb-2">
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>{task.priority}</span>
                                    {isOverdue(task.due_date, task.status) && (
                                      <span className="px-2 py-1 rounded-full text-xs font-medium text-red-600 bg-red-50">Overdue</span>
                                    )}
                                  </div>
                                  <div className="text-xs text-gray-500">Due: {formatDate(task.due_date)}</div>
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      </div>
                    )}
                  </Droppable>
                );
              })}
            </div>
          </DragDropContext>
        </div>
      )}

      {showCreateModal && (
        <div className="modal-overlay fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">
                {editingProject ? 'Edit Project' : 'Create New Project'}
              </h3>
              <button
                onClick={resetForm}
                className="text-gray-400 hover:text-gray-600 transition duration-200"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition duration-200"
                  placeholder="Enter project name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition duration-200"
                  placeholder="Enter project description"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
                <div className="flex space-x-2">
                  {['#6366f1', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4'].map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormData({...formData, color})}
                      className={`w-8 h-8 rounded-full border-2 transition duration-200 no-gradient ${
                        formData.color === color ? 'border-gray-900' : 'border-gray-300'
                      }`}
                      style={{ backgroundColor: color }}
                    ></button>
                  ))}
                </div>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-purple-500 to-indigo-600 text-white py-3 px-4 rounded-xl font-medium hover:from-purple-600 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition duration-200 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : (editingProject ? 'Update Project' : 'Create Project')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const ForgotPassword = ({ onBackToLogin }) => {
  const [step, setStep] = useState(1); 
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [serverOtpToken, setServerOtpToken] = useState(''); 
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [touched, setTouched] = useState({ newPassword: false, confirmNewPassword: false });

  const passwordRules = [
    { label: 'At least 8 characters', test: (pw) => pw.length >= 8 },
    { label: 'One capital letter', test: (pw) => /[A-Z]/.test(pw) },
    { label: 'One or more numbers', test: (pw) => /[0-9]/.test(pw) },
    { label: 'Four or more lowercase letters', test: (pw) => (pw.match(/[a-z]/g) || []).length >= 4 },
  ];
  const passwordValid = passwordRules.every(rule => rule.test(newPassword));
  const passwordsMatch = newPassword === confirmNewPassword;

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setLoading(true); setError(''); setSuccessMsg('');
    try {
      const res = await axios.post(`${API}/auth/forgot-password`, { email });
      setServerOtpToken(res.data.otp_token); 
      setStep(2);
      setSuccessMsg('OTP sent to your email.');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to send OTP.');
    } finally { setLoading(false); }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setLoading(true); setError(''); setSuccessMsg('');
    try {
      const res = await axios.post(`${API}/auth/verify-otp`, { email, otp, otp_token: serverOtpToken });
      setServerOtpToken(res.data.otp_token);
      setStep(3);
      setSuccessMsg('OTP verified. You can now reset your password.');
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid OTP.');
    } finally { setLoading(false); }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setLoading(true); setError(''); setSuccessMsg('');
    if (!passwordValid) {
      setError('Password does not meet requirements.'); setLoading(false); return;
    }
    if (!passwordsMatch) {
      setError('Passwords do not match.'); setLoading(false); return;
    }
    try {
      await axios.post(`${API}/auth/reset-password`, {
        email, otp_token: serverOtpToken, new_password: newPassword
      });
      setSuccessMsg('Password reset successful! You can now log in.');
      setTimeout(() => { onBackToLogin(); }, 2000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to reset password.');
    } finally { setLoading(false); }
  };

  const handleBlur = (e) => {
    setTouched({ ...touched, [e.target.name]: true });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 min-h-90 max-h-[35rem] overflow-y-auto">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center">
            <img src={logo} alt="logo" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Forgot Password</h2>
          <p className="text-gray-600">{step === 1 ? 'Enter your registered email' : step === 2 ? 'Enter the OTP sent to your email' : 'Reset your password'}</p>
        </div>
        {step === 1 && (
          <form onSubmit={handleRequestOtp} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition duration-200" placeholder="Enter your registered email" />
            </div>
            {error && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm">{error}</div>}
            {successMsg && <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-green-700 text-sm">{successMsg}</div>}
            <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 text-white py-3 px-4 rounded-xl font-medium hover:from-purple-600 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition duration-200 disabled:opacity-50">{loading ? 'Please wait...' : 'Send OTP'}</button>
            <button type="button" onClick={onBackToLogin} className="w-full text-blue-600 hover:text-black-700 font-medium p-2 no-gradient">Back to Login</button>
          </form>
        )}
        {step === 2 && (
          <form onSubmit={handleVerifyOtp} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">OTP</label>
              <input type="text" required value={otp} onChange={e => setOtp(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition duration-200" placeholder="Enter the OTP" />
              <p className="text-xs text-gray-500 mt-2">Didn't get the email? Please check your <span className='font-semibold'>Spam</span> or <span className='font-semibold'>Promotions</span> folder in Gmail.</p>
            </div>
            {error && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm">{error}</div>}
            {successMsg && <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-green-700 text-sm">{successMsg}</div>}
            <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 text-white py-3 px-4 rounded-xl font-medium hover:from-purple-600 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition duration-200 disabled:opacity-50">{loading ? 'Please wait...' : 'Verify OTP'}</button>
            <button type="button" onClick={() => setStep(1)} className="w-full text-blue-600 hover:text-black-700 font-medium p-2 no-gradient">Back</button>
          </form>
        )}
        {step === 3 && (
          <form onSubmit={handleResetPassword} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
              <div className="relative">
                <input type={showNewPassword ? 'text' : 'password'} name="newPassword" required value={newPassword} onChange={e => setNewPassword(e.target.value)} onBlur={handleBlur} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition duration-200 pr-12" placeholder="Enter new password" autoComplete="new-password" />
                <button type="button" tabIndex={-1} className="absolute right-3 top-4 text-gray-400 hover:text-gray-700 focus:outline-none" onClick={() => setShowNewPassword(v => !v)} aria-label={showNewPassword ? 'Hide password' : 'Show password'}>
                  {showNewPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="black" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-5.523 0-10-4.477-10-10 0-1.657.402-3.22 1.125-4.575m2.1-2.1A9.956 9.956 0 0112 3c5.523 0 10 4.477 10 10 0 1.657-.402 3.22-1.125 4.575m-2.1 2.1A9.956 9.956 0 0112 21c-5.523 0-10-4.477-10-10 0-1.657.402-3.22 1.125-4.575" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="black" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-5.523 0-10-4.477-10-10 0-1.657.402-3.22 1.125-4.575m2.1-2.1A9.956 9.956 0 0112 3c5.523 0 10 4.477 10 10 0 1.657-.402 3.22-1.125 4.575m-2.1 2.1A9.956 9.956 0 0112 21c-5.523 0-10-4.477-10-10 0-1.657.402-3.22 1.125-4.575" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18" /></svg>
                  )}
                </button>
              </div>
              {(touched.newPassword || newPassword) && (
                <ul className="mt-2 space-y-1 text-sm">
                  {passwordRules.map((rule, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <span className={rule.test(newPassword) ? 'text-green-600' : 'text-gray-400'}>
                        {rule.test(newPassword) ? (
                          <svg className="inline w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        ) : (
                          <svg className="inline w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        )}
                      </span>
                      <span className={rule.test(newPassword) ? 'text-gray-800' : 'text-gray-500'}>{rule.label}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Confirm New Password</label>
              <div className="relative">
                <input type={showConfirmPassword ? 'text' : 'password'} name="confirmNewPassword" required value={confirmNewPassword} onChange={e => setConfirmNewPassword(e.target.value)} onBlur={handleBlur} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition duration-200 pr-12" placeholder="Re-enter new password" autoComplete="new-password" />
                <button type="button" tabIndex={-1} className="absolute right-3 top-4 text-gray-400 hover:text-gray-700 focus:outline-none" onClick={() => setShowConfirmPassword(v => !v)} aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}>
                  {showConfirmPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-5.523 0-10-4.477-10-10 0-1.657.402-3.22 1.125-4.575m2.1-2.1A9.956 9.956 0 0112 3c5.523 0 10 4.477 10 10 0 1.657-.402 3.22-1.125 4.575m-2.1 2.1A9.956 9.956 0 0112 21c-5.523 0-10-4.477-10-10 0-1.657.402-3.22 1.125-4.575" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-5.523 0-10-4.477-10-10 0-1.657.402-3.22 1.125-4.575m2.1-2.1A9.956 9.956 0 0112 3c5.523 0 10 4.477 10 10 0 1.657-.402 3.22-1.125 4.575m-2.1 2.1A9.956 9.956 0 0112 21c-5.523 0-10-4.477-10-10 0-1.657.402-3.22 1.125-4.575" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18" /></svg>
                  )}
                </button>
              </div>
              {touched.confirmNewPassword && confirmNewPassword && !passwordsMatch && (
                <div className="text-red-600 text-xs mt-1">Passwords do not match</div>
              )}
            </div>
            {error && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm">{error}</div>}
            {successMsg && <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-green-700 text-sm">{successMsg}</div>}
            <button type="submit" disabled={loading || !passwordValid || !passwordsMatch} className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 text-white py-3 px-4 rounded-xl font-medium hover:from-purple-600 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition duration-200 disabled:opacity-50">{loading ? 'Please wait...' : 'Reset Password'}</button>
            <button type="button" onClick={onBackToLogin} className="w-full text-blue-600 hover:text-black-700 font-medium p-2 no-gradient">Back to Login</button>
          </form>
        )}
      </div>
    </div>
  );
};

const Collaboration = ({ setCurrentView }) => {
  const [projects, setProjects] = useState([]);
  const [invites, setInvites] = useState([]);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [inviteLoading, setInviteLoading] = useState({});
  const [responding, setResponding] = useState({});
  const [whiteboardProject, setWhiteboardProject] = useState(null);
  const { user, token } = useAuth();
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [celebrate, setCelebrate] = useState(null);
  const [expandedProjectId, setExpandedProjectId] = useState(null);
  const [projectDetails, setProjectDetails] = useState({}); 
  const [loadingDetails, setLoadingDetails] = useState({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res1 = await axios.get(`${API}/collaboration/projects`);
        setProjects(res1.data);
      } catch {}
      try {
        const res2 = await axios.get(`${API}/collaboration/invites`);
        setInvites(res2.data);
      } catch {}
    };

    fetchData();

    const interval = setInterval(fetchData, 7000);

    return () => clearInterval(interval);
  }, [user]);

  const handleSearch = async (e) => {
    e.preventDefault();
    setSearching(true);
    try {
      const res = await axios.get(`${API}/users/search?query=${encodeURIComponent(search)}`);
      setSearchResults(res.data);
    } catch {
      setSearchResults([]);
    }
    setSearching(false);
  };

  const handleInvite = async (userId) => {
    if (!selectedProjectId) {
      setErrorMsg('Please select a project to invite to.');
      setTimeout(() => setErrorMsg(''), 3000);
      return;
    }
    setInviteLoading(l => ({ ...l, [userId]: true }));
    try {
      await axios.post(`${API}/collaboration/invite`, { user_id: userId, project_id: selectedProjectId });
      const res2 = await axios.get(`${API}/collaboration/invites`);
      setInvites(res2.data);
      setSuccessMsg("Invite sent!");
      setTimeout(() => setSuccessMsg(""), 2000);
      setErrorMsg("");
    } catch (err) {
      let msg = "Failed to send invite.";
      if (err.response && err.response.data && err.response.data.detail) {
        msg = err.response.data.detail;
      }
      setErrorMsg(msg);
      setTimeout(() => setErrorMsg(""), 3000);
    }
    setInviteLoading(l => ({ ...l, [userId]: false }));
  };

  const handleRespond = async (inviteId, accept) => {
    setResponding(r => ({ ...r, [`${inviteId}_${accept ? 'accept' : 'decline'}`]: true }));
    try {
      await axios.post(`${API}/collaboration/invite/${inviteId}/${accept ? 'accept' : 'decline'}`);
      setInvites(invites => invites.filter(inv => inv.id !== inviteId));
      if (accept) {
        const res1 = await axios.get(`${API}/collaboration/projects`);
        setProjects(res1.data);
        const newProject = res1.data.find(p => p.collaborators && p.collaborators.includes(user.id) && !projects.some(old => old.id === p.id));
        if (newProject) {
          setCelebrate({ projectName: newProject.name, ownerName: newProject.owner_name });
          setTimeout(() => setCelebrate(null), 5000);
        }
      }
    } catch {}
    setResponding(r => ({ ...r, [`${inviteId}_${accept ? 'accept' : 'decline'}`]: false }));
  };

  const fetchProjectDetails = async (projectId) => {
    setLoadingDetails(ld => ({ ...ld, [projectId]: true }));
    try {
      const [collabRes, inviteRes] = await Promise.all([
        axios.get(`${API}/projects/${projectId}/collaborators`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/projects/${projectId}/invites`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setProjectDetails(pd => ({
        ...pd,
        [projectId]: {
          collaborators: collabRes.data,
          invites: inviteRes.data.filter(i => i.status === 'pending'),
        }
      }));
    } catch {}
    setLoadingDetails(ld => ({ ...ld, [projectId]: false }));
  };

  if (whiteboardProject) {
    return <Whiteboard project={whiteboardProject} token={token} onBack={() => setWhiteboardProject(null)} />;
  }

  return (
    <div className="max-w-1xl mx-auto pb-8">
      <h2 className="text-2xl font-bold mb-4">Collaboration</h2>
      <div className="mb-8">
        <h3 className="font-semibold mb-2">Invite Users</h3>
        <div className="mb-2 flex gap-2 items-center">
          <label className="font-medium">Project:</label>
          <div className="flex-1">
            <CustomSelect
              value={selectedProjectId}
              onChange={e => setSelectedProjectId(e.target.value)}
              placeholder="Select project"
              options={[
                { value: '', label: 'Select project' },
                ...projects.filter(p => p.user_id === user.id).map(p => ({
                  value: p.id,
                  label: p.name
                }))
              ]}
              className="w-full"
            />
          </div>
        </div>
        <form onSubmit={handleSearch} className="flex gap-2 mb-2 flex-wrap">
          <input
            className="border rounded px-3 py-1 flex-1"
            placeholder="Search users by name or email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <button className="bg-blue-600 text-white px-4 py-1 rounded" disabled={searching}>
            {searching ? 'Searching...' : 'Search'}
          </button>
        </form>
        {successMsg && <div className="bg-green-50 border border-green-200 rounded-xl p-2 text-green-700 text-sm mb-2">{successMsg}</div>}
        {errorMsg && <div className="bg-red-50 border border-red-200 rounded-xl p-2 text-red-700 text-sm mb-2">{errorMsg}</div>}
        {searchResults.length > 0 && (
          <ul className="bg-gray-50 border rounded divide-y thin-scrollbar rounded-xl" style={{ display: 'block' }}>
            {searchResults.map(u => {
              const project = projects.find(p => p.id === selectedProjectId);
              const isOwner = project && project.user_id === u.id;
              const isCollaborator = project && project.collaborators && project.collaborators.includes(u.id);
              const alreadyInvited = invites.some(inv => inv.to_user_id === u.id && inv.project_id === selectedProjectId && inv.status === 'pending');
              return (
                <li key={u.id} className="flex items-center justify-between px-3 py-2 ">
                  <span>{u.name} ({u.email})</span>
                  {isOwner || isCollaborator ? (
                    <button className="bg-gray-300 text-gray-600 px-3 py-1 rounded cursor-not-allowed" disabled>User already in Project</button>
                  ) : alreadyInvited ? (
                    <button className="bg-gray-300 text-gray-600 px-3 py-1 rounded cursor-not-allowed" disabled>Invited already</button>
                  ) : (
                    <button
                      className="bg-green-600 text-white px-3 py-1 rounded"
                      disabled={inviteLoading[u.id]}
                      onClick={() => handleInvite(u.id)}
                    >{inviteLoading[u.id] ? 'Inviting...' : 'Invite'}</button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <div className="mb-8">
        <h3 className="font-semibold mb-2">Pending Invites</h3>
        {invites.length === 0 ? (
          <div className="text-gray-500">No pending invites.</div>
        ) : (
          <ul className="bg-yellow-50 border rounded divide-y thin-scrollbar" style={{ display: 'block' }}>
            {invites.map(inv => (
              <li
                key={inv.id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-3 py-2 gap-2"
              >
                <span className="mb-2 sm:mb-0">From: {inv.from_user_name} ({inv.from_user_email})</span>
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                  <button
                    className="bg-green-600 text-white px-3 py-1 rounded w-full sm:w-auto"
                    disabled={responding[`${inv.id}_accept`]}
                    onClick={() => handleRespond(inv.id, true)}
                  >{responding[`${inv.id}_accept`] ? 'Accepting...' : 'Accept'}</button>
                  <button
                    className="bg-red-600 text-white px-3 py-1 rounded w-full sm:w-auto"
                    disabled={responding[`${inv.id}_decline`]}
                    onClick={() => handleRespond(inv.id, false)}
                  >{responding[`${inv.id}_decline`] ? 'Declining...' : 'Decline'}</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div>
        <h3 className="font-semibold mb-2">Your Collaborative Projects</h3>
        {projects.length === 0 ? (
          <div className="text-gray-500">You are not collaborating on any projects yet.</div>
        ) : (
          <ul className="flex flex-wrap gap-3 justify-center">
            {projects.map(p => (
              <li key={p.id} className="bg-blue-50 border rounded-2xl shadow flex flex-col items-center p-4 w-60 min-w-[280px] max-w-xs transition-all duration-200">
                <button
                  className="flex items-center justify-center gap-2 bg-gradient-to-r from-blue-400 to-cyan-400 text-white rounded-full px-3 py-1.5 text-xs font-semibold shadow hover:scale-105 transition-transform mb-3"
                  onClick={() => {
                    if (expandedProjectId === p.id) {
                      setExpandedProjectId(null);
                    } else {
                      setExpandedProjectId(p.id);
                      if (!projectDetails[p.id]) fetchProjectDetails(p.id);
                    }
                  }}
                  aria-label={expandedProjectId === p.id ? 'Hide Details' : 'View Details'}
                >
                  {expandedProjectId === p.id ? (
                    <>
                      <span>Close Details</span>
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </>
                  ) : (
                    <>
                      <span>Show Details</span>
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </>
                  )}
                </button>
                <div className="text-xl font-bold text-center mb-1 break-words w-full">{p.name}</div>
                <div className="text-xs text-gray-600 mb-2">Owner: <span className="font-semibold">{p.owner_name}</span></div>
                <div className="flex-grow"></div>
                <button className="bg-gradient-to-r from-blue-400 to-cyan-400 text-white px-4 py-1 rounded-full font-semibold mb-2 text-sm" onClick={() => setWhiteboardProject(p)}>
                  Open Whiteboard
                </button>
                {expandedProjectId === p.id && (
                  <div className="w-full mt-2">
                    {loadingDetails[p.id] ? (
                      <div className="text-center text-gray-500 text-sm">Loading...</div>
                    ) : (
                      <>
                        <div className="mb-1">
                        <div className="font-semibold text-blue-900 mb-1 text-xs">Collaborators ({projectDetails[p.id]?.collaborators?.length || 0})</div>
                        <ul className="flex flex-wrap gap-1">
                            {projectDetails[p.id]?.collaborators?.length > 0 ? projectDetails[p.id].collaborators.map(c => (
                              <li key={c.id} className="bg-white border rounded px-2 py-0.5 text-xs flex items-center gap-1">
                                <span className="font-semibold">{c.name}</span>
                                <span className="text-gray-400">({c.email})</span>
                              </li>
                            )) : 
                            <div className="text-xs text-gray-400 italic mt-2">You are not the owner, so you cannot see collaborators here.</div>}
                          </ul>
                        </div>
                        <div>
                          {user.id === p.user_id ? (
                            <>
                              <div className="font-semibold text-blue-900 mb-1 text-xs">Pending Invites</div>
                              <ul className="flex flex-wrap gap-1">
                                {projectDetails[p.id]?.invites?.length > 0 ? projectDetails[p.id].invites.map(i => (
                                  <li key={i.id} className="bg-yellow-100 border border-yellow-300 rounded px-2 py-0.5 text-xs flex items-center gap-1">
                                    <span className="font-semibold">{i.user_name || i.to_user_id}</span>
                                    <span className="text-gray-400">({i.user_email || ''})</span>
                                  </li>
                                )) : <li className="text-gray-400 text-xs">No pending invites.</li>}
                              </ul>
                            </>
                          ) : (
                            <div className="text-xs text-gray-400 italic mt-2">You are not the owner, so you cannot see invites here.</div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
      {celebrate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-2xl shadow-2xl px-8 py-6 flex flex-col items-center max-w-xs relative animate-bounce-in">
            <button className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-2xl pb-1 px-2 font-bold" onClick={() => setCelebrate(null)}>&times;</button>
            <div className="text-5xl mb-2">🎉</div>
            <div className="font-bold text-lg mb-1 text-blue-700">Welcome to the Project!</div>
            <div className="text-base text-gray-700 mb-2">You just joined <span className="font-semibold">{celebrate.projectName}</span></div>
            <div className="text-sm text-gray-500">Project Leader: <span className="font-semibold">{celebrate.ownerName}</span></div>
          </div>
        </div>
      )}
      {(successMsg || errorMsg) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className={`bg-white rounded-2xl shadow-2xl px-8 py-6 flex flex-col items-center max-w-xs relative animate-bounce-in border-2 ${successMsg ? 'border-green-400' : 'border-yellow-400'}`}>
            <button className="button-cross absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-2xl font-bold" onClick={() => { setSuccessMsg(''); setErrorMsg(''); }}>&times;</button>
            <div className="text-5xl mb-2">
              {successMsg ? <span className="text-green-500">✔️</span> : <span className="text-yellow-400">❗</span>}
            </div>
            <div className={`font-bold text-lg mb-1 ${successMsg ? 'text-green-700' : 'text-yellow-700'}`}>{successMsg || errorMsg}</div>
          </div>
        </div>
      )}
    </div>
  );
};

const Notifications = ({ setCurrentView }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState({});
  const { user } = useAuth();
  const [projectMap, setProjectMap] = useState({}); 

  useEffect(() => {
    const fetchNotifications = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`${API}/notifications`);
        setNotifications(res.data);
      } catch (err) {
        setNotifications([]);
      }
      setLoading(false);
    };
    fetchNotifications();
  }, [user]);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await axios.get(`${API}/collaboration/projects`);
        const map = {};
        res.data.forEach(p => { map[p.id] = p.name; });
        setProjectMap(map);
      } catch {}
    };
    fetchProjects();
  }, [user]);

  const handleMarkRead = async (notif_id) => {
    setMarking(m => ({ ...m, [notif_id]: true }));
    try {
      await axios.post(`${API}/notifications/${notif_id}/read`);
      setNotifications(n => n.map(notif => notif.id === notif_id ? { ...notif, status: 'read' } : notif));
    } catch (err) {}
    setMarking(m => ({ ...m, [notif_id]: false }));
  };

  const handleDeleteNotification = async (notif_id) => {
    try {
      await axios.delete(`${API}/notifications/${notif_id}`);
      setNotifications(n => n.filter(nf => nf.id !== notif_id));
    } catch (err) {
    }
  };

  const handleDeleteAllRead = async () => {
    try {
      await axios.delete(`${API}/notifications/read/all`);
      setNotifications(n => n.filter(notif => notif.status !== 'read'));
    } catch (err) {
    }
  };

  return (
    <div className="max-w-1xl mx-auto pb-8">
      <h2 className="text-2xl font-bold mb-4">Notifications</h2>
      <p className="text-gray-600 mb-4">See your invites and important updates here.</p>
      <div className="flex justify-end gap-2 mb-4">
        <button
          className="btn-noti bg-black-100 text-black-700 px-3 py-1 rounded hover:bg-blue-200 text-xs font-semibold"
          onClick={async () => {
            await Promise.all(notifications.filter(n => n.status === 'unread').map(n => axios.post(`${API}/notifications/${n.id}/read`)));
            setNotifications(n => n.map(notif => ({ ...notif, status: 'read' })));
          }}
        ><span className='btn-noti'>Mark All as Read</span></button>
        <button
          className="btn-noti bg-black-100 text-red-700 px-3 py-1 rounded hover:bg-red-200 text-xs font-semibold"
          onClick={handleDeleteAllRead}
        ><span className='btn-noti'>Remove All Read</span></button>
      </div>
      {loading ? (
        <div className="text-gray-500">Loading...</div>
      ) : notifications.length === 0 ? (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-blue-800">No notifications yet.</div>
      ) : (
        <ul className="divide-y thin-scrollbar pb-4" style={{ display: 'block' }}>
          {notifications.map(notif => (
            <li key={notif.id} className="flex items-center justify-between py-3">
              <div>
                <span className={notif.status === 'unread' ? 'font-semibold' : 'text-gray-600'}>{notif.message}</span>
                {notif.related_project_id && (
                  <span className="ml-2 text-xs text-gray-400">[Project: {projectMap[notif.related_project_id] || notif.related_project_id}]</span>
                )}
              </div>
              <div className="flex gap-2 items-center">
                <span className={`text-xs px-2 py-1 rounded ${notif.status === 'unread' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-500'}`}>{notif.status}</span>
                {notif.status === 'unread' && (
                  <button
                    className="bg-green-600 text-white px-3 py-1 rounded"
                    disabled={marking[notif.id]}
                    onClick={() => handleMarkRead(notif.id)}
                  >{marking[notif.id] ? 'Marking...' : 'Mark as Read'}</button>
                )}
                <button
                  className="text-gray-400 hover:text-red-500 text-lg font-bold px-2 pb-1"
                  onClick={() => handleDeleteNotification(notif.id)}
                  aria-label="Remove notification"
                >&times;</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

function ChatSidebar({ open, onClose, project, token, user }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editingText, setEditingText] = useState("");
  const [uploading, setUploading] = useState(false);
  const wsRef = useRef(null);
  const bottomRef = useRef(null);
  const fileInputRef = useRef();
  const audioInputRef = useRef();

  useEffect(() => {
    if (open && project && token) {
      axios.get(`${API}/chat/${project.id}`, { headers: { Authorization: `Bearer ${token}` } })
        .then(res => setMessages(res.data || []));
    }
  }, [open, project, token]);

  useEffect(() => {
    if (!open || !project || !token) return;
    const ws = new window.WebSocket(`${BACKEND_URL.replace('http', 'ws')}/api/ws/chat/${project.id}?token=${token}`);
    wsRef.current = ws;
    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === 'message') {
        setMessages(m => [...m, msg.message]);
      } else if (msg.type === 'edit') {
        setMessages(m => m.map(x => x.id === msg.id ? { ...x, content: msg.content, edited: true } : x));
      } else if (msg.type === 'delete') {
        setMessages(m => m.map(x => x.id === msg.id ? { ...x, deleted: true, content: "" } : x));
      }
    };
    return () => ws.close();
  }, [open, project, token]);

  useEffect(() => {
    if (bottomRef.current) bottomRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  const sendMessage = async () => {
    if (!input.trim() || !wsRef.current || wsRef.current.readyState !== 1) return;
    wsRef.current.send(JSON.stringify({ type: 'text', content: input }));
    setInput("");
  };

  const startEdit = (msg) => {
    setEditingId(msg.id);
    setEditingText(msg.content);
  };
  const saveEdit = () => {
    if (!editingText.trim() || !wsRef.current || wsRef.current.readyState !== 1) return;
    wsRef.current.send(JSON.stringify({ type: 'edit', id: editingId, content: editingText }));
    setEditingId(null);
    setEditingText("");
  };
  const deleteMsg = (id) => {
    if (!wsRef.current || wsRef.current.readyState !== 1) return;
    wsRef.current.send(JSON.stringify({ type: 'delete', id }));
  };

  const sendFile = async (file, type) => {
    if (!file || !project || !token) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await axios.post(`/api/chat/${project.id}/upload`, formData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (wsRef.current && wsRef.current.readyState === 1) {
        wsRef.current.send(JSON.stringify({
          type,
          content: res.data.url,
          file_name: res.data.file_name,
        }));
      }
    } catch (err) {
      alert('File upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) sendFile(file, 'file');
    e.target.value = '';
  };
  const handleAudioChange = (e) => {
    const file = e.target.files[0];
    if (file) sendFile(file, 'voice');
    e.target.value = '';
  };

  return (
    <div>
      <div
        className={`fixed inset-0 z-40 transition-opacity duration-300 ${open ? 'bg-black/20 pointer-events-auto' : 'pointer-events-none bg-transparent'}`}
        style={{ display: open ? 'block' : 'none' }}
        onClick={onClose}
      />
      <div
        className={`fixed top-0 right-0 pb-4 h-full w-[380px] max-w-full bg-white shadow-2xl z-50 transition-transform duration-300 ${open ? 'translate-x-0' : 'translate-x-full'}`}
        style={{ boxShadow: open ? '-4px 0 24px 0 rgba(0,0,0,0.12)' : 'none' }}
      >
        <div className="flex items-center justify-between p-4 border-b">
          <span className="font-bold text-lg text-blue-700">Project Chat</span>
          <button className="text-gray-500 px-2 mt-0 py-0 pb-1 hover:text-blue-600 text-2xl font-bold" onClick={onClose}>&times;</button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ height: 'calc(100% - 120px)' }}>
          {messages.map(msg => (
            <div key={msg.id} className={`message_card rounded-2xl px-3 py-2 border-2 shadow-sm ${msg.user_id === user.id ? 'bg-green-50 border-green-400 text-right ml-8' : 'bg-gray-50 border-gray-400 text-left mr-8'} ${msg.deleted ? 'opacity-60 italic' : ''}`}> 
              <div className="flex items-center justify-between">
                <span className="font-semibold text-blue-800 text-sm px-2 py-1">{msg.user_name}{msg.user_id === user.id && ' (You)'}</span>
                <span className="text-xs text-gray-400 ml-2">{msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}{msg.edited && !msg.deleted ? ' (edited)' : ''}</span>
              </div>
              {editingId === msg.id ? (
                <div className="flex flex-col md:flex-row gap-2 mt-1 items-end w-full">
                  <textarea
                    className="flex-1 border px-3 py-2 text-sm resize-y min-h-[40px] max-h-40 focus:outline-blue-400 bg-white shadow-sm"
                    value={editingText}
                    onChange={e => setEditingText(e.target.value)}
                    rows={Math.max(2, editingText.split('\n').length)}
                    style={{ overflow: 'auto' }}
                    autoFocus
                  />
                  <div className="flex gap-2 mt-2 md:mt-0">
                    <button className="text-xs px-4 py-2 rounded-full bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-all shadow-md" onClick={saveEdit}>Save</button>
                    <button className="text-xs px-4 py-2 rounded-full bg-gray-200 text-gray-700 font-semibold hover:bg-gray-300 transition-all shadow-md" onClick={() => setEditingId(null)}>Cancel</button>
                  </div>
                </div>
              ) : msg.deleted ? (
                <span className="text-gray-400 italic">(deleted)</span>
              ) : msg.type === 'file' ? (
                <div className="mt-1 text-sm">
                  <a href={`${(BACKEND_URL + msg.content).replace(/([^:]\/)\/+/, '$1/')}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline" download={msg.file_name || true}>
                    <span className="inline-block align-middle mr-1">📎</span>{msg.file_name || 'Download file'}
                  </a>
                </div>
              ) : msg.type === 'voice' ? (
                <div className="mt-1">
                  <audio controls src={`${(BACKEND_URL + msg.content).replace(/([^:]\/)\/+/, '$1/')}`} className="w-full" />
                  <div className="text-xs text-gray-400">{msg.file_name || 'Voice note'}</div>
                </div>
              ) : (
                <div className="mt-1 text-sm break-words">{msg.content}</div>
              )}
              {!msg.deleted && msg.user_id === user.id && editingId !== msg.id && (
                <div className="flex gap-2 justify-end mt-1">
                  <button className="text-xs px-3 py-1 rounded-full bg-red text-red-700 font-semibold hover:bg-red-200 transition-all shadow-sm" onClick={() => startEdit(msg)}>Edit</button>
                  <button className="text-xs px-3 py-1 rounded-full bg-red text-red-700 font-semibold hover:bg-red-200 transition-all shadow-sm" onClick={() => deleteMsg(msg.id)}>Delete</button>
                </div>
              )}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
        <div className="p-3 border-t flex gap-2 bg-white items-center flex-wrap md:flex-nowrap pb-6">
          <input
            className="flex-1 border rounded px-3 py-2 text-sm focus:outline-blue-400 min-w-0"
            placeholder="Type a message..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') sendMessage(); }}
            disabled={!!editingId || uploading}
          />
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            onChange={handleFileChange}
            disabled={uploading}
          />
          <button
            className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-2 py-2 rounded"
            onClick={() => fileInputRef.current && fileInputRef.current.click()}
            disabled={uploading}
            title="Send file"
            style={{ minWidth: 40 }}
          >📎</button>
          <input
            type="file"
            accept="audio/*"
            ref={audioInputRef}
            style={{ display: 'none' }}
            onChange={handleAudioChange}
            disabled={uploading}
          />
          {/* <button
            className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-2 py-2 rounded"
            onClick={() => audioInputRef.current && audioInputRef.current.click()}
            disabled={uploading}
            title="Send voice note"
            style={{ minWidth: 40 }}
          >🎤</button> */}
          <button
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded font-semibold whitespace-nowrap shadow-md transition-all"
            onClick={sendMessage}
            disabled={!input.trim() || !!editingId || uploading}
            style={{ minWidth: 64 }}
          >Send</button>
        </div>
      </div>
    </div>
  );
}

const Whiteboard = ({ project, token, onBack }) => {
  const canvasRef = useRef(null);
  const wsRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [drawing, setDrawing] = useState(false);
  const [last, setLast] = useState(null);
  const [actions, setActions] = useState([]);
  const savingRef = useRef(false);
  const [color, setColor] = useState('#222');
  const [width, setWidth] = useState(2);
  const [invites, setInvites] = useState([]);
  const { user } = useAuth();
  const [collaborators, setCollaborators] = useState([]);
  const [onlineUserIds, setOnlineUserIds] = useState([]);
  const [chatOpen, setChatOpen] = useState(false);
  const whiteboardBgColorRef = useRef('#ffffff');
  const [whiteboardBgColor, setWhiteboardBgColor] = useState('#ffffff');
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(false);
  const openLeftSidebar = () => { setLeftSidebarOpen(true); setChatOpen(false); };
  const closeLeftSidebar = () => setLeftSidebarOpen(false);
  const openChatSidebar = () => { setChatOpen(true); setLeftSidebarOpen(false); };

  useEffect(() => {
    if (!project || !token || !user || user.id !== project.user_id) return;
    axios.get(`${API}/projects/${project.id}/invites`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then(res => setInvites(res.data)).catch(() => setInvites([]));
  }, [project, token, user]);

  useEffect(() => {
    if (!project || !token) return;
    axios.get(`${API}/projects/${project.id}/collaborators`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then(res => setCollaborators(res.data)).catch(() => setCollaborators([]));
  }, [project, token]);

  useEffect(() => {
    if (!project) return;
    axios.get(`${API}/whiteboard/${project.id}`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then(res => {
      let actionsArr = [];
      let bgColor = '#ffffff';
      if (res.data && typeof res.data === 'object' && Array.isArray(res.data.actions)) {
        actionsArr = res.data.actions;
        bgColor = res.data.bgColor || '#ffffff';
      } else if (Array.isArray(res.data)) {
        actionsArr = res.data;
      }
      setActions(actionsArr);
      setWhiteboardBgColor(bgColor);
      setTimeout(() => {
        if (canvasRef.current) {
          const ctx = canvasRef.current.getContext('2d');
          ctx.clearRect(0, 0, 800, 500);
          ctx.fillStyle = bgColor;
          ctx.fillRect(0, 0, 800, 500);
          actionsArr.forEach(act => {
            ctx.strokeStyle = act.color || '#222';
            ctx.lineWidth = act.width || 2;
            ctx.beginPath();
            ctx.moveTo(act.from.x, act.from.y);
            ctx.lineTo(act.to.x, act.to.y);
            ctx.stroke();
          });
        }
      }, 100);
    });
  }, [project, token]);

  const redraw = (acts) => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    ctx.fillStyle = whiteboardBgColorRef.current;
    ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    acts.forEach(act => {
      ctx.strokeStyle = act.color || '#222';
      ctx.lineWidth = act.width || 2;
      ctx.beginPath();
      ctx.moveTo(act.from.x, act.from.y);
      ctx.lineTo(act.to.x, act.to.y);
      ctx.stroke();
    });
  };

  useEffect(() => {
    whiteboardBgColorRef.current = whiteboardBgColor;
    redraw(actions);
  }, [actions]);

  const debouncedSendBgColor = useRef(
    debounce((color) => {
      if (wsRef.current && wsRef.current.readyState === 1) {
        wsRef.current.send(JSON.stringify({ type: 'bgcolor', color }));
      }
    }, 200)
  ).current;

  const debouncedSaveBgColor = useRef(
    debounce((color, actions) => {
      if (!project || !token) return;
      axios.post(`${API}/whiteboard/${project.id}`, { actions, bgColor: color }, {
        headers: { Authorization: `Bearer ${token}` }
      });
    }, 3000)
  ).current;

  const handleBgColorChange = (e) => {
    const color = e.target.value;
    if (color === whiteboardBgColorRef.current) return;
    setWhiteboardBgColor(color);
    whiteboardBgColorRef.current = color;
    redraw(actions);
    debouncedSendBgColor(color);
    debouncedSaveBgColor(color, actions);
  };

  const saveActions = (newActions) => {
    if (savingRef.current) return;
    savingRef.current = true;
    axios.post(`${API}/whiteboard/${project.id}`, newActions, {
      headers: { Authorization: `Bearer ${token}` }
    }).finally(() => {
      savingRef.current = false;
    });
  };

  useEffect(() => {
    if (actions.length > 0) saveActions(actions);
  }, [actions]);

  useEffect(() => {
    if (!project || !token) return;
    const ws = new window.WebSocket(`${API.replace('http', 'ws')}/ws/whiteboard/${project.id}?token=${token}`);
    wsRef.current = ws;
    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === 'draw' && canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        ctx.strokeStyle = msg.color || '#222';
        ctx.lineWidth = msg.width || 2;
        ctx.beginPath();
        ctx.moveTo(msg.from.x, msg.from.y);
        ctx.lineTo(msg.to.x, msg.to.y);
        ctx.stroke();
        setActions(a => [...a, msg]);
      } else if (msg.type === 'presence' && Array.isArray(msg.onlineUserIds)) {
        setOnlineUserIds(msg.onlineUserIds);
      } else if (msg.type === 'undo') {
        setActions(a => {
          const newActs = a.slice(0, -1);
          setTimeout(() => redraw(newActs), 0);
          return newActs;
        });
      } else if (msg.type === 'clear') {
        setActions([]);
        setTimeout(() => redraw([]), 0);
      } else if (msg.type === 'bgcolor') {
        if ((msg.color || '#ffffff') !== whiteboardBgColorRef.current) {
          setWhiteboardBgColor(msg.color || '#ffffff');
          whiteboardBgColorRef.current = msg.color || '#ffffff';
          redraw(actions);
        }
      }
    };
    return () => ws.close();
  }, [project, token]);

  const sendDraw = (from, to) => {
    const act = { type: 'draw', from, to, color, width };
    if (wsRef.current && wsRef.current.readyState === 1) {
      wsRef.current.send(JSON.stringify(act));
    }
    setActions(a => [...a, act]);
  };

  const handleMouseDown = (e) => {
    setDrawing(true);
    setLast(getPos(e));
  };
  const handleMouseUp = () => setDrawing(false);
  const handleMouseMove = (e) => {
    if (!drawing) return;
    const pos = getPos(e);
    if (last && pos) {
      drawLine(last, pos);
      sendDraw(last, pos);
      setLast(pos);
    }
  };
  const getPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };
  const drawLine = (from, to) => {
    const ctx = canvasRef.current.getContext('2d');
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
  };

  const handleUndo = () => {
    if (actions.length === 0) return;
    if (wsRef.current && wsRef.current.readyState === 1) {
      wsRef.current.send(JSON.stringify({ type: 'undo' }));
    }
  };

  const handleClear = () => {
    if (actions.length === 0) return;
    if (wsRef.current && wsRef.current.readyState === 1) {
      wsRef.current.send(JSON.stringify({ type: 'clear' }));
    }
  };

  useEffect(() => {
    if (actions.length > 0 || actions.length === 0) redraw(actions);
  }, [actions]);

  const handleExport = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = canvas.width;
    exportCanvas.height = canvas.height;
    const ctx = exportCanvas.getContext('2d');
    ctx.fillStyle = whiteboardBgColorRef.current;
    ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
    ctx.drawImage(canvas, 0, 0);
    const link = document.createElement('a');
    link.download = `whiteboard-${project?.name || 'export'}.png`;
    link.href = exportCanvas.toDataURL('image/png');
    link.click();
  };

  const actionsRef = useRef(actions);
  useEffect(() => { actionsRef.current = actions; }, [actions]);

  useEffect(() => {
    redraw(actions);
  }, [actions, whiteboardBgColor]);

  const handleTouchStart = (e) => {
    e.preventDefault();
    if (!canvasRef.current) return;
    setDrawing(true);
    const touch = e.touches[0];
    setLast(getTouchPos(touch));
  };
  const handleTouchMove = (e) => {
    e.preventDefault();
    if (!drawing || !canvasRef.current) return;
    const touch = e.touches[0];
    const pos = getTouchPos(touch);
    if (last && pos) {
      drawLine(last, pos);
      sendDraw(last, pos);
      setLast(pos);
    }
  };
  const handleTouchEnd = (e) => {
    e.preventDefault();
    setDrawing(false);
  };
  const getTouchPos = (touch) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top
    };
  };

  return (
    <div className="flex flex-col items-center py-8 w-full pt-0 mt-0 relative">
      <button
        className="sidebar-btn fixed top-20 right-4 z-50 bg-white text-black rounded-full shadow-lg p-2 flex items-center justify-center transition-all duration-200 md:top-20 md:right-8"
        style={{ boxShadow: '0 4px 16px 0 rgba(80, 63, 63, 0.1)' }}
        onClick={openChatSidebar}
        aria-label="Open Chat"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="1.5" className="w-6 h-6" style={{ color: 'black' }}>
          <path d="M5 19l2.5-2.5H19a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v7a2 2 0 002 2h.5V19z" stroke="black" strokeWidth="1.5" strokeLinejoin="round" fill="none" />
          <circle cx="8.5" cy="11" r="1" fill="black" />
          <circle cx="12" cy="11" r="1" fill="black" />
          <circle cx="15.5" cy="11" r="1" fill="black" />
        </svg>
      </button>
      <ChatSidebar open={chatOpen} onClose={() => setChatOpen(false)} project={project} token={token} user={user} />
      <div className="w-full flex flex-col items-center mb-8 mt-0 px-2">
        <div className="flex flex-col md:flex-row w-full justify-between items-center max-w-5xl mx-auto gap-2 md:gap-0">
          <button className="bg-blue-500 text-white px-4 py-2 rounded text-lg font-semibold order-1 md:order-none w-full md:w-auto mb-2 md:mb-0" onClick={onBack}>Quit</button>
          <div className="flex flex-col items-center flex-1 order-2 md:order-none">
            <h2 className="text-2xl font-bold text-center">Whiteboard: {project.name}</h2>
            <span className={connected ? 'text-green-600 text-center' : 'text-red-600 text-center'}>{connected ? 'You are Connected' : 'Disconnected'}</span>
          </div>
        </div>
        <hr className="w-full max-w-5xl border-t-2 border-blue-200 mt-4" />
      </div>
      <div className="flex flex-col md:flex-row w-full justify-center items-start gap-4 md:gap-8 px-2 md:px-0">
        <div className="flex flex-col items-center flex-1 w-full md:w-auto">
          <div className="w-full flex flex-col items-center">
            <div className="flex flex-wrap items-center justify-center gap-3 md:gap-6 bg-white/90 rounded-2xl shadow-lg px-2 md:px-4 py-3 mb-4 border border-blue-100 max-w-3xl w-full min-w-0 overflow-x-auto thin-scrollbar">
              <button className="bg-gradient-to-r from-sky-400 to-blue-500 text-white px-4 py-2 rounded-xl font-semibold shadow hover:from-sky-500 hover:to-blue-600 transition-all flex-shrink-0" onClick={handleUndo} disabled={actions.length === 0}>Undo</button>
              <button className="bg-gradient-to-r from-cyan-400 to-blue-400 text-white px-4 py-2 rounded-xl font-semibold shadow hover:from-cyan-500 hover:to-blue-500 transition-all flex-shrink-0" onClick={handleClear} disabled={actions.length === 0}>Clear</button>
              <div className="flex items-center gap-2 min-w-0">
                <label className="font-medium whitespace-nowrap">Color:</label>
                <input type="color" value={color} onChange={e => setColor(e.target.value)} className="w-8 h-8 p-0 border-2 border-gray-200 rounded-lg shadow-sm hover:border-blue-400 focus:border-blue-500 transition flex-shrink-0" />
              </div>
              <div className="flex items-center gap-2 min-w-0">
                <label className="font-medium whitespace-nowrap">Pen Size:</label>
                <input type="range" min="1" max="12" value={width} onChange={e => setWidth(Number(e.target.value))} className="w-24 accent-blue-500 flex-shrink-0" />
                <span className="ml-1 text-sm text-gray-700 whitespace-nowrap">{width}px</span>
              </div>
              <div className="flex items-center gap-2 min-w-0">
                <label className="font-medium whitespace-nowrap">Background:</label>
                <input type="color" value={whiteboardBgColor} onChange={handleBgColorChange} className="w-8 h-8 p-0 border-2 border-gray-200 rounded-lg shadow-sm hover:border-blue-400 focus:border-blue-500 transition flex-shrink-0" />
              </div>
              <button className="bg-gradient-to-r from-cyan-400 to-blue-500 text-white px-5 py-2 rounded-xl font-semibold shadow hover:from-cyan-500 hover:to-blue-600 transition-all whitespace-nowrap flex-shrink-0" onClick={handleExport}>Export as PNG</button>
            </div>
          </div>
          <div className="w-full flex justify-center">
            <canvas
              ref={canvasRef}
              width={Math.min(800, window.innerWidth - 32)}
              height={window.innerWidth < 768 ? Math.max(320, window.innerHeight * 0.45) : 500}
              className="border rounded bg-white shadow max-w-full h-auto min-h-[320px] md:min-h-[500px]"
              style={{ touchAction: 'none', maxWidth: '100%', height: 'auto' }}
              onMouseDown={handleMouseDown}
              onMouseUp={handleMouseUp}
              onMouseOut={handleMouseUp}
              onMouseMove={handleMouseMove}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            />
          </div>
          <div className="mt-2 text-gray-500 text-center w-full">All collaborators see updates in real time. Drawings are saved automatically.</div>
        </div>
        <div className="flex flex-col items-stretch gap-4 min-w-0 max-w-xs w-full md:w-auto mt-4 md:mt-0">
          <div className="bg-white/80 rounded-xl shadow p-2 w-full border border-blue-100 max-w-full">
            <div className="font-semibold text-blue-900 mb-2 text-sm">Live Collaborators</div>
            <ul className="space-y-1 overflow-x-auto whitespace-nowrap max-w-full thin-scrollbar" style={{ display: 'block' }}>
              {collaborators.map(userObj => {
                const isOnline = onlineUserIds.map(String).includes(String(userObj.id));
                return (
                  <li key={userObj.id} className="flex items-center gap-2 text-sm inline-block min-w-fit">
                    <span className={`inline-block w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                    <span className="font-medium text-blue-800">{userObj.name}</span>
                    <span className="text-gray-500">({userObj.email})</span>
                  </li>
                );
              })}
              {collaborators.length === 0 && <li className="text-gray-400 text-sm">No collaborators found.</li>}
            </ul>
          </div>
          {user && project && user.id === project.user_id && invites.length > 0 && (
            <div className="bg-white/80 rounded-xl shadow p-3 w-full border border-blue-100 max-w-full">
              <div className="font-semibold text-blue-900 mb-2 text-sm">Invites</div>
              <ul className="space-y-1 overflow-x-auto whitespace-nowrap max-w-full thin-scrollbar pb-4" style={{ display: 'block' }}>
                {invites.filter(i => i.status === 'pending').map(i => (
                  <li key={i.id} className="flex items-center gap-2 text-sm inline-block min-w-fit">
                    <span className="inline-block w-2 h-2 rounded-full bg-yellow-400"></span>
                    <span className="font-medium text-blue-800">{i.user_name}</span>
                    <span className="text-gray-500">({i.user_email})</span>
                    <span className="ml-auto text-xs text-yellow-700">Pending</span>
                  </li>
                ))}
              </ul>
              {invites.some(i => i.status === 'declined') && (
                <div className="mt-2">
                  <div className="font-semibold text-red-700 text-xs mb-1">Declined</div>
                  <ul className="space-y-1 overflow-x-auto whitespace-nowrap max-w-full thin-scrollbar" style={{ display: 'block' }}>
                    {invites.filter(i => i.status === 'declined').map(i => (
                      <li key={i.id} className="flex items-center gap-2 text-sm inline-block min-w-fit">
                        <span className="inline-block w-2 h-2 rounded-full bg-red-400"></span>
                        <span className="font-medium text-blue-800">{i.user_name}</span>
                        <span className="text-gray-500">({i.user_email})</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <button
        className="sidebar-btn fixed top-20 left-4 z-50 bg-white text-black rounded-full shadow-lg p-2 flex items-center justify-center transition-all duration-200 md:top-20 md:left-8"
        style={{ boxShadow: '0 4px 16px 0 rgba(0, 0, 0, 0.1)' }}
        onClick={openLeftSidebar}
        aria-label="Open Tasks"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="1.5" className="w-6 h-6" style={{ color: 'black' }}>
          <rect x="7" y="4" width="10" height="16" rx="2" stroke="black" strokeWidth="1.5" fill="none" />
          <path d="M9 8h6M9 12h6M9 16h2" stroke="black" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
      <div
        className={`fixed top-0 left-0 h-full w-[380px] max-w-full bg-white shadow-2xl z-50 transition-transform duration-300 ${leftSidebarOpen ? 'translate-x-0 pointer-events-auto' : '-translate-x-full pointer-events-none'}`}
        style={{ boxShadow: '-4px 0 24px 0 rgba(0,0,0,0.12)' }}
      >
        <div className="flex items-center justify-between p-4 border-b">
          <span className="font-bold text-lg text-blue-700">Tasks</span>
          <button className="text-gray-500 px-2 mt-0 py-0 pb-1 hover:text-blue-600 text-2xl font-bold" onClick={closeLeftSidebar}>&times;</button>
        </div>
        <div className="flex-1 flex items-center justify-center p-8 text-xl text-gray-600 font-semibold">
          Tasks Management Section Coming soon.
        </div>
      </div>
      {leftSidebarOpen && (
        <div
          className="fixed inset-0 z-40 transition-opacity duration-300 bg-black/20 pointer-events-auto"
          onClick={closeLeftSidebar}
        />
      )}
    </div>
  );
};

export default function AppWithAuth() {
  return (
    <AuthProvider>
      <App />
    </AuthProvider>
  );
}