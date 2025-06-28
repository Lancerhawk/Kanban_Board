# Kanban App Setup Guide

## Overview
This is a full-stack Kanban task management application with user authentication, task management, and project management with Kanban boards.

## Features Implemented
✅ User Authentication (Login/Register)  
✅ Task Management (Create, Edit, Delete, Status Management)  
✅ Project Management (Create, Edit, Delete)  
✅ Kanban Board View for Projects  
✅ Dashboard with Statistics  
✅ Responsive Design  

## Setup Instructions

### 1. Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create a `.env` file (copy from `env.example`):
   ```bash
   cp env.example .env
   ```

3. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Start the backend server:
   ```bash
   python server.py
   ```
   
   The server will run on `http://localhost:8000`

### 2. Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Create a `.env` file (copy from `env.example`):
   ```bash
   cp env.example .env
   ```

3. Install Node.js dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

4. Start the frontend development server:
   ```bash
   npm start
   # or
   yarn start
   ```
   
   The app will run on `http://localhost:3000`

## How to Use

### 1. Authentication
- Register a new account or login with existing credentials
- The app uses JWT tokens for authentication

### 2. Task Management
- Navigate to "Tasks" in the navigation
- Click "Add Task" to create new tasks
- Tasks can have:
  - Title and description
  - Priority (Low, Medium, High)
  - Due date
  - Project assignment (optional)
  - Status (Todo, In Progress, Done)
- Edit or delete tasks using the action buttons
- Change task status using the dropdown

### 3. Project Management
- Navigate to "Projects" in the navigation
- Click "Add Project" to create new projects
- Projects can have:
  - Name and description
  - Custom color
- Click on a project to view its Kanban board
- Edit or delete projects using the action buttons

### 4. Kanban Board
- Click on any project to view its Kanban board
- Tasks are organized in three columns: Todo, In Progress, Done
- Drag and drop functionality for moving tasks between columns
- Change task status directly from the board

### 5. Dashboard
- View overall statistics including:
  - Total tasks
  - Completed tasks
  - In-progress tasks
  - Total projects
- Quick access to create new tasks and projects

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user

### Tasks
- `GET /api/tasks` - Get all tasks
- `POST /api/tasks` - Create new task
- `PUT /api/tasks/{id}` - Update task
- `DELETE /api/tasks/{id}` - Delete task

### Projects
- `GET /api/projects` - Get all projects
- `POST /api/projects` - Create new project
- `PUT /api/projects/{id}` - Update project
- `DELETE /api/projects/{id}` - Delete project
- `GET /api/projects/{id}` - Get project with tasks

### Dashboard
- `GET /api/dashboard/stats` - Get dashboard statistics

## Database
The app uses MongoDB Atlas for data storage. The connection string is configured in the backend `.env` file.

## Troubleshooting

1. **Backend won't start**: Make sure all Python dependencies are installed and the `.env` file is properly configured.

2. **Frontend can't connect to backend**: Check that the backend is running on port 8000 and the `REACT_APP_BACKEND_URL` in the frontend `.env` file is correct.

3. **Authentication issues**: Make sure the JWT secret is properly set in the backend `.env` file.

4. **Database connection issues**: Verify the MongoDB connection string in the backend `.env` file.

## Security Notes
- Change the JWT_SECRET in production
- Use environment variables for sensitive data
- Implement proper CORS configuration for production
- Add rate limiting and input validation for production use 