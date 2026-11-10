# KILOMeet Screen Flow Fix — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire all 17+ screens to Zustand stores and mock API, fix broken navigation, add missing handlers, and correct logic errors against the spec.

**Architecture:** Screens currently use hardcoded `MOCK_*` local constants. Zustand stores (`useAuthStore`, `useRunnerStore`, `useVoucherStore`, `useGroupStore`) and mock API layer (`src/api/mock/*`) already exist with correct signatures. Each task wires screens to stores, deletes hardcoded mocks, and adds missing UI handlers.

**Tech Stack:** Expo SDK 58, TypeScript, Zustand, expo-router, NativeWind, react-native-maps, expo-location, expo-camera, react-native-qrcode-svg

**Spec:** `docs/KILOMeet.md`

## Global Constraints

- All mock data lives in `src/api/mock/*.ts`; screens MUST NOT define inline `MOCK_*` constants.
- Route by `user.role` from `useAuthStore`, never by email string matching.
- TypeScript strict mode — `npx tsc --noEmit` must pass after every task.
- NativeWind `className` for styling; keep existing fallback inline `style` on root layouts.
- No new dependencies except what's already in `package.json`.
- Use `model: 'ag/gemini-3.5-flash'` for all subagents.

## Review Focus

1. **Login with wrong password** — catch block must NOT navigate to runner; must show error to user.
2. **Buy voucher without enough tokens** — must show error, not silently fail.
3. **Non-member accessing groups** — must show paywall, not group list.
4. **Season close with runner holding tokens > cap** — must clamp tokens and drop rank 2 tiers.
5. **QR scan of already-used voucher** — must show error state, not success.

---

### Task 1: Fix Auth Flow (login, register, routing, onboarding)

**Files:**
- Modify: `kilomeet-app/src/stores/auth.ts` (fix `getHomeRoute`)
- Modify: `kilomeet-app/app/index.tsx` (add auth guard + onboarding check)
- Modify: `kilomeet-app/app/(auth)/login.tsx` (role-based routing, error display, fix catch)
- Modify: `kilomeet-app/app/(auth)/register.tsx` (wire `useAuthStore.register`, role-aware routing)
- Modify: `kilomeet-app/app/(auth)/onboarding.tsx` (add completion flag via AsyncStorage)

**Interfaces:**
- Consumes: `useAuthStore` (`login`, `register`, `logout`, `user`, `error`, `isLoading`)
- Produces: Correct navigation to `/(runner)`, `/(store)`, `/(admin)` based on `user.role`

- [ ] **Step 1: Fix `getHomeRoute()` in `src/stores/auth.ts`**

Change route map to:
```
runner: '/(runner)'
member: '/(runner)'
store: '/(store)'
admin: '/(admin)'
```

- [ ] **Step 2: Rewrite `app/index.tsx` with auth guard**

```tsx
// Read useAuthStore.user
// If user exists → router.replace(getHomeRoute())
// If no user → check AsyncStorage 'hasSeenOnboarding'
//   If false → router.replace('/(auth)/onboarding')
//   If true → router.replace('/(auth)/login')
// Show loading spinner while checking
```

- [ ] **Step 3: Fix `login.tsx`**

- Import and use `useAuthStore` for `user`, `isLoading`, `error` (remove local `loading` state).
- After successful `login()`, route based on `useAuthStore.user.role`:
  - `store` → `/(store)`
  - `admin` → `/(admin)`
  - default → `/(runner)`
- Remove `catch` block that navigates to runner. Instead, let error state propagate and display error message below form.
- Demo quick login buttons: call `handleLogin` directly instead of just populating fields.
- Show `error` from store as red text below password field.

- [ ] **Step 4: Fix `register.tsx`**

- Import and call `useAuthStore.register(email, name, password)`.
- After success, route by `user.role` same as login.
- Remove `setTimeout` stub.
- Note: mock API always creates `role: 'runner'`. Store registration is a separate backend concern — keep the role toggle UI but route to `/(runner)` for now with a note.

- [ ] **Step 5: Wire `onboarding.tsx` completion flag**

- On "Bắt đầu" or "Bỏ qua": `await AsyncStorage.setItem('hasSeenOnboarding', 'true')` then navigate.
- Import from `@react-native-async-storage/async-storage` (already in Expo).

- [ ] **Step 6: Verify**

Run `npx tsc --noEmit`. Launch app, verify:
- Fresh user sees onboarding → login.
- Login with `lan@demo.com` / `demo123` → runner tabs.
- Login with `quanfuji@demo.com` → store dashboard.
- Login with `admin@demo.com` → admin dashboard.
- Login with wrong password → error message shown, stays on login.

