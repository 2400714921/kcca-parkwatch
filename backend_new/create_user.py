"""
Create or update an operator account for the ParkWatch dashboard.

Usage:
    python create_user.py <username>            # prompts for password (hidden)
    python create_user.py <username> --admin    # grant admin role
    python create_user.py                        # list existing accounts
"""
import sys
import time
from getpass import getpass

from main import _read_users, _write_users, hash_password


def list_users() -> None:
    users = _read_users()
    if not users:
        print("No accounts yet. Create one with:  python create_user.py <username>")
        return

    print(f"{len(users)} account(s):")
    for name, record in sorted(users.items()):
        created = time.strftime("%Y-%m-%d", time.localtime(record.get("created_at", 0)))
        print(f"  {name:<24} {record.get('role', 'operator'):<10} created {created}")


def main() -> int:
    args = [a for a in sys.argv[1:]]

    if not args:
        list_users()
        return 0

    username = args[0].lower().strip()

    if len(username) < 3:
        print("Username must be at least 3 characters.")
        return 1

    password = getpass(f"Password for '{username}' (min 6 chars): ")
    confirm = getpass("Confirm password: ")

    if password != confirm:
        print("Passwords do not match.")
        return 1

    if len(password) < 6:
        print("Password must be at least 6 characters.")
        return 1

    users = _read_users()
    is_new = username not in users

    users[username] = {
        "password_hash": hash_password(password),
        "created_at": users.get(username, {}).get("created_at", int(time.time())),
        "role": "admin" if ("--admin" in args or is_new and not users) else "operator",
    }

    _write_users(users)
    print(f"{'Created' if is_new else 'Updated'} account '{username}' ({users[username]['role']}).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
