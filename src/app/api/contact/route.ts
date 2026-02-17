import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const contactSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  subject: z.string().min(1),
  message: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = contactSchema.parse(body);

    // Send email to harmonicbluesfusion@gmail.com
    // For now, we'll use a simple approach that can be extended with an email service
    const emailContent = `
New Contact Form Submission

From: ${data.name} (${data.email})
Subject: ${data.subject}

Message:
${data.message}

---
Sent from Coffee Tracker Contact Form
    `.trim();

    // TODO: Integrate with an email service (Resend, SendGrid, etc.)
    // For now, we'll log it and return success
    // In production, you would use an email service here
    console.log("Contact form submission:", {
      to: "harmonicbluesfusion@gmail.com",
      subject: `[Coffee Tracker] ${data.subject}`,
      body: emailContent,
    });

    // In a real implementation, you would send the email here:
    // await sendEmail({
    //   to: "harmonicbluesfusion@gmail.com",
    //   subject: `[Coffee Tracker] ${data.subject}`,
    //   text: emailContent,
    //   from: data.email,
    //   replyTo: data.email,
    // });

    return NextResponse.json(
      { message: "Message sent successfully" },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid form data", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error processing contact form:", error);
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    );
  }
}
