import { Point, GridSettings } from '@/types/room';
import { Room, Edge } from '@shared/schema';

export class CanvasUtils {
  static snapToGrid(point: Point, gridSize: number): Point {
    return {
      x: Math.round(point.x / gridSize) * gridSize,
      y: Math.round(point.y / gridSize) * gridSize,
    };
  }

  static drawGrid(ctx: CanvasRenderingContext2D, width: number, height: number, gridSize: number) {
    ctx.strokeStyle = '#E5E7EB';
    ctx.lineWidth = 1;
    
    // Vertical lines
    for (let x = 0; x <= width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    
    // Horizontal lines
    for (let y = 0; y <= height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  }



  static drawEdge(ctx: CanvasRenderingContext2D, edge: Edge, gridSize: number, color: string) {
    ctx.fillStyle = color;
    
    // Calculate wall rectangle based on edge orientation and position
    const x1 = edge.x1 * gridSize;
    const y1 = edge.y1 * gridSize;
    const x2 = edge.x2 * gridSize;
    const y2 = edge.y2 * gridSize;
    
    // Determine if this is a horizontal or vertical edge
    const isHorizontal = y1 === y2;
    
    if (isHorizontal) {
      // Horizontal edge (north/south walls)
      const wallX = Math.min(x1, x2);
      const wallWidth = Math.abs(x2 - x1);
      let wallY, wallHeight;
      
      if (edge.side === 'north') {
        // North wall - extends inward from top boundary
        wallY = y1;
        wallHeight = gridSize;
      } else {
        // South wall - extends inward from bottom boundary  
        wallY = y1 - gridSize;
        wallHeight = gridSize;
      }
      
      ctx.fillRect(wallX, wallY, wallWidth, wallHeight);
    } else {
      // Vertical edge (east/west walls)
      const wallY = Math.min(y1, y2);
      const wallHeight = Math.abs(y2 - y1);
      let wallX, wallWidth;
      
      if (edge.side === 'west') {
        // West wall - extends inward from left boundary
        wallX = x1;
        wallWidth = gridSize;
      } else {
        // East wall - extends inward from right boundary
        wallX = x1 - gridSize;
        wallWidth = gridSize;
      }
      
      ctx.fillRect(wallX, wallY, wallWidth, wallHeight);
    }
  }

  static getCanvasCoordinates(event: MouseEvent, canvas: HTMLCanvasElement): Point {
    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }

  static getGridCoordinates(point: Point, gridSize: number): Point {
    return {
      x: Math.floor(point.x / gridSize),
      y: Math.floor(point.y / gridSize),
    };
  }

  static isPointInRoom(point: Point, room: Room): boolean {
    return (
      point.x >= room.x &&
      point.x < room.x + room.width &&
      point.y >= room.y &&
      point.y < room.y + room.height
    );
  }

  static generateRoomEdges(room: Room): Edge[] {
    const edges: Edge[] = [];
    
    // North edge
    edges.push({
      id: `${room.id}-north`,
      roomId: room.id,
      side: 'north',
      x1: room.x,
      y1: room.y,
      x2: room.x + room.width,
      y2: room.y,
    });
    
    // South edge
    edges.push({
      id: `${room.id}-south`,
      roomId: room.id,
      side: 'south',
      x1: room.x,
      y1: room.y + room.height,
      x2: room.x + room.width,
      y2: room.y + room.height,
    });
    
    // East edge
    edges.push({
      id: `${room.id}-east`,
      roomId: room.id,
      side: 'east',
      x1: room.x + room.width,
      y1: room.y,
      x2: room.x + room.width,
      y2: room.y + room.height,
    });
    
    // West edge
    edges.push({
      id: `${room.id}-west`,
      roomId: room.id,
      side: 'west',
      x1: room.x,
      y1: room.y,
      x2: room.x,
      y2: room.y + room.height,
    });
    
    return edges;
  }

  /**
   * Generate edge segments based on room overlaps - breaks walls into segments
   * so only overlapping portions change color
   */
  static generateSegmentedRoomEdges(room: Room, allRooms: Room[]): Edge[] {
    const edges: Edge[] = [];
    const otherRooms = allRooms.filter(r => r.id !== room.id);
    
    // For each side, create segments based on overlaps
    edges.push(...this.createSegmentedEdge(room, 'north', otherRooms));
    edges.push(...this.createSegmentedEdge(room, 'south', otherRooms));
    edges.push(...this.createSegmentedEdge(room, 'east', otherRooms));
    edges.push(...this.createSegmentedEdge(room, 'west', otherRooms));
    
    return edges;
  }

  private static createSegmentedEdge(room: Room, side: 'north' | 'south' | 'east' | 'west', otherRooms: Room[]): Edge[] {
    const segments: Edge[] = [];
    
    // Define the full wall coordinates
    let wallStart: Point, wallEnd: Point;
    
    switch (side) {
      case 'north':
        wallStart = { x: room.x, y: room.y };
        wallEnd = { x: room.x + room.width, y: room.y };
        break;
      case 'south':
        wallStart = { x: room.x, y: room.y + room.height };
        wallEnd = { x: room.x + room.width, y: room.y + room.height };
        break;
      case 'east':
        wallStart = { x: room.x + room.width, y: room.y };
        wallEnd = { x: room.x + room.width, y: room.y + room.height };
        break;
      case 'west':
        wallStart = { x: room.x, y: room.y };
        wallEnd = { x: room.x, y: room.y + room.height };
        break;
    }

    // Find intersection points with other rooms
    const intersectionPoints = this.findWallIntersections(wallStart, wallEnd, side, otherRooms);
    
    // Sort intersection points along the wall
    const sortedPoints = this.sortPointsAlongWall(wallStart, wallEnd, intersectionPoints, side);
    
    // Create segments between intersection points
    let currentStart = wallStart;
    let segmentIndex = 0;
    
    for (const point of sortedPoints) {
      if (this.pointsAreEqual(currentStart, point)) continue;
      
      // Create segment
      segments.push({
        id: `${room.id}-${side}-${segmentIndex++}`,
        roomId: room.id,
        side: side,
        x1: currentStart.x,
        y1: currentStart.y,
        x2: point.x,
        y2: point.y,
      });
      
      currentStart = point;
    }
    
    // Create final segment to wall end
    if (!this.pointsAreEqual(currentStart, wallEnd)) {
      segments.push({
        id: `${room.id}-${side}-${segmentIndex}`,
        roomId: room.id,
        side: side,
        x1: currentStart.x,
        y1: currentStart.y,
        x2: wallEnd.x,
        y2: wallEnd.y,
      });
    }
    
    // If no intersections found, create single segment for whole wall
    if (segments.length === 0) {
      segments.push({
        id: `${room.id}-${side}-0`,
        roomId: room.id,
        side: side,
        x1: wallStart.x,
        y1: wallStart.y,
        x2: wallEnd.x,
        y2: wallEnd.y,
      });
    }
    
    return segments;
  }

  private static findWallIntersections(wallStart: Point, wallEnd: Point, side: string, otherRooms: Room[]): Point[] {
    const intersections: Point[] = [];
    
    for (const otherRoom of otherRooms) {
      const roomBounds = {
        left: otherRoom.x,
        right: otherRoom.x + otherRoom.width,
        top: otherRoom.y,
        bottom: otherRoom.y + otherRoom.height,
      };
      
      // Find where this wall intersects with the other room's bounds
      if (side === 'north' || side === 'south') {
        // Horizontal wall
        const wallY = wallStart.y;
        if (wallY >= roomBounds.top && wallY <= roomBounds.bottom) {
          const leftIntersect = Math.max(wallStart.x, roomBounds.left);
          const rightIntersect = Math.min(wallEnd.x, roomBounds.right);
          
          if (leftIntersect < rightIntersect) {
            intersections.push({ x: leftIntersect, y: wallY });
            intersections.push({ x: rightIntersect, y: wallY });
          }
        }
      } else {
        // Vertical wall
        const wallX = wallStart.x;
        if (wallX >= roomBounds.left && wallX <= roomBounds.right) {
          const topIntersect = Math.max(wallStart.y, roomBounds.top);
          const bottomIntersect = Math.min(wallEnd.y, roomBounds.bottom);
          
          if (topIntersect < bottomIntersect) {
            intersections.push({ x: wallX, y: topIntersect });
            intersections.push({ x: wallX, y: bottomIntersect });
          }
        }
      }
    }
    
    return intersections;
  }

  private static sortPointsAlongWall(wallStart: Point, wallEnd: Point, points: Point[], side: string): Point[] {
    const allPoints = [wallStart, ...points, wallEnd];
    
    if (side === 'north' || side === 'south') {
      // Sort by x coordinate for horizontal walls
      return allPoints
        .filter((point, index, arr) => arr.findIndex(p => this.pointsAreEqual(p, point)) === index)
        .sort((a, b) => a.x - b.x)
        .slice(1, -1); // Remove start and end points
    } else {
      // Sort by y coordinate for vertical walls  
      return allPoints
        .filter((point, index, arr) => arr.findIndex(p => this.pointsAreEqual(p, point)) === index)
        .sort((a, b) => a.y - b.y)
        .slice(1, -1); // Remove start and end points
    }
  }

  private static pointsAreEqual(p1: Point, p2: Point): boolean {
    const tolerance = 0.001;
    return Math.abs(p1.x - p2.x) < tolerance && Math.abs(p1.y - p2.y) < tolerance;
  }

  /**
   * Calculate the center point for an edge selection dot positioned on the inside face
   */
  static getEdgeDotPosition(room: Room, side: 'north' | 'south' | 'east' | 'west', gridSize: number): Point {
    // Calculate the true center of each room edge
    let dotX: number;
    let dotY: number;
    
    const roomCenterX = room.x + room.width / 2;
    const roomCenterY = room.y + room.height / 2;
    // Position dots in the center of the wall thickness (blue area)
    const wallThickness = 0.1; // Wall thickness in grid units
    const wallCenter = wallThickness / 2; // Center of the wall
    
    switch (side) {
      case 'north':
        dotX = roomCenterX * gridSize;
        dotY = (room.y + wallCenter) * gridSize;
        break;
      case 'south':
        dotX = roomCenterX * gridSize;
        dotY = (room.y + room.height - wallCenter) * gridSize;
        break;
      case 'east':
        dotX = (room.x + room.width - wallCenter) * gridSize;
        dotY = roomCenterY * gridSize;
        break;
      case 'west':
        dotX = (room.x + wallCenter) * gridSize;
        dotY = roomCenterY * gridSize;
        break;
    }
    
    return { x: dotX, y: dotY };
  }

  /**
   * Check if a point is near an edge dot
   */
  static isPointNearEdgeDot(point: Point, dotPosition: Point, gridSize: number): boolean {
    const threshold = gridSize * 0.4; // 40% of grid size for easier clicking
    const distance = Math.sqrt(
      Math.pow(point.x - dotPosition.x, 2) + Math.pow(point.y - dotPosition.y, 2)
    );
    return distance <= threshold;
  }

  /**
   * Draw an edge selection dot
   */
  static drawEdgeDot(ctx: CanvasRenderingContext2D, position: Point, gridSize: number, isHovered: boolean = false) {
    const radius = gridSize * 0.45; // 3x bigger than original (was 0.15)
    
    ctx.fillStyle = isHovered ? '#3B82F6' : '#000000';
    ctx.beginPath();
    ctx.arc(position.x, position.y, radius, 0, 2 * Math.PI);
    ctx.fill();
    
    // Add white border for visibility
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}
