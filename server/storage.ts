import { type FileMetadata } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  publishFile(file: Omit<FileMetadata, 'id'>): Promise<FileMetadata>;
  getPublishedFile(id: string): Promise<FileMetadata | undefined>;
  getAllPublishedFiles(): Promise<FileMetadata[]>;
  updatePublishedFile(id: string, updates: Partial<FileMetadata>): Promise<FileMetadata | undefined>;
  deletePublishedFile(id: string): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private publishedFiles: Map<string, FileMetadata>;

  constructor() {
    this.publishedFiles = new Map();
  }

  async publishFile(file: Omit<FileMetadata, 'id'>): Promise<FileMetadata> {
    const id = randomUUID();
    const fileMetadata: FileMetadata = { ...file, id };
    this.publishedFiles.set(id, fileMetadata);
    return fileMetadata;
  }

  async getPublishedFile(id: string): Promise<FileMetadata | undefined> {
    return this.publishedFiles.get(id);
  }

  async getAllPublishedFiles(): Promise<FileMetadata[]> {
    return Array.from(this.publishedFiles.values());
  }

  async updatePublishedFile(id: string, updates: Partial<FileMetadata>): Promise<FileMetadata | undefined> {
    const existing = this.publishedFiles.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...updates };
    this.publishedFiles.set(id, updated);
    return updated;
  }

  async deletePublishedFile(id: string): Promise<boolean> {
    return this.publishedFiles.delete(id);
  }
}

export const storage = new MemStorage();
