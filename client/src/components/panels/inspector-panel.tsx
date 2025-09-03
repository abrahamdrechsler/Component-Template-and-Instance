import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Room, Edge, RoomColor } from '@shared/schema';
import { ROOM_COLORS } from '@/types/room';
import { MousePointer, Trash2 } from 'lucide-react';

interface InspectorPanelProps {
  selectedRoom?: Room;
  selectedEdge?: Edge;
  rooms: Room[];
  onUpdateRoom: (roomId: string, updates: Partial<Room>) => void;
  onUpdateEdge: (edgeId: string, updates: Partial<Edge>) => void;
  onDeleteRoom: (roomId: string) => void;
}

export function InspectorPanel({
  selectedRoom,
  selectedEdge,
  rooms,
  onUpdateRoom,
  onUpdateEdge,
  onDeleteRoom,
}: InspectorPanelProps) {
  const colorNames = {
    skyBlue: 'Blue',
    coralRed: 'Red',
    goldenYellow: 'Yellow',
    mintGreen: 'Green',
    lavenderPurple: 'Purple',
    slateGray: 'Gray',
  };

  const handleRoomUpdate = (field: keyof Room, value: any) => {
    if (selectedRoom) {
      onUpdateRoom(selectedRoom.id, { [field]: value });
    }
  };

  const handleEdgeColorChange = (color: RoomColor) => {
    if (selectedEdge) {
      const room = rooms.find(r => r.id === selectedEdge.roomId);
      if (room && color === room.color) {
        // If same as room color, clear override to inherit
        onUpdateEdge(selectedEdge.id, { colorOverride: undefined });
      } else {
        // Set color override
        onUpdateEdge(selectedEdge.id, { colorOverride: color });
      }
    }
  };

  const getEdgeSideName = (side: string) => {
    return side.charAt(0).toUpperCase() + side.slice(1);
  };

  if (!selectedRoom && !selectedEdge) {
    return (
      <div className="w-72 bg-white border-l border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">Inspector</h2>
        </div>

        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center text-gray-500">
            <MousePointer className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm">Select a room or edge to view properties</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-72 bg-white border-l border-gray-200 flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-base font-semibold text-gray-900">
          {selectedEdge ? 'Edge' : selectedRoom ? 'Room' : 'Inspector'}
        </h2>
      </div>

      {/* Room Inspector */}
      {selectedRoom && (
        <div className="flex-1 p-4 space-y-4">
          <div>
            <Label htmlFor="room-name" className="text-sm font-medium text-gray-700 mb-2 block">
              Room Name
            </Label>
            <Input
              id="room-name"
              value={selectedRoom.name}
              onChange={(e) => handleRoomUpdate('name', e.target.value)}
              className="text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="room-width" className="text-sm font-medium text-gray-700 mb-2 block">
                Width (ft)
              </Label>
              <Input
                id="room-width"
                type="number"
                min="1"
                value={selectedRoom.width}
                onChange={(e) => handleRoomUpdate('width', parseInt(e.target.value) || 1)}
                className="text-sm"
              />
            </div>
            <div>
              <Label htmlFor="room-height" className="text-sm font-medium text-gray-700 mb-2 block">
                Height (ft)
              </Label>
              <Input
                id="room-height"
                type="number"
                min="1"
                value={selectedRoom.height}
                onChange={(e) => handleRoomUpdate('height', parseInt(e.target.value) || 1)}
                className="text-sm"
              />
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium text-gray-700 mb-2 block">Room Color</Label>
            <div className="flex items-center space-x-2">
              <div
                className="w-8 h-8 rounded border border-gray-300"
                style={{ backgroundColor: ROOM_COLORS[selectedRoom.color] }}
              />
              <Select
                value={selectedRoom.color}
                onValueChange={(value: RoomColor) => handleRoomUpdate('color', value)}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(colorNames).map(([colorKey, colorName]) => (
                    <SelectItem key={colorKey} value={colorKey}>
                      {colorName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium text-gray-700 mb-2 block">Position</Label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="room-x" className="text-xs text-gray-500 mb-1 block">X (ft)</Label>
                <Input
                  id="room-x"
                  type="number"
                  value={selectedRoom.x}
                  onChange={(e) => handleRoomUpdate('x', parseInt(e.target.value) || 0)}
                  className="text-sm"
                />
              </div>
              <div>
                <Label htmlFor="room-y" className="text-xs text-gray-500 mb-1 block">Y (ft)</Label>
                <Input
                  id="room-y"
                  type="number"
                  value={selectedRoom.y}
                  onChange={(e) => handleRoomUpdate('y', parseInt(e.target.value) || 0)}
                  className="text-sm"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-200">
            <Button
              variant="destructive"
              size="sm"
              onClick={() => onDeleteRoom(selectedRoom.id)}
              className="w-full flex items-center justify-center space-x-2"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete Room</span>
            </Button>
          </div>
        </div>
      )}

      {/* Edge Inspector */}
      {selectedEdge && (
        <div className="flex-1 p-4 space-y-4">
          <div>
            <Label htmlFor="edge-name" className="text-sm font-medium text-gray-700 mb-2 block">
              Edge Name
            </Label>
            <Input
              id="edge-name"
              value={selectedEdge.name || `${rooms.find(r => r.id === selectedEdge.roomId)?.name || 'Room'} - ${getEdgeSideName(selectedEdge.side)}`}
              onChange={(e) => onUpdateEdge(selectedEdge.id, { name: e.target.value })}
              className="text-sm"
            />
          </div>

          <div>
            <Label className="text-sm font-medium text-gray-700 mb-2 block">Edge Color</Label>
            <div className="flex items-center space-x-2">
              <div
                className="w-8 h-8 rounded border border-gray-300"
                style={{ backgroundColor: selectedEdge.colorOverride ? ROOM_COLORS[selectedEdge.colorOverride] : ROOM_COLORS[rooms.find(r => r.id === selectedEdge.roomId)?.color || 'skyBlue'] }}
              />
              <Select
                value={selectedEdge.colorOverride || rooms.find(r => r.id === selectedEdge.roomId)?.color || 'skyBlue'}
                onValueChange={handleEdgeColorChange}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(colorNames).map(([colorKey, colorName]) => (
                    <SelectItem key={colorKey} value={colorKey}>
                      {colorName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
