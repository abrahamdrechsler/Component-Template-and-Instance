import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Room, ComponentTemplate, Link, type FileMetadata } from '@shared/schema';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Package, Link as LinkIcon, Plus, Trash2, AlertCircle, Download } from 'lucide-react';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

interface ProjectInspectorPanelProps {
  rooms: Room[];
  selectedRoomIds: string[];
  componentTemplates: ComponentTemplate[];
  links: Link[];
  onCreateTemplate: (name: string, roomIds: string[]) => void;
  onDeleteTemplate: (templateId: string) => void;
  onAddLink: (fileId: string, fileName: string) => void;
  onRemoveLink: (linkId: string) => void;
}

export function ProjectInspectorPanel({
  rooms,
  selectedRoomIds,
  componentTemplates,
  links,
  onCreateTemplate,
  onDeleteTemplate,
  onAddLink,
  onRemoveLink,
}: ProjectInspectorPanelProps) {
  const [templateName, setTemplateName] = useState('');
  const [showTemplateInput, setShowTemplateInput] = useState(false);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  
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
      onCreateTemplate(templateName.trim(), selectedRoomIds);
      setTemplateName('');
      setShowTemplateInput(false);
    }
  };

  return (
    <div className="w-72 bg-white border-r border-gray-200 flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-base font-semibold text-gray-900" data-testid="text-panel-title">Project Inspector</h2>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label className="text-sm font-medium text-gray-700">Rooms ({rooms.length})</Label>
            </div>
            
            {rooms.length === 0 ? (
              <div className="text-sm text-gray-500 text-center py-4">
                No rooms yet. Draw a room to get started.
              </div>
            ) : (
              <div className="space-y-2">
                {rooms.map((room) => (
                  <div
                    key={room.id}
                    className={`p-2 rounded border text-sm ${
                      selectedRoomIds.includes(room.id)
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 bg-gray-50'
                    }`}
                    data-testid={`room-item-${room.id}`}
                  >
                    <div className="font-medium text-gray-900">{room.name}</div>
                    <div className="text-xs text-gray-600 mt-1">
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
              <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Package className="w-4 h-4" />
                Component Templates ({componentTemplates.length})
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

            <Button
              size="sm"
              onClick={handleCreateTemplate}
              disabled={selectedRoomIds.length === 0}
              className="w-full mb-3"
              data-testid="button-save-template"
            >
              <Plus className="w-4 h-4 mr-2" />
              {showTemplateInput ? 'Save Template' : 'Save as Template'}
            </Button>

            {componentTemplates.length === 0 ? (
              <div className="text-sm text-gray-500 text-center py-4">
                No templates yet. Select rooms and save as template.
              </div>
            ) : (
              <div className="space-y-2">
                {componentTemplates.map((template) => (
                  <div
                    key={template.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('templateId', template.id);
                      e.dataTransfer.effectAllowed = 'copy';
                    }}
                    className="p-2 rounded border border-gray-200 bg-gray-50 cursor-move hover:bg-gray-100 hover:border-blue-300 transition-colors"
                    data-testid={`template-item-${template.id}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900 text-sm">
                          {template.name}
                        </div>
                        <div className="text-xs text-gray-600">
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
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Separator />

          <div>
            <div className="flex items-center justify-between mb-3">
              <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
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
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
