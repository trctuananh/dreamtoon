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

  // Request logging middleware - only for API and important routes
  app.use((req, res, next) => {
    const isApi = req.path.startsWith('/api') || req.path.startsWith('/notify-v3');
    if (isApi) {
      console.log(`[API] ${new Date().toISOString()} ${req.method} ${req.path}`);
    }
    next();
  });

  app.use(cors());
  app.use(express.json());

  // API Route for sending emails (v3 - no /api prefix to avoid proxy issues)
  app.all("/notify-v3", async (req, res) => {
    console.log(`>>> REACHED /notify-v3 with method: ${req.method}`);
    
    if (req.method !== 'POST') {
      return res.status(200).json({ 
        message: "This endpoint is alive. Please use POST to send notifications.",
        method: req.method 
      });
    }

    const { artistEmail, guestEmail, guestName, details, type } = req.body;
    
    console.log(`\n📧 Processing ${type} notification for: ${artistEmail}`);

    if (!artistEmail) {
      return res.status(400).json({ success: false, error: "Artist email is required" });
    }

    const resendInstance = getResend();
    if (resendInstance) {
      try {
        const rawFrom = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
        const from = rawFrom.includes('<') ? rawFrom : `Dreamtoon <${rawFrom}>`;
        
        const { data, error } = await resendInstance.emails.send({
          from: from,
          to: artistEmail,
          subject: `New ${type} request from ${guestName}`,
          html: getCommissionTemplate(guestName, guestEmail, details, type),
        });

        if (error) {
          console.error("❌ Resend Error:", error);
          return res.status(500).json({ success: false, error: error.message });
        }

        return res.json({ success: true, id: data?.id });
      } catch (err: any) {
        console.error("❌ Server Error:", err);
        return res.status(500).json({ success: false, error: err.message });
      }
    } else {
      return res.json({ 
        success: true, 
        message: "Simulated notification",
        simulated: true 
      });
    }
  });

  // Keep old routes for backward compatibility
  app.all("/api/notify-artist*", (req, res) => {
    console.log(`>>> DEPRECATED API CALL: ${req.method} ${req.path}`);
    res.status(410).json({ error: "This endpoint is deprecated. Please use /notify-v3" });
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
      const from = rawFrom.includes('<') ? rawFrom : `Dreamtoon <${rawFrom}>`;
      
      console.log(`📤 Sending test email from: ${from}`);
      
      const { data, error } = await resendInstance.emails.send({
        from: from,
        to: email,
        subject: "Test Email from Dreamtoon",
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
