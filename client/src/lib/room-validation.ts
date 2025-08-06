import { Room } from '@shared/schema';

export class RoomValidation {
  /**
   * Check if two rooms overlap by more than 1 grid unit (12")
   */
  static isValidRoomPlacement(newRoom: Room, existingRooms: Room[]): boolean {
    for (const existingRoom of existingRooms) {
      if (!this.isValidOverlap(newRoom, existingRoom)) {
        return false;
      }
    }
    return true;
  }

  /**
   * Check if a room can be moved to a new position without invalid overlaps
   */
  static isValidRoomMove(roomToMove: Room, newX: number, newY: number, allRooms: Room[]): boolean {
    const movedRoom = { ...roomToMove, x: newX, y: newY };
    const otherRooms = allRooms.filter(room => room.id !== roomToMove.id);
    
    return this.isValidRoomPlacement(movedRoom, otherRooms);
  }

  /**
   * Check if two rooms have valid overlap (max 1 grid unit on any side)
   */
  private static isValidOverlap(room1: Room, room2: Room): boolean {
    // Calculate the boundaries of both rooms
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

    // Check if rooms are completely separate (no overlap)
    if (r1.right <= r2.left || r2.right <= r1.left || 
        r1.bottom <= r2.top || r2.bottom <= r1.top) {
      return true; // No overlap is always valid
    }

    // Calculate overlap amounts on each side
    const overlapLeft = Math.max(0, Math.min(r1.right, r2.right) - Math.max(r1.left, r2.left));
    const overlapTop = Math.max(0, Math.min(r1.bottom, r2.bottom) - Math.max(r1.top, r2.top));

    // Check if overlap is within acceptable limits (1 grid unit = 12")
    const maxOverlap = 1;
    
    // For rooms to have valid overlap, they should only overlap by wall thickness
    // This means overlap should be exactly 1 unit on at most one dimension
    
    // If there's overlap in both dimensions, check if it's small enough
    if (overlapLeft > 0 && overlapTop > 0) {
      // Only allow overlap if it's wall-thickness on at least one side
      return overlapLeft <= maxOverlap && overlapTop <= maxOverlap;
    }

    // If there's only overlap in one dimension, it should be wall thickness
    if (overlapLeft > maxOverlap || overlapTop > maxOverlap) {
      return false;
    }

    return true;
  }

  /**
   * Get the nearest valid position for a room placement
   */
  static getNearestValidPosition(
    room: Room, 
    targetX: number, 
    targetY: number, 
    existingRooms: Room[]
  ): { x: number; y: number } {
    // Start from target position and search in expanding grid
    let bestX = targetX;
    let bestY = targetY;
    let bestDistance = Infinity;

    // Search in a reasonable radius around the target
    const searchRadius = 10;
    
    for (let dx = -searchRadius; dx <= searchRadius; dx++) {
      for (let dy = -searchRadius; dy <= searchRadius; dy++) {
        const testX = targetX + dx;
        const testY = targetY + dy;
        
        // Skip negative positions
        if (testX < 0 || testY < 0) continue;
        
        const testRoom = { ...room, x: testX, y: testY };
        
        if (this.isValidRoomPlacement(testRoom, existingRooms)) {
          const distance = Math.abs(dx) + Math.abs(dy);
          if (distance < bestDistance) {
            bestDistance = distance;
            bestX = testX;
            bestY = testY;
          }
        }
      }
    }

    return { x: bestX, y: bestY };
  }

  /**
   * Check if a position is valid for room placement during drag preview
   */
  static isValidPreviewPosition(
    room: Room,
    previewX: number,
    previewY: number,
    existingRooms: Room[]
  ): boolean {
    const previewRoom = { ...room, x: previewX, y: previewY };
    const otherRooms = existingRooms.filter(r => r.id !== room.id);
    return this.isValidRoomPlacement(previewRoom, otherRooms);
  }
}