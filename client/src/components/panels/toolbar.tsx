import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Pencil, Move, Trash2, Download, Upload, MousePointer, Cloud, Database } from 'lucide-react';
import { Link } from 'wouter';

interface ToolbarProps {
  selectedTool: 'draw' | 'move' | 'delete' | 'select';
  showGrid: boolean;
  fileName: string;
  onToolChange: (tool: 'draw' | 'move' | 'delete' | 'select') => void;
  onToggleGrid: (show: boolean) => void;
  onFileNameChange: (name: string) => void;
  onExport: () => void;
  onImport: (file: File) => void;
  onPublish: () => void;
}

export function Toolbar({
  selectedTool,
  showGrid,
  fileName,
  onToolChange,
  onToggleGrid,
  onFileNameChange,
  onExport,
  onImport,
  onPublish,
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
    <div className="bg-card border-b border-border h-14 flex items-center px-4 shadow-sm">
      <div className="flex items-center space-x-3">
        {/* Drawing Tools */}
        <div className="flex items-center space-x-1 border-r border-border pr-3">
          <Button
            variant={selectedTool === 'select' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onToolChange('select')}
            className="flex items-center space-x-2"
            title="Select (S)"
            data-testid="button-tool-select"
          >
            <MousePointer className="w-4 h-4" />
            <span>Select</span>
            <kbd className="ml-1 px-1 py-0.5 text-xs bg-muted text-muted-foreground rounded-sm">S</kbd>
          </Button>
          <Button
            variant={selectedTool === 'draw' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onToolChange('draw')}
            className="flex items-center space-x-2"
            title="Draw Room (R)"
            data-testid="button-tool-draw"
          >
            <Pencil className="w-4 h-4" />
            <span>Draw Room</span>
            <kbd className="ml-1 px-1 py-0.5 text-xs bg-muted text-muted-foreground rounded-sm">R</kbd>
          </Button>
          <Button
            variant={selectedTool === 'move' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onToolChange('move')}
            className="flex items-center space-x-2"
            title="Move Room (M)"
            data-testid="button-tool-move"
          >
            <Move className="w-4 h-4" />
            <span>Move Room</span>
            <kbd className="ml-1 px-1 py-0.5 text-xs bg-muted text-muted-foreground rounded-sm">M</kbd>
          </Button>
          <Button
            variant={selectedTool === 'delete' ? 'destructive' : 'outline'}
            size="sm"
            onClick={() => onToolChange('delete')}
            className="flex items-center space-x-2"
            title="Delete (D)"
            data-testid="button-tool-delete"
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete</span>
            <kbd className="ml-1 px-1 py-0.5 text-xs bg-muted text-muted-foreground rounded-sm">D</kbd>
          </Button>
        </div>

        {/* File Operations */}
        <div className="flex items-center space-x-1 border-r border-border pr-3">
          <Button
            variant="outline"
            size="sm"
            onClick={onExport}
            className="flex items-center space-x-2"
            data-testid="button-export"
          >
            <Download className="w-4 h-4" />
            <span>Export</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleImportClick}
            className="flex items-center space-x-2"
            data-testid="button-import"
          >
            <Upload className="w-4 h-4" />
            <span>Import</span>
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={onPublish}
            className="flex items-center space-x-2"
            data-testid="button-publish"
          >
            <Cloud className="w-4 h-4" />
            <span>Publish</span>
          </Button>
        </div>

        {/* Database Link */}
        <div className="flex items-center space-x-2">
          <Link href="/database">
            <Button
              variant="outline"
              size="sm"
              className="flex items-center space-x-2"
              data-testid="button-database"
            >
              <Database className="w-4 h-4" />
              <span>View Database</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Project Name */}
      <div className="flex-1 flex items-center justify-center gap-2">
        <span className="text-sm text-muted-foreground font-medium">Project:</span>
        <Input
          value={fileName}
          onChange={(e) => onFileNameChange(e.target.value)}
          className="w-64 h-8 text-center text-sm bg-white border-border"
          placeholder="Enter project name"
          data-testid="input-file-name"
        />
      </div>

      {/* Grid Controls and Shortcuts */}
      <div className="flex items-center space-x-3">
        {selectedTool === 'select' ? (
          <div className="text-xs text-muted-foreground hidden md:block">
            Hold <kbd className="px-1 py-0.5 bg-muted text-muted-foreground rounded-sm text-xs">Ctrl</kbd>, <kbd className="px-1 py-0.5 bg-muted text-muted-foreground rounded-sm text-xs">Cmd</kbd>, or <kbd className="px-1 py-0.5 bg-muted text-muted-foreground rounded-sm text-xs">Shift</kbd> to multi-select
          </div>
        ) : (
          <div className="text-xs text-muted-foreground hidden md:block">
            <kbd className="px-1 py-0.5 bg-muted text-muted-foreground rounded-sm text-xs">Del</kbd> to delete selected room
          </div>
        )}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="show-grid"
              checked={showGrid}
              onCheckedChange={onToggleGrid}
            />
            <label htmlFor="show-grid" className="text-sm text-muted-foreground">
              Show Grid
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
