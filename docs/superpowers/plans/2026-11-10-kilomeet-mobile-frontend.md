# KILOMeet Mobile Frontend — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Build a complete Expo (React Native) mobile frontend for KILOMeet — a seasonal running app with GPS tracking, token economy, vouchers, and group runs on Avalanche.

**Architecture:** Expo SDK 52 managed workflow, file-based routing (expo-router), Zustand state, mock API layer with clean TypeScript interfaces ready for backend integration. Assets generated via MCP image-generation server.

**Tech Stack:** Expo SDK 52, TypeScript, expo-router, Zustand, react-native-maps, expo-location, expo-camera (QR), ethers.js v6, NativeWind (Tailwind CSS for RN)

**Spec:** `docs/KILOMeet.md`

## Global Constraints

- TypeScript strict mode throughout
- All API calls go through `src/api/` layer — never direct fetch in components
- API layer uses typed request/response interfaces in `src/api/types.ts`
- Mock data in `src/api/mock/` — one file per domain (auth, runs, quests, vouchers, groups, admin)
- All colors, spacing, typography from `src/theme/` — no hardcoded values in components
- Vietnamese UI text, English code identifiers
- Target: iOS + Android via Expo Go / dev build
- No tests required (hackathon MVP, 12 days)

## Review Focus

1. API types must match spec domain model exactly (token amounts, rank names, voucher lifecycle states) — mismatch means backend can't plug in
2. GPS tracking must handle background/foreground transitions — broken tracking = no km logged
3. Mock data must cover all rank tiers and voucher states — demo needs pre-built accounts at every tier
4. Navigation must support 4 distinct role flows without auth confusion — wrong role sees wrong screens
5. Map components must throttle location updates — unthrottled updates = UI freeze on real device

---

### Task 1: Project Scaffold + Design System

**Files:**
- Create: `package.json`, `app.json`, `tsconfig.json`, `babel.config.js`
- Create: `tailwind.config.js`, `global.css`
- Create: `src/theme/colors.ts`, `src/theme/typography.ts`, `src/theme/spacing.ts`, `src/theme/index.ts`
- Create: `app/_layout.tsx` (root layout)
- Create: `app/(auth)/_layout.tsx`, `app/(runner)/_layout.tsx`, `app/(store)/_layout.tsx`, `app/(admin)/_layout.tsx`

**Interfaces:**
- Produces: Theme constants (`colors`, `typography`, `spacing`) used by all UI tasks
- Produces: Navigation structure (route groups) used by all screen tasks

