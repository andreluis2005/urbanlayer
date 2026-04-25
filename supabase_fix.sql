-- ==============================================
-- UrbanLayer — FIX: Completa o setup
-- As tabelas já existem. Este script apenas garante 
-- que tudo que possa ter falhado seja recriado.
-- ==============================================

-- Storage bucket (idempotente pelo ON CONFLICT)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'graffitis',
  'graffitis',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Dropar policies que já existem e recriar (para garantir consistência)
DROP POLICY IF EXISTS "Graffitis are viewable by everyone" ON public.graffitis;
DROP POLICY IF EXISTS "Authenticated users can create graffitis" ON public.graffitis;
DROP POLICY IF EXISTS "Users can update their own graffitis" ON public.graffitis;
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can create their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Graffiti images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload graffiti images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload graffiti images (anon for now)" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own graffiti images" ON storage.objects;

-- Recriar todas as policies
CREATE POLICY "Graffitis are viewable by everyone" ON public.graffitis FOR SELECT USING (is_visible = true);
CREATE POLICY "Authenticated users can create graffitis" ON public.graffitis FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update their own graffitis" ON public.graffitis FOR UPDATE TO authenticated USING (artist_user_id = auth.uid());

CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can create their own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid());

CREATE POLICY "Graffiti images are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'graffitis');
CREATE POLICY "Authenticated users can upload graffiti images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'graffitis');
CREATE POLICY "Anyone can upload graffiti images (anon for now)" ON storage.objects FOR INSERT TO anon WITH CHECK (bucket_id = 'graffitis');
CREATE POLICY "Users can update their own graffiti images" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'graffitis');

-- Trigger (idempotente)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER SET search_path = '' AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url, wallet_address)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''),
    COALESCE(NEW.raw_user_meta_data->>'wallet_address', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ✅ FIX COMPLETO
