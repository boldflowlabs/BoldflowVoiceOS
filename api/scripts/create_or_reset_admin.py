"""CLI script to create or update an admin user with superuser privileges and password.

Usage:
    python -m api.scripts.create_or_reset_admin --email godsonsaji832@gmail.com --password "Admingodson@123"
"""

import argparse
import asyncio
import sys

from api.db import db_client
from api.enums import OrganizationConfigurationKey
from api.services.auth.depends import create_user_configuration_with_mps_key
from api.services.configuration.ai_model_configuration import (
    convert_legacy_ai_model_configuration_to_v2,
)
from api.utils.auth import hash_password


async def create_or_reset_admin(email: str, password: str, name: str = "Admin") -> None:
    email = email.strip().lower()
    hashed = hash_password(password)

    user = await db_client.get_user_by_email(email)
    if user:
        await db_client.update_user_password(user.id, hashed)
        await db_client.update_user_superuser(user.id, True)
        print(f"✓ Updated existing user {email} (User ID: {user.id}) with new password and superuser=True.")

        org_id = user.selected_organization_id
        if not org_id:
            org, _ = await db_client.get_or_create_organization_by_provider_id(
                org_provider_id=f"org_{user.provider_id}", user_id=user.id
            )
            await db_client.add_user_to_organization(user.id, org.id)
            await db_client.update_user_selected_organization(user.id, org.id)
            print(f"✓ Created & linked organization ID {org.id} to user {email}.")
    else:
        user = await db_client.create_user_with_email(
            email=email,
            password_hash=hashed,
            name=name,
        )
        await db_client.update_user_superuser(user.id, True)

        org_provider_id = f"org_{user.provider_id}"
        org, _ = await db_client.get_or_create_organization_by_provider_id(
            org_provider_id=org_provider_id, user_id=user.id
        )
        await db_client.add_user_to_organization(user.id, org.id)
        await db_client.update_user_selected_organization(user.id, org.id)

        try:
            mps_config = await create_user_configuration_with_mps_key(
                user.id, org.id, user.provider_id
            )
            if mps_config:
                await db_client.update_user_configuration(user.id, mps_config)
                model_config_v2 = convert_legacy_ai_model_configuration_to_v2(mps_config)
                await db_client.upsert_configuration(
                    org.id,
                    OrganizationConfigurationKey.MODEL_CONFIGURATION_V2.value,
                    model_config_v2.model_dump(mode="json", exclude_none=True),
                )
        except Exception as e:
            print(f"Notice: Initial configuration notice: {e}")

        print(f"✓ Successfully created new admin user {email} (User ID: {user.id}, Org ID: {org.id}) with superuser=True.")


def main() -> None:
    parser = argparse.ArgumentParser(description="Create or reset admin account password & privileges")
    parser.add_argument("--email", type=str, default="godsonsaji832@gmail.com", help="Admin email address")
    parser.add_argument("--password", type=str, default="Admingodson@123", help="Admin password")
    parser.add_argument("--name", type=str, default="Admin", help="Admin full name")

    args = parser.parse_args()
    asyncio.run(create_or_reset_admin(args.email, args.password, args.name))


if __name__ == "__main__":
    main()
