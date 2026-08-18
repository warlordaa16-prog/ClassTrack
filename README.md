ClassTrack — Architecture & Development Specification

1. Project Overview

Project Name: ClassTrack
Project Type: Mobile-First Web Application / Progressive Web App (PWA)
Deployment Platform: Netlify
Database: PostgreSQL
ORM: Prisma
Primary Purpose: Digitize, automate, validate, and analyze student class attendance.

ClassTrack allows lecturers to create attendance sessions, students to securely check in using their mobile devices, and coordinators/administrators to monitor attendance across courses, classes, and students.

The system is designed specifically for:

- Mobile-first usage
- Fast attendance marking
- QR-based attendance
- API-based validation
- Optional location validation
- Offline-friendly operation
- Role-based access control
- Automatic attendance calculations
- Netlify deployment
- Cloud database storage
- Future scalability

---

2. Core Design Philosophy

The system follows these principles:

1. Mobile First
2. Fast
3. Simple
4. Secure
5. Offline Friendly
6. API Driven
7. Cloud Ready
8. Netlify Compatible
9. Scalable
10. Easy to Maintain

The attendance process should require as few interactions as possible.

Target student flow:

Open App
   ↓
Scan QR
   ↓
Validate
   ↓
Confirm
   ↓
Attendance Recorded

---

3. User Roles

3.1 Lecturer

The lecturer conducts attendance sessions.

Capabilities:

- Login
- View assigned courses
- View enrolled students
- Create attendance session
- Open/close attendance
- Generate QR attendance code
- Monitor attendance
- View present students
- View late students
- View absent students
- Manually correct attendance
- View attendance history
- Export attendance reports

---

3.2 Coordinator

The coordinator manages attendance at department/program level.

Capabilities:

- Login
- View departments
- View programs
- View courses
- View lecturers
- View students
- Monitor attendance
- View attendance statistics
- Generate reports
- Identify students with poor attendance
- View lecturer attendance activity
- Manage course assignments

---

3.3 Student

Students primarily use ClassTrack through their phones.

Capabilities:

- Login
- View profile
- View registered courses
- Scan attendance QR
- Check attendance status
- View attendance history
- View attendance percentage
- View late/absent records
- Receive notifications

---

3.4 Administrator

The administrator manages the entire system.

Capabilities:

- Manage users
- Manage students
- Manage lecturers
- Manage coordinators
- Manage departments
- Manage programs
- Manage courses
- Manage semesters
- Manage system settings
- View system-wide reports
- Audit attendance records
- Manage permissions

---

4. Recommended Technology Stack

Frontend

- Next.js
- React
- TypeScript
- Tailwind CSS
- shadcn/ui
- React Hook Form
- Zod
- TanStack Query

PWA

- Web App Manifest
- Service Worker
- Workbox
- IndexedDB

Backend

Use the Next.js server-side architecture supported by Netlify:

- Route Handlers
- Server Actions where appropriate
- Middleware
- Server-side authentication
- API validation
- Netlify Functions through the Netlify Next.js runtime

The application should remain serverless.

There is no requirement for a permanently running Express server.

---

5. Database

Recommended database:

PostgreSQL

Recommended providers:

- Supabase PostgreSQL
- Neon PostgreSQL

The application should use:

Prisma ORM

Architecture:

Next.js
   |
Netlify
   |
Serverless Functions
   |
Prisma
   |
PostgreSQL
   |
Supabase / Neon

The database should NOT be hosted directly inside Netlify.

---

6. Authentication

Authentication should support:

- Email/password
- Secure sessions
- Password hashing
- Role-based authorization
- Session expiration
- Password reset
- Account activation/deactivation

User hierarchy:

User
 |
 +-- Student
 |
 +-- Lecturer
 |
 +-- Coordinator
 |
 +-- Administrator

Never trust a role supplied by the frontend.

All authorization decisions must be made server-side.

---

7. Attendance Architecture

Attendance consists of:

Course
   |
Attendance Session
   |
Temporary Attendance Token
   |
Student Check-in
   |
Server Validation
   |
Attendance Record

Example:

Course:
Database Systems

Date:
18 August 2026

Start:
14:00

End:
16:00

The lecturer creates the attendance session.

The system generates a temporary QR token.

Students scan the QR code.

The backend validates:

