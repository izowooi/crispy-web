# AGENTS.md — hero-showcase (Layer 3)

이 문서는 `hero-showcase` 프로젝트에 적용되는 Layer 3 작업 지침이다.
상위 Layer 2 지침은 `../AGENTS.md`를 따른다.

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:supabase-migration-rules -->
# Supabase Schema Changes

**CRITICAL**: This project uses Supabase (PostgreSQL). The schema is NOT managed by code — changes require manual SQL execution.

## When you add a new column or table

You MUST:
1. **Provide the exact SQL** the user must run in Supabase Dashboard → SQL Editor, e.g.:
   ```sql
   ALTER TABLE hs_heroes ADD COLUMN short_id text UNIQUE;
   ```
2. **Remind the user to run it BEFORE deploying** the code that references the new column.
3. **Write graceful fallback code** in the app so that if the migration has not been run yet, the feature degrades silently rather than breaking the entire flow.

## Existing tables

| Table | Key columns |
|-------|-------------|
| `hs_heroes` | `id` (uuid PK), `short_id` (text UNIQUE, nullable), `name`, `title`, `job`, `rarity`, `portrait_url`, `card_url`, `metadata` (jsonb), `created_at` |

Storage buckets: `hs-portraits`, `hs-cards`
<!-- END:supabase-migration-rules -->
