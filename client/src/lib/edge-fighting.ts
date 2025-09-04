import { Room, Edge, ConflictMatrixEntry, RoomColor } from '@shared/schema';
import { ROOM_COLORS } from '@/types/room';

export class EdgeFightingResolver {
  static resolveEdgeColor(
    edge: Edge,
    rooms: Room[],
    mode: 'chronological' | 'priority' | 'matrix',
    colorPriority: RoomColor[],
    conflictMatrix: ConflictMatrixEntry[],
    allEdges?: Edge[]
  ): string {
    if (!allEdges) return ROOM_COLORS.skyBlue;

    // Step 1: Find all rooms that this edge passes through
    const overlappingRooms = this.findRoomsOverlappingEdge(edge, rooms);
    
    // Step 2: For each overlapping room, determine what color should represent it at this edge location
    const competingColors = overlappingRooms.map((room: Room) => {
      let color: RoomColor;
      
      if (room.id === edge.roomId) {
        // This is the room that owns the edge - check for edge override first
        color = edge.colorOverride || 
          allEdges.find(e => e.roomId === edge.roomId && e.side === edge.side && e.colorOverride)?.colorOverride ||
          room.color;
      } else {
        // This is another room that the edge passes through - use room color
        // (other rooms' edge overrides don't affect this edge)
        color = room.color;
      }
      
      return {
        color,
        createdAt: room.createdAt,
        roomId: room.id
      };
    });
    
    // Step 3: If only one room contributes color, return it
    if (competingColors.length <= 1) {
      return ROOM_COLORS[competingColors[0]?.color || 'skyBlue'] || ROOM_COLORS.skyBlue;
    }

    // Step 4: Resolve conflict between all competing colors using the selected mode
    switch (mode) {
      case 'chronological':
        return this.resolveChronologicalWithColors(competingColors);
      case 'priority':
        return this.resolvePriorityWithColors(competingColors, colorPriority);
      case 'matrix':
        return this.resolveMatrixWithColors(competingColors, conflictMatrix, colorPriority);
      default:
        return ROOM_COLORS[competingColors[0]?.color || 'skyBlue'] || ROOM_COLORS.skyBlue;
    }
  }

  private static findRoomsOverlappingEdge(edge: Edge, rooms: Room[]): Room[] {
    const overlapping: Room[] = [];
    
    // Get the room that owns this edge
    const edgeRoom = rooms.find(r => r.id === edge.roomId);
    if (!edgeRoom) return [];
    
    for (const room of rooms) {
      if (this.edgeIntersectsRoom(edge, room)) {
        // Only include if this is the edge's own room OR if rooms actually overlap (share interior space)
        // Don't include rooms that are just tangent (touching at boundaries)
        if (room.id === edgeRoom.id || this.roomsActuallyOverlap(edgeRoom, room)) {
          overlapping.push(room);
        }
      }
    }
    
    return overlapping;
  }

  private static findOverlappingEdges(edge: Edge, allEdges: Edge[]): Edge[] {
    const overlapping: Edge[] = [];
    
    for (const otherEdge of allEdges) {
      if (this.edgesOverlap(edge, otherEdge)) {
        overlapping.push(otherEdge);
      }
    }
    
    return overlapping;
  }

  private static edgesOverlap(edge1: Edge, edge2: Edge): boolean {
    // Check if two edges occupy the same space
    const e1Left = Math.min(edge1.x1, edge1.x2);
    const e1Right = Math.max(edge1.x1, edge1.x2);
    const e1Top = Math.min(edge1.y1, edge1.y2);
    const e1Bottom = Math.max(edge1.y1, edge1.y2);
    
    const e2Left = Math.min(edge2.x1, edge2.x2);
    const e2Right = Math.max(edge2.x1, edge2.x2);
    const e2Top = Math.min(edge2.y1, edge2.y2);
    const e2Bottom = Math.max(edge2.y1, edge2.y2);
    
    // Check if edges overlap in both x and y dimensions
    // For a meaningful overlap, edges need to share some common space
    const xOverlap = e1Right > e2Left && e1Left < e2Right;
    const yOverlap = e1Bottom > e2Top && e1Top < e2Bottom;
    
    // Also check if they actually intersect meaningfully (not just touch at a point)
    const xIntersection = Math.min(e1Right, e2Right) - Math.max(e1Left, e2Left);
    const yIntersection = Math.min(e1Bottom, e2Bottom) - Math.max(e1Top, e2Top);
    
    return xOverlap && yOverlap && xIntersection > 0 && yIntersection > 0;
  }