1. Student authentication
2. Student enrollment
3. Session validity
4. Token validity
5. Session expiration
6. Duplicate attendance
7. Optional location validation
8. Optional device/session validation

Only a successful validation creates an attendance record.

---

8. QR Attendance System

QR codes must NOT contain permanent student information.

The QR code contains a temporary attendance session URL.

Example:

https://classtrack.netlify.app/attendance/SESSION_TOKEN

The token should:

- Be cryptographically random
- Expire
- Belong to one attendance session
- Become invalid when the session closes
- Never expose sensitive information

Recommended token lifetime:

5–15 minutes

The lecturer may refresh the token during an active session.

---

9. Attendance Validation

Student flow:

Student
   |
   v
Scan QR
   |
   v
Attendance Page
   |
   v
Authenticate
   |
   v
Send Attendance Request
   |
   v
Netlify Function / API
   |
   +-- Session valid?
   |
   +-- Token valid?
   |
   +-- Student enrolled?
   |
   +-- Session open?
   |
   +-- Already marked?
   |
   +-- Location valid?
   |
   v
Create Attendance Record
   |
   v
Return Success

---

10. API-Based Validation

No dedicated hardware is required.

Validation uses:

Primary

- Authentication
- QR token
- Attendance session
- Course enrollment
- Server-side timestamp

Optional

- Browser geolocation
- IP information
- Device/session information
- Network validation

The system must never rely on client-side validation alone.

---

11. Location Validation

Location validation is optional.

A course/classroom may have:

Latitude:
XX.XXXX

Longitude:
XX.XXXX

Allowed Radius:
100 meters

The browser requests location permission.

The server calculates the distance.

Example:

Student distance: 42m
Allowed radius: 100m

Result:
VALID

If:

Student distance: 450m
Allowed radius: 100m

Result:
INVALID

Geolocation should be treated as a supporting verification mechanism rather than an absolute anti-cheating mechanism.

---

12. Offline Architecture

ClassTrack should be an installable PWA.

Use:

IndexedDB

for temporary client-side storage.

Offline capabilities may include:

- Application shell caching
- Previously loaded courses
- Cached attendance history
- Cached timetable
- Temporary request queue

However, the server remains the final authority.

A student must not be able to fabricate an attendance record while offline.

Recommended behavior:

Offline
   |
   v
Request queued
   |
   v
Internet restored
   |
   v
Netlify API
   |
   v
Server validation
   |
   v
PostgreSQL

---

13. Database Entities

Core entities:

User
Student
Lecturer
Coordinator
Administrator
Department
Program
Course
CourseEnrollment
AcademicSemester
AttendanceSession
AttendanceToken
AttendanceRecord
AttendanceAudit
Notification

---

14. Data Relationships

Department
    |
    +---- Programs
    |
    +---- Courses
             |
             +---- Course Enrollment
             |          |
             |          +---- Students
             |
             +---- Lecturers
             |
             +---- Attendance Sessions
                         |
                         +---- Attendance Records
                                      |
                                      +---- Students

---

15. Attendance Status

Supported statuses:

PRESENT
LATE
ABSENT
EXCUSED

Example:

0–10 minutes after class starts
= PRESENT

10+ minutes after class starts
= LATE

No valid attendance record
= ABSENT

These rules must be configurable by the institution.

---

16. Attendance Calculation

Default calculation:

Attendance %
=
(Present + Late) / Expected Sessions × 100

Example:

Total Classes = 20
Present = 17
Late = 1
Absent = 2

Attendance =
18 / 20 × 100

= 90%

The institution may configure whether late attendance counts toward the percentage.

---

17. Student Dashboard

Mobile-first design:

--------------------------------
Good Morning
Student Name
--------------------------------

Overall Attendance

        87%

--------------------------------

My Courses

Database Systems       92%
Web Development        88%
Computer Networks      81%
Software Engineering   90%

--------------------------------

Today's Classes

10:00 AM
Database Systems

2:00 PM
Web Development

--------------------------------

       [ SCAN ATTENDANCE ]

--------------------------------

---

18. Lecturer Dashboard

--------------------------------
Lecturer Dashboard
--------------------------------

Today's Classes

Database Systems
10:00 AM – 12:00 PM

[ OPEN ATTENDANCE ]

--------------------------------

