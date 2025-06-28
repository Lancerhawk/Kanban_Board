import React, { useState, useEffect, createContext, useContext } from 'react';
import axios from 'axios';
import './App.css';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Auth Context
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
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

// Auth Components
const AuthForm = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = isLogin 
      ? await login(formData.email, formData.password)
      : await register(formData.name, formData.email, formData.password);

    if (!result.success) {
      setError(result.error);
    }
    setLoading(false);
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full mx-auto mb-4 flex items-center justify-center">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
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
            <input
              type="password"
              name="password"
              required
              value={formData.password}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition duration-200"
              placeholder="Enter your password"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 text-white py-3 px-4 rounded-xl font-medium hover:from-purple-600 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition duration-200 disabled:opacity-50"
          >
            {loading ? 'Please wait...' : (isLogin ? 'Sign In' : 'Create Account')}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-purple-600 hover:text-purple-700 font-medium"
          >
            {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
};

// Main App Component
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
    </div>
  );
};

// Dashboard Component
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
      default:
        return <DashboardHome stats={stats} projects={projects} tasks={tasks} setCurrentView={setCurrentView} />;
    }
  };

  // Sidebar close on outside click
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
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">TaskFlow</h1>
            </div>
            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center space-x-8">
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
            </nav>
            {/* Desktop User/Logout */}
            <div className="hidden md:flex items-center space-x-4">
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
            {/* Mobile Burger Icon */}
            <button
              className="md:hidden burger-btn p-2 rounded focus:outline-none focus:ring-2 focus:ring-purple-400"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open navigation menu"
            >
              <svg className="w-7 h-7 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </header>
      {/* Mobile Sidebar Drawer */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Overlay */}
          <div className="fixed inset-0 bg-black bg-opacity-30 transition-opacity"></div>
          {/* Sidebar */}
          <aside className="mobile-sidebar ml-auto w-64 max-w-full h-full bg-white shadow-xl p-6 flex flex-col animate-slide-in">
            <div className="flex flex-col flex-1 min-h-0">
              <div className="flex items-center justify-between mb-8">
                <span className="font-bold text-lg text-gray-900">Hi, {user.name}</span>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-2 rounded hover:bg-gray-100 focus:outline-none"
                  aria-label="Close navigation menu"
                >
                  <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderContent()}
      </main>
    </div>
  );
};

