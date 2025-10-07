# TaskFlow Kanban App

A modern, cozy, and fully responsive Kanban web application for managing tasks and projects with a beautiful dashboard, analytics, and mobile-friendly navigation.  

---

## 🚀 New Features (2025)

- Beautiful, fully responsive calendar with drag, drop, and resize
- Event color coding and categorization
- Persistent event storage (database integration)
- Touch and mobile support
- Custom event modal with color picker
- Horizontal scroll for calendar grid on small screens
- Modern, professional UI/UX
- Floating question mark button for feature updates
- Feature modal listing current and upcoming features

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
- **Real-Time Collaboration**: Work with others on projects and whiteboards in real time.
- **Whiteboard**: Collaborative whiteboard for drawing and brainstorming, with real-time updates.
- **Chat System**: Real-time project chat with support for text, file, and voice messages, including message edit/delete and uploads.
- **Improved Sidebar Logic**: Only one sidebar (tasks or chat) can be open at a time, with smooth transitions and modern SVG icons.
- **Real-Time Notifications**: Toast notifications for new events, with mark as read, remove, and bulk actions.
- **Invite & Collaborator Management**: Search users, invite to projects, see pending invites, and manage collaborators with clear feedback and backend validation.
- **Project Cards**: Compact, modern cards showing project, owner, and collaborators, with expandable details for owners.
- **Backend SSL/TLS**: Secure MongoDB connections for cloud deployment.
- **General UI/UX Enhancements**: Modernized cards, buttons, modals, and feedback for a professional, user-friendly experience.

---

## 🤝 Collaboration, Invites & Real-Time Features (New)

- **Real-Time Invite Status:** Invites and collaborative projects update automatically every few seconds.
- **Duplicate Invite Prevention:** Backend blocks duplicate invites and provides clear error messages.
- **Clear User Feedback:** Disabled buttons for already invited or collaborating users, and error/success modals for all actions.
- **Success/Error Alerts:** Modals and toasts for all invite and collaboration actions.
- **Robust Backend Validation:** All invite and collaboration actions are validated server-side.
- **Celebratory Popups:** When you join a project, see a celebratory popup with project and leader name.
- **Project Name in Notifications:** Notifications now show the project name, not just the ID.
- **Real-Time Notification Toasts:** Get notified instantly of new invites, messages, and updates.
- **Notification Management:** Mark all as read, remove all read, and delete individual notifications (frontend and backend).
- **Collaborative Whiteboard:** Draw and brainstorm with team members in real time.
- **Project Chat:** Send/receive messages, files, and voice notes in real time, with edit/delete support.
- **Polling for Updates:** Invites, projects, and notifications auto-refresh every few seconds for a live experience.

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
