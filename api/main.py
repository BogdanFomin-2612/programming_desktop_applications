from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from bson import ObjectId
from datetime import date, datetime
import asyncio

from database import connect_db, close_db, get_db
from models import (
    StudentCreate, StudentUpdate, AttendanceMark,
    GradeCreate, CodeReviewCreate
)

app = FastAPI(title="Homeroom Hub API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    await connect_db()
    await seed_data()


@app.on_event("shutdown")
async def shutdown():
    await close_db()


def oid(doc):
    """Convert ObjectId to string id."""
    if doc:
        doc["id"] = str(doc.pop("_id"))
    return doc


async def seed_data():
    """Insert sample data if empty."""
    db = get_db()
    if await db.students.count_documents({}) == 0:
        today = date.today().isoformat()
        students = [
            {"name": "Emma Johnson",   "email": "emma.j@school.edu",   "avatar_color": "#2563EB", "gpa": 8.5, "attendance_pct": 96},
            {"name": "Liam Smith",     "email": "liam.s@school.edu",   "avatar_color": "#7C3AED", "gpa": 7.2, "attendance_pct": 89},
            {"name": "Olivia Brown",   "email": "olivia.b@school.edu", "avatar_color": "#16A34A", "gpa": 9.1, "attendance_pct": 94},
            {"name": "Noah Davis",     "email": "noah.d@school.edu",   "avatar_color": "#EA580C", "gpa": 6.8, "attendance_pct": 71},
            {"name": "Ava Wilson",     "email": "ava.w@school.edu",    "avatar_color": "#DB2777", "gpa": 9.4, "attendance_pct": 98},
            {"name": "Ethan Martinez", "email": "ethan.m@school.edu",  "avatar_color": "#0891B2", "gpa": 7.8, "attendance_pct": 85},
            {"name": "Sophia Lee",     "email": "sophia.l@school.edu", "avatar_color": "#65A30D", "gpa": 8.9, "attendance_pct": 92},
            {"name": "Mason Taylor",   "email": "mason.t@school.edu",  "avatar_color": "#B45309", "gpa": 6.5, "attendance_pct": 78},
            {"name": "Isabella Garcia","email": "isabella.g@school.edu","avatar_color": "#6D28D9", "gpa": 8.2, "attendance_pct": 90},
            {"name": "Logan White",    "email": "logan.w@school.edu",  "avatar_color": "#047857", "gpa": 7.6, "attendance_pct": 87},
        ]
        result = await db.students.insert_many(students)
        ids = result.inserted_ids

        # Seed today's attendance
        statuses = ["present","present","late","absent","present","present","present","present","absent","present"]
        attendance_docs = [
            {"student_id": str(ids[i]), "date": today, "status": statuses[i]}
            for i in range(len(ids))
        ]
        await db.attendance.insert_many(attendance_docs)

        # Seed grades
        grades = [
            {"student_id": str(ids[0]), "subject": "Math",    "value": 9.0, "date": today, "description": "Final exam"},
            {"student_id": str(ids[1]), "subject": "Math",    "value": 6.5, "date": today, "description": "Quiz"},
            {"student_id": str(ids[2]), "subject": "Physics", "value": 9.5, "date": today, "description": "Lab report"},
            {"student_id": str(ids[3]), "subject": "Physics", "value": 5.0, "date": today, "description": "Missed classes"},
            {"student_id": str(ids[4]), "subject": "English", "value": 9.8, "date": today, "description": "Essay"},
        ]
        await db.grades.insert_many(grades)

        # Seed alerts
        alerts = [
            {"type": "critical", "teacher": "Dr. Sarah Chen", "subject": "Physics",
             "student_name": "Noah Davis",
             "message": "Noah has missed 3 consecutive physics classes. Recommend parent contact.",
             "created_at": datetime.utcnow().isoformat()},
            {"type": "warning", "teacher": "Mr. James Wilson", "subject": "Math",
             "student_name": "Liam Smith",
             "message": "Liam's recent quiz scores have dropped. May need additional support.",
             "created_at": datetime.utcnow().isoformat()},
            {"type": "info", "teacher": "Ms. Emily Rodriguez", "subject": "English",
             "student_name": "Ava Wilson",
             "message": "Ava showed exceptional performance in essay writing. Consider advanced placement.",
             "created_at": datetime.utcnow().isoformat()},
        ]
        await db.alerts.insert_many(alerts)

        # Seed code reviews
        reviews = [
            {"student_id": str(ids[0]), "title": "Bubble Sort", "language": "Python",
             "code": "def bubble_sort(arr):\n    n = len(arr)\n    for i in range(n):\n        for j in range(0, n-i-1):\n            if arr[j] > arr[j+1]:\n                arr[j], arr[j+1] = arr[j+1], arr[j]\n    return arr",
             "feedback": "Good implementation! Consider adding early termination when no swaps occur.", "score": 8.5, "date": today},
            {"student_id": str(ids[1]), "title": "Fibonacci", "language": "JavaScript",
             "code": "function fib(n) {\n  if (n <= 1) return n;\n  return fib(n-1) + fib(n-2);\n}",
             "feedback": "Works but exponential complexity. Try memoization.", "score": 6.0, "date": today},
        ]
        await db.code_reviews.insert_many(reviews)


# ─────────────────────────── STUDENTS ───────────────────────────

@app.get("/students")
async def list_students():
    db = get_db()
    today = date.today().isoformat()
    students = []
    async for s in db.students.find():
        s = oid(s)
        rec = await db.attendance.find_one({"student_id": s["id"], "date": today})
        s["today_status"] = rec["status"] if rec else "present"
        students.append(s)
    return students


@app.post("/students", status_code=201)
async def create_student(data: StudentCreate):
    db = get_db()
    doc = data.model_dump()
    doc["gpa"] = 0.0
    doc["attendance_pct"] = 100.0
    result = await db.students.insert_one(doc)
    doc["id"] = str(result.inserted_id)
    doc["today_status"] = "present"
    return doc


@app.put("/students/{student_id}")
async def update_student(student_id: str, data: StudentUpdate):
    db = get_db()
    update = {k: v for k, v in data.dict().items() if v is not None}
    if not update:
        raise HTTPException(400, "No fields to update")
    await db.students.update_one({"_id": ObjectId(student_id)}, {"$set": update})
    doc = await db.students.find_one({"_id": ObjectId(student_id)})
    return oid(doc)


@app.delete("/students/{student_id}", status_code=204)
async def delete_student(student_id: str):
    db = get_db()
    await db.students.delete_one({"_id": ObjectId(student_id)})
    await db.attendance.delete_many({"student_id": student_id})
    await db.grades.delete_many({"student_id": student_id})
    await db.code_reviews.delete_many({"student_id": student_id})


# ─────────────────────────── ATTENDANCE ───────────────────────────

@app.get("/attendance/today")
async def today_attendance():
    db = get_db()
    today = date.today().isoformat()
    total = await db.students.count_documents({})
    present = await db.attendance.count_documents({"date": today, "status": "present"})
    late = await db.attendance.count_documents({"date": today, "status": "late"})
    absent = await db.attendance.count_documents({"date": today, "status": "absent"})
    rate = round((present / total * 100) if total else 0, 1)
    return {"total": total, "present": present, "late": late, "absent": absent, "rate": rate}


@app.put("/attendance/{student_id}")
async def mark_attendance(student_id: str, data: AttendanceMark):
    db = get_db()
    today = date.today().isoformat()
    await db.attendance.update_one(
        {"student_id": student_id, "date": today},
        {"$set": {"status": data.status}},
        upsert=True
    )
    # Recompute attendance_pct
    total = await db.attendance.count_documents({"student_id": student_id})
    present = await db.attendance.count_documents({"student_id": student_id, "status": "present"})
    pct = round((present / total * 100) if total else 100, 1)
    await db.students.update_one({"_id": ObjectId(student_id)}, {"$set": {"attendance_pct": pct}})
    return {"status": data.status, "attendance_pct": pct}


# ─────────────────────────── GRADES ───────────────────────────

@app.get("/grades")
async def list_grades():
    db = get_db()
    grades = []
    async for g in db.grades.find().sort("date", -1):
        g = oid(g)
        student = await db.students.find_one({"_id": ObjectId(g["student_id"])})
        g["student_name"] = student["name"] if student else "Unknown"
        grades.append(g)
    return grades


@app.post("/grades", status_code=201)
async def create_grade(data: GradeCreate):
    db = get_db()
    doc = data.model_dump()
    result = await db.grades.insert_one(doc)
    doc["id"] = str(result.inserted_id)
    # Recompute GPA
    all_grades = []
    async for g in db.grades.find({"student_id": data.student_id}):
        all_grades.append(g["value"])
    gpa = round(sum(all_grades) / len(all_grades), 2) if all_grades else 0.0
    await db.students.update_one({"_id": ObjectId(data.student_id)}, {"$set": {"gpa": gpa}})
    student = await db.students.find_one({"_id": ObjectId(data.student_id)})
    doc["student_name"] = student["name"] if student else ""
    return doc


@app.delete("/grades/{grade_id}", status_code=204)
async def delete_grade(grade_id: str):
    db = get_db()
    grade = await db.grades.find_one({"_id": ObjectId(grade_id)})
    if grade:
        await db.grades.delete_one({"_id": ObjectId(grade_id)})
        # Recompute GPA
        all_grades = []
        async for g in db.grades.find({"student_id": grade["student_id"]}):
            all_grades.append(g["value"])
        gpa = round(sum(all_grades) / len(all_grades), 2) if all_grades else 0.0
        await db.students.update_one(
            {"_id": ObjectId(grade["student_id"])}, {"$set": {"gpa": gpa}}
        )


# ─────────────────────────── CODE REVIEWS ───────────────────────────

@app.get("/code-reviews")
async def list_reviews():
    db = get_db()
    reviews = []
    async for r in db.code_reviews.find().sort("date", -1):
        r = oid(r)
        student = await db.students.find_one({"_id": ObjectId(r["student_id"])})
        r["student_name"] = student["name"] if student else "Unknown"
        reviews.append(r)
    return reviews


@app.post("/code-reviews", status_code=201)
async def create_review(data: CodeReviewCreate):
    db = get_db()
    doc = data.model_dump()
    result = await db.code_reviews.insert_one(doc)
    doc["id"] = str(result.inserted_id)
    student = await db.students.find_one({"_id": ObjectId(data.student_id)})
    doc["student_name"] = student["name"] if student else ""
    return doc


@app.put("/code-reviews/{review_id}")
async def update_review(review_id: str, data: CodeReviewCreate):
    db = get_db()
    update = data.dict()
    await db.code_reviews.update_one({"_id": ObjectId(review_id)}, {"$set": update})
    doc = await db.code_reviews.find_one({"_id": ObjectId(review_id)})
    return oid(doc)


@app.delete("/code-reviews/{review_id}", status_code=204)
async def delete_review(review_id: str):
    db = get_db()
    await db.code_reviews.delete_one({"_id": ObjectId(review_id)})


# ─────────────────────────── ALERTS ───────────────────────────

@app.get("/alerts")
async def list_alerts():
    db = get_db()
    alerts = []
    async for a in db.alerts.find().sort("created_at", -1):
        a = oid(a)
        alerts.append(a)
    return alerts
