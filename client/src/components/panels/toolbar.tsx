import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Pencil, Move, Trash2, Download, Upload } from 'lucide-react';

interface ToolbarProps {
  selectedTool: 'draw' | 'move' | 'delete';
  showGrid: boolean;
  onToolChange: (tool: 'draw' | 'move' | 'delete') => void;
  onToggleGrid: (show: boolean) => void;
  onExport: () => void;
  onImport: (file: File) => void;
}

export function Toolbar({
  selectedTool,
  showGrid,
  onToolChange,
  onToggleGrid,
  onExport,
  onImport,
}: ToolbarProps) {
  const handleImportClick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        onImport(file);
      }
    };
    input.click();
  };

  return (
    <div className="bg-white border-b border-gray-200 h-16 flex items-center px-4 shadow-sm">
      <div className="flex items-center space-x-4">
        {/* Drawing Tools */}
        <div className="flex items-center space-x-2 border-r border-gray-200 pr-4">
          <Button
            variant={selectedTool === 'draw' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onToolChange('draw')}
            className="flex items-center space-x-2"
            title="Draw Room (R)"
          >
            <Pencil className="w-4 h-4" />
            <span>Draw Room</span>
            <kbd className="ml-1 px-1 py-0.5 text-xs bg-gray-200 text-gray-600 rounded">R</kbd>
          </Button>
          <Button
            variant={selectedTool === 'move' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onToolChange('move')}
            className="flex items-center space-x-2"
            title="Move Room (M)"
          >
            <Move className="w-4 h-4" />
            <span>Move Room</span>
            <kbd className="ml-1 px-1 py-0.5 text-xs bg-gray-200 text-gray-600 rounded">M</kbd>
          </Button>
          <Button
            variant={selectedTool === 'delete' ? 'destructive' : 'outline'}
            size="sm"
            onClick={() => onToolChange('delete')}
            className="flex items-center space-x-2"
            title="Delete (D)"
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete</span>
            <kbd className="ml-1 px-1 py-0.5 text-xs bg-gray-200 text-gray-600 rounded">D</kbd>
          </Button>
        </div>

        {/* File Operations */}
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onExport}
            className="flex items-center space-x-2"
          >
            <Download className="w-4 h-4" />
            <span>Export</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleImportClick}
            className="flex items-center space-x-2"
          >
            <Upload className="w-4 h-4" />
            <span>Import</span>
          </Button>
        </div>
      </div>

      {/* Project Title */}
      <div className="flex-1 text-center">
        <h1 className="text-lg font-semibold text-gray-900">Edge Conflict Prototype</h1>
      </div>

      {/* Grid Controls and Shortcuts */}
      <div className="flex items-center space-x-4">
        <div className="text-xs text-gray-500 hidden md:block">
          <kbd className="px-1 py-0.5 bg-gray-200 text-gray-600 rounded">Del</kbd> to delete selected room
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="show-grid"
              checked={showGrid}
              onCheckedChange={onToggleGrid}
            />
            <label htmlFor="show-grid" className="text-sm text-gray-600">
              Show Grid
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