- [ ] **Step 7: Commit**

```
git add -A && git commit -m "fix(auth): wire auth store, role routing, onboarding guard, error display"
```

---

### Task 2: Wire Runner Dashboard + Run Screen

**Files:**
- Modify: `kilomeet-app/app/(runner)/index.tsx` (replace MOCK with store data)
- Modify: `kilomeet-app/app/(runner)/run.tsx` (save run via store, detect store proximity)

**Interfaces:**
- Consumes: `useAuthStore` (`user`), `useRunnerStore` (`syncFromUser`, `fetchQuests`, `fetchRuns`, `startRun`, `endRun`, `completeQuest`, `tokenBalance`, `rank`, `kmThisWeek`, `quests`, `runs`)
- Produces: Run data persisted in mock API; quest completion triggers token credit

- [ ] **Step 1: Rewrite `(runner)/index.tsx`**

- Import `useAuthStore` and `useRunnerStore`.
- On mount: `syncFromUser(user)`, `fetchQuests()`, `fetchRuns()`.
- Replace all `MOCK.*` references with store state.
- `onRefresh`: call `fetchQuests()` + `fetchRuns()`.
- Show token burn warning if `tokenBalance > RANK_TOKEN_RETENTION[rank]` (import from types).
- Wire notification bell `onPress` to `Alert.alert('Thông báo', 'Chưa có thông báo mới')`.
- Quest cards: show real `quests` from store, display progress.

- [ ] **Step 2: Rewrite `(runner)/run.tsx` to save runs**

- Import `useRunnerStore`.
- On "Bắt đầu chạy": call `startRun()` to get `runId`.
- On finish: call `endRun(runId, distanceKm, durationMinutes, route, passedStoreIds)`.
- After endRun success: check if `distanceKm >= DAILY_QUEST_KM` → find active daily quest → call `completeQuest(questId)`. Show actual token reward in summary.
- Store proximity detection: import `MOCK_STORE` coordinates from `src/api/mock/data.ts`. After run completes, calculate haversine distance for each GPS point against store coordinates. If any point within `STORE_PROXIMITY_M` (50m), add `storeId` to `passedStoreIds`. Show store selection modal if `passedStoreIds.length > 0`.

- [ ] **Step 3: Verify**

- Start run, walk/simulate 2+ km, finish → run saved in store, daily quest completed, +10 tokens shown.
- Dashboard refreshes with updated stats.

- [ ] **Step 4: Commit**

```
git add -A && git commit -m "feat(runner): wire dashboard and run screen to stores, add store proximity"
```

---

### Task 3: Wire Voucher Screens (marketplace, detail, buy, gift, QR display)

**Files:**
- Modify: `kilomeet-app/app/(runner)/vouchers.tsx` (use `useVoucherStore`)
- Modify: `kilomeet-app/app/(runner)/voucher/[id].tsx` (buy handler, gift handler, QR display)

**Interfaces:**
- Consumes: `useVoucherStore` (`fetchTemplates`, `fetchMyVouchers`, `buyVoucher`, `giftVoucher`, `templates`, `myVouchers`), `useRunnerStore` (`tokenBalance`, `rank`)
- Produces: Voucher purchase deducts tokens; owned voucher shows QR code

- [ ] **Step 1: Wire `vouchers.tsx`**

- On mount: `fetchTemplates()`, `fetchMyVouchers()`.
- "Khám phá" tab: render `templates` from store.
- "Của tôi" tab: render `myVouchers` from store. Show each owned voucher with status badge and QR code button.
- Remove inline `MOCK_VOUCHERS`.

- [ ] **Step 2: Wire `voucher/[id].tsx`**

- Fetch voucher by `id` param from `templates` or `myVouchers` in store (find by id, fallback to first if not found for demo).
- "Mua voucher" button `onPress`:
  - Check `rank >= template.minRank` (use `RANK_INDEX`).
  - Check `tokenBalance >= price`.
  - Call `buyVoucher(templateId, questCompleted)`.
  - On success: show Alert, refresh my vouchers.
  - On error: show Alert with error message.
- "Tặng" button `onPress`:
  - Prompt for recipient email/ID.
  - Call `giftVoucher(voucherId, toUserId)`.
  - On success: show Alert confirmation.
- Add QR code display section for owned vouchers:
  - Import `QRCode` from `react-native-qrcode-svg`.
  - If voucher is owned (`status === 'owned'`): render QR code with `voucher.qrCode` value.

