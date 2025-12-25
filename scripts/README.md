# Database Seeding Scripts

## seed-database.ts

Seeds the database with initial data:
- Chapters (all 12 IEEE societies)
- Roles (5-level hierarchy)
- Demo users (10 accounts with hashed passwords)

### Usage

```bash
# Ensure you have your .env.local file configured with Supabase credentials
npx ts-node scripts/seed-database.ts
```

### What it does

1. Creates/updates all chapters (Student Branch, RAS, CS, etc.)
2. Creates/updates all roles with appropriate levels
3. Creates/updates demo users with hashed passwords (password: 12345)

### Notes

- Uses upsert to avoid duplicate entries
- All passwords are hashed using bcrypt
- Chapter associations are created based on role names
- Safe to run multiple times (idempotent)
