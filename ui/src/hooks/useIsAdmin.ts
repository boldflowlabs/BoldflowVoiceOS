'use client';

import { useUserConfig } from '@/context/UserConfigContext';

/**
 * Role check built on the platform's real permission mechanism:
 *
 * - Superusers (UserModel.is_superuser on the backend, surfaced via
 *   /user/auth/user) are ALWAYS admins — even in CLIENT_MODE. This is the
 *   deployment owner; ADMIN_EMAILS on the API promotes them automatically.
 * - Stack Auth deployments: the selected team's permissions are fetched via
 *   `listPermissions(selectedTeam)`; org admins carry the `admin` permission
 *   (the same check `getRedirectUrl` in lib/utils.ts already uses).
 * - Local/OSS deployments: upstream grants every user `[{ id: 'admin' }]`.
 *
 * `NEXT_PUBLIC_CLIENT_MODE=true` forces the client-safe UI (no model/
 * provider/API-key/engine settings) for everyone EXCEPT superusers.
 */
export function useIsAdmin(): { isAdmin: boolean; isLoaded: boolean } {
    const { isSuperuser, isLocked, superuserLoaded } = useUserConfig();

    // Superusers always have full admin privileges.
    // Client organizations have editing privileges when explicitly unlocked (isLocked === false).
    const isAdmin = Boolean(isSuperuser) || (!Boolean(isSuperuser) && isLocked === false);

    return {
        isAdmin,
        isLoaded: superuserLoaded,
    };
}