Attendance Today

Present       42
Late           3
Absent         5

--------------------------------

Recent Sessions
--------------------------------

---

19. Live Attendance Screen

When attendance is active:

Database Systems

Attendance Session

42 / 50 Students

████████████████░░ 84%

        QR CODE

Session:
OPEN

Remaining:
07:42

[ REFRESH QR ]

--------------------------------

Present: 42
Late: 3
Absent: 5
--------------------------------

The system should refresh attendance statistics efficiently.

For the MVP, polling can be used.

Real-time WebSocket infrastructure should only be introduced if required by scale.

---

20. Coordinator Dashboard

Metrics:

Total Students
Total Courses
Active Lecturers
Today's Sessions
Average Attendance
Low Attendance Students

Analytics:

- Attendance by course
- Attendance by department
- Attendance by semester
- Student attendance trends
- Lecturer session activity

---

21. Administrator Dashboard

The administrator can access:

Users
Students
Lecturers
Coordinators
Departments
Programs
Courses
Semesters
Attendance
Reports
Audit Logs
System Settings

---

22. Reporting

Reports:

- Daily attendance
- Course attendance
- Student attendance
- Lecturer session report
- Department attendance
- Semester attendance
- Absentee report
- Low-attendance students

Export:

CSV
PDF
Excel

For large reports, generation should be handled asynchronously rather than blocking a serverless request.

---

23. Attendance Audit Trail

Every attendance modification must create an audit record.

Example:

User:
Lecturer John Doe

Action:
Changed attendance

Student:
Student 1023

Old:
ABSENT

New:
PRESENT

Reason:
Approved manual correction

Timestamp:
18 Aug 2026 16:24

This prevents silent attendance manipulation.

---

24. Security

The application must implement:

- HTTPS
- Secure cookies
- Password hashing
- Server-side authorization
- Input validation
- Rate limiting
- SQL injection protection
- XSS protection
- Token expiration
- Audit logging
- Secure environment variables
- Authentication checks
- Database constraints

Never expose:

DATABASE_URL
DIRECT_URL
AUTH_SECRET
JWT_SECRET
SUPABASE_SERVICE_ROLE_KEY
PRIVATE_API_KEYS

to the browser.

---

25. Environment Variables

Example:

DATABASE_URL=
DIRECT_URL=

AUTH_SECRET=

NEXT_PUBLIC_APP_URL=

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

SUPABASE_SERVICE_ROLE_KEY=

Only variables intended for frontend exposure should use:

NEXT_PUBLIC_

Private credentials must remain server-side.

---

26. Project Folder Structure

classtrack/
│
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   └── forgot-password/
│   │
│   ├── dashboard/
│   │
│   ├── student/
│   │   ├── dashboard/
│   │   ├── attendance/
│   │   └── courses/
│   │
│   ├── lecturer/
│   │   ├── dashboard/
│   │   ├── sessions/
│   │   └── reports/
│   │
│   ├── coordinator/
│   │   ├── dashboard/
│   │   ├── courses/
│   │   └── reports/
│   │
│   ├── admin/
│   │   ├── dashboard/
│   │   ├── users/
│   │   ├── courses/
│   │   └── settings/
│   │
│   ├── attendance/
│   │   └── [token]/
│   │
│   └── api/
│       ├── attendance/
│       ├── auth/
│       ├── courses/
│       ├── students/
│       └── reports/
│
├── components/
│   ├── ui/
│   ├── attendance/
│   ├── dashboard/
│   ├── forms/
│   └── navigation/
│
├── lib/
│   ├── auth/
│   ├── db/
│   ├── attendance/
│   ├── validation/
│   ├── location/
│   └── utils/
│
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
│
├── public/
│   ├── icons/
│   ├── manifest.json
│   └── images/
│
├── types/
├── hooks/
├── services/
├── tests/
│
├── netlify/
│
├── .env.example
├── .gitignore
├── netlify.toml
├── next.config.ts
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── README.md

The "netlify/" directory should only contain custom Netlify-specific functionality when necessary. Do not duplicate the entire backend there.

---

27. Netlify Deployment Architecture

