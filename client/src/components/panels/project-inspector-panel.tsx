import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Room, ComponentTemplate, Link, Option, type FileMetadata } from '@shared/schema';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Package, Link as LinkIcon, Plus, Trash2, AlertCircle, Download, Settings } from 'lucide-react';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CreationMode } from '@/hooks/use-units-editor';

interface ProjectInspectorPanelProps {
  rooms: Room[];
  selectedRoomIds: string[];
  componentTemplates: ComponentTemplate[];
  links: Link[];
  options: Option[];
  activeOptionState: Record<string, string>;
  creationMode: CreationMode;
  isSelectingOrigin: boolean;
  onSelectRoom: (roomId: string) => void;
  onCreateTemplate: (name: string, roomIds: string[]) => void;
  onStartOriginSelection: (name: string, roomIds: string[]) => void;
  onCancelOriginSelection: () => void;
  onDeleteTemplate: (templateId: string) => void;
  onAddLink: (fileId: string, fileName: string) => void;
  onRemoveLink: (linkId: string) => void;
  onCreationModeChange: (mode: CreationMode) => void;
  onTemplateDragStart: (templateId: string) => void;
  onTemplateDragEnd: () => void;
  onCreateOption: (name: string) => void;
  onSelectOption: (optionId: string) => void;
  onSetActiveOptionValue: (optionId: string, valueId: string) => void;
}

const CREATION_MODE_LABELS: Record<CreationMode, string> = {
  'template-is-first-instance': 'Template is first Instance',
  'all-instances-are-templates': 'All instances are Templates',
  'template-is-separate-file': 'Template is Separate File',
  'template-always-live': 'Template always Live',
};

