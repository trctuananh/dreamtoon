import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { Resend } from 'resend';
import dotenv from 'dotenv';

dotenv.config();

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route for sending emails
  app.post("/api/notify-artist", async (req, res) => {
    const { artistEmail, guestEmail, guestName, details, type } = req.body;
    
    console.log(`\n📧 Processing ${type} notification for: ${artistEmail}`);

    if (resend) {
      try {
        // IMPORTANT: If you haven't verified your domain in Resend, 
        // you MUST use 'onboarding@resend.dev' as the from address.
        // Also, you can only send to your own email address until verified.
        const fromAddress = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
        
        const { data, error } = await resend.emails.send({
          from: `DreamToon <${fromAddress}>`,
          to: [artistEmail],
          subject: `New ${type} request from ${guestName}`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; rounded: 12px;">
              <h2 style="color: #111; font-weight: 900; text-transform: uppercase; letter-spacing: -0.025em;">New ${type} Request!</h2>
              <p style="color: #666; line-height: 1.5;">Hello, you have received a new ${type} request on DreamToon.</p>
              <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0; font-weight: bold; color: #111;">From: ${guestName}</p>
                <p style="margin: 5px 0; color: #666;">Email: ${guestEmail}</p>
                <hr style="border: 0; border-top: 1px solid #ddd; margin: 15px 0;" />
                <p style="margin: 0; font-weight: bold; color: #111;">Details:</p>
                <p style="margin: 5px 0; color: #666; white-space: pre-wrap;">${details}</p>
              </div>
              <p style="color: #666; font-size: 14px;">Please log in to your dashboard at <a href="https://dreamtoon.vn" style="color: #3b82f6; text-decoration: none; font-weight: bold;">dreamtoon.vn</a> to manage this request.</p>
              <p style="color: #999; font-size: 12px; margin-top: 40px; border-top: 1px solid #eee; padding-top: 20px;">This is an automated notification from DreamToon.</p>
            </div>
          `,
        });

        if (error) {
          console.error("Resend Error:", error);
          return res.status(500).json({ success: false, error: error.message });
        }

        console.log("✅ Email sent successfully via Resend:", data?.id);
        return res.json({ success: true, message: "Email sent successfully" });
      } catch (err) {
        console.error("Failed to send email via Resend:", err);
        return res.status(500).json({ success: false, error: "Internal server error" });
      }
    } else {
      // Fallback to simulation if no API key
      console.log("⚠️ RESEND_API_KEY not found. Simulating email...");
      console.log("------------------------------------------");
      console.log(`To: ${artistEmail}`);
      console.log(`Subject: New ${type} request from ${guestName}`);
      console.log(`Details: ${details}`);
      console.log("------------------------------------------\n");
      
      return res.json({ 
        success: true, 
        message: "Simulated notification (Add RESEND_API_KEY for real emails)",
        simulated: true 
      });
    }
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
