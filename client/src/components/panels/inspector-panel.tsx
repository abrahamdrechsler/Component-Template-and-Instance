import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Room, Edge, RoomColor, ComponentInstance, ComponentTemplate, Option, RoomCondition } from '@shared/schema';
import { ROOM_COLORS } from '@/types/room';
import { MousePointer, Trash2, Package, ChevronDown, Plus, X } from 'lucide-react';
import { useState } from 'react';

interface InspectorPanelProps {
  selectedRoom?: Room;
  selectedEdge?: Edge;
  selectedInstance?: ComponentInstance;
  rooms: Room[];
  componentTemplates: ComponentTemplate[];
  options: Option[];
  onUpdateRoom: (roomId: string, updates: Partial<Room>) => void;
  onUpdateEdge: (edgeId: string, updates: Partial<Edge>) => void;
  onDeleteRoom: (roomId: string) => void;
  onDeleteInstance?: (instanceId: string) => void;
}

export function InspectorPanel({
  selectedRoom,
  selectedEdge,
  selectedInstance,
  rooms,
  componentTemplates,
  options,
  onUpdateRoom,
  onUpdateEdge,
  onDeleteRoom,
  onDeleteInstance,
}: InspectorPanelProps) {
  const [conditionsExpanded, setConditionsExpanded] = useState(true);
  
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

  // Condition management helpers
  const addCondition = () => {
    if (!selectedRoom || options.length === 0) return;
    
    const firstOption = options[0];
    const firstValue = firstOption.values[0];
    
    const newCondition: RoomCondition = {
      id: `condition-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      optionId: firstOption.id,
      valueId: firstValue.id,
      operator: 'equals',
    };
    
    const currentConditions = selectedRoom.conditions || [];
    onUpdateRoom(selectedRoom.id, { conditions: [...currentConditions, newCondition] });
  };

  const updateCondition = (conditionId: string, updates: Partial<RoomCondition>) => {
    if (!selectedRoom || !selectedRoom.conditions) return;
    
    const updatedConditions = selectedRoom.conditions.map(c =>
      c.id === conditionId ? { ...c, ...updates } : c
    );
    
    onUpdateRoom(selectedRoom.id, { conditions: updatedConditions });
  };

  const deleteCondition = (conditionId: string) => {
    if (!selectedRoom || !selectedRoom.conditions) return;
    
    const updatedConditions = selectedRoom.conditions.filter(c => c.id !== conditionId);
    onUpdateRoom(selectedRoom.id, { conditions: updatedConditions });
  };

  const toggleOperator = (conditionId: string) => {
    if (!selectedRoom || !selectedRoom.conditions) return;
    
    const condition = selectedRoom.conditions.find(c => c.id === conditionId);
    if (!condition) return;
    
    const newOperator = condition.operator === 'equals' ? 'notEquals' : 'equals';
    updateCondition(conditionId, { operator: newOperator });
  };

  if (!selectedRoom && !selectedEdge && !selectedInstance) {
    return (
      <div className="w-full h-full bg-white border-l border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">Inspector</h2>
        </div>

        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center text-gray-500">
            <MousePointer className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm">Select a room, edge, or component instance to view properties</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-white border-l border-gray-200 flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-base font-semibold text-gray-900">
          {selectedInstance ? 'Component Instance' : selectedEdge ? 'Edge' : selectedRoom ? 'Room' : 'Inspector'}
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

          {/* Conditions Section */}
          {options.length > 0 && (
            <div className="border-t border-gray-200 pt-4">
              <div className="flex items-center justify-between mb-3">
                <button
                  onClick={() => setConditionsExpanded(!conditionsExpanded)}
                  className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                >
                  Conditions
                  <ChevronDown 
                    className={`w-4 h-4 transition-transform ${conditionsExpanded ? 'rotate-180' : ''}`}
                  />
                </button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={addCondition}
                  className="h-7 w-7 p-0"
                  disabled={options.length === 0}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              {conditionsExpanded && (
                <div className="space-y-2">
                  {(!selectedRoom.conditions || selectedRoom.conditions.length === 0) ? (
                    <p className="text-xs text-gray-500 text-center py-3">
                      No conditions. Click + to add.
                    </p>
                  ) : (
                    selectedRoom.conditions.map((condition) => {
                      const option = options.find(o => o.id === condition.optionId);
                      const selectedValue = option?.values.find(v => v.id === condition.valueId);
                      
                      return (
                        <div key={condition.id} className="flex items-center gap-2">
                          {/* Option Dropdown */}
                          <Select
                            value={condition.optionId}
                            onValueChange={(value) => {
                              const newOption = options.find(o => o.id === value);
                              if (newOption) {
                                updateCondition(condition.id, {
                                  optionId: value,
                                  valueId: newOption.values[0].id,
                                });
                              }
                            }}
                          >
                            <SelectTrigger className="flex-1 h-9 text-xs">
                              <SelectValue placeholder="Select option" />
                            </SelectTrigger>
                            <SelectContent>
                              {options.map((opt) => (
                                <SelectItem key={opt.id} value={opt.id} className="text-xs">
                                  {opt.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          {/* Operator Toggle */}
                          <button
                            onClick={() => toggleOperator(condition.id)}
                            className="h-9 w-9 flex items-center justify-center border border-gray-300 rounded bg-white hover:bg-gray-50 text-sm font-medium"
                            title={condition.operator === 'equals' ? 'Equals' : 'Not equals'}
                          >
                            {condition.operator === 'equals' ? '=' : '≠'}
                          </button>

                          {/* Value Dropdown */}
                          <Select
                            value={condition.valueId}
                            onValueChange={(value) => updateCondition(condition.id, { valueId: value })}
                          >
                            <SelectTrigger className="flex-1 h-9 text-xs">
                              <SelectValue placeholder="Select value" />
                            </SelectTrigger>
                            <SelectContent>
                              {option?.values.map((val) => (
                                <SelectItem key={val.id} value={val.id} className="text-xs">
                                  {val.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          {/* Delete Button */}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deleteCondition(condition.id)}
                            className="h-9 w-9 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          )}

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

      {/* Component Instance Inspector */}
      {selectedInstance && (
        <div className="flex-1 p-4 space-y-4">
          {(() => {
            const template = componentTemplates.find(t => t.id === selectedInstance.templateId);
            const templateRooms = template ? rooms.filter(r => template.roomIds.includes(r.id)) : [];
            
            return (
              <>
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                    <Package className="w-4 h-4 inline mr-1" />
                    Template
                  </Label>
                  <div className="bg-gray-50 p-3 rounded border border-gray-200">
                    <p className="text-sm font-medium">{template?.name || 'Unknown Template'}</p>
                    <p className="text-xs text-gray-500 mt-1">{templateRooms.length} room{templateRooms.length !== 1 ? 's' : ''}</p>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">Position</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-gray-500 mb-1 block">X (ft)</Label>
                      <Input
                        type="number"
                        value={selectedInstance.x}
                        disabled
                        className="text-sm bg-gray-50"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500 mb-1 block">Y (ft)</Label>
                      <Input
                        type="number"
                        value={selectedInstance.y}
                        disabled
                        className="text-sm bg-gray-50"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">Use the Move tool or drag to reposition</p>
                </div>

                {template && templateRooms.length > 0 && (
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-2 block">Template Rooms</Label>
                    <div className="space-y-2">
                      {templateRooms.map(room => (
                        <div key={room.id} className="flex items-center space-x-2 text-sm">
                          <div
                            className="w-4 h-4 rounded border border-gray-300"
                            style={{ backgroundColor: ROOM_COLORS[room.color] }}
                          />
                          <span className="text-gray-700">{room.name}</span>
                          <span className="text-gray-400 text-xs">({room.width} × {room.height} ft)</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {onDeleteInstance && (
                  <div className="pt-4 border-t border-gray-200">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => onDeleteInstance(selectedInstance.id)}
                      className="w-full flex items-center justify-center space-x-2"
                      data-testid="button-delete-instance"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Delete Instance</span>
                    </Button>
                  </div>
                )}
              </>
            );
          })()}
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