- [ ] Step 1: Run `npx create-expo-app@latest kilomeet-app --template blank-typescript` in project root
- [ ] Step 2: Install dependencies: `expo-router`, `nativewind`, `tailwindcss`, `zustand`, `expo-location`, `react-native-maps`, `expo-camera`, `ethers`, `react-native-safe-area-context`, `react-native-screens`, `expo-status-bar`, `react-native-reanimated`, `@expo/vector-icons`, `expo-linear-gradient`
- [ ] Step 3: Configure NativeWind — `tailwind.config.js` with custom theme, `babel.config.js` with nativewind preset, `global.css`
- [ ] Step 4: Define design system in `src/theme/`:
  - Color palette: energetic but clean — primary green (#22C55E running/nature), accent orange (#F97316 achievement/fire), dark backgrounds (#0F172A, #1E293B), surface (#334155), text white/gray
  - Typography: system fonts, sizes 12/14/16/18/24/32/40
  - Spacing: 4/8/12/16/20/24/32/48
  - Rank colors: Đồng=#A0785A, Bạc=#94A3B8, Vàng=#EAB308, Bạch kim=#67E8F9, Kim cương=#818CF8, Cao thủ=#F43F5E
- [ ] Step 5: Create root `app/_layout.tsx` with NativeWind provider, SafeArea, StatusBar
- [ ] Step 6: Create route group layouts — `(auth)`, `(runner)` with bottom tabs, `(store)`, `(admin)`
- [ ] Step 7: Verify app starts with `npx expo start`
- [ ] Step 8: Commit

### Task 2: API Types + Mock Layer

**Files:**
- Create: `src/api/types.ts` — all domain types
- Create: `src/api/client.ts` — API client abstraction
- Create: `src/api/mock/auth.ts`, `src/api/mock/runs.ts`, `src/api/mock/quests.ts`, `src/api/mock/vouchers.ts`, `src/api/mock/groups.ts`, `src/api/mock/admin.ts`, `src/api/mock/store.ts`
- Create: `src/api/index.ts` — barrel export
- Create: `src/stores/auth.ts`, `src/stores/runner.ts`, `src/stores/voucher.ts`, `src/stores/group.ts`

**Interfaces:**
- Consumes: Nothing (foundation task)
- Produces: All TypeScript types and mock API functions consumed by every UI task

- [ ] Step 1: Define domain types in `src/api/types.ts`:
  - `User { id, email, name, role: 'runner'|'member'|'store'|'admin', walletAddress }`
  - `Rank = 'đồng'|'bạc'|'vàng'|'bạch_kim'|'kim_cương'|'cao_thủ'`
  - `Season { id, name, startDate, endDate, status }`
  - `RunSession { id, userId, distanceKm, durationMs, route: LatLng[], startedAt, endedAt }`
  - `Quest { id, type: 'daily'|'weekly', requirement, reward, progress, completed }`
  - `Voucher { id, storeId, storeName, title, description, originalPrice, discountedPrice, questDescription, questCompleted, status: 'available'|'owned'|'gifted'|'used'|'expired', expiresAt, minRank, area }`
  - `RunGroup { id, startTime, meetingPoint: LatLng, meetingPointName, distance, rankRange, members: GroupMember[], status }`
  - `GroupMember { userId, name, rank, location?: LatLng, arrivedAt?, punctualityRate }`
  - `Store { id, name, location: LatLng, address, status: 'pending'|'approved'|'rejected' }`
  - `TokenBalance { amount, rank, weeklyKm, kmToKeepRank, seasonDaysLeft }`
- [ ] Step 2: Create `src/api/client.ts` — abstract API client with `get<T>`, `post<T>`, `put<T>`, `delete<T>` that currently route to mock implementations. Include `setBaseUrl()` for future backend switch.
- [ ] Step 3: Create mock data files with realistic Vietnamese data — 4 pre-built user accounts (runner Đồng, member Cao thủ, store owner, admin), voucher data for cafes near HCMUT, run history, group run schedules
- [ ] Step 4: Create Zustand stores — `useAuthStore` (user, login, logout), `useRunnerStore` (token balance, rank, runs, quests), `useVoucherStore` (available, owned vouchers), `useGroupStore` (groups, active group)
- [ ] Step 5: Commit

### Task 3: Generate Visual Assets via MCP

**Files:**
- Create: `assets/images/` — all generated images
- Create: `assets/icons/` — custom icons
- Create: `src/components/common/RankBadge.tsx` — rank badge component using generated assets
- Create: `src/components/common/AppLogo.tsx`

**Interfaces:**
- Consumes: Theme colors from Task 1
- Produces: Image assets and badge components used by UI screens

- [ ] Step 1: Generate app splash/onboarding illustration — energetic running scene, minimalist flat style, green+orange palette
- [ ] Step 2: Generate 6 rank badge icons (Đồng through Cao thủ) — each with distinct visual identity matching rank colors
- [ ] Step 3: Generate seasonal badge/trophy icon
- [ ] Step 4: Generate voucher card background pattern
- [ ] Step 5: Generate group run illustration (people running together)
- [ ] Step 6: Generate empty state illustrations (no runs yet, no vouchers, no groups)
- [ ] Step 7: Build `RankBadge` component that renders the correct badge per rank
- [ ] Step 8: Build `AppLogo` component
- [ ] Step 9: Commit

### Task 4: Auth Screens

**Files:**
- Create: `app/(auth)/login.tsx`, `app/(auth)/register.tsx`, `app/(auth)/onboarding.tsx`
- Create: `src/components/auth/LoginForm.tsx`, `src/components/auth/RegisterForm.tsx`

**Interfaces:**
- Consumes: Theme (Task 1), API types + auth store (Task 2)
- Produces: Auth flow that redirects to correct role-based route group

- [ ] Step 1: Build `login.tsx` — email input, password, login button, register link. Dark background, green accent. Show wallet address after login.
- [ ] Step 2: Build `register.tsx` — email, name, password, role selector (người chạy / cửa hàng). Auto-create wallet on register.
- [ ] Step 3: Build `onboarding.tsx` — 3 slides: "Chạy bộ mỗi ngày", "Kiếm token & voucher", "Chạy cùng nhóm". Use generated illustrations.
- [ ] Step 4: Wire auth store — login/register mock calls, redirect to role-based layout
- [ ] Step 5: Commit

### Task 5: Runner Home + Dashboard

**Files:**
- Create: `app/(runner)/index.tsx` (home/dashboard)
- Create: `src/components/runner/StatsCard.tsx`, `src/components/runner/QuestCard.tsx`, `src/components/runner/SeasonProgress.tsx`, `src/components/runner/RankProgress.tsx`

**Interfaces:**
- Consumes: Theme (Task 1), API types + runner store (Task 2), RankBadge (Task 3)
- Produces: Dashboard screen with stats overview

- [ ] Step 1: Build `StatsCard` — reusable card showing icon + value + label (e.g., "🏃 42 km tuần này")
- [ ] Step 2: Build `QuestCard` — daily/weekly quest with progress bar, reward amount, completion state
- [ ] Step 3: Build `SeasonProgress` — circular or bar progress showing days left, current rank, token balance
- [ ] Step 4: Build `RankProgress` — visual showing current rank, km needed for next rank, streak info
- [ ] Step 5: Compose `index.tsx` dashboard — greeting, season info, stats row, active quests, rank card. ScrollView with pull-to-refresh.
- [ ] Step 6: Commit

### Task 6: GPS Run Tracking Screen

**Files:**
- Create: `app/(runner)/run.tsx` (active run screen)
- Create: `app/(runner)/run-history.tsx`
- Create: `src/components/runner/RunMap.tsx`, `src/components/runner/RunStats.tsx`, `src/components/runner/RunHistoryItem.tsx`
- Create: `src/services/location.ts` — GPS tracking service

**Interfaces:**
- Consumes: Theme (Task 1), API types + runner store (Task 2)
- Produces: GPS run tracking and history screens

- [ ] Step 1: Build `src/services/location.ts` — `startTracking()`, `stopTracking()`, `getCurrentPosition()`, distance calculation using Haversine. Uses `expo-location` foreground tracking.
- [ ] Step 2: Build `RunMap` — MapView showing current route polyline, current position marker, distance labels
- [ ] Step 3: Build `RunStats` — live stats overlay: distance, duration, pace, calories estimate
- [ ] Step 4: Build `run.tsx` — full-screen map with stats overlay, start/pause/stop controls, auto-detect nearby stores for voucher quest completion
- [ ] Step 5: Build `RunHistoryItem` — list item showing date, distance, duration, map thumbnail
- [ ] Step 6: Build `run-history.tsx` — FlatList of past runs with stats summary at top
- [ ] Step 7: Commit

### Task 7: Voucher Marketplace + QR

**Files:**
- Create: `app/(runner)/vouchers.tsx` (marketplace)
- Create: `app/(runner)/voucher/[id].tsx` (voucher detail)
- Create: `app/(runner)/my-vouchers.tsx`
- Create: `src/components/voucher/VoucherCard.tsx`, `src/components/voucher/VoucherQR.tsx`, `src/components/voucher/GiftVoucherModal.tsx`

**Interfaces:**
- Consumes: Theme (Task 1), API types + voucher store (Task 2), RankBadge (Task 3)
- Produces: Voucher marketplace, detail, owned vouchers, QR display, gift flow

- [ ] Step 1: Build `VoucherCard` — card showing store name, discount, price in tokens, quest requirement, min rank badge. Tap → detail.
- [ ] Step 2: Build `vouchers.tsx` — grid/list of available vouchers, filter by area/rank, search
- [ ] Step 3: Build `voucher/[id].tsx` — full detail: store info, quest description, price (original + discounted), buy button, map showing store location
- [ ] Step 4: Build `VoucherQR` — generate QR code from voucher data for store scanning
- [ ] Step 5: Build `GiftVoucherModal` — modal to select recipient, confirm gift
- [ ] Step 6: Build `my-vouchers.tsx` — owned vouchers list with status tabs (active, gifted, used, expired), QR button, gift button
- [ ] Step 7: Commit

### Task 8: Group Run (Member) Screens

**Files:**
- Create: `app/(runner)/groups/index.tsx` (find/create group)
- Create: `app/(runner)/groups/[id].tsx` (group detail + live map)
- Create: `app/(runner)/groups/create.tsx`
- Create: `src/components/group/GroupCard.tsx`, `src/components/group/GroupMap.tsx`, `src/components/group/MemberAvatar.tsx`

**Interfaces:**
- Consumes: Theme (Task 1), API types + group store (Task 2), RankBadge (Task 3)
- Produces: Group discovery, creation, live tracking screens

- [ ] Step 1: Build `GroupCard` — card showing time, location, distance, member count, rank range
- [ ] Step 2: Build `groups/index.tsx` — list of available groups, "Tự lập nhóm" and "Ghép tự động" buttons, filter by time/distance/rank
- [ ] Step 3: Build `groups/create.tsx` — form: pick start time (30min slots 5:00-7:00, 17:00-20:00), meeting point (map picker), distance, rank range selector
- [ ] Step 4: Build `MemberAvatar` — circular avatar with rank badge overlay, punctuality indicator
- [ ] Step 5: Build `GroupMap` — MapView showing meeting point, all member positions (real-time mock), estimated arrival times, 50m radius circle
- [ ] Step 6: Build `groups/[id].tsx` — group detail with member list, map, confirm/cancel buttons, countdown to start, chat-like status updates
- [ ] Step 7: Commit

### Task 9: Store Owner Screens

**Files:**
- Create: `app/(store)/index.tsx` (store dashboard)
- Create: `app/(store)/vouchers/create.tsx`
- Create: `app/(store)/vouchers/index.tsx` (manage vouchers)
- Create: `app/(store)/scan.tsx` (QR scanner)
- Create: `src/components/store/ScanResult.tsx`, `src/components/store/VoucherForm.tsx`, `src/components/store/StoreStats.tsx`

**Interfaces:**
- Consumes: Theme (Task 1), API types (Task 2)
- Produces: Store management screens

- [ ] Step 1: Build `StoreStats` — dashboard cards: total vouchers created, redeemed count, fees owed
- [ ] Step 2: Build `(store)/index.tsx` — store dashboard with stats, recent redemptions list, quick actions
- [ ] Step 3: Build `VoucherForm` — create voucher form: title, description, token price, quest type + requirement, discount %, quantity, expiry, min rank, area
- [ ] Step 4: Build `vouchers/create.tsx` — page wrapping VoucherForm with preview
- [ ] Step 5: Build `vouchers/index.tsx` — list of store's vouchers with status, redemption count
- [ ] Step 6: Build `scan.tsx` — camera-based QR scanner using expo-camera, `ScanResult` showing voucher info + confirm redemption
- [ ] Step 7: Commit

### Task 10: Admin Screens

**Files:**
- Create: `app/(admin)/index.tsx` (admin dashboard)
- Create: `app/(admin)/stores.tsx` (approve stores)
- Create: `app/(admin)/season.tsx` (season management)
- Create: `src/components/admin/StoreApprovalCard.tsx`, `src/components/admin/SeasonControl.tsx`

**Interfaces:**
- Consumes: Theme (Task 1), API types (Task 2)
- Produces: Admin management screens

- [ ] Step 1: Build `StoreApprovalCard` — pending store info with approve/reject buttons
- [ ] Step 2: Build `(admin)/stores.tsx` — list of pending + approved stores
- [ ] Step 3: Build `SeasonControl` — current season status, open/close season button, reset confirmation modal
- [ ] Step 4: Build `(admin)/season.tsx` — season management with config display (quest levels, rank thresholds)
- [ ] Step 5: Build `(admin)/index.tsx` — dashboard with pending count, season status, quick links
- [ ] Step 6: Commit

### Task 11: Polish + Demo Readiness

**Files:**
- Modify: various screens for transitions, loading states
- Create: `src/components/common/LoadingScreen.tsx`, `src/components/common/EmptyState.tsx`, `src/components/common/Toast.tsx`
- Modify: `app/(runner)/_layout.tsx` — bottom tab icons and labels

**Interfaces:**
- Consumes: All previous tasks
- Produces: Polished app ready for UniHack demo

- [ ] Step 1: Add tab bar icons and labels for runner layout — Trang chủ, Chạy, Voucher, Nhóm, Tôi
- [ ] Step 2: Build `LoadingScreen`, `EmptyState` (with generated illustrations), `Toast` components
- [ ] Step 3: Add loading states and empty states to all list screens
- [ ] Step 4: Add pull-to-refresh to dashboard and list screens  
- [ ] Step 5: Add screen transitions (slide, fade) via expo-router
- [ ] Step 6: Wire up demo accounts — quick-switch between 4 pre-built accounts for demo scenario
- [ ] Step 7: Verify full demo flow matches spec's "Kịch bản demo 3 phút" (steps 1-8)
- [ ] Step 8: Commit
