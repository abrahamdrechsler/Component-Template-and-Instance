import { useRef, useEffect } from 'react';
import { useEdgeConflict } from '@/hooks/use-edge-conflict';
import { Toolbar } from '@/components/panels/toolbar';
import { SettingsPanel } from '@/components/panels/settings-panel';
import { InspectorPanel } from '@/components/panels/inspector-panel';
import { DrawingCanvas } from '@/components/canvas/drawing-canvas';
import { ROOM_COLORS } from '@/types/room';
import { useToast } from '@/hooks/use-toast';

export default function EdgeConflictPage() {
  const { toast } = useToast();
  const {
    rooms,
    edges,
    mode,
    colorPriority,
    conflictMatrix,
    selectedTool,
    selectedColor,
    selectedRoomId,
    selectedEdgeId,
    showGrid,
    edgeAuthoring,
    addRoom,
    deleteRoom,
    moveRoom,
    updateRoom,
    updateEdge,
    setMode,
    setColorPriority,
    setConflictMatrix,
    setSelectedTool,
    setSelectedColor,
    setSelectedRoomId,
    setSelectedEdgeId,
    setShowGrid,
    setEdgeAuthoring,
    exportData,
    importData,
    getEdgeColor,
    getRoomAt,
    getEdgeAt,
  } = useEdgeConflict();

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

  const selectedRoom = selectedRoomId ? rooms.find(r => r.id === selectedRoomId) : undefined;
  const selectedEdge = selectedEdgeId ? edges.find(e => e.id === selectedEdgeId) : undefined;

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <Toolbar
        selectedTool={selectedTool}
        showGrid={showGrid}
        edgeAuthoring={edgeAuthoring}
        onToolChange={setSelectedTool}
        onToggleGrid={setShowGrid}
        onToggleEdgeAuthoring={setEdgeAuthoring}
        onExport={exportData}
        onImport={handleImport}
      />

      <div className="flex flex-1 overflow-hidden">
        <SettingsPanel
          mode={mode}
          colorPriority={colorPriority}
          conflictMatrix={conflictMatrix}
          selectedColor={selectedColor}
          onModeChange={setMode}
          onColorPriorityChange={setColorPriority}
          onConflictMatrixChange={setConflictMatrix}
          onSelectedColorChange={setSelectedColor}
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
                  showGrid={showGrid}
                  onAddRoom={addRoom}
                  onMoveRoom={moveRoom}
                  onDeleteRoom={deleteRoom}
                  onSelectRoom={setSelectedRoomId}
                  onSelectEdge={setSelectedEdgeId}
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
          edgeAuthoring={edgeAuthoring}
          onUpdateRoom={updateRoom}
          onUpdateEdge={updateEdge}
          onDeleteRoom={deleteRoom}
        />
      </div>
    </div>
  );
}
