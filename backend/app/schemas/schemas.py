from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional, List
from datetime import datetime
from enum import Enum


class UserRole(str, Enum):
    student = "student"
    admin = "admin"


class Department(str, Enum):
    cs = "Computer Science"
    it = "Information Technology"
    ece = "Electronics & Communication"
    ee = "Electrical Engineering"
    me = "Mechanical Engineering"
    ce = "Civil Engineering"
    chem = "Chemical Engineering"
    mba = "MBA"
    mca = "MCA"
    bca = "BCA"
    other = "Other"


class AcademicYear(str, Enum):
    first = "1st Year"
    second = "2nd Year"
    third = "3rd Year"
    fourth = "4th Year"
    fifth = "5th Year"
    postgrad = "Postgraduate"


class AvailabilitySlot(BaseModel):
    day: str
    start_time: str
    end_time: str


# ─── Auth Schemas ──────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    department: Department
    academic_year: AcademicYear

    @validator("full_name")
    def name_must_not_be_empty(cls, v):
        if not v.strip():
            raise ValueError("Name cannot be empty")
        return v.strip()


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


class PasswordResetRequest(BaseModel):
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str = Field(..., min_length=8)


# ─── Profile Schemas ───────────────────────────────────────────────────────────

class SkillEntry(BaseModel):
    name: str
    level: str  # beginner, intermediate, advanced, expert
    category: str


class UpdateProfileRequest(BaseModel):
    full_name: Optional[str] = Field(None, min_length=2, max_length=100)
    bio: Optional[str] = Field(None, max_length=500)
    department: Optional[Department] = None
    academic_year: Optional[AcademicYear] = None
    skills_offered: Optional[List[SkillEntry]] = None
    skills_wanted: Optional[List[str]] = None
    interests: Optional[List[str]] = None
    languages: Optional[List[str]] = None
    availability: Optional[List[AvailabilitySlot]] = None
    is_profile_public: Optional[bool] = None
    show_department: Optional[bool] = None
    show_year: Optional[bool] = None

    class Config:
        use_enum_values = True


class OnboardingStep(BaseModel):
    step: int
    data: dict


# ─── Skill Listing Schemas ──────────────────────────────────────────────────────

class SkillLevel(str, Enum):
    beginner = "Beginner"
    intermediate = "Intermediate"
    advanced = "Advanced"
    expert = "Expert"


class SessionFormat(str, Enum):
    online = "Online"
    offline = "In Person"
    hybrid = "Hybrid"


class SkillListingCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=120)
    description: str = Field(..., min_length=10, max_length=2000)
    category: str
    skill_level: SkillLevel
    session_duration_minutes: int = Field(..., ge=15, le=240)
    preferred_language: str = "English"
    session_format: SessionFormat = SessionFormat.hybrid
    availability: List[AvailabilitySlot] = []
    tags: List[str] = []

    class Config:
        use_enum_values = True


class SkillListingUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=3, max_length=120)
    description: Optional[str] = Field(None, min_length=10, max_length=2000)
    category: Optional[str] = None
    skill_level: Optional[SkillLevel] = None
    session_duration_minutes: Optional[int] = Field(None, ge=15, le=240)
    preferred_language: Optional[str] = None
    session_format: Optional[SessionFormat] = None
    availability: Optional[List[AvailabilitySlot]] = None
    tags: Optional[List[str]] = None
    status: Optional[str] = None  # active, paused, closed

    class Config:
        use_enum_values = True


# ─── Resource Schemas ─────────────────────────────────────────────────────────

class ItemCondition(str, Enum):
    new = "New"
    like_new = "Like New"
    good = "Good"
    fair = "Fair"
    heavily_used = "Heavily Used"
    poor = "Poor"


class ResourceCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=120)
    description: str = Field(..., min_length=5, max_length=2000)
    category: str
    condition: str = "Good"
    available_from: Optional[str] = None
    available_until: Optional[str] = None
    max_loan_days: Optional[int] = 7
    max_duration_days: Optional[int] = 7
    pickup_location: Optional[str] = "Campus Library"
    pickup_instructions: Optional[str] = None
    lending_notes: Optional[str] = None
    is_deposit_required: Optional[bool] = False
    deposit_amount: Optional[float] = 0.0
    tags: Optional[List[str]] = []

    class Config:
        extra = "allow"
        use_enum_values = True


class ResourceUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    condition: Optional[str] = None
    available_from: Optional[str] = None
    available_until: Optional[str] = None
    max_loan_days: Optional[int] = None
    max_duration_days: Optional[int] = None
    pickup_location: Optional[str] = None
    pickup_instructions: Optional[str] = None
    lending_notes: Optional[str] = None
    status: Optional[str] = None

    class Config:
        extra = "allow"
        use_enum_values = True


# ─── Exchange Request Schemas ─────────────────────────────────────────────────

class ExchangeRequestCreate(BaseModel):
    listing_id: str
    request_type: str  # "skill" | "resource"
    proposed_time: Optional[str] = None
    proposed_date: Optional[str] = None
    duration_days: Optional[int] = None
    message: Optional[str] = Field(None, max_length=500)
    return_date: Optional[str] = None  # for resource loans

    class Config:
        extra = "allow"


class ExchangeRequestAction(BaseModel):
    action: str  # accept | reject | cancel | suggest_time | confirm_handover | confirm_return
    message: Optional[str] = Field(None, max_length=500)
    suggested_time: Optional[str] = None


# ─── Project Schemas ──────────────────────────────────────────────────────────

class OpenRole(BaseModel):
    title: str
    description: str
    required_skills: List[str]


class ProjectCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=120)
    problem_statement: Optional[str] = ""
    description: str = Field(..., min_length=5, max_length=3000)
    goals: List[str] = []
    tech_stack: List[str] = []
    required_skills: List[str] = []
    open_roles: List[OpenRole] = []
    max_team_size: Optional[int] = 4
    commitment_hours_per_week: int = Field(default=5, ge=1, le=40)
    timeline: Optional[str] = None
    deadline: Optional[str] = None
    category: str = "General"

    class Config:
        extra = "allow"


class ProjectApplicationCreate(BaseModel):
    project_id: str
    role_title: str
    message: str = Field(..., min_length=10, max_length=1000)
    relevant_skills: List[str] = []


# ─── Message Schemas ──────────────────────────────────────────────────────────

class MessageCreate(BaseModel):
    recipient_id: str
    content: str = Field(..., min_length=1, max_length=2000)


class MessageSend(BaseModel):
    content: str = Field(..., min_length=1, max_length=2000)


# ─── Review Schemas ───────────────────────────────────────────────────────────

class ReviewCreate(BaseModel):
    exchange_id: str
    rating: int = Field(..., ge=1, le=5)
    comment: Optional[str] = Field(None, max_length=500)


# ─── Report Schemas ───────────────────────────────────────────────────────────

class ReportCreate(BaseModel):
    target_type: str  # "user" | "listing" | "resource" | "project"
    target_id: str
    reason: str
    details: Optional[str] = Field(None, max_length=1000)


# ─── Pagination ───────────────────────────────────────────────────────────────

class PaginatedResponse(BaseModel):
    items: List[dict]
    total: int
    page: int
    page_size: int
    pages: int
