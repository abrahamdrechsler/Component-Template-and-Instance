import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RoomColor, EdgeFightingMode, ConflictMatrixEntry } from '@shared/schema';
import { ROOM_COLORS, DEFAULT_COLOR_PRIORITY } from '@/types/room';
import { GripVertical, Plus, Trash2 } from 'lucide-react';
import { useState, useEffect } from 'react';

interface SettingsPanelProps {
  mode: EdgeFightingMode;
  colorPriority: RoomColor[];
  conflictMatrix: ConflictMatrixEntry[];
  selectedColor: RoomColor;
  onModeChange: (mode: EdgeFightingMode) => void;
  onColorPriorityChange: (priority: RoomColor[]) => void;
  onConflictMatrixChange: (matrix: ConflictMatrixEntry[]) => void;
  onSelectedColorChange: (color: RoomColor) => void;
}

export function SettingsPanel({
  mode,
  colorPriority,
  conflictMatrix,
  selectedColor,
  onModeChange,
  onColorPriorityChange,
  onConflictMatrixChange,
  onSelectedColorChange,
}: SettingsPanelProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  // Initialize conflict matrix with one default row when switching to matrix mode
  useEffect(() => {
    if (mode === 'matrix' && conflictMatrix.length === 0 && colorPriority.length >= 2) {
      const defaultRule: ConflictMatrixEntry = {
        underneath: colorPriority[0],
        onTop: colorPriority[1],
        result: colorPriority[0]
      };
      onConflictMatrixChange([defaultRule]);
    }
  }, [mode, conflictMatrix.length, colorPriority, onConflictMatrixChange]);
  
  const colorNames = {
    skyBlue: 'Blue',
    coralRed: 'Red',
    goldenYellow: 'Yellow',
    mintGreen: 'Green',
    lavenderPurple: 'Purple',
    slateGray: 'Gray',
  };



  const movePriorityItem = (fromIndex: number, toIndex: number) => {
    const newPriority = [...colorPriority];
    const [movedItem] = newPriority.splice(fromIndex, 1);
    newPriority.splice(toIndex, 0, movedItem);
    onColorPriorityChange(newPriority);
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.currentTarget.outerHTML);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== dropIndex) {
      movePriorityItem(draggedIndex, dropIndex);
    }
    setDraggedIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        if (index > 0) {
          movePriorityItem(index, index - 1);
          setSelectedIndex(index - 1);
        }
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (index < colorPriority.length - 1) {
          movePriorityItem(index, index + 1);
          setSelectedIndex(index + 1);
        }
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        setSelectedIndex(selectedIndex === index ? null : index);
        break;
    }
  };

  const handleColorClick = (index: number) => {
    setSelectedIndex(selectedIndex === index ? null : index);
  };

  // Get available colors (only those used in rooms)
  const availableColors = colorPriority; // This already contains only used colors

  const addMatrixRule = () => {
    if (availableColors.length >= 2) {
      const newRule: ConflictMatrixEntry = {
        underneath: availableColors[0],
        onTop: availableColors[1],
        result: availableColors[0]
      };
      onConflictMatrixChange([...conflictMatrix, newRule]);
    }
  };

  const removeMatrixRule = (index: number) => {
    const updatedMatrix = conflictMatrix.filter((_, i) => i !== index);
    onConflictMatrixChange(updatedMatrix);
  };

  const updateMatrixRule = (index: number, field: keyof ConflictMatrixEntry, value: RoomColor) => {
    const updatedMatrix = conflictMatrix.map((entry, i) => 
      i === index ? { ...entry, [field]: value } : entry
    );
    onConflictMatrixChange(updatedMatrix);
  };

  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col overflow-hidden">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-base font-semibold text-gray-900">Edge Fighting Rules</h2>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Mode Selection */}
        <div>
          <Label className="text-sm font-medium text-gray-700 mb-3 block">Resolution Mode</Label>
          <RadioGroup value={mode} onValueChange={onModeChange}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="chronological" id="chronological" />
              <div>
                <Label htmlFor="chronological" className="text-sm font-medium text-gray-900">
                  Chronological
                </Label>
                <div className="text-xs text-gray-500">Last drawn room wins</div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="priority" id="priority" />
              <div>
                <Label htmlFor="priority" className="text-sm font-medium text-gray-900">
                  Priority List
                </Label>
                <div className="text-xs text-gray-500">User-defined hierarchy</div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="matrix" id="matrix" />
              <div>
                <Label htmlFor="matrix" className="text-sm font-medium text-gray-900">
                  Conflict Matrix
                </Label>
                <div className="text-xs text-gray-500">Custom rule table</div>
              </div>
            </div>
          </RadioGroup>
        </div>

        {/* Color Priority List */}
        {mode === 'priority' && (
          <div>
            <Label className="text-sm font-medium text-gray-700 mb-3 block">
              Color Priority (Highest to Lowest)
            </Label>
            <div className="space-y-2">
              {colorPriority.map((color, index) => (
                <div
                  key={color}
                  draggable
                  tabIndex={0}
                  onClick={() => handleColorClick(index)}
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                  onKeyDown={(e) => handleKeyDown(e, index)}
                  className={`flex items-center p-2 rounded border cursor-move transition-colors focus:outline-none ${
                    draggedIndex === index
                      ? 'bg-blue-100 border-blue-300 opacity-50'
                      : selectedIndex === index
                      ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-200'
                      : 'bg-gray-50 hover:bg-gray-100 border-gray-200'
                  }`}
                  role="button"
                  aria-label={`${colorNames[color]} priority item. Use arrow keys to move up or down.`}
                >
                  <GripVertical className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0" />
                  <div
                    className="w-4 h-4 rounded mr-3 flex-shrink-0"
                    style={{ backgroundColor: ROOM_COLORS[color] }}
                  />
                  <span className="flex-1 text-sm text-gray-900">
                    {colorNames[color]}
                  </span>
                  {selectedIndex === index && (
                    <span className="text-xs text-blue-600 ml-2">
                      ↑↓ to move
                    </span>
                  )}
                </div>
              ))}
            </div>
            {colorPriority.length > 0 && (
              <div className="text-xs text-gray-500 mt-2">
                Click to select, then use ↑↓ arrow keys to reorder, or drag and drop
              </div>
            )}
          </div>
        )}

        {/* Conflict Matrix */}
        {mode === 'matrix' && (
          <div>
            <Label className="text-sm font-medium text-gray-700 mb-3 block">
              Conflict Rules
            </Label>
            <div className="text-xs text-gray-500 mb-4">
              Format: Color × Color = Result
            </div>
            
            {availableColors.length < 2 ? (
              <div className="text-sm text-gray-500 italic">
                Need at least 2 different room colors to create conflict rules
              </div>
            ) : (
              <div className="space-y-2">
                {conflictMatrix.map((rule, index) => (
                  <div key={index} className="bg-gray-50 rounded border p-2">
                    <div className="flex items-center gap-2">
                      <Select
                        value={rule.underneath}
                        onValueChange={(value: RoomColor) => updateMatrixRule(index, 'underneath', value)}
                      >
                        <SelectTrigger className="h-8 w-10 p-1">
                          <div className="w-6 h-6 rounded" style={{ backgroundColor: ROOM_COLORS[rule.underneath] }} />
                        </SelectTrigger>
                        <SelectContent>
                          {availableColors.map(color => (
                            <SelectItem key={color} value={color}>
                              <div className="w-6 h-6 rounded" style={{ backgroundColor: ROOM_COLORS[color] }} />
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      
                      <span className="text-gray-600 font-mono">×</span>
                      
                      <Select
                        value={rule.onTop}
                        onValueChange={(value: RoomColor) => updateMatrixRule(index, 'onTop', value)}
                      >
                        <SelectTrigger className="h-8 w-10 p-1">
                          <div className="w-6 h-6 rounded" style={{ backgroundColor: ROOM_COLORS[rule.onTop] }} />
                        </SelectTrigger>
                        <SelectContent>
                          {availableColors.map(color => (
                            <SelectItem key={color} value={color}>
                              <div className="w-6 h-6 rounded" style={{ backgroundColor: ROOM_COLORS[color] }} />
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <span className="text-gray-600 font-mono">=</span>
                      
                      <Select
                        value={rule.result}
                        onValueChange={(value: RoomColor) => updateMatrixRule(index, 'result', value)}
                      >
                        <SelectTrigger className="h-8 w-10 p-1">
                          <div className="w-6 h-6 rounded" style={{ backgroundColor: ROOM_COLORS[rule.result] }} />
                        </SelectTrigger>
                        <SelectContent>
                          {availableColors.map(color => (
                            <SelectItem key={color} value={color}>
                              <div className="w-6 h-6 rounded" style={{ backgroundColor: ROOM_COLORS[color] }} />
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeMatrixRule(index)}
                        className="p-1 h-8 w-8 flex-shrink-0 ml-auto"
                      >
                        <Trash2 className="w-4 h-4 text-gray-400" />
                      </Button>
                    </div>
                  </div>
                ))}
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addMatrixRule}
                  className="w-full h-8"
                  disabled={availableColors.length < 2}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Rule
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Room Colors Palette */}
        <div>
          <Label className="text-sm font-medium text-gray-700 mb-3 block">Room Colors</Label>
          <div className="grid grid-cols-6 gap-2">
            {Object.entries(ROOM_COLORS).map(([colorKey, colorValue]) => (
              <Button
                key={colorKey}
                variant="outline"
                size="sm"
                className={`w-8 h-8 p-0 border-2 ${
                  selectedColor === colorKey
                    ? 'border-blue-500'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                style={{ backgroundColor: colorValue }}
                onClick={() => onSelectedColorChange(colorKey as RoomColor)}
                title={colorNames[colorKey as RoomColor]}
              />
            ))}
          </div>
          <div className="mt-2 text-xs text-gray-500">
            Selected: <span>{colorNames[selectedColor]}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
