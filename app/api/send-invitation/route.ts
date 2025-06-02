import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: Request) {
  try {
    const { email, repoOwner, repoName, role, invitedBy, invitationUrl } = await request.json();
    
    // Validate required fields
    if (!email || !repoOwner || !repoName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    // Set up nodemailer transporter (replace with your SMTP settings)
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.example.com",
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER || "",
        pass: process.env.SMTP_PASSWORD || "",
      },
    });
    
    // Email content
    const mailOptions = {
      from: process.env.EMAIL_FROM || "MetaSync <no-reply@metasync.app>",
      to: email,
      subject: `You've been invited to collaborate on ${repoOwner}/${repoName}`,
      html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
        <h2>Repository Invitation</h2>
        <p>${invitedBy} has invited you to collaborate on <strong>${repoOwner}/${repoName}</strong> with <strong>${role}</strong> permissions.</p>
        
        <p>You can accept this invitation by visiting:</p>
        
        <p style="margin: 20px 0;">
          <a href="${invitationUrl}" style="background-color: #0366d6; color: white; padding: 10px 15px; text-decoration: none; border-radius: 4px; display: inline-block;">
            View Invitation
          </a>
        </p>
        
        <p>This repository is managed with MetaSync, a content management system for GitHub repositories.</p>
        
        <p>Your role as <strong>${role}</strong> will allow you to contribute to this project according to the permission level set by the repository owner.</p>
        
        <p style="color: #666; font-size: 12px; margin-top: 30px;">
          This is an automated message from MetaSync. If you weren't expecting this invitation, you can ignore this email.
        </p>
      </div>
      `
    };
    
    // Send email
    await transporter.sendMail(mailOptions);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error sending invitation email:', error);
    return NextResponse.json(
      { error: 'Failed to send invitation email' },
      { status: 500 }
    );
  }
}