import type { ReactNode } from "react";

import { AdminGuard } from "@/components/AdminGuard";

// Protected: only Boldflow Labs admins can view or edit telephony configurations.
export default function TelephonyConfigurationsLayout({ children }: { children: ReactNode }) {
    return <AdminGuard>{children}</AdminGuard>;
}
