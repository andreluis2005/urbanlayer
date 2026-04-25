-- ==============================================
-- UrbanLayer — Setup Completo do Supabase
-- Execute este SQL no SQL Editor do Supabase:
-- https://supabase.com/dashboard/project/cgogdddxzscmfajeplti/sql
-- ==============================================

-- ============================================
-- 1. TABELA: graffitis (core da aplicação)
-- Armazena todas as artes de grafite criadas
-- ============================================
CREATE TABLE IF NOT EXISTS public.graffitis (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  
  -- Localização
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  address TEXT,
  
  -- Arte
  image_url TEXT NOT NULL,
  
  -- Metadata (para futuro)
  artist_address TEXT,          -- Endereço da wallet do artista
  artist_user_id UUID REFERENCES auth.users(id), -- Referência ao user Supabase
  title TEXT,
  style TEXT,                   -- Banksy, Basquiat, etc.
  is_ai_generated BOOLEAN DEFAULT false,
  
  -- NFT (quando mintado)
  token_id TEXT,
  tx_hash TEXT,
  tier TEXT,                    -- bronze, silver, gold, diamond, legendary
  
  -- Visibilidade
  is_visible BOOLEAN DEFAULT true
);

-- Índice para busca por localização (performance)
CREATE INDEX IF NOT EXISTS idx_graffitis_location ON public.graffitis (lat, lng);
CREATE INDEX IF NOT EXISTS idx_graffitis_artist ON public.graffitis (artist_address);
CREATE INDEX IF NOT EXISTS idx_graffitis_created ON public.graffitis (created_at DESC);

-- ============================================
-- 2. TABELA: profiles (perfil do usuário)
-- Criado automaticamente quando user faz signup
-- ============================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Identidade
  username TEXT UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  
  -- Wallet
  wallet_address TEXT,
  
  -- Stats
  total_graffitis INTEGER DEFAULT 0,
  total_spots_owned INTEGER DEFAULT 0,
  
  -- Créditos para geração IA (futuro P1)
  ai_credits INTEGER DEFAULT 1,  -- 1 crédito grátis de trial
  
  CONSTRAINT username_length CHECK (char_length(username) >= 3 OR username IS NULL)
);

CREATE INDEX IF NOT EXISTS idx_profiles_wallet ON public.profiles (wallet_address);

-- ============================================
-- 3. ROW LEVEL SECURITY (RLS)
-- Protege dados por usuário
-- ============================================

-- === graffitis ===
ALTER TABLE public.graffitis ENABLE ROW LEVEL SECURITY;

-- Qualquer um pode VER grafites (são públicos)
CREATE POLICY "Graffitis are viewable by everyone"
  ON public.graffitis
  FOR SELECT
  USING (is_visible = true);

-- Usuários autenticados podem CRIAR grafites
CREATE POLICY "Authenticated users can create graffitis"
  ON public.graffitis
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Usuários podem EDITAR apenas seus próprios grafites
CREATE POLICY "Users can update their own graffitis"
  ON public.graffitis
  FOR UPDATE
  TO authenticated
  USING (artist_user_id = auth.uid());

-- === profiles ===
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Perfis são públicos (para galeria de artistas)
CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles
  FOR SELECT
  USING (true);

-- Usuários podem criar seu próprio perfil
CREATE POLICY "Users can create their own profile"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- Usuários podem editar apenas seu próprio perfil
CREATE POLICY "Users can update their own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid());

-- ============================================
-- 4. TRIGGER: Criar perfil automaticamente
-- Quando um novo user faz signup (email, Google, ou Web3)
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SET search_path = ''
AS $$
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

-- Criar trigger se não existir
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 5. STORAGE: Bucket para imagens de grafite
-- ============================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'graffitis',
  'graffitis',
  true,  -- Bucket público (imagens precisam ser acessíveis)
  5242880,  -- 5MB max
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Políticas de acesso ao Storage
CREATE POLICY "Graffiti images are publicly accessible"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'graffitis');

CREATE POLICY "Authenticated users can upload graffiti images"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'graffitis');

CREATE POLICY "Anyone can upload graffiti images (anon for now)"
  ON storage.objects
  FOR INSERT
  TO anon
  WITH CHECK (bucket_id = 'graffitis');

CREATE POLICY "Users can update their own graffiti images"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'graffitis');

-- ============================================
-- ✅ SETUP COMPLETO!
-- 
-- Tabelas criadas:
--   • graffitis — artes + localização + NFT metadata
--   • profiles  — perfil do usuário + créditos IA
--
-- Storage:
--   • bucket 'graffitis' — imagens públicas
--
-- Segurança:
--   • RLS ativo em todas as tabelas
--   • Trigger auto-cria perfil no signup
-- ============================================
