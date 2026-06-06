"""Generate a bcrypt hash for the admin password.

Run this once to produce the value for ADMIN_PASSWORD_HASH in .env:

    python scripts/hash_password.py

It prompts for the password (input hidden) and prints the hash to paste in.
"""
import getpass

import bcrypt


def main() -> None:
    pw = getpass.getpass("Admin password: ")
    confirm = getpass.getpass("Confirm password: ")
    if pw != confirm:
        raise SystemExit("Passwords do not match.")
    if not pw:
        raise SystemExit("Password must not be empty.")
    hashed = bcrypt.hashpw(pw.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    print("\nAdd this line to your .env:\n")
    print(f"ADMIN_PASSWORD_HASH={hashed}")


if __name__ == "__main__":
    main()
