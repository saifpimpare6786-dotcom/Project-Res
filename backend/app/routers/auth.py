import uuid
import sqlite3
from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends
from app.core.config import settings
from app.core.auth import hash_password, verify_password, create_access_token, get_current_user
from app.schemas.api_models import (
    StudentRegisterRequest, LoginRequest, TokenResponse, UserProfileResponse
)

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


def get_db():
    conn = sqlite3.connect(settings.SQLITE_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()


@router.post("/register", response_model=TokenResponse, status_code=201)
def register_user(req: StudentRegisterRequest, db: sqlite3.Connection = Depends(get_db)):
    """Register a new student or TPO account. Issues a JWT on success."""
    cursor = db.cursor()

    # Check for duplicate email
    cursor.execute("SELECT id FROM students WHERE email = ?", (req.email.lower().strip(),))
    if cursor.fetchone():
        raise HTTPException(status_code=409, detail="An account with this email already exists.")

    # Validate role
    allowed_roles = ("student", "tpo")
    role = req.role if req.role in allowed_roles else "student"

    user_id = str(uuid.uuid4())
    hashed = hash_password(req.password)

    cursor.execute("""
        INSERT INTO students (id, name, email, hashed_password, role, batch, branch, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (user_id, req.name, req.email.lower().strip(), hashed, role, req.batch, req.branch, datetime.utcnow().isoformat()))
    db.commit()

    token = create_access_token({"sub": user_id, "email": req.email.lower(), "role": role, "name": req.name})
    return TokenResponse(
        access_token=token,
        user_id=user_id,
        name=req.name,
        role=role,
        email=req.email.lower()
    )


@router.post("/login", response_model=TokenResponse)
def login_user(req: LoginRequest, db: sqlite3.Connection = Depends(get_db)):
    """Authenticate a student or TPO and return a JWT access token."""
    cursor = db.cursor()
    cursor.execute("SELECT * FROM students WHERE email = ?", (req.email.lower().strip(),))
    user = cursor.fetchone()

    if not user or not verify_password(req.password, user["hashed_password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    # Update last_login timestamp
    cursor.execute("UPDATE students SET last_login = ? WHERE id = ?",
                   (datetime.utcnow().isoformat(), user["id"]))
    db.commit()

    token = create_access_token({
        "sub": user["id"],
        "email": user["email"],
        "role": user["role"],
        "name": user["name"]
    })
    return TokenResponse(
        access_token=token,
        user_id=user["id"],
        name=user["name"],
        role=user["role"],
        email=user["email"]
    )


@router.get("/me", response_model=UserProfileResponse)
def get_my_profile(current_user: dict = Depends(get_current_user), db: sqlite3.Connection = Depends(get_db)):
    """Return the authenticated user's profile."""
    cursor = db.cursor()
    cursor.execute("SELECT * FROM students WHERE id = ?", (current_user["sub"],))
    user = cursor.fetchone()
    if not user:
        raise HTTPException(status_code=404, detail="User profile not found.")
    return UserProfileResponse(
        id=user["id"],
        name=user["name"],
        email=user["email"],
        role=user["role"],
        batch=user["batch"],
        branch=user["branch"],
        created_at=user["created_at"]
    )


@router.get("/users")
def list_users(current_user: dict = Depends(get_current_user), db: sqlite3.Connection = Depends(get_db)):
    """List all users (TPO only). Used by admin dashboard."""
    if current_user.get("role") != "tpo":
        raise HTTPException(status_code=403, detail="TPO access required.")
    cursor = db.cursor()
    cursor.execute("SELECT id, name, email, role, batch, branch, created_at, last_login FROM students ORDER BY created_at DESC")
    return [dict(r) for r in cursor.fetchall()]
