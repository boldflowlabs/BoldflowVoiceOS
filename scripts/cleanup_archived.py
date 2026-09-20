"""Script to delete archived workflows and tools for admin accounts in Dograh / VoiceOS.

Usage:
    # Dry run to preview what will be deleted:
    python scripts/cleanup_archived.py --dry-run

    # Execute deletion:
    python scripts/cleanup_archived.py --execute

    # Optionally specify admin email:
    python scripts/cleanup_archived.py --execute --email godsonsaji832@gmail.com
"""

import argparse
import asyncio
import os
import sys
from pathlib import Path

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from dotenv import load_dotenv

# Load environment variables
load_dotenv("api/.env")

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import create_async_engine


async def main():
    parser = argparse.ArgumentParser(description="Clean up archived workflows and tools")
    parser.add_argument(
        "--execute",
        action="store_true",
        help="Perform actual deletion. Default is dry-run.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        default=True,
        help="Preview items to be deleted without modifying data.",
    )
    parser.add_argument(
        "--email",
        type=str,
        default=None,
        help="Admin email to target (defaults to ADMIN_EMAILS or is_superuser users)",
    )
    args = parser.parse_args()
    is_dry_run = not args.execute

    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        print("ERROR: DATABASE_URL environment variable is not set.")
        sys.exit(1)

    admin_emails_env = os.environ.get("ADMIN_EMAILS", "")
    admin_emails = [e.strip() for e in admin_emails_env.split(",") if e.strip()]
    if args.email:
        admin_emails = [args.email.strip()]

    print(f"Connecting to database...")
    engine = create_async_engine(database_url)

    async with engine.begin() as conn:
        # 1. Identify Admin Users & Organizations
        if admin_emails:
            emails_formatted = ", ".join(f"'{e}'" for e in admin_emails)
            users_query = f"""
                SELECT id, email, selected_organization_id, is_superuser 
                FROM users 
                WHERE email IN ({emails_formatted}) OR is_superuser = true;
            """
        else:
            users_query = """
                SELECT id, email, selected_organization_id, is_superuser 
                FROM users 
                WHERE is_superuser = true;
            """

        result = await conn.execute(text(users_query))
        admin_users = result.fetchall()

        if not admin_users:
            print("No admin users found matching criteria. Checking all users with is_superuser or first user...")
            result = await conn.execute(text("SELECT id, email, selected_organization_id, is_superuser FROM users ORDER BY id ASC LIMIT 5;"))
            admin_users = result.fetchall()

        print("\n--- Identified Admin / Target Accounts ---")
        org_ids = set()
        user_ids = set()
        for u in admin_users:
            print(f"User ID: {u.id}, Email: {u.email}, Selected Org ID: {u.selected_organization_id}, Superuser: {u.is_superuser}")
            user_ids.add(u.id)
            if u.selected_organization_id:
                org_ids.add(u.selected_organization_id)

        # Also get all organizations associated with these users
        if user_ids:
            u_ids_str = ", ".join(str(uid) for uid in user_ids)
            org_res = await conn.execute(text(f"SELECT organization_id FROM organization_users WHERE user_id IN ({u_ids_str});"))
            for r in org_res.fetchall():
                org_ids.add(r[0])

        if not org_ids:
            print("ERROR: No organization IDs found for target accounts.")
            return

        org_ids_str = ", ".join(str(oid) for oid in org_ids)
        print(f"Target Organization IDs: {org_ids_str}")

        # 2. Find Archived Workflows
        wf_query = f"""
            SELECT id, name, workflow_uuid, status, organization_id, created_at
            FROM workflows
            WHERE organization_id IN ({org_ids_str}) AND status = 'archived';
        """
        wf_res = await conn.execute(text(wf_query))
        archived_workflows = wf_res.fetchall()

        print(f"\n--- Archived Workflows Found: {len(archived_workflows)} ---")
        for wf in archived_workflows:
            print(f"  • ID: {wf.id} | Name: '{wf.name}' | UUID: {wf.workflow_uuid} | Org: {wf.organization_id}")

        # 3. Find Archived Tools
        tool_query = f"""
            SELECT id, name, tool_uuid, category, status, organization_id
            FROM tools
            WHERE organization_id IN ({org_ids_str}) AND status = 'archived';
        """
        tool_res = await conn.execute(text(tool_query))
        archived_tools = tool_res.fetchall()

        print(f"\n--- Archived Tools Found: {len(archived_tools)} ---")
        for t in archived_tools:
            print(f"  • ID: {t.id} | Name: '{t.name}' | UUID: {t.tool_uuid} | Category: {t.category} | Org: {t.organization_id}")

        if is_dry_run:
            print("\n[DRY RUN MODE] No changes were made to the database.")
            print("To permanently delete these items, re-run with: --execute")
            return

        # 4. Perform Deletion
        print("\n--- Executing Deletion ---")

        # Delete archived tools
        if archived_tools:
            delete_tools_sql = f"""
                DELETE FROM tools
                WHERE organization_id IN ({org_ids_str}) AND status = 'archived';
            """
            t_del = await conn.execute(text(delete_tools_sql))
            print(f"✓ Deleted {t_del.rowcount} archived tools.")
        else:
            print("No archived tools to delete.")

        # Delete archived workflows safely with FK resolution
        if archived_workflows:
            wf_ids_str = ", ".join(str(w.id) for w in archived_workflows)

            # Step 4a: Disassociate circular reference released_definition_id
            await conn.execute(text(f"""
                UPDATE workflows
                SET released_definition_id = NULL
                WHERE id IN ({wf_ids_str});
            """))

            # Step 4b: Nullify credit ledger references to runs of these workflows
            await conn.execute(text(f"""
                UPDATE credit_ledger_entries
                SET workflow_run_id = NULL
                WHERE workflow_run_id IN (
                    SELECT id FROM workflow_runs WHERE workflow_id IN ({wf_ids_str})
                );
            """))

            # Step 4c: Delete workflow runs
            runs_del = await conn.execute(text(f"""
                DELETE FROM workflow_runs
                WHERE workflow_id IN ({wf_ids_str});
            """))
            print(f"  - Cleared {runs_del.rowcount} associated workflow runs.")

            # Step 4d: Delete workflow definitions
            defs_del = await conn.execute(text(f"""
                DELETE FROM workflow_definitions
                WHERE workflow_id IN ({wf_ids_str});
            """))
            print(f"  - Cleared {defs_del.rowcount} associated workflow definitions.")

            # Step 4e: Delete the workflows
            wf_del = await conn.execute(text(f"""
                DELETE FROM workflows
                WHERE id IN ({wf_ids_str});
            """))
            print(f"✓ Deleted {wf_del.rowcount} archived workflows.")
        else:
            print("No archived workflows to delete.")

        print("\nDeletion completed successfully.")


if __name__ == "__main__":
    asyncio.run(main())
