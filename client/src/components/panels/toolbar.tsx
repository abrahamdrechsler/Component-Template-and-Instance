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

        {/* File Operations - TEMPORARILY HIDDEN - TODO: Revisit and add back to UI later */}
        {/* Functionality is preserved but UI elements are hidden for now */}
        {false && (
          <>
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

            {/* Database Link - TEMPORARILY HIDDEN - TODO: Revisit and add back to UI later */}
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
          </>
        )}
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

      {/* Grid Controls and Shortcuts - TEMPORARILY HIDDEN - TODO: Revisit UI hints later */}
      {/* Multi-select hint and show grid checkbox are hidden for cleaner UI */}
      <div className="flex items-center space-x-3">
        {/* Shortcuts hidden but keyboard functionality still works */}
      </div>
    </div>
  );
}
