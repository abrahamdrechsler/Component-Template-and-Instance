import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileMetadata } from '@shared/schema';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Trash2, Download } from 'lucide-react';
import { Link } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function DatabasePage() {
  const { toast } = useToast();
  const { data: files, isLoading, refetch } = useQuery<FileMetadata[]>({
    queryKey: ['/api/files'],
  });

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/files/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete file');
      }

      toast({
        title: "Deleted successfully",
        description: "File has been deleted from the database.",
      });
      
      refetch();
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: "Delete failed",
        description: "Failed to delete file. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleView = async (id: string) => {
    try {
      const response = await fetch(`/api/files/${id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch file');
      }
      
      const file: FileMetadata = await response.json();
      const data = JSON.parse(file.appState);
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${file.name.toLowerCase().replace(/\s+/g, '-')}.json`;
      a.click();
      URL.revokeObjectURL(url);
      
      toast({
        title: "Downloaded successfully",
        description: `${file.name} has been downloaded.`,
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Download failed",
        description: "Failed to download file. Please try again.",
        variant: "destructive",
      });
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="outline" size="sm" data-testid="button-back">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Editor
                </Button>
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">Published Files Database</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Loading published files...</p>
          </div>
        ) : !files || files.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600">No published files yet.</p>
            <p className="text-sm text-gray-500 mt-2">
              Go back to the editor and publish a file to see it here.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow border border-gray-200">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>File Name</TableHead>
                  <TableHead>Published At</TableHead>
                  <TableHead>Unit Count</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {files.map((file) => (
                  <TableRow key={file.id} data-testid={`row-file-${file.id}`}>
                    <TableCell className="font-medium">{file.name}</TableCell>
                    <TableCell>{formatDate(file.timestamp)}</TableCell>
                    <TableCell>{file.unitCount}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleView(file.id)}
                          data-testid={`button-download-${file.id}`}
                        >
                          <Download className="w-4 h-4 mr-1" />
                          Download
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(file.id)}
                          data-testid={`button-delete-${file.id}`}
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