  private static findAllRoomsAtEdgeLocation(edge: Edge, rooms: Room[]): Room[] {
    const overlapping: Room[] = [];
    
    // Get the room that owns this edge
    const edgeRoom = rooms.find(r => r.id === edge.roomId);
    if (!edgeRoom) return [];
    
    for (const room of rooms) {
      // Check if this edge segment intersects with the room's area
      if (this.edgeIntersectsRoom(edge, room)) {
        // Only include if rooms actually overlap (share interior space)
        // not just touch at boundaries (tangent)
        if (room.id === edgeRoom.id || this.roomsActuallyOverlap(edgeRoom, room)) {
          overlapping.push(room);
        }
      }
    }
    
    return overlapping;
  }

  private static edgeIntersectsRoom(edge: Edge, room: Room): boolean {
    const roomBounds = {
      left: room.x,
      right: room.x + room.width,
      top: room.y,
      bottom: room.y + room.height,
    };
    
    if (edge.side === 'north' || edge.side === 'south') {
      // Horizontal edge
      const edgeY = edge.y1;
      const edgeLeft = Math.min(edge.x1, edge.x2);
      const edgeRight = Math.max(edge.x1, edge.x2);
      
      // Check if edge intersects with room bounds
      return (edgeY >= roomBounds.top && edgeY <= roomBounds.bottom) &&
             (edgeRight > roomBounds.left && edgeLeft < roomBounds.right);
    } else {
      // Vertical edge
      const edgeX = edge.x1;
      const edgeTop = Math.min(edge.y1, edge.y2);
      const edgeBottom = Math.max(edge.y1, edge.y2);
      
      // Check if edge intersects with room bounds
      return (edgeX >= roomBounds.left && edgeX <= roomBounds.right) &&
             (edgeBottom > roomBounds.top && edgeTop < roomBounds.bottom);
    }
  }

  private static edgeSegmentOverlapsRoom(edge: Edge, room: Room): boolean {
    const roomBounds = {
      left: room.x,
      right: room.x + room.width,
      top: room.y,
      bottom: room.y + room.height,
    };
    
    // Get the room that owns this edge to check for actual overlap
    const edgeRoom = { x: 0, y: 0, width: 0, height: 0 }; // We'll need to pass this in properly
    
    // For now, check if the edge segment intersects with room boundaries
    // AND the rooms actually overlap (not just touch)
    if (edge.side === 'north' || edge.side === 'south') {
      // Horizontal edge
      const edgeY = edge.y1;
      const edgeLeft = Math.min(edge.x1, edge.x2);
      const edgeRight = Math.max(edge.x1, edge.x2);
      
      // Check if edge intersects with room and there's actual overlap area
      const intersects = (edgeY >= roomBounds.top && edgeY <= roomBounds.bottom) &&
                        (edgeRight > roomBounds.left && edgeLeft < roomBounds.right);
      
      return intersects;
    } else {
      // Vertical edge
      const edgeX = edge.x1;
      const edgeTop = Math.min(edge.y1, edge.y2);
      const edgeBottom = Math.max(edge.y1, edge.y2);
      
      // Check if edge intersects with room and there's actual overlap area
      const intersects = (edgeX >= roomBounds.left && edgeX <= roomBounds.right) &&
                        (edgeBottom > roomBounds.top && edgeTop < roomBounds.bottom);
      
      return intersects;
    }
  }



  private static roomsActuallyOverlap(room1: Room, room2: Room): boolean {
    // Check if rooms actually overlap (share interior space), not just touch boundaries
    const r1 = {
      left: room1.x,
      right: room1.x + room1.width,
      top: room1.y,
      bottom: room1.y + room1.height,
    };

    const r2 = {
      left: room2.x,
      right: room2.x + room2.width,
      top: room2.y,
      bottom: room2.y + room2.height,
    };

    // Calculate actual overlap area
    const overlapX = Math.max(0, Math.min(r1.right, r2.right) - Math.max(r1.left, r2.left));
    const overlapY = Math.max(0, Math.min(r1.bottom, r2.bottom) - Math.max(r1.top, r2.top));
    
    // Only consider it an overlap if there's actual shared interior space > 0
    // This excludes tangent rooms that just touch at boundaries
    return overlapX > 0 && overlapY > 0;
  }



