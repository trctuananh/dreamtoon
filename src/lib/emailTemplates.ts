
export const siteName = 'Dreamtoon';
export const siteUrl = 'https://dreamtoon.vn';

export const emailStyles = `
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  max-width: 600px;
  margin: 0 auto;
  padding: 40px 20px;
  color: #1a1a1a;
  line-height: 1.6;
`;

export const logoHtml = `
  <div style="text-align: center; margin-bottom: 32px;">
    <div style="display: inline-block; width: 48px; height: 48px; background: #000; border-radius: 12px; line-height: 48px; color: #fff; font-size: 24px; font-weight: 900; font-style: italic;">D</div>
    <h1 style="font-size: 24px; font-weight: 900; margin: 16px 0 8px; text-transform: uppercase; letter-spacing: -0.025em;">${siteName}</h1>
  </div>
`;

export const footerHtml = `
  <div style="text-align: center; margin-top: 40px; border-top: 1px solid #e4e4e7; padding-top: 24px;">
    <p style="font-size: 12px; color: #a1a1aa; margin: 0;">
      &copy; ${new Date().getFullYear()} ${siteName}. All rights reserved.
    </p>
    <p style="font-size: 12px; color: #a1a1aa; margin: 8px 0 0;">
      This is an automated notification. Please do not reply directly to this email.
    </p>
  </div>
`;

export const getCommissionTemplate = (guestName: string, guestEmail: string, details: string, type: string = 'commission') => `
  <div style="${emailStyles}">
    ${logoHtml}
    
    <div style="text-align: center; margin-bottom: 32px;">
      <h2 style="font-size: 20px; font-weight: 900; margin: 0; text-transform: uppercase; letter-spacing: -0.025em;">New ${type} Request</h2>
      <p style="color: #666; font-size: 16px; margin: 8px 0 0;">You've received a new request from a fan!</p>
    </div>
    
    <div style="background: #f4f4f5; border-radius: 24px; padding: 32px; margin-bottom: 32px;">
      <div style="margin-bottom: 24px;">
        <p style="text-transform: uppercase; font-size: 10px; font-weight: 900; letter-spacing: 0.1em; color: #a1a1aa; margin: 0 0 8px;">From</p>
        <p style="font-size: 16px; font-weight: 700; margin: 0;">${guestName}</p>
        <p style="font-size: 14px; color: #666; margin: 4px 0 0;">${guestEmail}</p>
      </div>
      
      <div style="border-top: 1px solid #e4e4e7; padding-top: 24px;">
        <p style="text-transform: uppercase; font-size: 10px; font-weight: 900; letter-spacing: 0.1em; color: #a1a1aa; margin: 0 0 8px;">Request Details</p>
        <p style="font-size: 15px; line-height: 1.6; color: #3f3f46; margin: 0; white-space: pre-wrap;">${details}</p>
      </div>
    </div>
    
    <div style="text-align: center;">
      <a href="${siteUrl}/my-wall" style="display: inline-block; background: #000; color: #fff; text-decoration: none; padding: 16px 32px; border-radius: 16px; font-weight: 700; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em;">View Your Dashboard</a>
    </div>
    
    ${footerHtml}
  </div>
`;

export const getWelcomeTemplate = (userName: string) => `
  <div style="${emailStyles}">
    ${logoHtml}
    
    <div style="text-align: center; margin-bottom: 32px;">
      <h2 style="font-size: 20px; font-weight: 900; margin: 0; text-transform: uppercase; letter-spacing: -0.025em;">Welcome to the Dream!</h2>
      <p style="color: #666; font-size: 16px; margin: 8px 0 0;">Hi ${userName}, we're thrilled to have you here.</p>
    </div>
    
    <div style="background: #f4f4f5; border-radius: 24px; padding: 32px; margin-bottom: 32px;">
      <p style="font-size: 16px; color: #3f3f46; margin: 0;">
        Dreamtoon is a community for artists and dreamers. You can now follow your favorite artists, 
        request commissions, and share your own dreams with the world.
      </p>
      <div style="margin-top: 24px; display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
        <div style="background: #fff; padding: 16px; border-radius: 16px; border: 1px solid #e4e4e7;">
          <p style="font-weight: 900; font-size: 12px; margin: 0 0 4px; text-transform: uppercase;">Explore</p>
          <p style="font-size: 12px; color: #666; margin: 0;">Discover new comics and artists.</p>
        </div>
        <div style="background: #fff; padding: 16px; border-radius: 16px; border: 1px solid #e4e4e7;">
          <p style="font-weight: 900; font-size: 12px; margin: 0 0 4px; text-transform: uppercase;">Connect</p>
          <p style="font-size: 12px; color: #666; margin: 0;">Chat directly with creators.</p>
        </div>
      </div>
    </div>
    
    <div style="text-align: center;">
      <a href="${siteUrl}" style="display: inline-block; background: #000; color: #fff; text-decoration: none; padding: 16px 32px; border-radius: 16px; font-weight: 700; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em;">Start Exploring</a>
    </div>
    
    ${footerHtml}
  </div>
`;

export const getTestTemplate = (email: string) => `
  <div style="${emailStyles}">
    ${logoHtml}
    <div style="text-align: center; padding: 40px 0;">
      <div style="font-size: 48px; margin-bottom: 16px;">🚀</div>
      <h2 style="font-size: 24px; font-weight: 900; margin: 0; text-transform: uppercase;">Test Successful!</h2>
      <p style="color: #666; font-size: 16px; margin: 12px 0 0;">Your Resend configuration is working perfectly.</p>
      <p style="font-size: 12px; color: #a1a1aa; margin-top: 24px;">Sent to: ${email}</p>
    </div>
    ${footerHtml}
  </div>
`;
