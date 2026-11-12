import {
  ingestResendWebhook,
  InvalidResendWebhookError,
} from "@/lib/email-delivery/resend-webhook";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const id = request.headers.get("svix-id");
  const timestamp = request.headers.get("svix-timestamp");
  const signature = request.headers.get("svix-signature");

  if (!id || !timestamp || !signature) {
    return Response.json({ error: "Invalid webhook signature." }, { status: 400 });
  }

  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error("[resend-webhook] RESEND_WEBHOOK_SECRET is not configured.");
    return Response.json({ error: "Webhook unavailable." }, { status: 503 });
  }

  const payload = await request.text();

  try {
    const result = await ingestResendWebhook({
      payload,
      headers: { id, timestamp, signature },
      webhookSecret,
    });

    return Response.json({ received: true, ...result });
  } catch (error) {
    if (error instanceof InvalidResendWebhookError) {
      return Response.json({ error: "Invalid webhook." }, { status: 400 });
    }

    console.error("[resend-webhook] Failed to store webhook event:", error);
    return Response.json({ error: "Webhook processing failed." }, { status: 500 });
  }
}
