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
}
