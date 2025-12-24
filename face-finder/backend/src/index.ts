import { Elysia, t } from "elysia";
import { cors } from "@elysiajs/cors";
import { staticPlugin } from "@elysiajs/static";
import { Database } from "bun:sqlite";

import { mkdir } from "node:fs/promises";

// Ensure uploads directory exists
await mkdir("uploads", { recursive: true });

// Initialize Database
const db = new Database("faces.db");

// Initialize Tables
db.run(`
  CREATE TABLE IF NOT EXISTS photos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS face_encodings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    photo_id INTEGER NOT NULL,
    descriptor TEXT NOT NULL,
    FOREIGN KEY(photo_id) REFERENCES photos(id)
  )
`);

// Types
type FaceDescriptor = number[];

// App
const app = new Elysia()
  .use(cors())
  .use(staticPlugin({
    assets: "uploads",
    prefix: "/uploads"
  }))
  .post("/api/upload", async ({ body }) => {
    const file = body.file as File;
    const descriptorsStr = body.descriptors as string;

    if (!file || !descriptorsStr) {
      return { success: false, error: "Missing file or descriptors" };
    }

    const descriptors: FaceDescriptor[] = JSON.parse(descriptorsStr);

    // Sanitize filename to prevent path traversal and ensure uniqueness
    // Using a UUID or a clean timestamp + sanitized name is safer
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const filename = `${Date.now()}-${crypto.randomUUID()}-${safeName}`;
    const uploadPath = `uploads/${filename}`;

    // Ensure uploads directory exists
    // (Though we usually create it at startup, double checking here or relying on init is good practice)

    // Save file
    await Bun.write(uploadPath, file);

    // Save to DB
    const insertPhoto = db.prepare("INSERT INTO photos (filename) VALUES (?) RETURNING id");
    const photoResult = insertPhoto.get(filename) as { id: number };
    const photoId = photoResult.id;

    const insertFace = db.prepare("INSERT INTO face_encodings (photo_id, descriptor) VALUES (?, ?)");
    const insertFaceTx = db.transaction((faces: FaceDescriptor[]) => {
      for (const face of faces) {
        insertFace.run(photoId, JSON.stringify(face));
      }
    });

    insertFaceTx(descriptors);

    return { success: true, photoId };
  }, {
    body: t.Object({
      file: t.File(),
      descriptors: t.String()
    })
  })
  .post("/api/search", ({ body }) => {
    const targetDescriptor = body.descriptor;

    // Retrieve all faces
    // Note: In a production app, use a vector DB or optimized search.
    // For MVP/Sandbox, linear scan in JS is fine for small datasets.
    const query = db.query("SELECT photo_id, descriptor, photos.filename FROM face_encodings JOIN photos ON face_encodings.photo_id = photos.id");
    const allFaces = query.all() as { photo_id: number, descriptor: string, filename: string }[];

    const matches: { filename: string, distance: number }[] = [];
    const processedPhotos = new Set<number>();

    for (const face of allFaces) {
      // Avoid adding the same photo multiple times if multiple faces match
      // But maybe we want to know WHICH face matched. For now, let's just find the photos.

      const storedDescriptor: number[] = JSON.parse(face.descriptor);
      const distance = euclideanDistance(targetDescriptor, storedDescriptor);

      // Threshold usually around 0.6 for face-api
      if (distance < 0.6) {
         matches.push({
           filename: face.filename,
           distance
         });
      }
    }

    // Sort by best match (lowest distance)
    matches.sort((a, b) => a.distance - b.distance);

    // Dedup by filename, keep best score
    const uniqueMatches = [];
    const seen = new Set();
    for (const m of matches) {
      if (!seen.has(m.filename)) {
        seen.add(m.filename);
        uniqueMatches.push(m);
      }
    }

    return { success: true, matches: uniqueMatches };
  }, {
    body: t.Object({
      descriptor: t.Array(t.Number())
    })
  })
  .listen(3000);

console.log(`🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`);

// Helper
function euclideanDistance(d1: number[], d2: number[]): number {
  if (d1.length !== d2.length) return 1.0; // Error
  let sum = 0;
  for (let i = 0; i < d1.length; i++) {
    sum += (d1[i] - d2[i]) * (d1[i] - d2[i]);
  }
  return Math.sqrt(sum);
}
