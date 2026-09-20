"""cleanup archived admin workflows and tools

Revision ID: d1e2f3a4b5c6
Revises: c1a2b3d4e5f6
Create Date: 2026-09-20 12:20:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.sql import text

# revision identifiers, used by Alembic.
revision: str = "d1e2f3a4b5c6"
down_revision: Union[str, None] = "c1a2b3d4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()

    # 1. Identify admin organizations (superusers and designated admin emails)
    query_orgs = text("""
        SELECT DISTINCT u.selected_organization_id AS org_id
        FROM users u
        WHERE u.email IN ('godsonsaji832@gmail.com', 'boldflowlabs@gmail.com')
           OR u.is_superuser = true
        UNION
        SELECT ou.organization_id AS org_id
        FROM organization_users ou
        JOIN users u ON ou.user_id = u.id
        WHERE u.email IN ('godsonsaji832@gmail.com', 'boldflowlabs@gmail.com')
           OR u.is_superuser = true;
    """)
    res = conn.execute(query_orgs)
    admin_org_ids = [r[0] for r in res.fetchall() if r[0] is not None]

    if not admin_org_ids:
        return

    # 2. Delete all archived tools in admin organizations
    conn.execute(
        text("DELETE FROM tools WHERE organization_id = ANY(:org_ids) AND status = 'archived'"),
        {"org_ids": admin_org_ids},
    )

    # 3. Find archived workflows in admin organizations
    wf_res = conn.execute(
        text("SELECT id FROM workflows WHERE organization_id = ANY(:org_ids) AND status = 'archived'"),
        {"org_ids": admin_org_ids},
    )
    archived_wf_ids = [r[0] for r in wf_res.fetchall() if r[0] is not None]

    if archived_wf_ids:
        # 3a. Break circular FK: Nullify released_definition_id
        conn.execute(
            text("UPDATE workflows SET released_definition_id = NULL WHERE id = ANY(:wf_ids)"),
            {"wf_ids": archived_wf_ids},
        )

        # 3b. Nullify credit ledger references to runs of these workflows
        conn.execute(
            text("""
                UPDATE credit_ledger_entries 
                SET workflow_run_id = NULL 
                WHERE workflow_run_id IN (
                    SELECT id FROM workflow_runs WHERE workflow_id = ANY(:wf_ids)
                )
            """),
            {"wf_ids": archived_wf_ids},
        )

        # 3c. Delete workflow runs
        conn.execute(
            text("DELETE FROM workflow_runs WHERE workflow_id = ANY(:wf_ids)"),
            {"wf_ids": archived_wf_ids},
        )

        # 3d. Delete workflow definitions
        conn.execute(
            text("DELETE FROM workflow_definitions WHERE workflow_id = ANY(:wf_ids)"),
            {"wf_ids": archived_wf_ids},
        )

        # 3e. Delete the workflows
        conn.execute(
            text("DELETE FROM workflows WHERE id = ANY(:wf_ids)"),
            {"wf_ids": archived_wf_ids},
        )


def downgrade() -> None:
    # Deletions are permanent cleanup; downgrade is a no-op
    pass
