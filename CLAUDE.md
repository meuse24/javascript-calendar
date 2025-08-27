# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a JavaScript Calendar Application - a vanilla JS project for managing events with a clean, responsive interface. The application uses localStorage for data persistence and is designed as a single-page application with modal-based interactions.

## Architecture

### Core Components

- **DateUtils** (`script.js:7-144`): Comprehensive date manipulation utilities including calendar grid generation, month navigation, date formatting, and leap year handling
- **CalendarApp** (`script.js:147-202`): Main application controller managing state, modal interactions, and event handling
- **Modal System**: Overlay-based modal system with keyboard navigation and accessibility features

### File Structure

- `index.html` - Semantic HTML structure with calendar container and modal overlay
- `script.js` - All JavaScript logic including DateUtils and CalendarApp
- `styles.css` - Complete CSS with responsive design, grid layout, and modal styling
- `package.json` - Project dependencies (currently only task-master-ai)

### Data Flow

1. **Calendar Generation**: DateUtils.generateCalendarData() creates calendar grid with previous/current/next month days
2. **Event Management**: Events stored in CalendarApp.events array, persisted via localStorage
3. **Modal Interactions**: showModal()/closeModal() methods handle form display and user input
4. **State Management**: CalendarApp.currentDate tracks current month/year view

## Task Master Integration

This project uses Task Master AI for project management:

- **Tasks Location**: `.taskmaster/tasks/tasks.json`
- **Current Tag**: "master" 
- **Task Status**: Use `mcp__taskmaster-ai__*` tools to interact with tasks
- **Configuration**: `.taskmaster/config.json` with Claude 3.7 Sonnet as primary model

## Development Notes

### Date Handling Patterns
- All months are 0-indexed (January = 0, December = 11)
- Date formatting uses YYYY-MM-DD format via DateUtils.formatDate()
- Calendar grid always shows 6 weeks (42 days) including adjacent month days

### CSS Architecture
- Mobile-first responsive design with breakpoint at 768px
- CSS Grid used for calendar layout (to be implemented in Task 4)
- Utility classes (.hidden, .text-center) for common patterns
- CSS custom properties and modern selectors throughout

### Modal System Pattern
- Modal overlay with backdrop click-to-close
- Keyboard navigation support (Escape key, focus management)
- Content dynamically inserted via innerHTML
- Accessibility features with proper ARIA handling

### Event Model Structure
- Events stored as objects with date keys
- localStorage integration planned for Task 8
- Event creation/editing via modal forms (Tasks 9-11)

## Current Implementation Status

The project has a solid foundation with:
- Complete date utilities (Tasks 1-2 completed)
- Basic HTML structure and CSS framework 
- Application initialization and modal system
- Responsive design foundation

Next development priorities focus on calendar grid rendering (Task 3) and CSS Grid implementation (Task 4).