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
    
    console.log("------------------------------------------");
    console.log(`SERVER: Sending ${type} email notification...`);
    console.log(`To: ${artistEmail}`);
    console.log(`From: ${guestEmail} (${guestName})`);
    console.log(`Details: ${details}`);
    console.log("------------------------------------------");

    // In a real production app, you would use nodemailer or a service like SendGrid here:
    /*
    const transporter = nodemailer.createTransport({...});
    await transporter.sendMail({
      from: '"DreamToon" <noreply@dreamtoon.vn>',
      to: artistEmail,
      subject: `New ${type} request from ${guestName}`,
      text: details
    });
    */

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
