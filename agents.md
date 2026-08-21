# Project Overview

This is a React web application.
Frontend:

- React
- TypeScript
- Vite (if applicable)
- Tailwind CSS (if applicable)

Architecture:

- Feature-first structure
- Component-based architecture
- Repository pattern (for data access)
- Service layer
- Custom hooks for business logic
- Context API / Zustand / Redux (follow existing project architecture)

Platform Priority:

1. Web
2. Mobile responsive

---

# UI Rules

- Follow the existing design system and theme
- Mobile-first responsive design
- Clean spacing and consistent layouts
- Reuse existing UI components whenever possible
- Keep UI modern, minimal, and uncluttered
- Maintain consistent border radius, shadows, spacing, and typography
- Use rectangular rounded containers for icons instead of circular ones unless the existing design specifies otherwise
- Maintain consistent button, dialog, and card styles throughout the application

---

# Coding Standards

- Use ponytail skills every time, and use other skills whenever necessary
- Never create unnecessary files
- Reuse existing shared components before creating new ones
- Keep components small and focused
- Follow SOLID principles where applicable
- Avoid duplicate code
- Prefer composition over inheritance
- Use TypeScript strictly (avoid `any` whenever possible)
- Use functional components only
- Prefer hooks over class components
- Keep business logic outside UI components
- Use meaningful naming conventions

---

# React Standards

- Prefer reusable components over duplicated JSX
- Keep pages lightweight
- Move reusable logic into custom hooks
- Avoid unnecessary re-renders
- Memoize expensive computations when needed
- Keep state as local as possible
- Avoid prop drilling where practical
- Use lazy loading for large pages/components when appropriate
- Keep folder structure consistent with existing architecture

---

# Styling Rules

- Follow the existing styling approach (Tailwind CSS / CSS Modules / Styled Components / existing project convention)
- Do not introduce a different styling framework
- Keep styling reusable
- Prefer utility classes/components over inline styles
- Maintain responsive layouts
- Support dark mode if already implemented

---

# Before Writing Code

Always:

1. Understand the existing architecture
2. Search for an existing implementation
3. Reuse existing shared components before creating new ones
4. Check if a hook, utility, or service already exists
5. Explain the implementation plan before making changes

---

# After Writing Code

Always:

1. Run TypeScript type checking
2. Run ESLint
3. Verify imports
4. Remove unused imports and variables
5. Ensure there are no compile errors
6. Verify responsive behavior
7. Ensure code follows existing project conventions

---

# Performance Guidelines

- Avoid unnecessary renders
- Code split large pages
- Lazy load heavy components when appropriate
- Optimize images and assets
- Avoid unnecessary API calls
- Cache data when appropriate
- Debounce expensive user interactions

---

# Session Persistence Rules

Before starting work:

1. Read `CURRENT_STATE.md`

After completing work:

1. Update `CURRENT_STATE.md`

If interrupted:

- Leave detailed implementation notes
- Document unfinished tasks
- Document blockers
- Document recommended next steps

Always ensure another agent can continue work without additional context.

---

# Documentation

Always:

- Keep `README.md` updated
- Document major architectural decisions
- Add meaningful comments only where necessary (avoid obvious comments)
- Include author and timestamp only if the project convention already requires it

---

# Must Follow

- Follow the existing project architecture instead of introducing a new one
- Minimize breaking changes
- Keep commits focused and atomic
- Prioritize reusable, maintainable, and scalable code
- Never refactor unrelated code unless explicitly requested
- Ask before introducing new dependencies
- Maintain consistent code formatting across the project
