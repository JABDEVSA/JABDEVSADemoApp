SELECT token_hash,expires_at FROM sessions WHERE user_id = $user;
