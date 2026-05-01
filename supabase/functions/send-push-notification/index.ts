import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

interface WebhookPayload {
  type: "INSERT";
  table: string;
  record: {
    id: string;
    group_slug: string;
    user_id: string;
    display_name: string;
    username: string;
    message: string | null;
    message_type: string;
    image_url: string | null;
  };
  schema: string;
}

Deno.serve(async (req) => {
  try {
    const payload: WebhookPayload = await req.json();

    if (payload.type !== "INSERT" || payload.table !== "messages") {
      return new Response("ignored", { status: 200 });
    }

    const msg = payload.record;

    // Skip system messages
    if (msg.message_type === "system") {
      return new Response("ignored", { status: 200 });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Get all members of the group (except sender)
    const { data: members } = await supabase
      .from("user_groups")
      .select("user_id")
      .eq("group_slug", msg.group_slug)
      .neq("user_id", msg.user_id);

    if (!members?.length) {
      return new Response("no members", { status: 200 });
    }

    const memberIds = members.map((m) => m.user_id);

    // Get push tokens for those members
    const { data: tokens } = await supabase
      .from("push_tokens")
      .select("expo_push_token")
      .in("user_id", memberIds);

    if (!tokens?.length) {
      return new Response("no tokens", { status: 200 });
    }

    const body =
      msg.message_type === "image"
        ? "📷 Sent a photo"
        : msg.message_type === "location"
          ? "📍 Shared a location"
          : (msg.message ?? "").slice(0, 120);

    // Batch push messages (Expo limit: 100 per request)
    const messages = tokens.map((t) => ({
      to: t.expo_push_token,
      title: msg.display_name,
      body,
      sound: "default",
      data: {
        type: "chat_message",
        groupSlug: msg.group_slug,
      },
      channelId: "chat",
    }));

    const chunks: typeof messages[] = [];
    for (let i = 0; i < messages.length; i += 100) {
      chunks.push(messages.slice(i, i + 100));
    }

    await Promise.all(
      chunks.map((chunk) =>
        fetch(EXPO_PUSH_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(chunk),
        }),
      ),
    );

    return new Response("ok", { status: 200 });
  } catch (e) {
    console.error("[send-push-notification]", e);
    return new Response("error", { status: 500 });
  }
});
