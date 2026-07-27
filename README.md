# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.
password for db: EISrecords1234567890987654321

```
eis-school-management
├─ .env
├─ .oxlintrc.json
├─ README.md
├─ index.html
├─ package-lock.json
├─ package.json
├─ postcss.config.js
├─ public
│  ├─ favicon.svg
│  └─ icons.svg
├─ src
│  ├─ App.css
│  ├─ App.tsx
│  ├─ assets
│  │  ├─ hero.png
│  │  ├─ react.svg
│  │  ├─ styles
│  │  └─ vite.svg
│  ├─ components
│  │  ├─ common
│  │  ├─ forms
│  │  │  └─ StudentRegistrationForm
│  │  │     └─ StudentRegistrationForm.tsx
│  │  ├─ layout
│  │  │  └─ MainLayout
│  │  │     └─ MainLayout.tsx
│  │  ├─ shared
│  │  └─ ui
│  ├─ config
│  │  └─ supabase
│  │     └─ client.ts
│  ├─ constants
│  ├─ contexts
│  │  ├─ AuthContext.tsx
│  │  ├─ NotificationContext.tsx
│  │  ├─ ThemeContext.tsx
│  │  ├─ index.ts
│  │  └─ {AuthContext}
│  ├─ features
│  │  ├─ analytics
│  │  ├─ communication
│  │  ├─ payment
│  │  ├─ registration
│  │  └─ reporting
│  ├─ hooks
│  │  ├─ useAuth.ts
│  │  ├─ useNotification.ts
│  │  ├─ useStudents.ts
│  │  └─ useTheme.ts
│  ├─ index.css
│  ├─ main.tsx
│  ├─ pages
│  │  ├─ announcements
│  │  ├─ auth
│  │  │  └─ Login.tsx
│  │  ├─ branches
│  │  │  └─ BranchesList.tsx
│  │  ├─ calendar
│  │  ├─ classes
│  │  │  └─ ClassesList.tsx
│  │  ├─ dashboard
│  │  │  └─ Dashboard.tsx
│  │  ├─ documents
│  │  ├─ error
│  │  │  ├─ NotFound.tsx
│  │  │  └─ Unauthorized.tsx
│  │  ├─ fees
│  │  │  └─ FeesList.tsx
│  │  ├─ landing
│  │  ├─ notifications
│  │  ├─ parents
│  │  ├─ payments
│  │  │  └─ PaymentsList.tsx
│  │  ├─ profile
│  │  │  └─ Profile.tsx
│  │  ├─ reports
│  │  │  └─ ReportsDashboard.tsx
│  │  ├─ settings
│  │  │  └─ Settings.tsx
│  │  ├─ students
│  │  │  ├─ RegisterStudent.tsx
│  │  │  └─ StudentsList.tsx
│  │  ├─ support
│  │  └─ teachers
│  │     └─ TeachersList.tsx
│  ├─ routes
│  │  ├─ AppRoutes.tsx
│  │  └─ RouteConstants.ts
│  ├─ services
│  │  ├─ api
│  │  ├─ auth
│  │  │  ├─ auth.service.ts
│  │  │  └─ types.ts
│  │  ├─ branches
│  │  ├─ classes
│  │  ├─ documents
│  │  ├─ fees
│  │  ├─ notifications
│  │  ├─ parents
│  │  ├─ payments
│  │  ├─ reports
│  │  ├─ settings
│  │  ├─ students
│  │  │  └─ student.service.ts
│  │  └─ teachers
│  ├─ store
│  │  └─ slices
│  ├─ supabase
│  │  └─ migrations
│  ├─ types
│  │  ├─ auth.types.ts
│  │  ├─ index.ts
│  │  └─ student.types.ts
│  └─ utils
│     ├─ formatters
│     ├─ generators
│     ├─ helpers
│     └─ validators
├─ tailwind.config.js
├─ tsconfig.app.json
├─ tsconfig.json
├─ tsconfig.node.json
└─ vite.config.ts

```