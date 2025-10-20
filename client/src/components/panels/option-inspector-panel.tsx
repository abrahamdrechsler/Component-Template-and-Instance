import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Option } from '@shared/schema';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Plus, Trash2, Edit2, Check, X } from 'lucide-react';
import { useState } from 'react';

interface OptionInspectorPanelProps {
  option: Option | undefined;
  onUpdateOption: (optionId: string, name: string) => void;
  onDeleteOption: (optionId: string) => void;
  onAddOptionValue: (optionId: string, name: string) => void;
  onUpdateOptionValue: (optionId: string, valueId: string, name: string) => void;
  onDeleteOptionValue: (optionId: string, valueId: string) => void;
}

export function OptionInspectorPanel({
  option,
  onUpdateOption,
  onDeleteOption,
  onAddOptionValue,
  onUpdateOptionValue,
  onDeleteOptionValue,
}: OptionInspectorPanelProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [editingValueId, setEditingValueId] = useState<string | null>(null);
  const [editedValueName, setEditedValueName] = useState('');
  const [newValueName, setNewValueName] = useState('');

  if (!option) {
    return (
      <div className="w-full h-full bg-card border-l border-border flex flex-col shadow-sm">
        <div className="p-4 flex items-center justify-center h-full text-muted-foreground text-sm">
          Select an option to view details
        </div>
      </div>
    );
  }

  const handleStartEditName = () => {
    setEditedName(option.name);
    setIsEditingName(true);
  };

  const handleSaveName = () => {
    if (editedName.trim()) {
      onUpdateOption(option.id, editedName.trim());
    }
    setIsEditingName(false);
  };

  const handleCancelEditName = () => {
    setIsEditingName(false);
    setEditedName('');
  };

  const handleStartEditValue = (valueId: string, currentName: string) => {
    setEditingValueId(valueId);
    setEditedValueName(currentName);
  };

  const handleSaveValue = () => {
    if (editingValueId && editedValueName.trim()) {
      onUpdateOptionValue(option.id, editingValueId, editedValueName.trim());
    }
    setEditingValueId(null);
    setEditedValueName('');
  };

  const handleCancelEditValue = () => {
    setEditingValueId(null);
    setEditedValueName('');
  };

  const handleAddValue = () => {
    if (newValueName.trim()) {
      onAddOptionValue(option.id, newValueName.trim());
      setNewValueName('');
    }
  };

  const canDeleteValue = option.values.length > 2;

  return (
    <div className="w-full h-full bg-card border-l border-border flex flex-col shadow-sm">
      <div className="p-4 border-b border-border">
        <h2 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wide">
          Option Inspector
        </h2>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Option Name */}
          <div>
            <Label className="text-xs font-medium text-foreground/70 mb-2 block uppercase tracking-wide">
              Name
            </Label>
            {isEditingName ? (
              <div className="flex gap-2">
                <Input
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveName();
                    if (e.key === 'Escape') handleCancelEditName();
                  }}
                  className="flex-1"
                  autoFocus
                />
                <Button size="icon" variant="ghost" onClick={handleSaveName}>
                  <Check className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={handleCancelEditName}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between p-2 rounded-sm border border-border bg-muted/50">
                <span className="text-sm text-foreground">{option.name}</span>
                <Button size="icon" variant="ghost" onClick={handleStartEditName}>
                  <Edit2 className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>

          <Separator />

          {/* Option Values */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs font-medium text-foreground/70 uppercase tracking-wide">
                Values
              </Label>
              <span className="text-xs text-muted-foreground">
                {option.values.length} values
              </span>
            </div>
            
            <div className="space-y-2">
              {option.values.map((value) => (
                <div key={value.id}>
                  {editingValueId === value.id ? (
                    <div className="flex gap-2">
                      <Input
                        value={editedValueName}
                        onChange={(e) => setEditedValueName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveValue();
                          if (e.key === 'Escape') handleCancelEditValue();
                        }}
                        className="flex-1"
                        autoFocus
                      />
                      <Button size="icon" variant="ghost" onClick={handleSaveValue}>
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={handleCancelEditValue}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between p-2 rounded-sm border border-border bg-muted/50 hover:bg-muted transition-colors">
                      <span className="text-sm text-foreground">{value.name}</span>
                      <div className="flex gap-1">
                        <Button 
                          size="icon" 
                          variant="ghost"
                          onClick={() => handleStartEditValue(value.id, value.name)}
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        <Button 
                          size="icon" 
                          variant="ghost"
                          onClick={() => onDeleteOptionValue(option.id, value.id)}
                          disabled={!canDeleteValue}
                          title={canDeleteValue ? 'Delete value' : 'Minimum 2 values required'}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Add New Value */}
            <div className="mt-3 flex gap-2">
              <Input
                placeholder="New value name..."
                value={newValueName}
                onChange={(e) => setNewValueName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddValue();
                }}
              />
              <Button onClick={handleAddValue} size="icon" variant="outline">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <Separator />

          {/* Delete Option */}
          <Button
            variant="destructive"
            className="w-full"
            onClick={() => onDeleteOption(option.id)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Option
          </Button>
        </div>
      </ScrollArea>
    </div>
  );
}

