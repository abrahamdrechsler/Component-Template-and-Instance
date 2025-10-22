import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { OptionComponent, Option } from '@shared/schema';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, X, Trash2, Edit2, Check } from 'lucide-react';
import { useState } from 'react';

interface OptionComponentInspectorPanelProps {
  optionComponent: OptionComponent | undefined;
  options: Option[];
  onUpdateOptionComponent: (optionComponentId: string, name: string) => void;
  onDeleteOptionComponent: (optionComponentId: string) => void;
  onAddOptionToComponent: (optionComponentId: string, optionId: string) => void;
  onRemoveOptionFromComponent: (optionComponentId: string, optionId: string) => void;
}

export function OptionComponentInspectorPanel({
  optionComponent,
  options,
  onUpdateOptionComponent,
  onDeleteOptionComponent,
  onAddOptionToComponent,
  onRemoveOptionFromComponent,
}: OptionComponentInspectorPanelProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');

  if (!optionComponent) {
    return (
      <div className="w-full h-full bg-card border-l border-border flex flex-col shadow-sm">
        <div className="p-4 flex items-center justify-center h-full text-muted-foreground text-sm">
          Select an option component to view details
        </div>
      </div>
    );
  }

  const handleStartEditName = () => {
    setEditedName(optionComponent.name);
    setIsEditingName(true);
  };

  const handleSaveName = () => {
    if (editedName.trim()) {
      onUpdateOptionComponent(optionComponent.id, editedName.trim());
    }
    setIsEditingName(false);
  };

  const handleCancelEditName = () => {
    setIsEditingName(false);
    setEditedName('');
  };

  // Get options that are NOT yet added to this component
  const availableOptions = options.filter(
    (option) => !optionComponent.optionIds.includes(option.id)
  );

  // Get options that ARE in this component
  const componentOptions = options.filter((option) =>
    optionComponent.optionIds.includes(option.id)
  );

  const canAddMore = availableOptions.length > 0;

  return (
    <div className="w-full h-full bg-card border-l border-border flex flex-col shadow-sm">
      {/* Header */}
      <div className="p-4 border-b border-border">
        {isEditingName ? (
          <div className="flex items-center gap-2">
            <Input
              value={editedName}
              onChange={(e) => setEditedName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSaveName();
                } else if (e.key === 'Escape') {
                  handleCancelEditName();
                }
              }}
              className="text-base font-semibold"
              autoFocus
            />
            <Button
              size="sm"
              variant="ghost"
              onClick={handleSaveName}
              className="h-8 w-8 p-0"
            >
              <Check className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleCancelEditName}
              className="h-8 w-8 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <h2
              className="text-base font-semibold text-gray-900 cursor-pointer hover:text-blue-600 transition-colors"
              onClick={handleStartEditName}
            >
              {optionComponent.name}
            </h2>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleStartEditName}
              className="h-8 w-8 p-0"
            >
              <Edit2 className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Options Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label className="text-sm font-medium text-gray-700">Options</Label>
              {canAddMore && (
                <Select
                  value=""
                  onValueChange={(optionId) => {
                    if (optionId) {
                      onAddOptionToComponent(optionComponent.id, optionId);
                    }
                  }}
                >
                  <SelectTrigger className="w-[180px] h-8">
                    <div className="flex items-center gap-1">
                      <Plus className="w-4 h-4" />
                      <span className="text-xs">Add Option</span>
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {availableOptions.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {componentOptions.length === 0 ? (
              <div className="text-sm text-gray-500 text-center py-6 border border-dashed border-gray-300 rounded-md">
                No options added yet.
                {canAddMore && <div className="mt-1">Click "Add Option" to add one.</div>}
                {!canAddMore && (
                  <div className="mt-1">Create options in the project panel first.</div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {componentOptions.map((option) => (
                  <div
                    key={option.id}
                    className="flex items-center justify-between p-2 rounded border border-gray-200 bg-gray-50"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-sm">{option.name}</div>
                      <div className="text-xs text-gray-500">
                        {option.values.length} value{option.values.length !== 1 ? 's' : ''}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        onRemoveOptionFromComponent(optionComponent.id, option.id)
                      }
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {!canAddMore && componentOptions.length > 0 && (
              <div className="mt-2 text-xs text-gray-500 text-center">
                All available options have been added
              </div>
            )}
          </div>
        </div>
      </ScrollArea>

      {/* Footer - Delete Button */}
      <div className="p-4 border-t border-border">
        <Button
          variant="destructive"
          onClick={() => onDeleteOptionComponent(optionComponent.id)}
          className="w-full"
          data-testid="button-delete-option-component"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Delete Option Component
        </Button>
      </div>
    </div>
  );
}