- [ ] **Step 3: Verify**

- Open vouchers tab → see marketplace. Switch to "Của tôi" → see owned vouchers.
- Buy voucher → token balance decreases. View owned voucher → QR code displayed.

- [ ] **Step 4: Commit**

```
git add -A && git commit -m "feat(voucher): wire buy/gift/QR, connect to voucher store"
```

---

### Task 4: Wire Group Screens + Member Gate

**Files:**
- Modify: `kilomeet-app/app/(runner)/groups/index.tsx` (use `useGroupStore`, add member gate)
- Modify: `kilomeet-app/app/(runner)/groups/create.tsx` (wire `createGroup`)
- Modify: `kilomeet-app/app/(runner)/groups/[id].tsx` (wire `joinGroup`, confirm/cancel handlers)

**Interfaces:**
- Consumes: `useGroupStore` (`fetchGroups`, `createGroup`, `joinGroup`, `groups`, `currentGroup`, `fetchGroupDetail`), `useAuthStore` (`user` — check `isMember`)
- Produces: Group creation and join persisted in mock API

- [ ] **Step 1: Add member gate to `groups/index.tsx`**

- Import `useAuthStore`. Check `user.isMember`.
- If not member: render paywall screen with membership benefits + "Đăng ký Hội viên" button (link to profile tab or show inline subscription modal).
- If member: render existing group list UI.
- On mount (if member): `fetchGroups()`.
- Replace `MOCK_GROUPS` with `groups` from store.
- Wire "Ghép tự động" button: `Alert.alert` with "Đang tìm nhóm phù hợp..." then call `fetchGroups()` (mock auto-match).

- [ ] **Step 2: Wire `groups/create.tsx`**

- Import `useGroupStore`.
- On submit: call `createGroup({ date: today, timeSlot, meetingPoint: { name: addressText, latitude: 10.773, longitude: 106.660 }, distanceKm, rankRange })`.
- On success: `router.replace('/(runner)/groups/' + group.id)`.
- Add date picker or default to today's date.

- [ ] **Step 3: Wire `groups/[id].tsx`**

- Import `useGroupStore`.
- On mount: `fetchGroupDetail(id)`. Render `currentGroup` from store.
- "Xác nhận tham gia" `onPress`: call `joinGroup(id)`.
- "Huỷ" `onPress`: `Alert.alert` confirmation → `router.back()`.
- Replace hardcoded `currentUserId` with `useAuthStore.user.id`.

- [ ] **Step 4: Verify**

- Login as `lan@demo.com` (non-member) → Groups tab shows paywall.
- Login as `minh@demo.com` (member) → Groups tab shows group list.
- Create group → appears in list. Join group → member count updates.

- [ ] **Step 5: Commit**

```
git add -A && git commit -m "feat(groups): wire store, member gate, create/join handlers"
```

---

### Task 5: Wire Store Screens (dashboard, voucher list, create, QR scan)

**Files:**
- Modify: `kilomeet-app/app/(store)/index.tsx` (use mock API, approval gate)
- Modify: `kilomeet-app/app/(store)/scan.tsx` (wire `mockScanQR`)
- Modify: `kilomeet-app/app/(store)/vouchers/index.tsx` (fetch from store, add nav link)
- Modify: `kilomeet-app/app/(store)/vouchers/create.tsx` (wire `mockCreateVoucher`)
- Modify: `kilomeet-app/app/(store)/index.tsx` (add link to voucher list)

**Interfaces:**
- Consumes: `useAuthStore` (`user` as `Store`), `useVoucherStore` (`fetchTemplates`), mock API via `api.get('/store/dashboard')`, `api.post('/store/scan')`, `api.post('/store/vouchers')`
- Produces: Dashboard reflects real data; QR scan calls mock API; voucher creation persists

- [ ] **Step 1: Wire `(store)/index.tsx`**

- On mount: call `api.get<StoreDashboard>('/store/dashboard')` (import `api` from `src/api/client`).
- Replace `MOCK_DASHBOARD` with API response state.
- If `user.approved === false`: disable "Tạo voucher" and "Quét QR" buttons, show pending banner.
- Add navigation link to `/(store)/vouchers` (voucher list).
- Add logout button calling `useAuthStore.logout()` + `router.replace('/(auth)/login')`.

- [ ] **Step 2: Wire `(store)/scan.tsx`**

