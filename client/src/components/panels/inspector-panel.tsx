import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Room, Edge, RoomColor, ComponentInstance, ComponentTemplate, Option, RoomCondition } from '@shared/schema';
import { CreationMode, OptionMode } from '@/hooks/use-units-editor';
import { ROOM_COLORS } from '@/types/room';
import { MousePointer, Trash2, Package, ChevronDown, Plus, X } from 'lucide-react';
import { useState } from 'react';

interface InspectorPanelProps {
  selectedRoom?: Room;
  selectedEdge?: Edge;
  selectedInstance?: ComponentInstance;
  selectedTemplate?: ComponentTemplate;
  rooms: Room[];
  componentTemplates: ComponentTemplate[];
  options: Option[];
  creationMode: CreationMode;
  optionMode: OptionMode;
  isEditingTemplate: boolean;
  onUpdateRoom: (roomId: string, updates: Partial<Room>) => void;
  onUpdateEdge: (edgeId: string, updates: Partial<Edge>) => void;
  onDeleteRoom: (roomId: string) => void;
  onDeleteInstance?: (instanceId: string) => void;
  onUpdateTemplate?: (templateId: string, updates: Partial<ComponentTemplate>) => void;
  onAddRoomToTemplate?: (roomId: string, templateId: string) => void;
  onRemoveRoomFromTemplate?: (roomId: string) => void;
  getRoomTemplateAssociation?: (roomId: string) => string | undefined;
  onSetCreationMode?: (mode: CreationMode) => void;
  onSetOptionMode?: (mode: OptionMode) => void;
}

