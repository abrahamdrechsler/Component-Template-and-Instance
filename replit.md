# Edge Conflict Prototype

## Overview

This is a browser-based prototype built to simulate edge-fighting behavior between overlapping room geometries. The application allows users to draw rectangular rooms on a grid-based canvas and test different visual edge priority resolution methods when rooms overlap. The tool provides three conflict resolution modes: chronological order (last drawn wins), user-defined priority lists, and customizable conflict matrices.

## Recent Changes (August 2025)

- **Simplified Conflict Matrix UI**: Redesigned matrix interface with clean "Color × Color = Result" format using only visual color swatches for compact, intuitive rule creation
- **Fixed Matrix Resolution Logic**: Corrected conflict matrix functionality to properly apply user-defined rules for edge color resolution when rooms overlap
- **Enhanced Drag Behavior**: Implemented smooth, constrained room dragging where preview shows only valid positions and final placement matches preview exactly (no snapping or jumping)
- **Visual Validation**: Added real-time validation during room placement with clear visual feedback

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**React + TypeScript SPA**: Built using Vite as the build tool with React 18 and TypeScript for type safety. The application follows a component-based architecture with clear separation between UI components, business logic, and state management.

**State Management**: Uses a custom hook (`useEdgeConflict`) that centralizes all application state and logic. This pattern provides a clean API for components while keeping complex state transformations isolated. The hook manages rooms, edges, conflict resolution modes, and UI state.

**Canvas Rendering**: Implements a custom 2D canvas solution for drawing rooms and handling user interactions. The canvas system includes grid snapping, room placement validation, and real-time edge conflict visualization. Canvas utilities handle coordinate transformations, grid rendering, and shape drawing.

**UI Framework**: Leverages shadcn/ui components built on Radix UI primitives for consistent, accessible interface elements. Components are styled with Tailwind CSS using a design system with CSS custom properties for theming.

### Component Structure

**Layout Components**: Toolbar for drawing tools and file operations, resizable panels for settings and inspector, and a main canvas area. The layout is responsive and adapts to different screen sizes.

**Drawing System**: Canvas component handles mouse events for drawing, moving, and selecting rooms. Grid system provides 1-foot resolution with visual guides. Room validation ensures proper placement rules (separate, tangent, or 1-grid overlap).

**Configuration Panels**: Settings panel manages conflict resolution modes and color priorities. Inspector panel provides detailed editing for selected rooms and edges. Both panels update state through the central hook.

### Data Architecture

**Schema Definition**: Uses Zod schemas for runtime type validation and TypeScript type generation. Schemas define rooms, edges, conflict matrix entries, and application state with proper validation rules.

**Edge Fighting Logic**: Implements three resolution algorithms:
- Chronological: Based on room creation timestamps
- Priority: Uses user-defined color ranking system  
- Matrix: Custom conflict resolution table with fallback to priority

**Data Persistence**: Supports JSON export/import for saving and loading room layouts and configurations. No backend persistence required for prototype.

### State Management Pattern

**Centralized Logic**: The `useEdgeConflict` hook encapsulates all state mutations, business rules, and derived state calculations. This pattern prevents prop drilling and ensures consistent state updates.

**Immutable Updates**: All state changes create new objects rather than mutating existing ones, enabling reliable React re-renders and easier debugging.

**Computed Values**: Edge colors and conflict resolutions are calculated on-demand based on current state, ensuring consistency between display and configuration changes.

## External Dependencies

### UI and Interaction Libraries
- **Radix UI**: Provides accessible, unstyled UI primitives for complex components like dialogs, dropdowns, and form controls
- **Tailwind CSS**: Utility-first CSS framework for consistent styling and responsive design
- **Lucide React**: Icon library providing consistent iconography throughout the interface
- **Wouter**: Lightweight client-side routing for navigation between views

### Development and Build Tools
- **Vite**: Modern build tool providing fast development server and optimized production builds
- **TypeScript**: Static type checking for improved code quality and developer experience
- **ESBuild**: Fast JavaScript bundler used by Vite for server-side code compilation

### Canvas and Graphics
- **HTML5 Canvas API**: Native browser canvas for 2D graphics rendering and user interaction
- **Custom Canvas Utilities**: Purpose-built utilities for grid rendering, room drawing, and coordinate transformations

### Data Validation and Utilities
- **Zod**: Runtime schema validation and TypeScript type generation for data integrity
- **Class Variance Authority**: Utility for creating consistent component variants and styling
- **CLSX**: Conditional CSS class name utility for dynamic styling

### Database Integration (Prepared)
- **Drizzle ORM**: Type-safe SQL query builder configured for PostgreSQL
- **Neon Database**: Serverless PostgreSQL provider integration configured but not actively used in current prototype
- **Database migrations**: Schema migration system prepared for future backend integration

The application is designed as a client-side prototype but includes infrastructure for future backend integration when persistent storage and multi-user features are required.