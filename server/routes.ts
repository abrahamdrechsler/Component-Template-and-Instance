import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

export async function registerRoutes(app: Express): Promise<Server> {
  app.post("/api/files/publish", async (req, res) => {
    try {
      const { name, timestamp, unitCount, appState } = req.body;
      
      if (!name || !timestamp || unitCount === undefined || !appState) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const file = await storage.publishFile({
        name,
        timestamp,
        unitCount,
        appState,
      });

      res.json(file);
    } catch (error) {
      console.error("Error publishing file:", error);
      res.status(500).json({ error: "Failed to publish file" });
    }
  });

  app.get("/api/files", async (req, res) => {
    try {
      const files = await storage.getAllPublishedFiles();
      res.json(files);
    } catch (error) {
      console.error("Error fetching files:", error);
      res.status(500).json({ error: "Failed to fetch files" });
    }
  });

  app.get("/api/files/:id", async (req, res) => {
    try {
      const file = await storage.getPublishedFile(req.params.id);
      if (!file) {
        return res.status(404).json({ error: "File not found" });
      }
      res.json(file);
    } catch (error) {
      console.error("Error fetching file:", error);
      res.status(500).json({ error: "Failed to fetch file" });
    }
  });

  app.delete("/api/files/:id", async (req, res) => {
    try {
      const success = await storage.deletePublishedFile(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "File not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting file:", error);
      res.status(500).json({ error: "Failed to delete file" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
