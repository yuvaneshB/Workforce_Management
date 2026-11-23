# Workforce AI – Frontend Application

React + Vite + Tailwind CSS conversion of the Workforce Management AI static HTML prototype.

## Tech Stack
- React 19
- Vite 8
- React Router DOM 7
- Tailwind CSS 4 (`@tailwindcss/vite`)
- Lucide React
- Recharts (prepared for future analytics integration)

## Getting Started

```bash
cd frontend
npm install
npm run dev
```

## Routes
- `/dashboard` — Workforce Overview
- `/employees` — Employee Management
- `/attendance` — Attendance Management
- `/shifts` — Shift Management
- `/operations` — Production Operations
- `/analytics` — Workforce Analytics
- `/assistant` — Workforce Intelligence Assistant
- `/recommendations` — Staffing Recommendations
- `/approvals` — HR Approvals

## Notes
- Preserves light and dark themes (`data-theme="light" | "dark"`, persisted in `localStorage` under `workforce-theme`).
- Preserves all empty states without fabricated workforce data or backend/AI connections.
