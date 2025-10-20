import { useRef, useEffect, useState } from 'react';
import { useUnitsEditor } from '@/hooks/use-units-editor';
import { Toolbar } from '@/components/panels/toolbar';
import { ProjectInspectorPanel } from '@/components/panels/project-inspector-panel';
import { InspectorPanel } from '@/components/panels/inspector-panel';
import { OptionInspectorPanel } from '@/components/panels/option-inspector-panel';
import { DrawingCanvas } from '@/components/canvas/drawing-canvas';
import { ROOM_COLORS } from '@/types/room';
import { useToast } from '@/hooks/use-toast';

export default function EdgeConflictPage() {
  const { toast } = useToast();
  const [draggedTemplateId, setDraggedTemplateId] = useState<string | null>(null);
  const [leftPanelWidth, setLeftPanelWidth] = useState(320); // px
  const [rightPanelWidth, setRightPanelWidth] = useState(288); // px (w-72 = 18rem = 288px)
  const [isDraggingLeft, setIsDraggingLeft] = useState(false);
  const [isDraggingRight, setIsDraggingRight] = useState(false);
  
  const {
    rooms,
    edges,
    selectedTool,
    selectedColor,
    selectedRoomId,
    selectedEdgeId,
    selectedRoomIds,
    selectedInstanceId,
    showGrid,
    cornerPriorities,
    fileName,
    componentTemplates,
    componentInstances,
    links,
    options,
    activeOptionState,
    selectedOptionId,
    creationMode,
    isEditingTemplate,
    editingTemplateId,
    editingInstanceId,
    isSelectingOrigin,
    templateOriginX,
    templateOriginY,
    addRoom,
    deleteRoom,
    moveRoom,
    updateRoom,
    updateEdge,
    setSelectedTool,
    setSelectedColor,
    setSelectedRoomId,
    setSelectedEdgeId,
    setSelectedRoomIds,
    setSelectedInstanceId,
    setShowGrid,
    setFileName,
    setCreationMode,
    toggleCornerPriority,
    exportData,
    importData,
    getEdgeColor,
    getRoomAt,
    getEdgeAt,
    getInstanceAt,
    createTemplate,
    startOriginSelection,
    selectOrigin,
    cancelOriginSelection,
    setTemplateOrigin,
    updateTemplateOrigin,
    deleteTemplate,
    placeInstance,
    moveInstance,
    deleteInstance,
    duplicateInstance,
    addLink,
    removeLink,
    enterTemplateEditMode,
    saveTemplateEdits,
    discardTemplateEdits,
    createOption,
    updateOption,
    deleteOption,
    addOptionValue,
    updateOptionValue,
    deleteOptionValue,
    setActiveOptionValue,
    setSelectedOptionId,
  } = useUnitsEditor();

  // Resizing handlers
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingLeft) {
        const newWidth = Math.max(200, Math.min(600, e.clientX));
        setLeftPanelWidth(newWidth);
      } else if (isDraggingRight) {
        const newWidth = Math.max(200, Math.min(600, window.innerWidth - e.clientX));
        setRightPanelWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsDraggingLeft(false);
      setIsDraggingRight(false);
    };

    if (isDraggingLeft || isDraggingRight) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDraggingLeft, isDraggingRight]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Don't trigger shortcuts if user is typing in an input field
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true') {
        return;
      }

      const key = event.key.toLowerCase();
      
      switch (key) {
        case 's':
          setSelectedTool('select');
          break;
        case 'r':
          setSelectedTool('draw');
          break;
        case 'm':
          setSelectedTool('move');
          break;
        case 'd':
          setSelectedTool('delete');
          break;
        case 'c':
          if (selectedInstanceId) {
            duplicateInstance(selectedInstanceId);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [setSelectedTool, selectedInstanceId, duplicateInstance]);

  const handleImport = async (file: File) => {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      importData(data);
      toast({
        title: "Import successful",
        description: "Data has been imported successfully.",
      });
    } catch (error) {
      toast({
        title: "Import failed",
        description: "Please check the file format and try again.",
        variant: "destructive",
      });
    }
  };

  const handlePublish = async () => {
    try {
      const appState = JSON.stringify({
        rooms,
        edges,
        componentTemplates,
        componentInstances,
        links,
      });

      const response = await fetch('/api/files/publish', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: fileName,
          timestamp: Date.now(),
          unitCount: componentInstances.length,
          appState,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to publish file');
      }

      const publishedFile = await response.json();
      
      toast({
        title: "Published successfully",
        description: `${fileName} has been published to the database.`,
      });
    } catch (error) {
      console.error('Publish error:', error);
      toast({
        title: "Publish failed",
        description: "Failed to publish file. Please try again.",
        variant: "destructive",
      });
    }
  };

  const selectedRoom = selectedRoomId ? rooms.find(r => r.id === selectedRoomId) : undefined;
  const selectedEdge = selectedEdgeId ? edges.find(e => e.id === selectedEdgeId) : undefined;
  const selectedInstance = selectedInstanceId ? componentInstances.find(i => i.id === selectedInstanceId) : undefined;

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <Toolbar
        selectedTool={selectedTool}
        showGrid={showGrid}
        fileName={fileName}
        onToolChange={setSelectedTool}
        onToggleGrid={setShowGrid}
        onFileNameChange={setFileName}
        onExport={exportData}
        onImport={handleImport}
        onPublish={handlePublish}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Left Inspector Panel */}
        <div style={{ width: leftPanelWidth, flexShrink: 0 }}>
          <ProjectInspectorPanel
            rooms={rooms}
            selectedRoomIds={selectedRoomIds}
            componentTemplates={componentTemplates}
            links={links}
            options={options}
            activeOptionState={activeOptionState}
            creationMode={creationMode}
            isSelectingOrigin={isSelectingOrigin}
            onSelectRoom={setSelectedRoomId}
            onCreateTemplate={createTemplate}
            onStartOriginSelection={startOriginSelection}
            onCancelOriginSelection={cancelOriginSelection}
            onDeleteTemplate={deleteTemplate}
            onAddLink={addLink}
            onCreationModeChange={setCreationMode}
            onRemoveLink={removeLink}
            onTemplateDragStart={setDraggedTemplateId}
            onTemplateDragEnd={() => setDraggedTemplateId(null)}
            onCreateOption={createOption}
            onSelectOption={setSelectedOptionId}
            onSetActiveOptionValue={setActiveOptionValue}
          />
        </div>

        {/* Left Resizer */}
        <div
          onMouseDown={() => setIsDraggingLeft(true)}
          className="w-1 bg-gray-200 hover:bg-blue-400 cursor-col-resize transition-colors flex-shrink-0"
          style={{ minWidth: '4px' }}
        />

        {/* Main Canvas Area */}
        <div className="flex-1 flex flex-col bg-gray-100 relative" style={{ minWidth: 0 }}>
          {/* Edit Mode Banner - Overlay */}
          {isEditingTemplate && (
            <div className="absolute top-0 left-0 right-0 z-10 bg-blue-500 text-white px-4 py-2 flex items-center justify-between shadow-lg">
              <div className="flex items-center gap-2">
                <div className="text-sm font-medium">Editing Template</div>
                <div className="text-xs opacity-90">Make changes to the template rooms, then save or discard</div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={saveTemplateEdits}
                  className="bg-white text-blue-600 px-4 py-1.5 rounded text-sm font-medium hover:bg-blue-50 transition-colors"
                  data-testid="button-save-template"
                >
                  Save Changes
                </button>
                <button
                  onClick={discardTemplateEdits}
                  className="bg-transparent border border-white text-white px-4 py-1.5 rounded text-sm font-medium hover:bg-blue-600 transition-colors"
                  data-testid="button-discard-template"
                >
                  Discard
                </button>
              </div>
            </div>
          )}
          
          <div className="flex-1 p-4">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-full relative overflow-hidden">
              <div className="absolute inset-4">
                <DrawingCanvas
                  rooms={rooms}
                  edges={edges}
                  selectedTool={selectedTool}
                  selectedColor={ROOM_COLORS[selectedColor]}
                  selectedRoomId={selectedRoomId}
                  selectedEdgeId={selectedEdgeId}
                  selectedRoomIds={selectedRoomIds}
                  selectedInstanceId={selectedInstanceId}
                  showGrid={showGrid}
                  cornerPriorities={cornerPriorities}
                  componentTemplates={componentTemplates}
                  componentInstances={componentInstances}
                  creationMode={creationMode}
                  isEditingTemplate={isEditingTemplate}
                  editingTemplateId={editingTemplateId}
                  editingInstanceId={editingInstanceId}
                  isSelectingOrigin={isSelectingOrigin}
                  templateOriginX={templateOriginX}
                  templateOriginY={templateOriginY}
                  draggedTemplateId={draggedTemplateId}
                  onAddRoom={addRoom}
                  onMoveRoom={moveRoom}
                  onDeleteRoom={deleteRoom}
                  onDeleteInstance={deleteInstance}
                  onSelectRoom={setSelectedRoomId}
                  onSelectEdge={setSelectedEdgeId}
                  onSelectRoomIds={setSelectedRoomIds}
                  onSelectInstance={setSelectedInstanceId}
                  onMoveInstance={moveInstance}
                  onToggleCornerPriority={toggleCornerPriority}
                  onPlaceInstance={placeInstance}
                  onEnterTemplateEditMode={enterTemplateEditMode}
                  onSelectOrigin={selectOrigin}
                  onSetTemplateOrigin={setTemplateOrigin}
                  onUpdateTemplateOrigin={updateTemplateOrigin}
                  getEdgeColor={getEdgeColor}
                  getRoomAt={getRoomAt}
                  getEdgeAt={getEdgeAt}
                  getInstanceAt={getInstanceAt}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Resizer */}
        <div
          onMouseDown={() => setIsDraggingRight(true)}
          className="w-1 bg-gray-200 hover:bg-blue-400 cursor-col-resize transition-colors flex-shrink-0"
          style={{ minWidth: '4px' }}
        />

        {/* Right Inspector Panel */}
        <div style={{ width: rightPanelWidth, flexShrink: 0 }}>
          {selectedOptionId ? (
            <OptionInspectorPanel
              option={options.find(o => o.id === selectedOptionId)}
              onUpdateOption={updateOption}
              onDeleteOption={deleteOption}
              onAddOptionValue={addOptionValue}
              onUpdateOptionValue={updateOptionValue}
              onDeleteOptionValue={deleteOptionValue}
            />
          ) : (
            <InspectorPanel
              selectedRoom={selectedRoom}
              selectedEdge={selectedEdge}
              selectedInstance={selectedInstance}
              rooms={rooms}
              componentTemplates={componentTemplates}
              options={options}
              onUpdateRoom={updateRoom}
              onUpdateEdge={updateEdge}
              onDeleteRoom={deleteRoom}
              onDeleteInstance={deleteInstance}
            />
          )}
        </div>
      </div>
    </div>
  );
}