export function InspectorPanel({
  selectedRoom,
  selectedEdge,
  selectedInstance,
  selectedTemplate,
  rooms,
  componentTemplates,
  options,
  creationMode,
  optionMode,
  isEditingTemplate,
  onUpdateRoom,
  onUpdateEdge,
  onDeleteRoom,
  onDeleteInstance,
  onUpdateTemplate,
  onAddRoomToTemplate,
  onRemoveRoomFromTemplate,
  getRoomTemplateAssociation,
  onSetCreationMode,
  onSetOptionMode,
}: InspectorPanelProps) {
  const [conditionsExpanded, setConditionsExpanded] = useState(true);
  const [isEditingRoomName, setIsEditingRoomName] = useState(false);
  const [tempRoomName, setTempRoomName] = useState('');
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  
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

  // Template management functions
  const handleAddToTemplate = () => {
    if (!selectedRoom || !onAddRoomToTemplate) return;
    
    if (componentTemplates.length === 1) {
      // Only one template, add directly
      onAddRoomToTemplate(selectedRoom.id, componentTemplates[0].id);
    } else if (componentTemplates.length > 1) {
      // Multiple templates, show selection dialog
      setShowTemplateDialog(true);
    }
  };

  const handleRemoveFromTemplate = () => {
    if (!selectedRoom || !onRemoveRoomFromTemplate) return;
    onRemoveRoomFromTemplate(selectedRoom.id);
  };

  const handleTemplateSelection = () => {
    if (!selectedRoom || !selectedTemplateId || !onAddRoomToTemplate) return;
    onAddRoomToTemplate(selectedRoom.id, selectedTemplateId);
    setShowTemplateDialog(false);
    setSelectedTemplateId('');
  };

  const getRoomTemplateId = () => {
    if (!selectedRoom || !getRoomTemplateAssociation) return undefined;
    return getRoomTemplateAssociation(selectedRoom.id);
  };

  // Mode labels
  const CREATION_MODE_LABELS: Record<CreationMode, string> = {
    'template-is-first-instance': 'Modeling Component is first Instance',
    'all-instances-are-templates': 'All instances are Modeling Components',
    'template-is-separate-file': 'Modeling Component is Separate File',
    'template-always-live': 'Modeling Component always Live',
  };

  const OPTION_MODE_LABELS: Record<OptionMode, string> = {
    'option-component': 'Option Component',
    'special-option': 'Special Option',
  };

  if (!selectedRoom && !selectedEdge && !selectedInstance && !selectedTemplate) {
    return (
      <div className="w-full h-full bg-white border-l border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">Settings</h2>
        </div>

        <div className="flex-1 p-4 space-y-6">
          {/* Creation Mode */}
          <div>
            <Label className="text-sm font-medium text-gray-700 mb-2 block">Creation Mode</Label>
            <Select
              value={creationMode}
              onValueChange={(value) => onSetCreationMode?.(value as CreationMode)}
              disabled={!onSetCreationMode}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="template-is-first-instance">
                  {CREATION_MODE_LABELS['template-is-first-instance']}
                </SelectItem>
                <SelectItem value="all-instances-are-templates">
                  {CREATION_MODE_LABELS['all-instances-are-templates']}
                </SelectItem>
                <SelectItem value="template-is-separate-file">
                  {CREATION_MODE_LABELS['template-is-separate-file']}
                </SelectItem>
                <SelectItem value="template-always-live">
                  {CREATION_MODE_LABELS['template-always-live']}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Option Mode */}
          <div>
            <Label className="text-sm font-medium text-gray-700 mb-2 block">Option Mode</Label>
            <Select
              value={optionMode}
              onValueChange={(value) => onSetOptionMode?.(value as OptionMode)}
              disabled={!onSetOptionMode}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="option-component">
                  {OPTION_MODE_LABELS['option-component']}
                </SelectItem>
                <SelectItem value="special-option">
                  {OPTION_MODE_LABELS['special-option']}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-white border-l border-gray-200 flex flex-col">
      <div className="p-4 border-b border-gray-200">
        {selectedRoom ? (
          <div className="flex items-center">
            {isEditingRoomName ? (
              <Input
                value={tempRoomName}
                onChange={(e) => setTempRoomName(e.target.value)}
                onBlur={() => {
                  handleRoomUpdate('name', tempRoomName);
                  setIsEditingRoomName(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleRoomUpdate('name', tempRoomName);
                    setIsEditingRoomName(false);
                  } else if (e.key === 'Escape') {
                    setTempRoomName(selectedRoom.name);
                    setIsEditingRoomName(false);
                  }
                }}
                className="text-base font-semibold text-gray-900 border-none p-0 h-auto focus:ring-0 focus:border-none"
                autoFocus
              />
            ) : (
              <h2 
                className="text-base font-semibold text-gray-900 cursor-pointer hover:text-blue-600 transition-colors"
                onClick={() => {
                  setTempRoomName(selectedRoom.name);
                  setIsEditingRoomName(true);
                }}
              >
                {selectedRoom.name}
              </h2>
            )}
          </div>
        ) : (
          <h2 className="text-base font-semibold text-gray-900">
            {selectedInstance ? 'Component Instance' : selectedEdge ? 'Edge' : 'Inspector'}
          </h2>
        )}
      </div>

      {/* Room Inspector */}
      {selectedRoom && (
        <div className="flex-1 p-4 space-y-4">
          {/* Conditions Section - First section */}
          <div>
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
                  {options.length === 0 ? (
                    <p className="text-xs text-gray-500 text-center py-3">
                      No options exist. Create options in the project panel to add conditions.
                    </p>
                  ) : (!selectedRoom.conditions || selectedRoom.conditions.length === 0) ? (
                    <p className="text-xs text-gray-500 text-center py-3">
                      No conditions. Click + to add.
                    </p>
                  ) : (
                    selectedRoom.conditions.map((condition) => {
                      const option = options.find(o => o.id === condition.optionId);
                      const selectedValue = option?.values.find(v => v.id === condition.valueId);
                      const showSpecialCheckbox = isEditingTemplate && optionMode === 'special-option';
                      const isSpecial = condition.isSpecial || false;
                      
                      return (
                        <div 
                          key={condition.id} 
                          className={`flex items-center gap-2 p-2 rounded ${isSpecial ? 'border-2 border-purple-500 bg-purple-50/30' : ''}`}
                        >
                          {/* Special Condition Checkbox (only in template edit mode with special-option mode) */}
                          {showSpecialCheckbox && (
                            <div className="flex items-center" title="Special (per-instance) option">
                              <Checkbox
                                checked={isSpecial}
                                onCheckedChange={(checked) => {
                                  updateCondition(condition.id, { isSpecial: checked === true });
                                }}
                                className="h-5 w-5"
                              />
                            </div>
                          )}

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

          {/* Width and Height as separate horizontal lines */}
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
              className="text-sm w-full"
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
              className="text-sm w-full"
            />
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

          {/* Modeling Component management for "template-always-live" mode - Not implemented yet */}
          {false && creationMode === 'template-is-first-instance' && onAddRoomToTemplate && onRemoveRoomFromTemplate && (
            <div className="border-t border-gray-200 pt-4">
              <Label className="text-sm font-medium text-gray-700 mb-2 block">Modeling Component Association</Label>
              {getRoomTemplateId() ? (
                <div className="space-y-2">
                  <div className="text-sm text-gray-600">
                    Room is part of modeling component: {componentTemplates.find(t => t.id === getRoomTemplateId())?.name || 'Unknown'}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRemoveFromTemplate}
                    className="w-full"
                  >
                    Remove from Modeling Component
                  </Button>
                </div>
              ) : componentTemplates.length > 0 ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddToTemplate}
                  className="w-full"
                >
                  Add to Modeling Component
                </Button>
              ) : (
                <div className="text-sm text-gray-500 text-center py-2">
                  No modeling components available. Create a modeling component first.
                </div>
              )}
              
              {/* Modeling Component Selection Dialog */}
              <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Select Modeling Component</DialogTitle>
                    <DialogDescription>
                      Choose which modeling component to add this room to.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a modeling component" />
                      </SelectTrigger>
                      <SelectContent>
                        {componentTemplates.map((template) => (
                          <SelectItem key={template.id} value={template.id}>
                            {template.name} ({template.roomIds.length} room{template.roomIds.length !== 1 ? 's' : ''})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowTemplateDialog(false);
                          setSelectedTemplateId('');
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleTemplateSelection}
                        disabled={!selectedTemplateId}
                      >
                        Add to Modeling Component
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
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

      {/* Modeling Component Inspector */}
      {selectedTemplate && (
        <div className="flex-1 p-4 space-y-4">
          <div>
            <Label className="text-sm font-medium text-gray-700 mb-2 block">
              <Package className="w-4 h-4 inline mr-1" />
              Modeling Component
            </Label>
            <div className="bg-gray-50 p-3 rounded border border-gray-200">
              <p className="text-sm font-medium">{selectedTemplate.name}</p>
              <p className="text-xs text-gray-500 mt-1">ID: {selectedTemplate.id}</p>
            </div>
          </div>

          {/* Origin Point */}
          {selectedTemplate.originX !== undefined && selectedTemplate.originY !== undefined && (
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2 block">
                Origin Point
              </Label>
              <div className="bg-gray-50 p-3 rounded border border-gray-200">
                <p className="text-xs text-gray-600">
                  X: {selectedTemplate.originX}, Y: {selectedTemplate.originY}
                </p>
              </div>
            </div>
          )}

          {/* Child Rooms */}
          <div>
            <Label className="text-sm font-medium text-gray-700 mb-2 block">
              Child Rooms ({selectedTemplate.roomIds.length})
            </Label>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {selectedTemplate.roomIds.map(roomId => {
                const room = rooms.find(r => r.id === roomId);
                if (!room) return null;
                
                return (
                  <div key={roomId} className="bg-gray-50 p-3 rounded border border-gray-200">
                    <p className="text-sm font-medium">{room.name || `Room ${roomId}`}</p>
                    <div className="flex gap-4 mt-1 text-xs text-gray-600">
                      <span>X: {room.x}</span>
                      <span>Y: {room.y}</span>
                      <span>W: {room.width}</span>
                      <span>H: {room.height}</span>
                    </div>
                    <div 
                      className="w-4 h-4 rounded mt-2 border border-gray-300"
                      style={{ backgroundColor: ROOM_COLORS[room.color] }}
                    />
                  </div>
                );
              })}
            </div>
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
                    Modeling Component
                  </Label>
                  <div className="bg-gray-50 p-3 rounded border border-gray-200">
                    <p className="text-sm font-medium">{template?.name || 'Unknown Modeling Component'}</p>
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
                    <Label className="text-sm font-medium text-gray-700 mb-2 block">Modeling Component Rooms</Label>
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
