# Duplicate Routes & Screens Audit

**Program:** 4100 — Product Cleanup & UX Consolidation  
**Date:** 2026-07-08

## Executive Summary

ForgeOS accumulated parallel entry points during RC1–RC12 development. This audit maps duplicates and consolidation targets without removing routes.

## Duplicate Dashboard / Founder Hubs

| Route | Purpose | Status | Consolidation Target |
|-------|---------|--------|---------------------|
| `/dashboard` | Portfolio CEO dashboard | **Legacy** | `/command-center` |
| `/founder` | Founder dashboard view | **Legacy** | `/command-center` |
| `/creator` | Creator flow | **Legacy hub** (flow kept) | `/command-center` (banner) |
| `/command-center` | Unified founder hub | **Primary** | — |
| `/ceo` | CEO workspace | Primary (module) | Linked from Command Center |
| `/os` | OS desktop | Primary (OS shell) | Complementary to Command Center |

## Duplicate Capital Routes

| Route | Notes |
|-------|-------|
| `/capital` | Public capital hub — **primary nav** |
| `/os/capital` | OS module variant — linked under Capital group |
| `/lab/forge-capital` | Engineering lab harness |

## Duplicate Marketplace / Store

| Route | Notes |
|-------|-------|
| `/marketplace` | Primary marketplace — **primary nav** |
| `/os/marketplace` | OS module mirror |
| `/templates` | Legacy templates (was in old Sidebar) |
| `/store` | Official pack store |

## Duplicate Build / Deploy

| Route | Notes |
|-------|-------|
| `/os/build` | Build platform — **primary** |
| `/deployments` | Deployments dashboard — under Build nav group |
| `/lab/real-build-flow` | Engineering harness |

## Duplicate Labs Indexes

| Route | Notes |
|-------|-------|
| `/labs` | **New central index** (Program 4100) |
| `/os/labs` | OS-side mirror with link to `/labs` |
| Scattered `/lab/*` links in old Sidebar RC1 section | Removed from main nav |

## Duplicate Venture Entry Points

| Route | Notes |
|-------|-------|
| `/ventures/[slug]` | Generic E2E venture (e.g. aurea-facilities) — **primary** |
| `/venture/[id]` | Legacy venture detail |
| `/projects` | Legacy portfolio list |
| `/os/portfolio` | OS portfolio module |

## Action Taken

- Legacy routes **kept** with consolidation banners
- Main nav consolidated to Command Center hub
- No hard deletes; soft banners preferred over 308 redirects
