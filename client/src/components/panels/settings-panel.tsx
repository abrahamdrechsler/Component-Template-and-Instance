import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RoomColor, EdgeFightingMode, ConflictMatrixEntry } from '@shared/schema';
import { ROOM_COLORS, DEFAULT_COLOR_PRIORITY } from '@/types/room';
import { GripVertical } from 'lucide-react';
import { useState } from 'react';

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
  
  const colorNames = {
    red: 'Red',
    pink: 'Pink',
    purple: 'Purple',
    deepPurple: 'Deep Purple',
    indigo: 'Indigo',
    blue: 'Blue',
    cyan: 'Cyan',
    teal: 'Teal',
    green: 'Green',
    orange: 'Orange',
  };

  const handleMatrixChange = (underneath: RoomColor, onTop: RoomColor, result: RoomColor) => {
    const existingEntry = conflictMatrix.find(
      entry => entry.underneath === underneath && entry.onTop === onTop
    );

    if (existingEntry) {
      const updatedMatrix = conflictMatrix.map(entry =>
        entry.underneath === underneath && entry.onTop === onTop
          ? { ...entry, result }
          : entry
      );
      onConflictMatrixChange(updatedMatrix);
    } else {
      const newEntry: ConflictMatrixEntry = { underneath, onTop, result };
      onConflictMatrixChange([...conflictMatrix, newEntry]);
    }
  };

  const getMatrixValue = (underneath: RoomColor, onTop: RoomColor): RoomColor => {
    const entry = conflictMatrix.find(
      e => e.underneath === underneath && e.onTop === onTop
    );
    return entry?.result || underneath;
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
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`flex items-center p-2 rounded border cursor-move transition-colors ${
                    draggedIndex === index
                      ? 'bg-blue-100 border-blue-300 opacity-50'
                      : 'bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  <GripVertical className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0" />
                  <div
                    className="w-4 h-4 rounded mr-3 flex-shrink-0"
                    style={{ backgroundColor: ROOM_COLORS[color] }}
                  />
                  <span className="flex-1 text-sm text-gray-900">
                    {colorNames[color]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Conflict Matrix */}
        {mode === 'matrix' && (
          <div>
            <Label className="text-sm font-medium text-gray-700 mb-3 block">
              Conflict Matrix
            </Label>
            <div className="text-xs text-gray-500 mb-3">
              Rows: underneath color, Columns: on top color
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead>
                  <tr>
                    <th className="w-8"></th>
                    {DEFAULT_COLOR_PRIORITY.slice(0, 4).map(color => (
                      <th key={color} className="w-8 p-1">
                        <div
                          className="w-4 h-4 rounded mx-auto"
                          style={{ backgroundColor: ROOM_COLORS[color] }}
                        />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {DEFAULT_COLOR_PRIORITY.slice(0, 4).map(rowColor => (
                    <tr key={rowColor}>
                      <td className="p-1">
                        <div
                          className="w-4 h-4 rounded"
                          style={{ backgroundColor: ROOM_COLORS[rowColor] }}
                        />
                      </td>
                      {DEFAULT_COLOR_PRIORITY.slice(0, 4).map(colColor => (
                        <td key={colColor} className="p-1">
                          <Select
                            value={getMatrixValue(rowColor, colColor)}
                            onValueChange={(value: RoomColor) =>
                              handleMatrixChange(rowColor, colColor, value)
                            }
                          >
                            <SelectTrigger className="w-full h-6 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={rowColor}>{colorNames[rowColor]}</SelectItem>
                              <SelectItem value={colColor}>{colorNames[colColor]}</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-2 text-xs text-gray-500">
              Undefined combinations fall back to priority list
            </div>
          </div>
        )}

        {/* Room Colors Palette */}
        <div>
          <Label className="text-sm font-medium text-gray-700 mb-3 block">Room Colors</Label>
          <div className="grid grid-cols-5 gap-2">
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
