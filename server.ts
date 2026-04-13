import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { Resend } from 'resend';
import dotenv from 'dotenv';
import cors from 'cors';
import { getCommissionTemplate, getTestTemplate } from './src/lib/emailTemplates.ts';

dotenv.config();

// Helper to get Resend instance
function getResend() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  return new Resend(apiKey);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // Request logging middleware
  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    }
    next();
  });

  // API Route for sending emails
  app.get("/api/notify-artist-v2", (req, res) => {
    res.json({ message: "This endpoint only supports POST requests for sending notifications." });
  });

  app.post("/api/notify-artist-v2", async (req, res) => {
    console.log(">>> REACHED /api/notify-artist-v2 POST");
    const { artistEmail, guestEmail, guestName, details, type } = req.body;
    
    console.log(`\n📧 Processing ${type} notification for: ${artistEmail}`);

    if (!artistEmail) {
      console.error("❌ Error: artistEmail is missing in request body");
      return res.status(400).json({ success: false, error: "Artist email is required" });
    }

    const resendInstance = getResend();
    if (resendInstance) {
      try {
        const rawFrom = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
        const from = rawFrom.includes('<') ? rawFrom : `DreamToon <${rawFrom}>`;
        
        console.log(`📤 Sending ${type} email from: ${from} to: ${artistEmail}`);
        
        const { data, error } = await resendInstance.emails.send({
          from: from,
          to: artistEmail, // Changed from [artistEmail] to artistEmail for simplicity
          subject: `New ${type} request from ${guestName}`,
          html: getCommissionTemplate(guestName, guestEmail, details, type),
        });

        if (error) {
          console.error("❌ Resend Error Details:", JSON.stringify(error, null, 2));
          return res.status(500).json({ success: false, error: error.message, code: error.name });
        }

        console.log("✅ Email sent successfully via Resend:", data?.id);
        return res.json({ success: true, message: "Email sent successfully", id: data?.id });
      } catch (err) {
        console.error("❌ Critical Failure in notify-artist:", err);
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

  app.post("/api/test-email", async (req, res) => {
    const { email } = req.body;
    console.log(`\n🧪 Received test email request for: ${email}`);
    
    const resendInstance = getResend();
    if (!resendInstance) {
      console.log("❌ RESEND_API_KEY is not configured");
      return res.status(400).json({ success: false, error: "RESEND_API_KEY is not configured" });
    }

    try {
      const rawFrom = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
      // Ensure the from address is in the correct format: "Name <email@domain.com>"
      const from = rawFrom.includes('<') ? rawFrom : `DreamToon <${rawFrom}>`;
      
      console.log(`📤 Sending test email from: ${from}`);
      
      const { data, error } = await resendInstance.emails.send({
        from: from,
        to: email,
        subject: "Test Email from DreamToon",
        html: getTestTemplate(email),
      });

      if (error) {
        console.error("❌ Resend Test Error:", JSON.stringify(error, null, 2));
        // Provide a more helpful message for common validation errors
        let errorMessage = error.message;
        if (error.name === 'validation_error') {
          errorMessage = `Validation Error: Please ensure "${rawFrom}" is a verified domain/email in your Resend dashboard. If using onboarding@resend.dev, you can only send to your own account email.`;
        }
        return res.status(500).json({ success: false, error: errorMessage });
      }
      
      console.log("✅ Test email sent successfully:", data?.id);
      return res.json({ success: true, data });
    } catch (err) {
      console.error("❌ Failed to send test email:", err);
      return res.status(500).json({ success: false, error: "Internal server error" });
    }
  });

  app.get("/api/config-check", (req, res) => {
    const hasApiKey = !!process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
    
    res.json({
      resendConfigured: hasApiKey,
      fromEmail: fromEmail,
      nodeEnv: process.env.NODE_ENV,
      timestamp: new Date().toISOString()
    });
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
