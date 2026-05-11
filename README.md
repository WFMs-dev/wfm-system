# WFM System - Workforce Management

## Overview
Enterprise-grade Workforce Management System built on Base44.

## Modules
- **Dashboard** - KPI overview, charts, quick actions
- **Employees** - Employee profiles, skills, roles, RBAC
- **Schedule** - Monthly calendar view, shift assignment
- **Attendance** - Clock-in/out with GPS, OT tracking
- **Leave Management** - Leave requests, multi-type, approval flow
- **Shift Swap** - Shift swap requests + supervisor approval
- **Approvals** - Central approval hub for all pending items
- **Holidays** - Public/company/special holidays management
- **Reports** - Analytics dashboards with charts
- **Payroll Export** - CSV export with filters for payroll processing

## Entities
Employee, Shift, Schedule, LeaveType, LeaveRequest, ShiftSwapRequest,
AttendanceLog, Holiday, Notification, ExportJob, AuditLog

## Backend Functions
- `exportPayroll` - Server-side CSV export with date/team/dept filters

## Tech Stack
- React + Tailwind CSS (Frontend)
- Base44 Platform (Backend, DB, Auth)
- Recharts (Charts)
- Lucide React (Icons)
- Deno (Backend Functions)

## Roles
Admin, Supervisor, Scheduler, Agent, HR
