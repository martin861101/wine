-- Books persistent conversation memory, Phase 1.
-- Ownership uses public.users.id (the application member UUID), not auth.uid().
-- public.app_user_id() maps auth.uid() through users.auth_user_id. This follows
-- existing application foreign-key/RLS conventions and deliberately gives no
-- administrator override for private transcripts.

CREATE TABLE public.ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  initial_request_id UUID NOT NULL,
  title TEXT CHECK (title IS NULL OR char_length(btrim(title)) BETWEEN 1 AND 160),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (owner_id, initial_request_id)
);

CREATE TABLE public.ai_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL CHECK (char_length(btrim(content)) BETWEEN 1 AND 20000),
  status TEXT NOT NULL DEFAULT 'complete' CHECK (status IN ('pending', 'complete', 'failed')),
  request_id UUID NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(metadata) = 'object'),
  sequence BIGINT GENERATED ALWAYS AS IDENTITY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (role = 'user' OR status = 'complete'),
  UNIQUE (conversation_id, role, request_id),
  UNIQUE (conversation_id, sequence)
);

CREATE INDEX ai_conversations_owner_recent_idx
  ON public.ai_conversations(owner_id, last_message_at DESC, id DESC);
CREATE INDEX ai_messages_conversation_order_idx
  ON public.ai_messages(conversation_id, sequence ASC);
CREATE INDEX ai_messages_conversation_status_order_idx
  ON public.ai_messages(conversation_id, status, sequence DESC);

CREATE OR REPLACE FUNCTION public.protect_ai_conversation_owner()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.owner_id IS DISTINCT FROM OLD.owner_id THEN
    RAISE EXCEPTION 'Conversation ownership cannot be changed.';
  END IF;
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER protect_ai_conversation_owner_before_update
BEFORE UPDATE ON public.ai_conversations
FOR EACH ROW EXECUTE FUNCTION public.protect_ai_conversation_owner();

CREATE OR REPLACE FUNCTION public.touch_ai_conversation_from_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.ai_conversations
  SET updated_at = now(), last_message_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER touch_ai_conversation_after_message_insert
AFTER INSERT ON public.ai_messages
FOR EACH ROW EXECUTE FUNCTION public.touch_ai_conversation_from_message();

ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY ai_conversations_owner_select
ON public.ai_conversations FOR SELECT TO authenticated
USING (public.current_user_is_active() AND owner_id = public.app_user_id());

CREATE POLICY ai_conversations_owner_insert
ON public.ai_conversations FOR INSERT TO authenticated
WITH CHECK (public.current_user_is_active() AND owner_id = public.app_user_id());

CREATE POLICY ai_conversations_owner_update
ON public.ai_conversations FOR UPDATE TO authenticated
USING (public.current_user_is_active() AND owner_id = public.app_user_id())
WITH CHECK (public.current_user_is_active() AND owner_id = public.app_user_id());

CREATE POLICY ai_messages_owner_select
ON public.ai_messages FOR SELECT TO authenticated
USING (
  public.current_user_is_active()
  AND EXISTS (
    SELECT 1 FROM public.ai_conversations conversation
    WHERE conversation.id = ai_messages.conversation_id
      AND conversation.owner_id = public.app_user_id()
  )
);

CREATE POLICY ai_messages_owner_insert
ON public.ai_messages FOR INSERT TO authenticated
WITH CHECK (
  role = 'user'
  AND status = 'pending'
  AND public.current_user_is_active()
  AND EXISTS (
    SELECT 1 FROM public.ai_conversations conversation
    WHERE conversation.id = ai_messages.conversation_id
      AND conversation.owner_id = public.app_user_id()
  )
);

GRANT SELECT, INSERT ON public.ai_conversations TO authenticated;
GRANT UPDATE (title) ON public.ai_conversations TO authenticated;
GRANT SELECT, INSERT ON public.ai_messages TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.ai_messages_sequence_seq TO authenticated;