  private static resolveChronologicalMultiple(overlappingRooms: Room[]): string {
    // Last created room wins (creation order preserved regardless of movements)
    const latestRoom = overlappingRooms.reduce((latest, current) => 
      current.createdAt > latest.createdAt ? current : latest
    );
    return ROOM_COLORS[latestRoom.color];
  }

  private static resolvePriorityMultiple(overlappingRooms: Room[], colorPriority: RoomColor[]): string {
    const allColors = overlappingRooms.map(r => r.color);
    
    // Find highest priority color among all overlapping rooms
    for (const color of colorPriority) {
      if (allColors.includes(color)) {
        return ROOM_COLORS[color];
      }
    }
    
    // Fallback to first room's color if no priority found
    return ROOM_COLORS[overlappingRooms[0]?.color] || ROOM_COLORS.skyBlue;
  }

  private static resolveMatrixMultiple(
    overlappingRooms: Room[], 
    conflictMatrix: ConflictMatrixEntry[],
    colorPriority: RoomColor[]
  ): string {
    if (overlappingRooms.length === 0) {
      return ROOM_COLORS.skyBlue;
    }
    
    if (overlappingRooms.length === 1) {
      return ROOM_COLORS[overlappingRooms[0].color];
    }

    // For exactly two rooms, check if there's a matrix rule
    if (overlappingRooms.length === 2) {
      const [room1, room2] = overlappingRooms;
      
      // Check for direct match: room1 underneath × room2 onTop = result
      let rule = conflictMatrix.find(r => 
        r.underneath === room1.color && r.onTop === room2.color
      );
      
      if (rule) {
        return ROOM_COLORS[rule.result];
      }
      
      // Check for reverse match: room2 underneath × room1 onTop = result
      rule = conflictMatrix.find(r => 
        r.underneath === room2.color && r.onTop === room1.color
      );
      
      if (rule) {
        return ROOM_COLORS[rule.result];
      }
    }

    // If no matrix rule found or more than 2 rooms, fall back to priority
    return this.resolvePriorityMultiple(overlappingRooms, colorPriority);
  }

  // New helper functions for color-based resolution
  private static resolveChronologicalWithColors(colorData: { color: RoomColor, createdAt: number }[]): string {
    // Last created color wins
    const latestColor = colorData.reduce((latest, current) => 
      current.createdAt > latest.createdAt ? current : latest
    );
    return ROOM_COLORS[latestColor.color];
  }

  private static resolvePriorityWithColors(colorData: { color: RoomColor, createdAt: number }[], colorPriority: RoomColor[]): string {
    const allColors = colorData.map(c => c.color);
    
    console.log('Priority resolution:', {
      competingColors: allColors,
      priorityList: colorPriority,
      colorData: colorData
    });
    
    // Find highest priority color among all competing colors
    for (const color of colorPriority) {
      if (allColors.includes(color)) {
        console.log('Winner:', color);
        return ROOM_COLORS[color];
      }
    }
    
    // Fallback to first color if no priority found
    console.log('No priority found, using fallback:', colorData[0]?.color);
    return ROOM_COLORS[colorData[0]?.color] || ROOM_COLORS.skyBlue;
  }

  private static resolveMatrixWithColors(
    colorData: { color: RoomColor, createdAt: number }[], 
    conflictMatrix: ConflictMatrixEntry[],
    colorPriority: RoomColor[]
  ): string {
    if (colorData.length === 0) {
      return ROOM_COLORS.skyBlue;
    }
    
    if (colorData.length === 1) {
      return ROOM_COLORS[colorData[0].color];
    }

    // For exactly two colors, check if there's a matrix rule
    if (colorData.length === 2) {
      const [color1, color2] = colorData;
      
      // Check for direct match: color1 underneath × color2 onTop = result
      let rule = conflictMatrix.find(r => 
        r.underneath === color1.color && r.onTop === color2.color
      );
      
      if (rule) {
        return ROOM_COLORS[rule.result];
      }
      
      // Check for reverse match: color2 underneath × color1 onTop = result
      rule = conflictMatrix.find(r => 
        r.underneath === color2.color && r.onTop === color1.color
      );
      
      if (rule) {
        return ROOM_COLORS[rule.result];
      }
    }

    // If no matrix rule found or more than 2 colors, fall back to priority
    return this.resolvePriorityWithColors(colorData, colorPriority);
  }
}
