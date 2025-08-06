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

  static drawRoom(ctx: CanvasRenderingContext2D, room: Room, gridSize: number, color: string) {
    const x = room.x * gridSize;
    const y = room.y * gridSize;
    const width = room.width * gridSize;
    const height = room.height * gridSize;
    
    ctx.strokeStyle = color;
    ctx.lineWidth = gridSize; // Wall thickness = 1 grid square
    ctx.strokeRect(x + gridSize / 2, y + gridSize / 2, width - gridSize, height - gridSize);
  }

  static drawEdge(ctx: CanvasRenderingContext2D, edge: Edge, gridSize: number, color: string) {
    ctx.strokeStyle = color;
    ctx.lineWidth = gridSize;
    ctx.beginPath();
    ctx.moveTo(edge.x1 * gridSize, edge.y1 * gridSize);
    ctx.lineTo(edge.x2 * gridSize, edge.y2 * gridSize);
    ctx.stroke();
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