Production architecture:

                    USERS
                      |
          Mobile / Desktop / PWA
                      |
                      v
                  NETLIFY
                      |
          ┌───────────┴───────────┐
          |                       |
          v                       v
     Next.js App           Netlify Functions
          |                       |
          |                       v
          |                    Prisma
          |                       |
          └───────────────> PostgreSQL
                              |
                       Supabase / Neon

Static assets are delivered through Netlify's CDN.

Server-side operations run through Netlify's serverless runtime as supported by the Next.js deployment.

---

28. Why Netlify

Netlify provides:

- Next.js deployment
- CDN
- HTTPS
- Serverless functions
- Environment variables
- GitHub integration
- Automatic deployments
- Deploy previews
- Production deployments
- Custom domains
- Rollbacks
- Branch deployments

The database remains external.

---

29. Netlify + GitHub Workflow

Recommended workflow:

Developer
    |
    v
GitHub
    |
    +---- Development Branch
    |
    +---- Pull Request
    |
    v
Netlify Deploy Preview
    |
    v
Testing
    |
    v
Main Branch
    |
    v
Netlify Production

Every pull request can receive its own preview deployment.

---

30. Netlify Configuration

A "netlify.toml" file should be included in the project.

Example:

[build]
  command = "npm run build"
  publish = ".next"

[build.environment]
  NODE_VERSION = "20"

[[plugins]]
  package = "@netlify/plugin-nextjs"

The exact configuration should be validated against the current Netlify Next.js runtime during deployment.

---

31. Mobile-First UI

Minimum supported design width:

320px+

The primary navigation should prioritize mobile.

Student

Home
Courses
Attendance
Reports
Profile

Lecturer

Dashboard
Sessions
Students
Reports
Profile

Coordinator

Dashboard
Courses
Students
Attendance
Reports
Profile

Administrator

Dashboard
Users
Academics
Attendance
Reports
Settings

---

32. Attendance UX

The student should complete attendance quickly:

Open App
    ↓
Scan QR
    ↓
Validate
    ↓
Confirm
    ↓
Done

Target:

Less than 10 seconds under normal network conditions.

---

33. PWA Requirements

ClassTrack should:

- Install on Android
- Install on supported iOS browsers
- Work as a standalone application
- Have application icons
- Have a splash/loading experience
- Cache static assets
- Support offline states
- Support camera access
- Support geolocation

The application should feel like a native mobile application.

---

34. Camera Integration

Use browser camera APIs with a QR scanning library.

Flow:

Student opens scanner
        |
        v
Camera Permission
        |
        v
Scan QR
        |
        v
Extract Session Token
        |
        v
Send to Netlify API
        |
        v
Validate Attendance

No physical attendance hardware is required.

---

35. Performance

Requirements:

- Fast initial page load
- Lazy loading
- Optimized images
- Server-side rendering where appropriate
- Client-side rendering only where required
- API pagination
- Database indexing
- Efficient queries
- Appropriate caching

Attendance APIs must remain lightweight because many students may scan at approximately the same time.

---

36. Database Indexing

Important indexes:

User.email
Student.studentNumber
Course.code
AttendanceSession.courseId
AttendanceSession.startTime
AttendanceRecord.studentId
AttendanceRecord.sessionId
AttendanceRecord.createdAt

Unique constraint:

AttendanceRecord(studentId, sessionId)

This prevents duplicate attendance.

---

37. Scalability

Initial target:

1 Department
500–2,000 Students

Future target:

10,000+ Students

Architecture:

Stateless Next.js application
+
Netlify serverless infrastructure
+
Managed PostgreSQL
+
Indexed database queries
+
CDN

For very large deployments, database connection pooling and serverless-compatible Prisma configuration must be implemented correctly.

---

38. Notifications

Future notification channels:

In-app
Email
Push Notification
SMS

Examples:

- Attendance confirmation
- Low attendance warning
- Missed class notification
- Lecturer session reminder
- Coordinator alert

Notifications should be added after the core attendance system is stable.

---

39. Development Phases

Phase 1 — Foundation

- Next.js
- TypeScript
- Tailwind
- Database
- Prisma
- Authentication
- Roles

Phase 2 — Academic Management

- Departments
- Programs
- Courses
- Students
- Lecturers
- Course enrollment

Phase 3 — Attendance

- Attendance sessions
- QR generation
- QR scanning
- Token validation
- Attendance records
- Present/Late/Absent

Phase 4 — Validation

