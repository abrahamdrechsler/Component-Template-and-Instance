import { useRef, useEffect } from 'react';
import { useUnitsEditor } from '@/hooks/use-units-editor';
import { Toolbar } from '@/components/panels/toolbar';
import { ProjectInspectorPanel } from '@/components/panels/project-inspector-panel';
import { InspectorPanel } from '@/components/panels/inspector-panel';
import { DrawingCanvas } from '@/components/canvas/drawing-canvas';
import { ROOM_COLORS } from '@/types/room';
import { useToast } from '@/hooks/use-toast';

export default function EdgeConflictPage() {
  const { toast } = useToast();
  const {
    rooms,
    edges,
    selectedTool,
    selectedColor,
    selectedRoomId,
    selectedEdgeId,
    selectedRoomIds,
    showGrid,
    cornerPriorities,
    fileName,
    componentTemplates,
    componentInstances,
    links,
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
    setShowGrid,
    setFileName,
    toggleCornerPriority,
    exportData,
    importData,
    getEdgeColor,
    getRoomAt,
    getEdgeAt,
    createTemplate,
    deleteTemplate,
    addLink,
    removeLink,
  } = useUnitsEditor();

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
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [setSelectedTool]);

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
        <ProjectInspectorPanel
          rooms={rooms}
          selectedRoomIds={selectedRoomIds}
          componentTemplates={componentTemplates}
          links={links}
          onCreateTemplate={createTemplate}
          onDeleteTemplate={deleteTemplate}
          onAddLink={addLink}
          onRemoveLink={removeLink}
        />

        {/* Main Canvas Area */}
        <div className="flex-1 flex flex-col bg-gray-100">
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
                  showGrid={showGrid}
                  cornerPriorities={cornerPriorities}
                  onAddRoom={addRoom}
                  onMoveRoom={moveRoom}
                  onDeleteRoom={deleteRoom}
                  onSelectRoom={setSelectedRoomId}
                  onSelectEdge={setSelectedEdgeId}
                  onSelectRoomIds={setSelectedRoomIds}
                  onToggleCornerPriority={toggleCornerPriority}
                  getEdgeColor={getEdgeColor}
                  getRoomAt={getRoomAt}
                  getEdgeAt={getEdgeAt}
                />
              </div>
            </div>
          </div>
        </div>

        <InspectorPanel
          selectedRoom={selectedRoom}
          selectedEdge={selectedEdge}
          rooms={rooms}
          onUpdateRoom={updateRoom}
          onUpdateEdge={updateEdge}
          onDeleteRoom={deleteRoom}
        />
      </div>
    </div>
  );
}
