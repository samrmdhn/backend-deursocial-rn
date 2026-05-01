-- Enable pg_net extension (needed to call HTTP from DB)
create extension if not exists pg_net schema extensions;

-- Trigger function: fires after new message inserted
create or replace function notify_push_on_message()
returns trigger language plpgsql security definer as $$
declare
  payload jsonb;
begin
  payload := jsonb_build_object(
    'type', 'INSERT',
    'table', 'messages',
    'schema', 'public',
    'record', row_to_json(new)
  );

  perform net.http_post(
    url := 'https://jbcdjttfaxwendlfpgjk.supabase.co/functions/v1/send-push-notification',
    body := payload,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.supabase_anon_key', true)
    )
  );

  return new;
end;
$$;

-- Attach trigger to messages table
drop trigger if exists on_message_insert_push on public.messages;
create trigger on_message_insert_push
  after insert on public.messages
  for each row execute function notify_push_on_message();
