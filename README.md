# TaskFlow Kanban App

A modern, cozy, and fully responsive Kanban web application for managing tasks and projects with a beautiful dashboard, analytics, and mobile-friendly navigation.

---

## ✨ Features

- **Dashboard Overview**: See stats, recent activity, deadlines, overdue & high-priority tasks, productivity, and motivational quotes.
- **Kanban Board**: Drag-and-drop tasks between columns for each project.
- **Task Manager**: Create, edit, delete, and filter tasks by status and priority.
- **Project Manager**: Organize tasks into color-coded projects, edit and delete projects.
- **Mobile Sidebar Navigation**: Burger menu opens a sidebar with navigation and logout, optimized for mobile.
- **Modern Cozy UI**: Soft gradients, rounded cards, custom scrollbars, and a warm color palette.
- **Accessibility**: Keyboard navigation, focus states, and semantic HTML.
- **Responsive Design**: Works beautifully on desktop, tablet, and mobile.
- **Authentication**: Register, login, and secure your data.
- **Analytics**: Productivity score, most active project, and more.

---

## 🛠️ Tech Stack

- **Frontend**: React, Tailwind CSS, CRACO, custom CSS
- **Backend**: Python (Flask or FastAPI, see `server.py`)
- **State Management**: React Context API
- **Drag & Drop**: @hello-pangea/dnd
- **HTTP**: Axios

---

## 🚀 Getting Started

### 1. Clone the Repository
```bash
git clone <your-repo-url>
cd Kanban-App-main
```

### 2. Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python server.py
```

- The backend will start on the default port (see `server.py`).
- Configure your environment variables as needed.

### 3. Frontend Setup
```bash
cd frontend
npm install
npm start
```
- The frontend runs on [http://localhost:3000](http://localhost:3000)
- Make sure to set `REACT_APP_BACKEND_URL` in your `.env` file to match your backend.

---

## 📱 Mobile Experience
- Burger menu for navigation and logout
- Sidebar slides in with smooth animation
- Task and project cards are mobile-optimized

---

## 🎨 Customization
- **Colors & Fonts**: Tweak in `frontend/src/App.css` and `tailwind.config.js`
- **Sidebar & Navbar**: Easily adjust in `App.js` and CSS
- **Add More Features**: Extend with new analytics, notifications, or integrations

---

## 🙏 Credits
- UI/UX inspired by modern productivity tools
- Built with React, Tailwind CSS, and Python
- Special thanks to all open-source contributors

---

## 📄 License
This project is for educational and personal use. Feel free to fork and adapt! 