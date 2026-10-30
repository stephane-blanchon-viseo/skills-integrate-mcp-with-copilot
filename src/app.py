"""
High School Management System API

A super simple FastAPI application that allows students to view and sign up
for extracurricular activities at Mergington High School.
"""

from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
import os
import json
from pathlib import Path

app = FastAPI(title="Mergington High School API",
              description="API for viewing and signing up for extracurricular activities")

# Mount the static files directory
current_dir = Path(__file__).parent
app.mount("/static", StaticFiles(directory=os.path.join(Path(__file__).parent,
          "static")), name="static")


class LoginRequest(BaseModel):
    username: str
    password: str


# Load teachers from JSON file
def load_teachers():
    teachers_file = Path(__file__).parent / "teachers.json"
    if teachers_file.exists():
        with open(teachers_file) as f:
            data = json.load(f)
            return data.get("teachers", [])
    return []


def authenticate_teacher(username: str, password: str) -> bool:
    """Check if the provided credentials match a teacher account"""
    teachers = load_teachers()
    return any(t["username"] == username and t["password"] == password for t in teachers)


# Load activities from JSON file
activities_file = Path(__file__).parent / "activities.json"
with open(activities_file) as f:
    activities = json.load(f)


@app.get("/")
def root():
    return RedirectResponse(url="/static/index.html")


@app.post("/login")
def login(request: LoginRequest):
    """Authenticate a teacher"""
    if authenticate_teacher(request.username, request.password):
        return {"success": True, "message": "Login successful"}
    else:
        raise HTTPException(status_code=401, detail="Invalid credentials")


@app.get("/activities")
def get_activities():
    return activities


@app.post("/activities/{activity_name}/signup")
def signup_for_activity(activity_name: str, email: str, is_admin: bool = False):
    """Sign up a student for an activity (admin only)"""
    # Check admin status
    if not is_admin:
        raise HTTPException(
            status_code=403,
            detail="Only teachers can register students"
        )
    
    # Validate activity exists
    if activity_name not in activities:
        raise HTTPException(status_code=404, detail="Activity not found")

    # Get the specific activity
    activity = activities[activity_name]

    # Validate student is not already signed up
    if email in activity["participants"]:
        raise HTTPException(
            status_code=400,
            detail="Student is already signed up"
        )

    # Add student
    activity["participants"].append(email)
    return {"message": f"Signed up {email} for {activity_name}"}


@app.delete("/activities/{activity_name}/unregister")
def unregister_from_activity(activity_name: str, email: str, is_admin: bool = False):
    """Unregister a student from an activity (admin only)"""
    # Check admin status
    if not is_admin:
        raise HTTPException(
            status_code=403,
            detail="Only teachers can unregister students"
        )
    
    # Validate activity exists
    if activity_name not in activities:
        raise HTTPException(status_code=404, detail="Activity not found")

    # Get the specific activity
    activity = activities[activity_name]

    # Validate student is signed up
    if email not in activity["participants"]:
        raise HTTPException(
            status_code=400,
            detail="Student is not signed up for this activity"
        )

    # Remove student
    activity["participants"].remove(email)
    return {"message": f"Unregistered {email} from {activity_name}"}
