
# Edge Conflict Prototype — PRD for Replit

## 🎯 Objective

Build a lightweight browser-based prototype using Replit to simulate **edge-fighting behavior** between overlapping room geometries. This tool allows testing visual edge priority resolution through color logic and user-defined rules.

---

## 🧱 Core Functionality

### 1. Canvas Room Drawing
- 2D canvas with a visible grid (1 ft resolution).
- Users can draw rectangular rooms (prisms).
- Each room:
  - Snaps to the grid.
  - Has visible wall thickness (1 grid square).
  - Is filled only along its edges with color.
  - Has a user-assigned color (from 10 pre-set options).

---

### 2. Room Placement Rules
- Rooms can be placed:
  - Fully separate.
  - Tangent (edges just touch).
  - Overlapping by 1 grid square (wall thickness).
- No diagonal placement or rotation support.

---

## ⚔️ Edge-Fighting Resolution

### Phase 1: Chronological Order
- Last drawn room’s edge color wins any overlap.

### Phase 2: User-Defined Priority List
- Users reorder a list of 10 colors.
- Highest on the list takes precedence.
- Used as fallback when matrix rules are undefined.

### Phase 3: Color Conflict Matrix
- Table with:
  - Rows = "underneath" color
  - Columns = "on top" color
  - Cells = resulting color from dropdown
- Undefined combinations fall back to the priority list.

---

## 🧠 Data Model & Persistence

- Everything runs client-side only.
- Users can **export/import** JSON files to persist state:
  - Room geometry + metadata
  - Color priority list
  - Conflict matrix rules

---

## 🖱 UI Layout

- **Top bar**: Draw Room, Move Room, Delete Room (trash icon)
- **Left panel**: Edge-fighting mode selector + color priority/matrix editor
- **Right panel**: Inspector for selected room or edge
  - Room: name, width/height, color, delete
  - Edge: override color (optional), inherits from room otherwise

---

## ✅ Inspector Behavior

- Room inspector shows when room is selected
- Edge inspector shows when a specific edge is selected
- At shared corners, selected edge color takes precedence visually

---

## 🧪 Goals

- Experiment with visual edge priority logic
- Enable fast UI testing of room overlap conditions
- Provide future groundwork for architectural edge modeling tools

---

## 📅 Work Plan

**Week 1–2**:  
- Grid setup  
- Basic room drawing  
- Room metadata  

**Week 3**:  
- Chronological edge-fighting logic  
- Edge overlap resolution  

**Week 4**:  
- Color priority list interface + logic  

**Week 5–6**:  
- Conflict matrix UI + fallback system  
- Export/import of JSON state
