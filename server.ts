import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { Resend } from 'resend';
import dotenv from 'dotenv';
import { getCommissionTemplate, getTestTemplate } from './src/lib/emailTemplates';

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
        const rawFrom = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
        const from = rawFrom.includes('<') ? rawFrom : `DreamToon <${rawFrom}>`;
        const siteName = 'DreamToon';
        
        const { data, error } = await resend.emails.send({
          from: from,
          to: [artistEmail],
          subject: `New ${type} request from ${guestName}`,
          html: getCommissionTemplate(guestName, guestEmail, details, type),
        });

        if (error) {
          console.error("❌ Resend Error:", JSON.stringify(error, null, 2));
          return res.status(500).json({ success: false, error: error.message });
        }

        console.log("✅ Email sent successfully via Resend:", data?.id);
        return res.json({ success: true, message: "Email sent successfully" });
      } catch (err) {
        console.error("❌ Failed to send email via Resend:", err);
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
    
    if (!resend) {
      console.log("❌ RESEND_API_KEY is not configured");
      return res.status(400).json({ success: false, error: "RESEND_API_KEY is not configured" });
    }

    try {
      const rawFrom = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
      // Ensure the from address is in the correct format: "Name <email@domain.com>"
      const from = rawFrom.includes('<') ? rawFrom : `DreamToon <${rawFrom}>`;
      
      console.log(`📤 Sending test email from: ${from}`);
      
      const { data, error } = await resend.emails.send({
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
