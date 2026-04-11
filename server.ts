import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route for sending emails (Simulated)
  app.post("/api/notify-artist", (req, res) => {
    const { artistEmail, guestEmail, guestName, details, type } = req.body;
    
    console.log("\n📧 [SIMULATED EMAIL SYSTEM]");
    console.log(`To: ${artistEmail || 'UNKNOWN ARTIST'}`);
    console.log(`Subject: New ${type} request from ${guestName}`);
    console.log(`Body:`);
    console.log(`  Hello, you have a new ${type} request!`);
    console.log(`  From: ${guestName} (${guestEmail})`);
    console.log(`  Details: ${details}`);
    console.log(`  Please check your DreamToon dashboard to manage this request.`);
    console.log("------------------------------------------\n");

    res.json({ success: true, message: "Notification sent to server" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