- Location validation
- Duplicate prevention
- Rate limiting
- Audit logging

Phase 5 — Dashboards

- Student dashboard
- Lecturer dashboard
- Coordinator dashboard
- Admin dashboard

Phase 6 — Reporting

- Attendance reports
- CSV export
- PDF export
- Excel export
- Analytics

Phase 7 — PWA

- Installable application
- Offline caching
- IndexedDB
- Background synchronization

Phase 8 — Production

- Security audit
- Performance testing
- Load testing
- Netlify deployment
- Database backups
- Monitoring

---

40. MVP Features

The first production-ready version should contain:

Authentication
Roles
Students
Lecturers
Coordinators
Courses
Enrollment
Attendance Sessions
QR Attendance
Attendance Validation
Attendance History
Attendance Percentage
Lecturer Dashboard
Student Dashboard
Coordinator Dashboard
Admin Dashboard
Reports
Audit Logs

---

41. Future Features

Possible extensions:

- Facial verification
- NFC
- Bluetooth proximity
- Smart timetable
- Push notifications
- AI attendance analytics
- Predictive absenteeism
- Parent/student notifications
- Mobile money integration
- Institution-wide analytics
- Multi-campus support

These are NOT required for the MVP.

---

42. Important Architectural Decision

ClassTrack should NOT use a traditional permanently running Express server for the MVP.

Use:

Next.js
+
Netlify
+
Netlify Serverless Runtime
+
Prisma
+
PostgreSQL

This provides:

- Simple deployment
- Lower infrastructure complexity
- GitHub-based deployment
- Automatic previews
- Serverless scaling
- Easy maintenance

If the system later requires:

- Heavy background processing
- Long-running jobs
- Dedicated WebSockets
- Advanced queue workers

those services can be introduced separately.

---

43. Final Production Stack

Frontend:
Next.js + React + TypeScript

UI:
Tailwind CSS + shadcn/ui

PWA:
Service Worker + IndexedDB

Backend:
Next.js Route Handlers / Server Actions

Serverless Runtime:
Netlify

ORM:
Prisma

Database:
PostgreSQL

Database Provider:
Supabase / Neon

Authentication:
Secure server-side authentication

Validation:
Zod

QR:
Browser Camera API + QR Scanner

Location:
Browser Geolocation API

Hosting:
Netlify

Source Control:
GitHub

Monitoring:
Netlify + Application Logging

---

44. Final Architecture

                         CLASS TRACK
                              |
             ┌────────────────┴────────────────┐
             |                                 |
         STUDENTS                            STAFF
             |                                 |
         Mobile PWA                    Lecturer / Admin
             |                                 |
             └────────────────┬────────────────┘
                              |
                           NETLIFY
                              |
                    ┌─────────┴─────────┐
                    |                   |
                Next.js          Serverless APIs
                    |                   |
                    └─────────┬─────────┘
                              |
                           Prisma
                              |
                        PostgreSQL
                              |
                       Supabase / Neon

---

45. Deployment Goal

The final project should be deployable using:

GitHub
   ↓
Netlify
   ↓
Build
   ↓
Deploy

No VPS is required for the MVP.

No physical attendance hardware is required.

No permanently running Express server is required.

The database remains a managed PostgreSQL service.

---

46. Definition of Done

ClassTrack MVP is considered production-ready when:

- Authentication works
- Roles work correctly
- Students can be enrolled in courses
- Lecturers can create attendance sessions
- QR codes can be generated
- Students can scan QR codes
- Attendance is validated server-side
- Duplicate attendance is prevented
- Attendance status is calculated
- Dashboards display correct data
- Reports can be generated
- Attendance changes are audited
- PWA can be installed
- Application works correctly on mobile
- Production environment variables are configured
- Database migrations work
- Application successfully deploys to Netlify
- Production APIs communicate with PostgreSQL
- Security checks have been completed
- Error handling is implemented
- Database backups are configured

---

47. Final Objective

ClassTrack should provide a complete digital attendance ecosystem where:

Students
    ↓
Check in quickly

Lecturers
    ↓
Create and monitor sessions

Coordinators
    ↓
Monitor departments

Administrators
    ↓
Control the entire institution

The application must remain:

Mobile-first + Secure + Fast + Serverless + PWA + PostgreSQL + Netlify-ready.