// Placeholder components - will be implemented in the next phase
const DashboardHome = ({ stats, projects, tasks, setCurrentView }) => {
  // --- Analytics & Calculations ---
  const today = new Date();
  // Productivity Score
  const productivityScore = stats.total_tasks > 0 ? Math.round((stats.completed_tasks / stats.total_tasks) * 100) : 0;
  // Completed this week
  const completedThisWeek = tasks.filter(task => task.status === 'done' && new Date(task.updated_at) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length;
  // High priority tasks
  const highPriorityTasks = tasks.filter(task => task.priority === 'high' && task.status !== 'done');
  // Active projects
  const activeProjects = projects.filter(p => tasks.some(t => t.project_id === p.id && t.status !== 'done')).length;
  // Recent activity
  const recentTasks = [...tasks].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5);
  // Upcoming deadlines
  const upcomingDeadlines = tasks.filter(task => task.status !== 'done' && task.due_date && new Date(task.due_date) >= today && new Date(task.due_date) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)).sort((a, b) => new Date(a.due_date) - new Date(b.due_date));
  // Overdue tasks
  const overdueTasks = tasks.filter(task => task.status !== 'done' && task.due_date && new Date(task.due_date) < today);
  // Most active project
  const projectStats = projects.map(p => ({
    ...p,
    completed: tasks.filter(t => t.project_id === p.id && t.status === 'done' && new Date(t.updated_at) >= new Date(Date.now() - 7*24*60*60*1000)).length
  }));
  const mostActiveProject = projectStats.sort((a, b) => b.completed - a.completed)[0];
  // --- Color helpers ---
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
  // --- Motivational Quotes ---
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
  // --- Render ---
  return (
    <div className="space-y-8 animate-fade-in">
      {/* Stats Cards Row */}
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
      {/* Main Grid: Recent, Deadlines, Overdue, High Priority */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Recent Activity */}
        <div className="bg-white shadow-lg rounded-2xl p-6 flex flex-col">
          <div className="flex items-center mb-3">
            <span className="mr-2 text-lg text-orange-500">⚡</span>
            <span className="font-bold text-lg text-neutral-900">Recent Activity</span>
          </div>
          <div className="overflow-x-auto max-h-56 pr-1 recent-activity-scroll">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-neutral-500 text-xs font-semibold">
                  <th className="px-2 py-1 text-left">Status</th>
                  <th className="px-2 py-1 text-left">Title</th>
                  <th className="px-2 py-1 text-left">Priority</th>
                  <th className="px-2 py-1 text-left">Status</th>
                  <th className="px-2 py-1 text-right">Date</th>
                </tr>
              </thead>
              <tbody>
                {recentTasks.map(task => (
                  <tr key={task.id} className="hover:bg-neutral-100 transition group">
                    <td className="px-2 py-1">
                      <span className={`mx-auto w-2 h-2 rounded-full inline-block ${task.status === 'done' ? 'bg-green-500' : task.status === 'in_progress' ? 'bg-blue-500' : 'bg-gray-400'}`}></span>
                    </td>
                    <td className="px-2 py-1 text-neutral-900 truncate max-w-[80px]">{task.title}</td>
                    <td className="px-2 py-1">
                      <span className={`px-2 py-0 rounded-full text-xs font-medium ${getPriorityColor(task.priority)} whitespace-nowrap`}>{task.priority}</span>
                    </td>
                    <td className="px-2 py-1">
                      <span className={`px-2 py-0 rounded-full text-xs font-medium ${getStatusColor(task.status)} whitespace-nowrap`}>{task.status.replace('_', ' ')}</span>
                    </td>
                    <td className="px-2 py-1 text-neutral-500 text-right whitespace-nowrap">{new Date(task.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
                {recentTasks.length === 0 && (
                  <tr><td colSpan={5} className="text-neutral-500 text-sm text-center py-2">No recent activity</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        {/* Upcoming Deadlines */}
        <div className="card p-4 flex flex-col">
          <div className="flex items-center mb-3">
            <span className="mr-2 text-lg">⏰</span>
            <span className="font-bold text-neutral-900 text-base">Upcoming Deadlines</span>
          </div>
          <div className="space-y-2 overflow-y-auto max-h-56">
            {upcomingDeadlines.map(task => (
              <div key={task.id} className="flex items-center space-x-2 p-2 rounded border-l-4 border-yellow-400 bg-yellow-50">
                <span className="font-medium text-neutral-900 truncate flex-1">{task.title}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>{task.priority}</span>
                <span className="text-xs text-yellow-700">Due: {new Date(task.due_date).toLocaleDateString()}</span>
              </div>
            ))}
            {upcomingDeadlines.length === 0 && <div className="text-neutral-500 text-sm">No upcoming deadlines</div>}
          </div>
        </div>
        {/* Overdue Tasks */}
        <div className="card p-4 flex flex-col">
          <div className="flex items-center mb-3">
            <span className="mr-2 text-lg">⚠️</span>
            <span className="font-bold text-neutral-900 text-base">Overdue Tasks</span>
          </div>
          <div className="space-y-2 overflow-y-auto max-h-56">
            {overdueTasks.slice(0, 5).map(task => (
              <div key={task.id} className="flex items-center space-x-2 p-2 rounded border-l-4 border-red-400 bg-red-50">
                <span className="font-medium text-neutral-900 truncate flex-1">{task.title}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>{task.priority}</span>
                <span className="text-xs text-red-700">Overdue by {Math.ceil((today - new Date(task.due_date)) / (1000 * 60 * 60 * 24))} days</span>
              </div>
            ))}
            {overdueTasks.length === 0 && <div className="text-green-700 text-sm">No overdue tasks! 🎉</div>}
            {overdueTasks.length > 5 && <div className="text-neutral-500 text-xs">+{overdueTasks.length - 5} more overdue tasks</div>}
          </div>
        </div>
        {/* High Priority Tasks */}
        <div className="card p-4 flex flex-col">
          <div className="flex items-center mb-3">
            <span className="mr-2 text-lg">🔥</span>
            <span className="font-bold text-neutral-900 text-base">High Priority</span>
          </div>
          <div className="space-y-2 overflow-y-auto max-h-56">
            {highPriorityTasks.slice(0, 5).map(task => (
              <div key={task.id} className="flex items-center space-x-2 p-2 rounded border-l-4 border-red-400 bg-red-50">
                <span className="font-medium text-neutral-900 truncate flex-1">{task.title}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>{task.status.replace('_', ' ')}</span>
                <span className="text-xs text-red-700">Due: {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No due date'}</span>
              </div>
            ))}
            {highPriorityTasks.length === 0 && <div className="text-neutral-500 text-sm">No high priority tasks</div>}
            {highPriorityTasks.length > 5 && <div className="text-neutral-500 text-xs">+{highPriorityTasks.length - 5} more high priority tasks</div>}
          </div>
        </div>
      </div>
      {/* Smart Analytics & Project Health Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Productivity Score */}
        <div className="card p-4 flex flex-col items-center justify-center">
          <div className="text-3xl">📈</div>
          <div className="font-bold text-neutral-900 text-lg mt-2">{productivityScore}% Productivity</div>
          <div className="text-neutral-600 text-sm">Keep up the great work!</div>
        </div>
        {/* Most Active Project */}
        <div className="card p-4 flex flex-col items-center justify-center">
          <div className="text-3xl">🏆</div>
          <div className="font-bold text-neutral-900 text-lg mt-2">{mostActiveProject?.name || 'N/A'}</div>
          <div className="text-neutral-600 text-xs">{mostActiveProject ? mostActiveProject.completed : 0} tasks completed this week</div>
        </div>
        {/* Motivational Quote */}
        <div className="card p-4 flex flex-col items-center justify-center">
          <div className="italic text-neutral-900 text-center">"{motivationalQuotes[today.getDate() % motivationalQuotes.length]}"</div>
          <div className="text-neutral-600 text-xs mt-2">— {motivationalAuthors[today.getDate() % motivationalAuthors.length]}</div>
        </div>
      </div>
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
        due_date: formData.due_date ? new Date(formData.due_date).toISOString() : null,
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
      // Optimistically update local state
      const updatedTasks = tasks.map(task => 
        task.id === taskId ? { ...task, status: newStatus } : task
      );
      setTasks(updatedTasks);

      // Call backend
      await axios.put(`${API}/tasks/${taskId}`, { status: newStatus });
      // Don't call fetchDashboardData() as it would overwrite our optimistic update
    } catch (error) {
      console.error('Failed to update task status:', error);
      // Revert on error by refreshing data
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

  // Filtered tasks
  const filteredTasks = tasks.filter(task => {
    const statusMatch = statusFilter === 'all' || task.status === statusFilter;
    const priorityMatch = priorityFilter === 'all' || task.priority === priorityFilter;
    return statusMatch && priorityMatch;
  });

  // Drag and Drop Handler for Kanban (Optimistic UI)
  const onDragEnd = async (result) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    // For TaskManager, we're reordering within the same list, not changing status
    // Find the task being moved
    const task = tasks.find((t) => t.id === draggableId);
    if (!task) return;

    // Optimistically update local state by reordering
    const newTasks = Array.from(tasks);
    const [removed] = newTasks.splice(source.index, 1);
    newTasks.splice(destination.index, 0, removed);
    
    // Update local state immediately
    setTasks(newTasks);

    // For TaskManager, we don't need to call backend since we're just reordering
    // The status change is handled by the dropdown select
    // No need to call fetchDashboardData() as it would overwrite our optimistic update
  };

  return (
    <div className="space-y-6 tasker">
      {/* Header */}
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

      {/* Filter Bar */}
      <div className="flex flex-wrap gap-4 mb-4">
        <div>
          <label className="mr-2 font-medium">Status:</label>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="border border-gray-300 rounded px-3 py-2"
          >
            <option value="all">All</option>
            <option value="todo">Todo</option>
            <option value="in_progress">In Progress</option>
            <option value="done">Done</option>
          </select>
        </div>
        <div>
          <label className="mr-2 font-medium">Priority:</label>
          <select
            value={priorityFilter}
            onChange={e => setPriorityFilter(e.target.value)}
            className="border border-gray-300 rounded px-3 py-2"
          >
            <option value="all">All</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
      </div>

      {/* Task List */}
      <div className="grid gap-4">
        {filteredTasks.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full mx-auto mb-4 flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
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
                    // Find the actual index in the original tasks array for drag and drop
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
                              {/* Top row: Action buttons (mobile: top right) */}
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
                              {/* Title centered (mobile) */}
                              <div className="flex flex-col items-center sm:items-start sm:flex-1">
                                <h3 className={`text-lg font-semibold text-center sm:text-left ${task.status === 'done' ? 'line-through text-gray-500' : 'text-gray-900'}`}>{task.title}</h3>
                                <div className="flex flex-row gap-2 mt-1">
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>{task.priority}</span>
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>{task.status.replace('_', ' ')}</span>
                                </div>
                              </div>
                              {/* Status select (mobile: full width below badges) */}
                              <div className="mt-2 sm:mt-0 sm:ml-4">
                                <select
                                  value={task.status}
                                  onChange={(e) => handleStatusChange(task.id, e.target.value)}
                                  className="text-sm border border-gray-300 rounded-lg px-2 py-1 focus:ring-2 focus:ring-purple-500 focus:border-transparent w-full sm:w-auto"
                                >
                                  <option value="todo">Todo</option>
                                  <option value="in_progress">In Progress</option>
                                  <option value="done">Done</option>
                                </select>
                              </div>
                            </div>
                            {/* Description */}
                            {task.description && (
                              <p className={`text-gray-600 my-2 ${task.status === 'done' ? 'line-through' : ''}`}>{task.description}</p>
                            )}
                            {/* Meta info stacked */}
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

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">
                {editingTask ? 'Edit Task' : 'Create New Task'}
              </h3>
              <button
                onClick={resetForm}
                className="text-gray-400 hover:text-gray-600 transition duration-200"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({...formData, priority: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition duration-200"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
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
                <select
                  value={formData.project_id}
                  onChange={(e) => setFormData({...formData, project_id: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition duration-200"
                >
                  <option value="">No Project</option>
                  {projects.map(project => (
                    <option key={project.id} value={project.id}>{project.name}</option>
                  ))}
                </select>
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
      // Optimistically update local state
      const updatedTasks = tasks.map(task => 
        task.id === taskId ? { ...task, status: newStatus } : task
      );
      setTasks(updatedTasks);

      // Call backend
      await axios.put(`${API}/tasks/${taskId}`, { status: newStatus });
      // Only refresh project tasks, not all dashboard data
      await fetchProjectTasks();
    } catch (error) {
      console.error('Failed to update task status:', error);
      // Revert on error by refreshing project tasks
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

  // Drag and Drop Handler for Kanban (Optimistic UI)
  const onDragEnd = async (result) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    // For ProjectManager Kanban board, we're changing task status between columns
    // Find the task being moved
    const task = tasks.find((t) => t.id === draggableId);
    if (!task) return;

    // Optimistically update local state
    let newTasks = [...tasks];
    // Remove from old column
    newTasks = newTasks.filter((t) => t.id !== draggableId);
    // Insert into new column at correct position
    const destTasks = newTasks.filter((t) => t.status === destination.droppableId);
    const otherTasks = newTasks.filter((t) => t.status !== destination.droppableId);
    const updatedTask = { ...task, status: destination.droppableId };
    destTasks.splice(destination.index, 0, updatedTask);
    setTasks([...otherTasks, ...destTasks]);

    // Call backend to update status
    try {
      await axios.put(`${API}/tasks/${task.id}`, { status: destination.droppableId });
      // Only refresh project tasks, not all dashboard data
      await fetchProjectTasks();
    } catch (error) {
      // Revert if failed
      console.error('Failed to update task status:', error);
      // Refresh project tasks to get correct state
      await fetchProjectTasks();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
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

      {/* Project List */}
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

      {/* Kanban Board */}
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
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                                    <select
                                      value={task.status}
                                      onChange={(e) => handleTaskStatusChange(task.id, e.target.value)}
                                      className="text-xs border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                    >
                                      <option value="todo">Todo</option>
                                      <option value="in_progress">In Progress</option>
                                      <option value="done">Done</option>
                                    </select>
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

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">
                {editingProject ? 'Edit Project' : 'Create New Project'}
              </h3>
              <button
                onClick={resetForm}
                className="text-gray-400 hover:text-gray-600 transition duration-200"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

// Wrap the entire app with AuthProvider
export default function AppWithAuth() {
  return (
    <AuthProvider>
      <App />
    </AuthProvider>
  );
}