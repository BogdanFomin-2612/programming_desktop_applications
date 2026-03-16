from pydantic import BaseModel
from typing import Optional


class StudentBase(BaseModel):
    name: str
    email: str
    avatar_color: Optional[str] = "#2563EB"


class StudentCreate(StudentBase):
    pass


class StudentUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    avatar_color: Optional[str] = None


class Student(StudentBase):
    id: str
    gpa: float = 0.0
    attendance_pct: float = 100.0
    today_status: str = "present"


# ------- Attendance -------

class AttendanceMark(BaseModel):
    status: str  # present | late | absent


# ------- Grades -------

class GradeCreate(BaseModel):
    student_id: str
    subject: str
    value: float
    date: str
    description: Optional[str] = ""


# ------- Code Review -------

class CodeReviewCreate(BaseModel):
    student_id: str
    title: str
    language: str
    code: str
    feedback: Optional[str] = ""
    score: Optional[float] = None
    date: str
