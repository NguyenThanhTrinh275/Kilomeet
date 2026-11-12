import type { StoreStatus } from '@prisma/client';
import { notFound } from '../../lib/errors.js';
import { enqueueChain } from '../../lib/outbox.js';
import { prisma } from '../../lib/prisma.js';

const toAdminStore = (s: { userId: string; storeName: string; storeAddress: string; lat: number; lng: number; appliedAt: Date; status: StoreStatus; user: { email: string } }) => ({
  id: s.userId,
  email: s.user.email,
  storeName: s.storeName,
  storeAddress: s.storeAddress,
  latitude: s.lat,
  longitude: s.lng,
  appliedAt: s.appliedAt.toISOString(),
  status: s.status,
});

export async function listStores(status?: StoreStatus) {
  const stores = await prisma.store.findMany({
    where: status ? { status } : {},
    include: { user: { select: { email: true } } },
    orderBy: { appliedAt: 'desc' },
  });
  return stores.map(toAdminStore);
}

export async function setStoreStatus(storeId: string, approve: boolean) {
  await prisma.$transaction(async (tx) => {
    const r = await tx.store.updateMany({ where: { userId: storeId }, data: { status: approve ? 'approved' : 'rejected' } });
    if (r.count === 0) throw notFound('Không tìm thấy cửa hàng');
    const u = await tx.user.findUniqueOrThrow({ where: { id: storeId }, select: { walletAddress: true } });
    await enqueueChain(tx, { op: 'approveMerchant', merchant: u.walletAddress, approved: approve }, `store-status:${storeId}`);
  });
  return { success: true };
}
