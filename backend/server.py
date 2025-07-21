from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, Query, WebSocket, WebSocketDisconnect, Body, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta, timezone
from passlib.context import CryptContext
from jose import JWTError, jwt
import os
import logging
import uuid
from pathlib import Path
from dotenv import load_dotenv
import motor.motor_asyncio
import asyncio
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail
import random
from bson import ObjectId
import json
from dateutil import parser

def serialize_for_json(obj):
    if isinstance(obj, dict):
        return {k: serialize_for_json(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [serialize_for_json(i) for i in obj]
    elif isinstance(obj, datetime):
        return obj.isoformat()
    else:
        return obj

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
db_name = os.environ['DB_NAME']
jwt_secret = os.environ['JWT_SECRET']
jwt_algorithm = os.environ['JWT_ALGORITHM']
jwt_expiration_hours = int(os.environ['JWT_EXPIRATION_HOURS'])

client = AsyncIOMotorClient(mongo_url, tls=False)
db = client[db_name]

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

app = FastAPI(title="Kanban Todo API", version="1.0.0")
api_router = APIRouter(prefix="/api")

class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: str
    hashed_password: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    created_at: datetime

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = ""
    priority: str = "medium"  
    due_date: Optional[datetime] = None
    project_id: Optional[str] = None

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[str] = None
    due_date: Optional[datetime] = None
    status: Optional[str] = None
    project_id: Optional[str] = None

class Task(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: Optional[str] = ""
    priority: str = "medium"
    status: str = "todo"  
    due_date: Optional[datetime] = None
    project_id: Optional[str] = None
    user_id: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = ""
    color: str = "#6366f1"  

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None

class Invite(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    project_id: str
    from_user_id: str
    to_user_id: str
    status: str = "pending" 
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Notification(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    type: str  
    message: str
    related_project_id: Optional[str] = None
    status: str = "unread"  
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Project(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: Optional[str] = ""
    color: str = "#6366f1"
    user_id: str
    collaborators: List[str] = []  # user IDs of collaborators
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ProjectWithTasks(BaseModel):
    id: str
    name: str
    description: Optional[str] = ""
    color: str
    user_id: str
    created_at: datetime
    updated_at: datetime
    tasks: List[Task] = []

class OTPRequest(BaseModel):
    email: EmailStr
    otp: Optional[str] = None
    otp_token: Optional[str] = None
    new_password: Optional[str] = None

class RegistrationOTPRequest(BaseModel):
    name: str
    email: EmailStr
    password: str

class RegistrationOTPVerify(BaseModel):
    email: EmailStr
    otp: str
    otp_token: str

class CalendarEventCreate(BaseModel):
    title: str
    start: datetime
    end: datetime
    allDay: bool
    description: Optional[str] = None
    color: Optional[str] = None

class CalendarEventUpdate(BaseModel):
    title: Optional[str] = None
    start: Optional[datetime] = None
    end: Optional[datetime] = None
    allDay: Optional[bool] = None
    description: Optional[str] = None
    color: Optional[str] = None

class CalendarEvent(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    title: str
    start: datetime
    end: datetime
    allDay: bool
    description: Optional[str] = None
    color: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(hours=jwt_expiration_hours)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, jwt_secret, algorithm=jwt_algorithm)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> User:
    try:
        token = credentials.credentials
        payload = jwt.decode(token, jwt_secret, algorithms=[jwt_algorithm])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user_doc = await db.users.find_one({"id": user_id})
    if user_doc is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return User(**user_doc)

def send_email(to_email: str, subject: str, body: str, otp: str = None, registration: bool = False):
    sendgrid_api_key = os.environ.get('SENDGRID_API_KEY')
    from_email = os.environ.get('FROM_EMAIL')
    if not sendgrid_api_key or not from_email:
        raise Exception('SENDGRID_API_KEY and FROM_EMAIL must be set in environment')

    if otp:
        logo_url = 'https://kanban-board-git-main-lancerhawks-projects.vercel.app/logo.png'
        if registration:
            html_content = f'''
            <div style="font-family: 'Segoe UI', Arial, sans-serif; background: #f6f8fa; padding: 40px 0;">
              <div style="max-width: 480px; margin: 0 auto; background: #fff; border-radius: 12px; box-shadow: 0 2px 8px rgba(80,80,120,0.08); padding: 32px 32px 24px 32px;">
                <div style="text-align: center; margin-bottom: 24px;">
                  <img src='{logo_url}' alt='TaskFlow' width='180' style='margin-bottom: 12px;'/>
                  <h2 style="margin: 0; color: #4f46e5; font-size: 2rem; font-weight: 700;">Verify Your Email</h2>
                </div>
                <p style="font-size: 1.1rem; color: #222; margin-bottom: 18px;">Welcome to TaskFlow!</p>
                <p style="font-size: 1.1rem; color: #222; margin-bottom: 18px;">To complete your registration, please verify your email address using the OTP below:</p>
                <div style="text-align: center; margin: 32px 0;">
                  <span style="display: inline-block; font-size: 2.2rem; letter-spacing: 0.3rem; color: #fff; background: linear-gradient(90deg,#6366f1,#4f46e5); padding: 16px 40px; border-radius: 10px; font-weight: bold; box-shadow: 0 2px 8px rgba(80,80,120,0.08);">{otp}</span>
                </div>
                <p style="font-size: 1rem; color: #444; margin-bottom: 18px;">This OTP is valid for <b>10 minutes</b>. If you did not try to create an account, you can safely ignore this email.</p>
                <p style="font-size: 1rem; color: #888; margin-top: 32px; text-align: center;">&mdash; The TaskFlow Team</p>
              </div>
              <div style="text-align: center; color: #aaa; font-size: 0.95rem; margin-top: 18px;">&copy; {datetime.now().year} TaskFlow. All rights reserved.</div>
            </div>
            '''
        else:
            html_content = f'''
            <div style="font-family: 'Segoe UI', Arial, sans-serif; background: #f6f8fa; padding: 40px 0;">
              <div style="max-width: 480px; margin: 0 auto; background: #fff; border-radius: 12px; box-shadow: 0 2px 8px rgba(80,80,120,0.08); padding: 32px 32px 24px 32px;">
                <div style="text-align: center; margin-bottom: 24px;">
                  <img src='{logo_url}' alt='TaskFlow' width='180' style='margin-bottom: 12px;'/>
                  <h2 style="margin: 0; color: #4f46e5; font-size: 2rem; font-weight: 700;">Password Reset OTP</h2>
                </div>
                <p style="font-size: 1.1rem; color: #222; margin-bottom: 18px;">Hello,</p>
                <p style="font-size: 1.1rem; color: #222; margin-bottom: 18px;">We received a request to reset your password for your TaskFlow account. Use the OTP below to continue:</p>
                <div style="text-align: center; margin: 32px 0;">
                  <span style="display: inline-block; font-size: 2.2rem; letter-spacing: 0.3rem; color: #fff; background: linear-gradient(90deg,#6366f1,#4f46e5); padding: 16px 40px; border-radius: 10px; font-weight: bold; box-shadow: 0 2px 8px rgba(80,80,120,0.08);">{otp}</span>
                </div>
                <p style="font-size: 1rem; color: #444; margin-bottom: 18px;">This OTP is valid for <b>10 minutes</b>. If you did not request a password reset, you can safely ignore this email.</p>
                <p style="font-size: 1rem; color: #888; margin-top: 32px; text-align: center;">&mdash; Arin Jain</p>
              </div>
              <div style="text-align: center; color: #aaa; font-size: 0.95rem; margin-top: 18px;">&copy; {datetime.now().year} TaskFlow. All rights reserved.</div>
            </div>
            '''
        message = Mail(
            from_email=from_email,
            to_emails=to_email,
            subject=subject,
            plain_text_content=body,
            html_content=html_content
        )
    else:
        message = Mail(
            from_email=from_email,
            to_emails=to_email,
            subject=subject,
            plain_text_content=body
        )
    try:
        sg = SendGridAPIClient(sendgrid_api_key)
        sg.send(message)
    except Exception as e:
        raise Exception(f'Failed to send email: {e}')

@api_router.post("/auth/register", response_model=Token)
async def register(user_data: UserCreate):
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    hashed_password = hash_password(user_data.password)
    user = User(
        name=user_data.name,
        email=user_data.email,
        hashed_password=hashed_password
    )
    
    await db.users.insert_one(user.dict())
    
    access_token = create_access_token(data={"sub": user.id})
    user_response = UserResponse(
        id=user.id,
        name=user.name,
        email=user.email,
        created_at=user.created_at
    )
    
    return Token(access_token=access_token, token_type="bearer", user=user_response)

@api_router.post('/auth/register-request-otp')
async def register_request_otp(data: RegistrationOTPRequest):
    existing_user = await db.users.find_one({'email': data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail='Email already registered')
    otp = str(random.randint(100000, 999999))
    otp_token = str(uuid.uuid4())
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)
    await db.registration_otps.insert_one({
        'name': data.name,
        'email': data.email,
        'password': data.password,  # Store plain for now, hash on verify
        'otp': otp,
        'otp_token': otp_token,
        'expires_at': expires_at
    })
    send_email(
        to_email=data.email,
        subject='Your OTP for Registration',
        body=f'Your OTP is: {otp}\nIt is valid for 10 minutes.',
        otp=otp,
        registration=True
    )
    return {'message': 'OTP sent to email', 'otp_token': otp_token}

@api_router.post('/auth/register-verify-otp', response_model=Token)
async def register_verify_otp(data: RegistrationOTPVerify):
    otp_doc = await db.registration_otps.find_one({'email': data.email, 'otp': data.otp, 'otp_token': data.otp_token})
    if not otp_doc:
        raise HTTPException(status_code=400, detail='Invalid OTP or token')
    expires_at = otp_doc['expires_at']
    if expires_at.tzinfo is None:
        from datetime import timezone
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail='OTP expired')
    # Double-check user not created in the meantime
    existing_user = await db.users.find_one({'email': data.email})
    if existing_user:
        await db.registration_otps.delete_one({'_id': otp_doc['_id']})
        raise HTTPException(status_code=400, detail='Email already registered')
    hashed_password = hash_password(otp_doc['password'])
    user = User(
        name=otp_doc['name'],
        email=otp_doc['email'],
        hashed_password=hashed_password
    )
    await db.users.insert_one(user.dict())
    await db.registration_otps.delete_one({'_id': otp_doc['_id']})
    access_token = create_access_token(data={"sub": user.id})
    user_response = UserResponse(
        id=user.id,
        name=user.name,
        email=user.email,
        created_at=user.created_at
    )
    return Token(access_token=access_token, token_type="bearer", user=user_response)

@api_router.post("/auth/login", response_model=Token)
async def login(login_data: UserLogin):
    user_doc = await db.users.find_one({"email": login_data.email})
    if not user_doc or not verify_password(login_data.password, user_doc["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user = User(**user_doc)
    access_token = create_access_token(data={"sub": user.id})
    user_response = UserResponse(
        id=user.id,
        name=user.name,
        email=user.email,
        created_at=user.created_at
    )
    
    return Token(access_token=access_token, token_type="bearer", user=user_response)

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return UserResponse(
        id=current_user.id,
        name=current_user.name,
        email=current_user.email,
        created_at=current_user.created_at
    )

@api_router.post("/tasks", response_model=Task)
async def create_task(task_data: TaskCreate, current_user: User = Depends(get_current_user)):
    task = Task(**task_data.dict(), user_id=current_user.id)
    await db.tasks.insert_one(task.dict())
    return task

@api_router.get("/tasks", response_model=List[Task])
async def get_tasks(
    project_id: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    query = {"user_id": current_user.id}
    if project_id:
        query["project_id"] = project_id
    tasks = await db.tasks.find(query).to_list(1000)
    return [Task(**task) for task in tasks]

@api_router.get("/tasks/{task_id}", response_model=Task)
async def get_task(task_id: str, current_user: User = Depends(get_current_user)):
    task_doc = await db.tasks.find_one({"id": task_id, "user_id": current_user.id})
    if not task_doc:
        raise HTTPException(status_code=404, detail="Task not found")
    return Task(**task_doc)

@api_router.put("/tasks/{task_id}", response_model=Task)
async def update_task(
    task_id: str,
    task_update: TaskUpdate,
    current_user: User = Depends(get_current_user)
):
    task_doc = await db.tasks.find_one({"id": task_id, "user_id": current_user.id})
    if not task_doc:
        raise HTTPException(status_code=404, detail="Task not found")
    
    update_data = {k: v for k, v in task_update.dict().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc)
    
    await db.tasks.update_one(
        {"id": task_id, "user_id": current_user.id},
        {"$set": update_data}
    )
    
    updated_task = await db.tasks.find_one({"id": task_id, "user_id": current_user.id})
    return Task(**updated_task)

@api_router.delete("/tasks/{task_id}")
async def delete_task(task_id: str, current_user: User = Depends(get_current_user)):
    result = await db.tasks.delete_one({"id": task_id, "user_id": current_user.id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"message": "Task deleted successfully"}

@api_router.post("/projects", response_model=Project)
async def create_project(project_data: ProjectCreate, current_user: User = Depends(get_current_user)):
    project = Project(**project_data.dict(), user_id=current_user.id)
    await db.projects.insert_one(project.dict())
    return project

@api_router.get("/projects", response_model=List[Project])
async def get_projects(current_user: User = Depends(get_current_user)):
    projects = await db.projects.find({"user_id": current_user.id}).to_list(1000)
    return [Project(**project) for project in projects]

@api_router.get("/projects/{project_id}", response_model=ProjectWithTasks)
async def get_project_with_tasks(project_id: str, current_user: User = Depends(get_current_user)):
    project_doc = await db.projects.find_one({"id": project_id, "user_id": current_user.id})
    if not project_doc:
        raise HTTPException(status_code=404, detail="Project not found")
    
    tasks = await db.tasks.find({"project_id": project_id, "user_id": current_user.id}).to_list(1000)
    
    project = Project(**project_doc)
    project_with_tasks = ProjectWithTasks(
        **project.dict(),
        tasks=[Task(**task) for task in tasks]
    )
    
    return project_with_tasks

@api_router.put("/projects/{project_id}", response_model=Project)
async def update_project(
    project_id: str,
    project_update: ProjectUpdate,
    current_user: User = Depends(get_current_user)
):
    project_doc = await db.projects.find_one({"id": project_id, "user_id": current_user.id})
    if not project_doc:
        raise HTTPException(status_code=404, detail="Project not found")
    
    update_data = {k: v for k, v in project_update.dict().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc)
    
    await db.projects.update_one(
        {"id": project_id, "user_id": current_user.id},
        {"$set": update_data}
    )
    
    updated_project = await db.projects.find_one({"id": project_id, "user_id": current_user.id})
    return Project(**updated_project)

@api_router.delete("/projects/{project_id}")
async def delete_project(project_id: str, current_user: User = Depends(get_current_user)):
    await db.tasks.delete_many({"project_id": project_id, "user_id": current_user.id})
    
    result = await db.projects.delete_one({"id": project_id, "user_id": current_user.id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Project not found")
    
    return {"message": "Project and all associated tasks deleted successfully"}

@api_router.get("/dashboard/stats")
async def get_dashboard_stats(current_user: User = Depends(get_current_user)):
    total_tasks = await db.tasks.count_documents({"user_id": current_user.id})
    completed_tasks = await db.tasks.count_documents({"user_id": current_user.id, "status": "done"})
    in_progress_tasks = await db.tasks.count_documents({"user_id": current_user.id, "status": "in_progress"})
    todo_tasks = await db.tasks.count_documents({"user_id": current_user.id, "status": "todo"})
    
    total_projects = await db.projects.count_documents({"user_id": current_user.id})
    
    current_time = datetime.now(timezone.utc)
    overdue_tasks = await db.tasks.count_documents({
        "user_id": current_user.id,
        "status": {"$ne": "done"},
        "due_date": {"$lt": current_time}
    })
    
    return {
        "total_tasks": total_tasks,
        "completed_tasks": completed_tasks,
        "in_progress_tasks": in_progress_tasks,
        "todo_tasks": todo_tasks,
        "total_projects": total_projects,
        "overdue_tasks": overdue_tasks,
        "completion_rate": round((completed_tasks / total_tasks * 100) if total_tasks > 0 else 0, 1)
    }

@api_router.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc),
        "database": "connected"
    }

@api_router.post('/auth/forgot-password')
async def forgot_password(data: OTPRequest):
    user = await db.users.find_one({'email': data.email})
    if not user:
        raise HTTPException(status_code=404, detail='Email not registered')
    otp = str(random.randint(100000, 999999))
    otp_token = str(uuid.uuid4())
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)
    await db.otps.insert_one({
        'email': data.email,
        'otp': otp,
        'otp_token': otp_token,
        'expires_at': expires_at
    })
    send_email(
        to_email=data.email,
        subject='Your OTP for Password Reset',
        body=f'Your OTP is: {otp}\nIt is valid for 10 minutes.',
        otp=otp
    )
    return {'message': 'OTP sent to email', 'otp_token': otp_token}

@api_router.post('/auth/verify-otp')
async def verify_otp(data: OTPRequest):
    otp_doc = await db.otps.find_one({'email': data.email, 'otp': data.otp, 'otp_token': data.otp_token})
    if not otp_doc:
        raise HTTPException(status_code=400, detail='Invalid OTP or token')
    expires_at = otp_doc['expires_at']
    if expires_at.tzinfo is None:
        from datetime import timezone
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail='OTP expired')
    return {'message': 'OTP verified', 'otp_token': data.otp_token}

@api_router.post('/auth/reset-password')
async def reset_password(data: OTPRequest):
    otp_doc = await db.otps.find_one({'email': data.email, 'otp_token': data.otp_token})
    if not otp_doc:
        raise HTTPException(status_code=400, detail='Invalid or expired OTP token')
    expires_at = otp_doc['expires_at']
    if expires_at.tzinfo is None:
        from datetime import timezone
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail='OTP expired')
    hashed = hash_password(data.new_password)
    await db.users.update_one({'email': data.email}, {'$set': {'hashed_password': hashed}})
    await db.otps.delete_one({'_id': otp_doc['_id']})
    return {'message': 'Password reset successful'}


@api_router.get('/users/search')
async def search_users(q: str = Query(None, min_length=1), query: str = Query(None, min_length=1), current_user: User = Depends(get_current_user)):
    search_term = query if query is not None else q
    if not search_term:
        raise HTTPException(status_code=422, detail='Missing search query')
    users = await db.users.find({
        "$or": [
            {"name": {"$regex": search_term, "$options": "i"}},
            {"email": {"$regex": search_term, "$options": "i"}}
        ],
        "id": {"$ne": current_user.id}
    }).to_list(10)
    return [{"id": u["id"], "name": u["name"], "email": u["email"]} for u in users]

@api_router.post('/projects/{project_id}/invite')
async def send_invite(project_id: str, to_user_id: str, current_user: User = Depends(get_current_user)):
    project = await db.projects.find_one({"id": project_id})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if current_user.id != project["user_id"] and current_user.id not in project.get("collaborators", []):
        raise HTTPException(status_code=403, detail="Not authorized to invite")
    existing = await db.invites.find_one({"project_id": project_id, "to_user_id": to_user_id, "status": "pending"})
    if existing:
        raise HTTPException(status_code=400, detail="Invite already sent")
    invite = Invite(project_id=project_id, from_user_id=current_user.id, to_user_id=to_user_id)
    await db.invites.insert_one(invite.dict())
    notif = Notification(user_id=to_user_id, type="invite", message=f"You have been invited to collaborate on project '{project['name']}'", related_project_id=project_id)
    await db.notifications.insert_one(notif.dict())
    return {"message": "Invite sent"}

@api_router.post('/invites/{invite_id}/respond')
async def respond_invite(invite_id: str, accept: bool, current_user: User = Depends(get_current_user)):
    invite = await db.invites.find_one({"id": invite_id, "to_user_id": current_user.id, "status": "pending"})
    if not invite:
        raise HTTPException(status_code=404, detail="Invite not found or already handled")
    new_status = "accepted" if accept else "declined"
    await db.invites.update_one({"id": invite_id}, {"$set": {"status": new_status}})
    if accept:
        await db.projects.update_one({"id": invite["project_id"]}, {"$addToSet": {"collaborators": current_user.id}})
        notif = Notification(user_id=invite["from_user_id"], type="info", message=f"{current_user.name} accepted your invite to project.", related_project_id=invite["project_id"])
        await db.notifications.insert_one(notif.dict())
    return {"message": f"Invite {new_status}"}

def fix_notification_serialization(notif):
    if '_id' in notif:
        notif['_id'] = str(notif['_id'])
    for k, v in notif.items():
        if isinstance(v, ObjectId):
            notif[k] = str(v)
    return notif

@api_router.get('/notifications')
async def get_notifications(current_user: User = Depends(get_current_user)):
    notifs = await db.notifications.find({"user_id": current_user.id}).sort("created_at", -1).to_list(50)
    return [fix_notification_serialization(n) for n in notifs]

@api_router.post('/notifications/{notif_id}/read')
async def mark_notification_read(notif_id: str, current_user: User = Depends(get_current_user)):
    notif = await db.notifications.find_one({"id": notif_id, "user_id": current_user.id})
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    await db.notifications.update_one({"id": notif_id}, {"$set": {"status": "read"}})
    return {"message": "Notification marked as read"}

@api_router.delete('/notifications/{notif_id}')
async def delete_notification(notif_id: str, current_user: User = Depends(get_current_user)):
    result = await db.notifications.delete_one({"id": notif_id, "user_id": current_user.id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"message": "Notification deleted"}

@api_router.delete('/notifications/read/all')
async def delete_all_read_notifications(current_user: User = Depends(get_current_user)):
    result = await db.notifications.delete_many({"user_id": current_user.id, "status": "read"})
    return {"message": f"{result.deleted_count} read notifications deleted"}

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {} 
        self.online_users: Dict[str, set] = {} 
        self.state: Dict[str, dict] = {}  

    async def connect(self, project_id: str, websocket: WebSocket, user_id: str):
        await websocket.accept()
        if project_id not in self.active_connections:
            self.active_connections[project_id] = []
        self.active_connections[project_id].append(websocket)
        if project_id not in self.online_users:
            self.online_users[project_id] = set()
        self.online_users[project_id].add(user_id)
        await self.broadcast_presence(project_id)

    def disconnect(self, project_id: str, websocket: WebSocket, user_id: str):
        if project_id in self.active_connections:
            self.active_connections[project_id].remove(websocket)
            if not self.active_connections[project_id]:
                del self.active_connections[project_id]
        if project_id in self.online_users:
            self.online_users[project_id].discard(user_id)
            if not self.online_users[project_id]:
                del self.online_users[project_id]

    async def broadcast(self, project_id: str, message: str):
        if project_id in self.active_connections:
            to_remove = []
            for connection in self.active_connections[project_id]:
                try:
                    await connection.send_text(message)
                except Exception:
                    to_remove.append(connection)
            for conn in to_remove:
                self.active_connections[project_id].remove(conn)

    async def broadcast_presence(self, project_id: str):
        if project_id in self.active_connections:
            msg = {"type": "presence", "onlineUserIds": list(self.online_users.get(project_id, []))}
            to_remove = []
            for connection in self.active_connections[project_id]:
                try:
                    await connection.send_text(json.dumps(msg))
                except Exception:
                    to_remove.append(connection)
            for conn in to_remove:
                self.active_connections[project_id].remove(conn)

manager = ConnectionManager()

@app.websocket("/api/ws/whiteboard/{project_id}")
async def websocket_endpoint(websocket: WebSocket, project_id: str, token: str = None):
    from jose import jwt, JWTError
    from starlette.websockets import WebSocketClose
    if not token:
        await websocket.close(code=1008)
        return
    try:
        payload = jwt.decode(token, jwt_secret, algorithms=[jwt_algorithm])
        user_id: str = payload.get("sub")
        if not user_id:
            await websocket.close(code=1008)
            return
    except JWTError:
        await websocket.close(code=1008)
        return
    project = await db.projects.find_one({"id": project_id})
    if not project or (user_id != project["user_id"] and user_id not in project.get("collaborators", [])):
        await websocket.close(code=1008)
        return
    await manager.connect(project_id, websocket, user_id)
    if project_id not in manager.state:
        wb = await db.whiteboards.find_one({"project_id": project_id})
        if wb and 'data' in wb:
            if isinstance(wb['data'], dict):
                manager.state[project_id] = wb['data']
            else:
                manager.state[project_id] = {'actions': wb['data'], 'bgColor': '#ffffff'}
        else:
            manager.state[project_id] = {'actions': [], 'bgColor': '#ffffff'}
    try:
        while True:
            data = await websocket.receive_text()
            msg = json.loads(data)
            if msg.get("type") == "draw":
                manager.state[project_id]['actions'].append(msg)
                await manager.broadcast(project_id, data)
            elif msg.get("type") == "undo":
                if manager.state[project_id]['actions']:
                    manager.state[project_id]['actions'] = manager.state[project_id]['actions'][:-1]
                    await manager.broadcast(project_id, json.dumps({"type": "undo"}))
                    await db.whiteboards.update_one({"project_id": project_id}, {"$set": {"data": manager.state[project_id]}}, upsert=True)
            elif msg.get("type") == "clear":
                manager.state[project_id]['actions'] = []
                await manager.broadcast(project_id, json.dumps({"type": "clear"}))
                await db.whiteboards.update_one({"project_id": project_id}, {"$set": {"data": manager.state[project_id]}}, upsert=True)
            elif msg.get("type") == "bgcolor":
                manager.state[project_id]['bgColor'] = msg.get('color', '#ffffff')
                await manager.broadcast(project_id, data)
                await db.whiteboards.update_one({"project_id": project_id}, {"$set": {"data": manager.state[project_id]}}, upsert=True)
            else:
                await manager.broadcast(project_id, data)
    except WebSocketDisconnect:
        manager.disconnect(project_id, websocket, user_id)
        await manager.broadcast_presence(project_id)
        await db.whiteboards.update_one({"project_id": project_id}, {"$set": {"data": manager.state.get(project_id, {'actions': [], 'bgColor': '#ffffff'})}}, upsert=True)

@api_router.get('/whiteboard/{project_id}')
async def get_whiteboard(project_id: str, current_user: User = Depends(get_current_user)):
    project = await db.projects.find_one({"id": project_id})
    if not project or (current_user.id != project["user_id"] and current_user.id not in project.get("collaborators", [])):
        raise HTTPException(status_code=403, detail="Not authorized")
    wb = await db.whiteboards.find_one({"project_id": project_id})
    return wb["data"] if wb and "data" in wb else []

@api_router.post('/whiteboard/{project_id}')
async def save_whiteboard(project_id: str, request: Request, current_user: User = Depends(get_current_user)):
    project = await db.projects.find_one({"id": project_id})
    if not project or (current_user.id != project["user_id"] and current_user.id not in project.get("collaborators", [])):
        raise HTTPException(status_code=403, detail="Not authorized")
    data = await request.json()
    await db.whiteboards.update_one({"project_id": project_id}, {"$set": {"data": data}}, upsert=True)
    return {"message": "Whiteboard saved"}

def fix_project_serialization(project):
    if '_id' in project:
        project['_id'] = str(project['_id'])
    for k, v in project.items():
        if isinstance(v, ObjectId):
            project[k] = str(v)
    return project

@api_router.get('/collaboration/projects')
async def get_collaboration_projects(current_user: User = Depends(get_current_user)):
    projects = await db.projects.find({
        "$or": [
            {"user_id": current_user.id},
            {"collaborators": current_user.id}
        ]
    }).to_list(100)
    user_ids = list(set([p["user_id"] for p in projects]))
    users = {u["id"]: u["name"] for u in await db.users.find({"id": {"$in": user_ids}}).to_list(len(user_ids))}
    for p in projects:
        p["owner_name"] = users.get(p["user_id"], "Unknown")
        fix_project_serialization(p)
    return projects

def fix_invite_serialization(invite):
    if '_id' in invite:
        invite['_id'] = str(invite['_id'])
    for k, v in invite.items():
        if isinstance(v, ObjectId):
            invite[k] = str(v)
    return invite

@api_router.get('/collaboration/invites')
async def get_collaboration_invites(current_user: User = Depends(get_current_user)):
    invites = await db.invites.find({"to_user_id": current_user.id, "status": "pending"}).to_list(50)
    from_ids = list(set([i["from_user_id"] for i in invites]))
    users = {u["id"]: u for u in await db.users.find({"id": {"$in": from_ids}}).to_list(len(from_ids))}
    for i in invites:
        u = users.get(i["from_user_id"])
        i["from_user_name"] = u["name"] if u else "Unknown"
        i["from_user_email"] = u["email"] if u else ""
        fix_invite_serialization(i)
    return invites

class CollaborationInviteRequest(BaseModel):
    user_id: str
    project_id: str

@api_router.post('/collaboration/invite')
async def collaboration_invite(data: CollaborationInviteRequest, current_user: User = Depends(get_current_user)):
    project = await db.projects.find_one({"id": data.project_id})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if current_user.id != project["user_id"] and current_user.id not in project.get("collaborators", []):
        raise HTTPException(status_code=403, detail="Not authorized to invite")
    existing = await db.invites.find_one({"project_id": data.project_id, "to_user_id": data.user_id, "status": "pending"})
    if existing:
        raise HTTPException(status_code=400, detail="Invite already sent")
    invite = Invite(project_id=data.project_id, from_user_id=current_user.id, to_user_id=data.user_id)
    await db.invites.insert_one(invite.dict())
    notif = Notification(user_id=data.user_id, type="invite", message=f"You have been invited to collaborate on project '{project['name']}'", related_project_id=data.project_id)
    notif_doc = notif.dict()
    notif_doc = {k: (str(v) if isinstance(v, ObjectId) else v) for k, v in notif_doc.items()}
    await db.notifications.insert_one(notif_doc)
    return {"message": "Invite sent"}

@api_router.post('/collaboration/invite/{invite_id}/accept')
async def collaboration_accept_invite(invite_id: str, current_user: User = Depends(get_current_user)):
    invite = await db.invites.find_one({"id": invite_id, "to_user_id": current_user.id, "status": "pending"})
    if not invite:
        raise HTTPException(status_code=404, detail="Invite not found or already handled")
    await db.invites.update_one({"id": invite_id}, {"$set": {"status": "accepted"}})
    await db.projects.update_one({"id": invite["project_id"]}, {"$addToSet": {"collaborators": current_user.id}})
    notif = Notification(user_id=invite["from_user_id"], type="info", message=f"{current_user.name} accepted your invite to project.", related_project_id=invite["project_id"])
    notif_doc = notif.dict()
    notif_doc = {k: (str(v) if isinstance(v, ObjectId) else v) for k, v in notif_doc.items()}
    await db.notifications.insert_one(notif_doc)
    return {"message": "Invite accepted"}

@api_router.post('/collaboration/invite/{invite_id}/decline')
async def collaboration_decline_invite(invite_id: str, current_user: User = Depends(get_current_user)):
    invite = await db.invites.find_one({"id": invite_id, "to_user_id": current_user.id, "status": "pending"})
    if not invite:
        raise HTTPException(status_code=404, detail="Invite not found or already handled")
    await db.invites.update_one({"id": invite_id}, {"$set": {"status": "declined"}})
    return {"message": "Invite declined"}

@api_router.get('/projects/{project_id}/invites')
async def get_project_invites(project_id: str, current_user: User = Depends(get_current_user)):
    project = await db.projects.find_one({"id": project_id})
    if not project or current_user.id != project["user_id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    invites = await db.invites.find({"project_id": project_id}).to_list(100)
    user_ids = [i["to_user_id"] for i in invites]
    users = {u["id"]: u for u in await db.users.find({"id": {"$in": user_ids}}).to_list(len(user_ids))}
    for i in invites:
        u = users.get(i["to_user_id"])
        i["user_name"] = u["name"] if u else "Unknown"
        i["user_email"] = u["email"] if u else ""
        if "_id" in i:
            i["_id"] = str(i["_id"])
    return invites

@api_router.get('/projects/{project_id}/collaborators')
async def get_project_collaborators(project_id: str, current_user: User = Depends(get_current_user)):
    project = await db.projects.find_one({"id": project_id})
    if not project or (current_user.id != project["user_id"] and current_user.id not in project.get("collaborators", [])):
        raise HTTPException(status_code=403, detail="Not authorized")
    user_ids = [project["user_id"]] + project.get("collaborators", [])
    users = await db.users.find({"id": {"$in": user_ids}}).to_list(len(user_ids))
    return [{"id": u["id"], "name": u["name"], "email": u["email"]} for u in users]

class ChatMessage(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    project_id: str
    user_id: str
    user_name: str
    type: str = "text"  
    content: Optional[str] = None  
    file_name: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    edited: bool = False
    deleted: bool = False


def fix_chat_message_serialization(msg):
    if '_id' in msg:
        msg['_id'] = str(msg['_id'])
    for k, v in msg.items():
        if isinstance(v, ObjectId):
            msg[k] = str(v)
    return msg

chat_collection = db.project_chat_messages

@api_router.get('/chat/{project_id}')
async def get_chat_messages(project_id: str, current_user: User = Depends(get_current_user)):
    project = await db.projects.find_one({"id": project_id})
    if not project or (current_user.id != project["user_id"] and current_user.id not in project.get("collaborators", [])):
        raise HTTPException(status_code=403, detail="Not authorized")
    msgs = await chat_collection.find({"project_id": project_id}).sort("created_at", 1).to_list(200)
    return [fix_chat_message_serialization(m) for m in msgs]

@api_router.post('/chat/{project_id}/send')
async def send_chat_message(project_id: str, msg: dict = Body(...), current_user: User = Depends(get_current_user)):
    project = await db.projects.find_one({"id": project_id})
    if not project or (current_user.id != project["user_id"] and current_user.id not in project.get("collaborators", [])):
        raise HTTPException(status_code=403, detail="Not authorized")
    chat_msg = ChatMessage(
        project_id=project_id,
        user_id=current_user.id,
        user_name=current_user.name,
        type=msg.get("type", "text"),
        content=msg.get("content"),
        file_name=msg.get("file_name")
    )
    await chat_collection.insert_one(chat_msg.dict())
    return chat_msg.dict()

@api_router.put('/chat/{project_id}/edit/{msg_id}')
async def edit_chat_message(project_id: str, msg_id: str, msg: dict = Body(...), current_user: User = Depends(get_current_user)):
    chat_msg = await chat_collection.find_one({"id": msg_id, "project_id": project_id})
    if not chat_msg or chat_msg["user_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to edit")
    await chat_collection.update_one({"id": msg_id}, {"$set": {"content": msg.get("content"), "edited": True, "updated_at": datetime.now(timezone.utc)}})
    return {"success": True}

@api_router.delete('/chat/{project_id}/delete/{msg_id}')
async def delete_chat_message(project_id: str, msg_id: str, current_user: User = Depends(get_current_user)):
    chat_msg = await chat_collection.find_one({"id": msg_id, "project_id": project_id})
    if not chat_msg or chat_msg["user_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete")
    await chat_collection.update_one({"id": msg_id}, {"$set": {"deleted": True, "content": "", "updated_at": datetime.now(timezone.utc)}})
    return {"success": True}

from fastapi import UploadFile, File
@api_router.post('/chat/{project_id}/upload')
async def upload_chat_file(project_id: str, file: UploadFile = File(...), current_user: User = Depends(get_current_user)):
    folder = ROOT_DIR / 'uploads' / 'chat' / project_id
    folder.mkdir(parents=True, exist_ok=True)
    file_path = folder / file.filename
    with open(file_path, 'wb') as f:
        f.write(await file.read())
    url = f"/uploads/chat/{project_id}/{file.filename}"
    return {"url": url, "file_name": file.filename}

class ChatConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}  # project_id -> websockets
    async def connect(self, project_id: str, websocket: WebSocket):
        await websocket.accept()
        if project_id not in self.active_connections:
            self.active_connections[project_id] = []
        self.active_connections[project_id].append(websocket)
    def disconnect(self, project_id: str, websocket: WebSocket):
        if project_id in self.active_connections:
            self.active_connections[project_id].remove(websocket)
            if not self.active_connections[project_id]:
                del self.active_connections[project_id]
    async def broadcast(self, project_id: str, message: str):
        if project_id in self.active_connections:
            to_remove = []
            for connection in self.active_connections[project_id]:
                try:
                    await connection.send_text(message)
                except Exception:
                    to_remove.append(connection)
            for conn in to_remove:
                self.active_connections[project_id].remove(conn)

chat_manager = ChatConnectionManager()

@app.websocket("/api/ws/chat/{project_id}")
async def chat_websocket(websocket: WebSocket, project_id: str, token: str = None):
    from jose import jwt, JWTError
    if not token:
        await websocket.close(code=1008)
        return
    try:
        payload = jwt.decode(token, jwt_secret, algorithms=[jwt_algorithm])
        user_id: str = payload.get("sub")
        if not user_id:
            await websocket.close(code=1008)
            return
    except JWTError:
        await websocket.close(code=1008)
        return
    project = await db.projects.find_one({"id": project_id})
    if not project or (user_id != project["user_id"] and user_id not in project.get("collaborators", [])):
        await websocket.close(code=1008)
        return
    await chat_manager.connect(project_id, websocket)
    try:
        while True:
            data = await websocket.receive_text()
            msg = json.loads(data)
            if msg.get("type") in ("text", "file", "voice"):
                user_doc = await db.users.find_one({"id": user_id})
                chat_msg = ChatMessage(
                    project_id=project_id,
                    user_id=user_id,
                    user_name=user_doc["name"] if user_doc else "Unknown",
                    type=msg.get("type"),
                    content=msg.get("content"),
                    file_name=msg.get("file_name")
                )
                await chat_collection.insert_one(chat_msg.dict())
                await chat_manager.broadcast(project_id, json.dumps({"type": "message", "message": serialize_for_json(chat_msg.dict())}))
            elif msg.get("type") == "edit":
                chat_msg = await chat_collection.find_one({"id": msg.get("id"), "project_id": project_id})
                if chat_msg and chat_msg["user_id"] == user_id:
                    await chat_collection.update_one({"id": msg.get("id")}, {"$set": {"content": msg.get("content"), "edited": True, "updated_at": datetime.now(timezone.utc)}})
                    await chat_manager.broadcast(project_id, json.dumps({"type": "edit", "id": msg.get("id"), "content": msg.get("content")}))
            elif msg.get("type") == "delete":
                chat_msg = await chat_collection.find_one({"id": msg.get("id"), "project_id": project_id})
                if chat_msg and chat_msg["user_id"] == user_id:
                    await chat_collection.update_one({"id": msg.get("id")}, {"$set": {"deleted": True, "content": "", "updated_at": datetime.now(timezone.utc)}})
                    await chat_manager.broadcast(project_id, json.dumps({"type": "delete", "id": msg.get("id")}))
    except WebSocketDisconnect:
        chat_manager.disconnect(project_id, websocket)

@api_router.post("/calendar/events", response_model=CalendarEvent)
async def create_calendar_event(event_data: CalendarEventCreate, current_user: User = Depends(get_current_user)):
    start = event_data.start
    end = event_data.end
    if isinstance(start, str):
        start = parser.parse(start)
    if isinstance(end, str):
        end = parser.parse(end)
    data = event_data.dict()
    data.pop('start', None)
    data.pop('end', None)
    event = CalendarEvent(
        **data,
        user_id=current_user.id,
        start=start.astimezone(timezone.utc),
        end=end.astimezone(timezone.utc),
    )
    await db.calendar_events.insert_one(event.dict())
    return event

@api_router.get("/calendar/events", response_model=List[CalendarEvent])
async def get_calendar_events(
    start: str = Query(..., description="Start datetime in ISO format"),
    end: str = Query(..., description="End datetime in ISO format"),
    current_user: User = Depends(get_current_user)
):
    start_dt = parser.parse(start)
    end_dt = parser.parse(end)
    query = {
        "user_id": current_user.id,
        "start": {"$lt": end_dt},
        "end": {"$gt": start_dt},
    }
    events = await db.calendar_events.find(query).to_list(1000)
    return [CalendarEvent(**event) for event in events]

@api_router.put("/calendar/events/{event_id}", response_model=CalendarEvent)
async def update_calendar_event(event_id: str, event_data: CalendarEventUpdate, current_user: User = Depends(get_current_user)):
    update_data = {k: v for k, v in event_data.dict().items() if v is not None}
    if 'start' in update_data:
        if isinstance(update_data['start'], str):
            update_data['start'] = parser.parse(update_data['start'])
        update_data['start'] = update_data['start'].astimezone(timezone.utc)
    if 'end' in update_data:
        if isinstance(update_data['end'], str):
            update_data['end'] = parser.parse(update_data['end'])
        update_data['end'] = update_data['end'].astimezone(timezone.utc)
    update_data["updated_at"] = datetime.now(timezone.utc)
    
    await db.calendar_events.update_one(
        {"id": event_id, "user_id": current_user.id},
        {"$set": update_data}
    )
    
    updated_event = await db.calendar_events.find_one({"id": event_id, "user_id": current_user.id})
    if not updated_event:
        raise HTTPException(status_code=404, detail="Event not found")
    return CalendarEvent(**updated_event)

@api_router.delete("/calendar/events/{event_id}")
async def delete_calendar_event(event_id: str, current_user: User = Depends(get_current_user)):
    result = await db.calendar_events.delete_one({"id": event_id, "user_id": current_user.id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Event not found")
    return {"message": "Event deleted successfully"}

app.include_router(api_router)

app.mount("/uploads/chat", StaticFiles(directory=str(ROOT_DIR / "uploads" / "chat")), name="chat_uploads")

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()


if __name__ == "__main__":
    import uvicorn
    import os

    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("server:app", host="0.0.0.0", port=port)
