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

    // Calculate overlap amounts
    const overlapX = Math.max(0, Math.min(r1.right, r2.right) - Math.max(r1.left, r2.left));
    const overlapY = Math.max(0, Math.min(r1.bottom, r2.bottom) - Math.max(r1.top, r2.top));

    // Allow overlap up to 1 grid unit (12") in any direction
    const maxOverlap = 1;
    
    // Debug logging
    console.log('Overlap check:', {
      room1: { x: room1.x, y: room1.y, w: room1.width, h: room1.height },
      room2: { x: room2.x, y: room2.y, w: room2.width, h: room2.height },
      overlapX,
      overlapY,
      maxOverlap,
      valid: overlapX <= maxOverlap && overlapY <= maxOverlap
    });
    
    // Valid if overlap is within limits
    return overlapX <= maxOverlap && overlapY <= maxOverlap;
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
    // Check if target position is already valid
    const testRoom = { ...room, x: targetX, y: targetY };
    if (this.isValidRoomPlacement(testRoom, existingRooms)) {
      return { x: targetX, y: targetY };
    }

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
   * Get the valid position for a room during drag operations
   */
  static getValidDragPosition(
    room: Room,
    targetX: number,
    targetY: number,
    existingRooms: Room[]
  ): { x: number; y: number } {
    return this.getNearestValidPosition(room, targetX, targetY, existingRooms);
  }

  /**
   * Check if exact arrow key movement is valid (no snapping)
   */
  static isValidArrowKeyMove(
    room: Room,
    targetX: number,
    targetY: number,
    existingRooms: Room[]
  ): boolean {
    // Don't allow negative positions
    if (targetX < 0 || targetY < 0) return false;
    
    const testRoom = { ...room, x: targetX, y: targetY };
    // Filter out the room being moved to avoid checking against itself
    const otherRooms = existingRooms.filter(r => r.id !== room.id);
    return this.isValidRoomPlacement(testRoom, otherRooms);
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