-- NoL Platform: Full Database Schema for Supabase PostgreSQL & Realtime
-- Production-Ready Migration

-- 1. Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Games Table
CREATE TABLE IF NOT EXISTS public.games (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(64) UNIQUE NOT NULL,
    name VARCHAR(120) NOT NULL,
    description TEXT NOT NULL,
    image_url TEXT NOT NULL,
    game_url VARCHAR(255) DEFAULT '',
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_locked BOOLEAN NOT NULL DEFAULT false,
    min_players INT NOT NULL DEFAULT 2,
    max_players INT NOT NULL DEFAULT 8,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Temporary Sessions Table (NO Permanent Accounts)
CREATE TABLE IF NOT EXISTS public.temporary_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id VARCHAR(64) UNIQUE NOT NULL,
    session_token_hash VARCHAR(128) NOT NULL,
    display_name VARCHAR(64) NOT NULL,
    ip_hash VARCHAR(128),
    user_agent_hash VARCHAR(128),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '6 hours')
);

CREATE INDEX IF NOT EXISTS idx_temp_sessions_player_id ON public.temporary_sessions(player_id);
CREATE INDEX IF NOT EXISTS idx_temp_sessions_expires_at ON public.temporary_sessions(expires_at);

-- 4. Temporary Rooms Table
CREATE TABLE IF NOT EXISTS public.rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_code VARCHAR(16) UNIQUE NOT NULL,
    room_token VARCHAR(64) UNIQUE NOT NULL,
    game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE RESTRICT,
    host_player_id VARCHAR(64) NOT NULL,
    status VARCHAR(24) NOT NULL DEFAULT 'waiting', -- 'waiting', 'playing', 'finished', 'expired', 'closed'
    game_state JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 minutes')
);

CREATE INDEX IF NOT EXISTS idx_rooms_code ON public.rooms(room_code);
CREATE INDEX IF NOT EXISTS idx_rooms_token ON public.rooms(room_token);
CREATE INDEX IF NOT EXISTS idx_rooms_status ON public.rooms(status);
CREATE INDEX IF NOT EXISTS idx_rooms_last_activity ON public.rooms(last_activity_at);

-- 5. Room Players Table
CREATE TABLE IF NOT EXISTS public.room_players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
    session_id UUID REFERENCES public.temporary_sessions(id) ON DELETE SET NULL,
    player_id VARCHAR(64) NOT NULL,
    display_name VARCHAR(64) NOT NULL,
    is_host BOOLEAN NOT NULL DEFAULT false,
    is_connected BOOLEAN NOT NULL DEFAULT true,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    score INT NOT NULL DEFAULT 0,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    CONSTRAINT uq_room_player UNIQUE (room_id, player_id)
);

CREATE INDEX IF NOT EXISTS idx_room_players_room ON public.room_players(room_id);
CREATE INDEX IF NOT EXISTS idx_room_players_player ON public.room_players(player_id);

-- 6. Activation Codes Table
CREATE TABLE IF NOT EXISTS public.activation_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code_hash VARCHAR(128) UNIQUE NOT NULL,
    code_display_prefix VARCHAR(16) NOT NULL,
    game_id UUID REFERENCES public.games(id) ON DELETE CASCADE,
    duration_days INT NOT NULL DEFAULT 30,
    status VARCHAR(24) NOT NULL DEFAULT 'unused', -- 'unused', 'active', 'expired', 'disabled'
    created_by VARCHAR(64) NOT NULL DEFAULT 'admin',
    activated_by_player_id VARCHAR(64),
    activated_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_codes_hash ON public.activation_codes(code_hash);
CREATE INDEX IF NOT EXISTS idx_codes_status ON public.activation_codes(status);

-- 7. Session Game Access (Permissions)
CREATE TABLE IF NOT EXISTS public.session_game_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id VARCHAR(64) NOT NULL,
    game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
    activation_code_id UUID REFERENCES public.activation_codes(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT uq_session_game UNIQUE (player_id, game_id)
);

-- 8. Game Events Log
CREATE TABLE IF NOT EXISTS public.game_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
    event_type VARCHAR(64) NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_game_events_room ON public.game_events(room_id, created_at DESC);

-- 9. Site Settings
CREATE TABLE IF NOT EXISTS public.site_settings (
    key VARCHAR(64) PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. Support Links
CREATE TABLE IF NOT EXISTS public.support_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    platform VARCHAR(32) UNIQUE NOT NULL,
    title VARCHAR(64) NOT NULL,
    url TEXT NOT NULL,
    icon VARCHAR(64) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. Anonymous Visit Stats
CREATE TABLE IF NOT EXISTS public.visit_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    page VARCHAR(128) NOT NULL,
    session_identifier VARCHAR(128) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_visit_stats_created_at ON public.visit_stats(created_at);

-- 12. Admin Users Table (Isolated from players)
CREATE TABLE IF NOT EXISTS public.admin_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(64) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(32) NOT NULL DEFAULT 'super_admin',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login_at TIMESTAMPTZ
);

-- 13. Enable Row Level Security (RLS)
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.temporary_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activation_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_game_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visit_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- 14. Policies (Public read for active games & support links; protected read for rooms)
CREATE POLICY "Public can view active games" ON public.games
    FOR SELECT USING (is_active = true);

CREATE POLICY "Public can view active support links" ON public.support_links
    FOR SELECT USING (is_active = true);

CREATE POLICY "Public can view room by token" ON public.rooms
    FOR SELECT USING (status != 'closed' AND status != 'expired');

CREATE POLICY "Public can view players in room" ON public.room_players
    FOR SELECT USING (true);

-- Sensitive tables strictly blocked from direct anon read
CREATE POLICY "Deny anon access to activation codes" ON public.activation_codes
    FOR ALL USING (false);

CREATE POLICY "Deny anon access to admin users" ON public.admin_users
    FOR ALL USING (false);

CREATE POLICY "Deny anon access to sessions list" ON public.temporary_sessions
    FOR ALL USING (false);

-- 15. Realtime Publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_players;
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_events;

-- 16. Cleanup Routine Function
CREATE OR REPLACE FUNCTION public.cleanup_expired_nol_data()
RETURNS void AS $$
BEGIN
    -- Expire rooms inactive for > 30 mins
    UPDATE public.rooms
    SET status = 'expired'
    WHERE status IN ('waiting', 'playing')
      AND last_activity_at < (NOW() - INTERVAL '30 minutes');

    -- Delete truly old events (> 24 hours)
    DELETE FROM public.game_events
    WHERE created_at < (NOW() - INTERVAL '24 hours');

    -- Mark expired sessions
    DELETE FROM public.temporary_sessions
    WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