export function ProjectInspectorPanel({
  rooms,
  selectedRoomIds,
  componentTemplates,
  links,
  options,
  activeOptionState,
  creationMode,
  isSelectingOrigin,
  onSelectRoom,
  onCreateTemplate,
  onStartOriginSelection,
  onCancelOriginSelection,
  onDeleteTemplate,
  onAddLink,
  onRemoveLink,
  onCreationModeChange,
  onTemplateDragStart,
  onTemplateDragEnd,
  onCreateOption,
  onSelectOption,
  onSetActiveOptionValue,
}: ProjectInspectorPanelProps) {
  const [templateName, setTemplateName] = useState('');
  const [showTemplateInput, setShowTemplateInput] = useState(false);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [optionName, setOptionName] = useState('');
  const [showOptionInput, setShowOptionInput] = useState(false);
  
  const { data: publishedFiles = [] } = useQuery<FileMetadata[]>({
    queryKey: ['/api/files'],
    enabled: showLinkDialog,
  });

  const handleCreateTemplate = () => {
    if (selectedRoomIds.length === 0) {
      return;
    }
    
    if (!showTemplateInput) {
      setShowTemplateInput(true);
      setTemplateName(`Template ${componentTemplates.length + 1}`);
      return;
    }

    if (templateName.trim()) {
      // Start origin selection workflow instead of creating template directly
      onStartOriginSelection(templateName.trim(), selectedRoomIds);
      setTemplateName('');
      setShowTemplateInput(false);
    }
  };

  return (
    <div className="w-full h-full bg-card border-r border-border flex flex-col shadow-sm">
      <div className="p-4 border-b border-border bg-muted/30 space-y-3">
        <div>
          <Label className="text-xs font-semibold text-foreground/70 mb-1.5 block uppercase tracking-wide">Creation Mode</Label>
          <Select 
            value={creationMode} 
            onValueChange={(value) => onCreationModeChange(value as CreationMode)}
          >
            <SelectTrigger className="w-full" data-testid="select-creation-mode">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="template-is-first-instance" data-testid="option-template-is-first-instance">
                {CREATION_MODE_LABELS['template-is-first-instance']}
              </SelectItem>
              <SelectItem value="all-instances-are-templates" data-testid="option-all-instances-are-templates">
                {CREATION_MODE_LABELS['all-instances-are-templates']}
              </SelectItem>
              <SelectItem value="template-is-separate-file" data-testid="option-template-is-separate-file">
                {CREATION_MODE_LABELS['template-is-separate-file']}
              </SelectItem>
              <SelectItem value="template-always-live" data-testid="option-template-always-live">
                {CREATION_MODE_LABELS['template-always-live']}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <h2 className="text-sm font-semibold text-foreground" data-testid="text-panel-title">PROJECT INSPECTOR</h2>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label className="text-xs font-semibold text-foreground/70 uppercase tracking-wide">Rooms ({rooms.length})</Label>
            </div>
            
            {rooms.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-4">
                No rooms yet. Draw a room to get started.
              </div>
            ) : (
              <div className="space-y-2">
                {rooms.map((room) => (
                  <div
                    key={room.id}
                    onClick={() => onSelectRoom(room.id)}
                    className={`p-2 rounded-sm border text-sm cursor-pointer hover:border-primary/50 transition-colors ${
                      selectedRoomIds.includes(room.id)
                        ? 'border-primary bg-accent'
                        : 'border-border bg-muted/50 hover:bg-muted'
                    }`}
                    data-testid={`room-item-${room.id}`}
                  >
                    <div className="font-medium text-foreground">{room.name}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {room.width}' × {room.height}' at ({room.x}', {room.y}')
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Separator />

          <div>
            <div className="flex items-center justify-between mb-3">
              <Label className="text-xs font-semibold text-foreground/70 uppercase tracking-wide flex items-center gap-2">
                <Package className="w-4 h-4" />
                Templates ({componentTemplates.length})
              </Label>
            </div>

            {showTemplateInput && (
              <div className="mb-3 space-y-2">
                <Input
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="Template name"
                  className="text-sm"
                  data-testid="input-template-name"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleCreateTemplate();
                    } else if (e.key === 'Escape') {
                      setShowTemplateInput(false);
                      setTemplateName('');
                    }
                  }}
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleCreateTemplate}
                    className="flex-1"
                    data-testid="button-confirm-template"
                  >
                    Create
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setShowTemplateInput(false);
                      setTemplateName('');
                    }}
                    data-testid="button-cancel-template"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {isSelectingOrigin && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md space-y-2 mb-3">
                <div className="text-sm font-medium text-red-800">
                  Select Origin Point
                </div>
                <div className="text-xs text-red-600">
                  Click on the canvas to set the origin point for your template. 
                  The red dot shows where the template will anchor when placed.
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onCancelOriginSelection}
                  className="w-full text-red-600 border-red-200 hover:bg-red-100"
                  data-testid="button-cancel-origin"
                >
                  Cancel Template Creation
                </Button>
              </div>
            )}

            <Button
              size="sm"
              onClick={handleCreateTemplate}
              disabled={selectedRoomIds.length === 0 || isSelectingOrigin}
              className="w-full mb-3"
              data-testid="button-save-template"
            >
              <Plus className="w-4 h-4 mr-2" />
              {showTemplateInput ? 'Save Template' : 'Save as Template'}
            </Button>

            {componentTemplates.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-4">
                No templates yet. Select rooms and save as template.
              </div>
            ) : (
              <div className="space-y-2">
                {componentTemplates.map((template) => (
                  <div
                    key={template.id}
                    draggable
                    onDragStart={(e) => {
                      console.log('Drag start:', template.id);
                      e.dataTransfer.setData('templateId', template.id);
                      e.dataTransfer.effectAllowed = 'copy';
                      onTemplateDragStart(template.id);
                      
                      // Hide the default drag image (the UI element)
                      const img = new Image();
                      img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAUEBAAAACwAAAAAAQABAAACAkQBADs=';
                      e.dataTransfer.setDragImage(img, 0, 0);
                    }}
                    onDragEnd={() => {
                      console.log('Drag end');
                      onTemplateDragEnd();
                    }}
                    className="p-2 rounded-sm border border-border bg-muted/50 cursor-move hover:bg-muted hover:border-primary/50 transition-colors"
                    data-testid={`template-item-${template.id}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-medium text-foreground text-sm">
                          {template.name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {template.roomIds.length} room{template.roomIds.length !== 1 ? 's' : ''} • Drag to place
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onDeleteTemplate(template.id)}
                        onMouseDown={(e) => e.stopPropagation()}
                        className="h-8 w-8 p-0"
                        data-testid={`button-delete-template-${template.id}`}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Separator />

          {/* OPTIONS SECTION */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label className="text-xs font-semibold text-foreground/70 uppercase tracking-wide flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Options ({options.length})
              </Label>
            </div>

            {!showOptionInput && (
              <Button
                size="sm"
                onClick={() => {
                  setShowOptionInput(true);
                  setOptionName(`Option ${options.length + 1}`);
                }}
                className="w-full mb-3"
                data-testid="button-create-option"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Option
              </Button>
            )}

            {showOptionInput && (
              <div className="p-3 bg-accent rounded-md space-y-2 mb-3">
                <Label htmlFor="option-name" className="text-xs font-medium">Option Name</Label>
                <Input
                  id="option-name"
                  placeholder="Enter option name..."
                  value={optionName}
                  onChange={(e) => setOptionName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && optionName.trim()) {
                      onCreateOption(optionName.trim());
                      setOptionName('');
                      setShowOptionInput(false);
                    }
                  }}
                  autoFocus
                  data-testid="input-option-name"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      if (optionName.trim()) {
                        onCreateOption(optionName.trim());
                        setOptionName('');
                        setShowOptionInput(false);
                      }
                    }}
                    data-testid="button-save-option"
                  >
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setShowOptionInput(false);
                      setOptionName('');
                    }}
                    data-testid="button-cancel-option"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {options.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-4">
                No options yet. Click "Create Option" to get started.
              </div>
            ) : (
              <div className="space-y-2">
                {options.map((option) => (
                  <div
                    key={option.id}
                    onClick={() => onSelectOption(option.id)}
                    className="p-2 rounded-sm border border-border bg-muted/50 hover:bg-muted hover:border-primary/50 transition-colors cursor-pointer"
                    data-testid={`option-item-${option.id}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-medium text-foreground text-sm">
                          {option.name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {option.values.length} value{option.values.length !== 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* LINKS SECTION - COMMENTED OUT FOR NOW */}
          {/* <Separator />

          <div>
            <div className="flex items-center justify-between mb-3">
              <Label className="text-xs font-semibold text-foreground/70 uppercase tracking-wide flex items-center gap-2">
                <LinkIcon className="w-4 h-4" />
                Links ({links.length})
              </Label>
              <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
                <DialogTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8"
                    data-testid="button-add-link"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Link File
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Link Published File</DialogTitle>
                    <DialogDescription>
                      Select a published file to link. You can then import templates from the linked file.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {publishedFiles.length === 0 ? (
                      <div className="text-sm text-gray-500 text-center py-8">
                        No published files available.
                      </div>
                    ) : (
                      publishedFiles.map((file) => {
                        const isAlreadyLinked = links.some(link => link.linkedFileId === file.id);
                        return (
                          <div
                            key={file.id}
                            className="flex items-center justify-between p-3 rounded border border-gray-200 hover:bg-gray-50"
                          >
                            <div className="flex-1">
                              <div className="font-medium text-sm">{file.name}</div>
                              <div className="text-xs text-gray-500">
                                {file.unitCount} units • {new Date(file.timestamp).toLocaleDateString()}
                              </div>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => {
                                onAddLink(file.id, file.name);
                                setShowLinkDialog(false);
                              }}
                              disabled={isAlreadyLinked}
                              data-testid={`button-link-file-${file.id}`}
                            >
                              {isAlreadyLinked ? 'Linked' : 'Link'}
                            </Button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {links.length === 0 ? (
              <div className="text-sm text-gray-500 text-center py-4">
                No linked files yet. Click "Link File" to get started.
              </div>
            ) : (
              <div className="space-y-2">
                {links.map((link) => (
                  <div
                    key={link.id}
                    className="p-2 rounded border border-gray-200 bg-gray-50"
                    data-testid={`link-item-${link.id}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900 text-sm">
                          {link.linkedFileName}
                        </div>
                        {link.hasUpdates && (
                          <div className="flex items-center gap-1 text-xs text-amber-600 mt-1">
                            <AlertCircle className="w-3 h-3" />
                            Updates available
                          </div>
                        )}
                        {link.importedTemplateIds.length > 0 && (
                          <div className="text-xs text-gray-600 mt-1">
                            {link.importedTemplateIds.length} template{link.importedTemplateIds.length !== 1 ? 's' : ''} imported
                          </div>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onRemoveLink(link.id)}
                        className="h-8 w-8 p-0"
                        data-testid={`button-remove-link-${link.id}`}
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div> */}

          {/* ACTIVE OPTION STATE SECTION */}
          {options.length > 0 && (
            <>
              <Separator />
              <div>
                <Label className="text-xs font-semibold text-foreground/70 uppercase tracking-wide mb-3 block">
                  Active Option State
                </Label>
                <div className="space-y-3">
                  {options.map((option) => (
                    <div key={option.id}>
                      <Label htmlFor={`active-option-${option.id}`} className="text-xs font-medium text-foreground mb-1 block">
                        {option.name}
                      </Label>
                      <Select
                        value={activeOptionState[option.id] || option.values[0]?.id}
                        onValueChange={(valueId) => onSetActiveOptionValue(option.id, valueId)}
                      >
                        <SelectTrigger id={`active-option-${option.id}`} className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {option.values.map((value) => (
                            <SelectItem key={value.id} value={value.id}>
                              {value.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
