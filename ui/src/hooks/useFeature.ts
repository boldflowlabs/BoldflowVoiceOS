import { type PlanFeatures, useUserConfig } from '@/context/UserConfigContext';

/**
 * Plan-tier feature gate.
 *
 * - The deployment owner (superuser) always passes.
 * - Otherwise the org's plan must include the feature:
 *     api → REST API keys / Developers (Growth & Scale)
 *     mcp → MCP server (Scale only)
 *     crm → CRM automation (Growth & Scale)
 *     analytics_dashboard → Analytics dashboard (Growth & Scale)
 *     advanced_analytics → Advanced analytics & telemetry (Scale only)
 *     advanced_whatsapp → Advanced WhatsApp automation (Scale only)
 *
 * `loaded` is false until the plan fetch resolves — gate UI on it to avoid
 * flashing a surface the org can't use.
 */
export function useFeature(feature: keyof PlanFeatures): { enabled: boolean; loaded: boolean } {
    const { isSuperuser, planFeatures, planLoaded } = useUserConfig();
    return { enabled: isSuperuser || Boolean(planFeatures[feature]), loaded: planLoaded };
}