- On QR scanned: call `api.post('/store/scan', { qrCode: data })` where `data` is the scanned string.
- On success: show result from API (voucher title, fee 5000đ).
- On error: show error Alert (invalid/already used).

- [ ] **Step 3: Wire `(store)/vouchers/index.tsx`**

- On mount: `useVoucherStore.fetchTemplates(user.id)`. Render `templates` filtered by store.
- Remove `MOCK_VOUCHERS`.

- [ ] **Step 4: Wire `(store)/vouchers/create.tsx`**

- On submit: call `api.post('/store/vouchers', formData)`.
- On success: `router.back()` to voucher list.
- Remove `Alert.alert` only stub.

- [ ] **Step 5: Verify**

- Login as store → see dashboard with real mock data.
- Create voucher → appears in voucher list.
- Scan QR → API called, result shown.

- [ ] **Step 6: Commit**

```
git add -A && git commit -m "feat(store): wire dashboard, scan, voucher CRUD to API"
```

---

### Task 6: Wire Admin Screens (dashboard, store approval, season management)

**Files:**
- Modify: `kilomeet-app/app/(admin)/index.tsx` (fetch from API)
- Modify: `kilomeet-app/app/(admin)/stores.tsx` (wire approve/reject API)
- Modify: `kilomeet-app/app/(admin)/season.tsx` (wire season control API)

**Interfaces:**
- Consumes: `useAuthStore` (`user`), mock API via `api.get('/admin/pending-stores')`, `api.get('/admin/seasons')`, `api.post('/admin/approve-store')`, `api.post('/admin/season')`
- Produces: Store approval persists in mock; season open/close persists

- [ ] **Step 1: Wire `(admin)/index.tsx`**

- On mount: fetch pending stores count and season info from API.
- Replace `MOCK` constant with API state.
- Add logout button.

- [ ] **Step 2: Wire `(admin)/stores.tsx`**

- On mount: `api.get<PendingStore[]>('/admin/pending-stores')`.
- On approve/reject: `api.post('/admin/approve-store', { storeId, approved })`.
- On success: refresh list.
- Remove local `MOCK_STORES`.

- [ ] **Step 3: Wire `(admin)/season.tsx`**

- On mount: `api.get<SeasonInfo[]>('/admin/seasons')`.
- "Đóng mùa": `api.post('/admin/season', { action: 'end' })`. On success: refresh.
- "Mở mùa mới": `api.post('/admin/season', { action: 'start' })`. On success: refresh.
- Remove local state-only season management.

- [ ] **Step 4: Verify**

- Login as admin → see real pending count.
- Approve store → removed from pending list.
- Close season → status updates to inactive.

- [ ] **Step 5: Commit**

```
git add -A && git commit -m "feat(admin): wire dashboard, store approval, season control to API"
```

---

### Task 7: Fix Profile Screen + Membership

**Files:**
- Modify: `kilomeet-app/app/(runner)/profile.tsx`
- Modify: `kilomeet-app/src/api/mock/auth.ts` (add membership toggle)
- Modify: `kilomeet-app/src/api/mock/router.ts` (add membership route)

**Interfaces:**
- Consumes: `useAuthStore` (`user`, `logout`), `useRunnerStore` (`tokenBalance`, `rank`, `runs`)
- Produces: Profile shows real user data; membership subscription updates user role

- [ ] **Step 1: Wire profile to stores**

- Replace `MOCK` with `useAuthStore.user` and `useRunnerStore` state.
- Display real: name, email, rank, wallet address, token balance, total km (sum from runs), total runs count, punctuality.

- [ ] **Step 2: Fix membership benefits text**

- Change `"Nhận thưởng token khi chạy nhóm"` to `"Được ghép nhóm chạy chung gần nhà"` (matches spec: group runs give no extra tokens).

- [ ] **Step 3: Wire membership button**

- Add mock endpoint `POST /auth/subscribe` in `mock/auth.ts`: sets `user.isMember = true`, `user.role = 'member'`.
- Register route in `mock/router.ts`.
- Button `onPress`: `Alert.alert` confirm → call `api.post('/auth/subscribe')` → update auth store user → show success.

- [ ] **Step 4: Wire settings**

- Logout button: already works. Verify it calls `useAuthStore.logout()` + navigates to login.
- Language / About: keep as-is (non-MVP).

- [ ] **Step 5: Verify**

- Profile shows real user data.
- Subscribe to membership → user becomes member → Groups tab now accessible.

- [ ] **Step 6: Commit**

```
git add -A && git commit -m "feat(profile): wire to stores, fix membership text, add subscription"
```
