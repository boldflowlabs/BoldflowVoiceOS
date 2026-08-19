"use client";

import { CreateWorkflowButton } from "@/components/workflow/CreateWorkflowButton";
import { CreateFolderButton } from "@/components/workflow/folders/CreateFolderButton";
import { UploadWorkflowButton } from "@/components/workflow/UploadWorkflowButton";
import { useIsAdmin } from "@/hooks/useIsAdmin";

/**
 * Renders agent creation, folder creation, and agent definition upload buttons
 * when the user is a superuser OR when the agency unlocks the client's account.
 */
export function WorkflowHeaderActions() {
    const { isAdmin, isLoaded } = useIsAdmin();

    if (!isLoaded || !isAdmin) {
        return null;
    }

    return (
        <div className="flex flex-wrap items-center gap-2">
            <UploadWorkflowButton />
            <CreateFolderButton />
            <CreateWorkflowButton />
        </div>
    );
}

export function WorkflowEmptyStateAction() {
    const { isAdmin, isLoaded } = useIsAdmin();

    if (!isLoaded || !isAdmin) {
        return null;
    }

    return <CreateWorkflowButton />;
}
