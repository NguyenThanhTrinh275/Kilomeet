import { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors } from '../../src/theme/colors';
import { api } from '../../src/api/client';
import type { PendingStore } from '../../src/api/types';

type StoreTab = 'pending' | 'approved' | 'rejected';

type StoreItem = PendingStore & { status: StoreTab };

const TABS: { key: StoreTab; label: string }[] = [
  { key: 'pending', label: 'Chờ duyệt' },
  { key: 'approved', label: 'Đã duyệt' },
  { key: 'rejected', label: 'Từ chối' },
];

export default function StoresScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<StoreTab>('pending');
  const [stores, setStores] = useState<StoreItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [modal, setModal] = useState<{ store: StoreItem; action: 'approve' | 'reject' } | null>(null);

  const fetchStores = useCallback(async () => {
    try {
      const pending = await api.get<PendingStore[]>('/admin/pending-stores');
      setStores(pending.map((s) => ({ ...s, status: 'pending' as const })));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchStores(); }, [fetchStores]);

  const filtered = stores.filter((s) => s.status === tab);

  async function confirmAction() {
    if (!modal) return;
    setActionLoading(true);
    try {
      await api.post('/admin/approve-store', {
        storeId: modal.store.id,
        approved: modal.action === 'approve',
      });
      setModal(null);
      // Refetch to get updated list
      setLoading(true);
      await fetchStores();
    } finally {
      setActionLoading(false);
    }
  }

  if (loading && stores.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-km-bg items-center justify-center" edges={['top']}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-km-bg" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center px-4 pt-4 pb-2">
        <TouchableOpacity onPress={() => router.back()} className="mr-3">
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text className="text-white text-xl font-bold flex-1">Duyệt cửa hàng</Text>
      </View>

      {/* Tabs */}
      <View className="flex-row px-4 mb-4 gap-2">
        {TABS.map((t) => {
          const count = stores.filter((s) => s.status === t.key).length;
          const active = tab === t.key;
          return (
            <TouchableOpacity
              key={t.key}
              className={`flex-1 py-2.5 rounded-xl items-center ${active ? 'bg-km-primary' : 'bg-km-bg-secondary'}`}
              onPress={() => setTab(t.key)}
              activeOpacity={0.7}
            >
              <Text className={`text-sm font-semibold ${active ? 'text-white' : 'text-slate-400'}`}>
                {t.label} ({count})
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Store List */}
      <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingBottom: 32 }}>
        {filtered.length === 0 && (
          <View className="items-center py-16">
            <Ionicons name="storefront-outline" size={48} color={colors.textMuted} />
            <Text className="text-slate-500 text-base mt-3">Không có cửa hàng nào</Text>
          </View>
        )}

        {filtered.map((store) => (
          <View key={store.id} className="bg-km-bg-secondary rounded-2xl p-4 mb-3">
            <View className="flex-row items-start mb-2">
              <View className="w-10 h-10 rounded-full bg-km-surface items-center justify-center mr-3">
                <Ionicons name="storefront" size={20} color={colors.primary} />
              </View>
              <View className="flex-1">
                <Text className="text-white text-base font-semibold">{store.storeName}</Text>
                <Text className="text-slate-400 text-xs mt-0.5">{store.storeAddress}</Text>
              </View>
            </View>

            <View className="ml-13 mb-3">
              <View className="flex-row items-center mb-1">
                <Ionicons name="mail-outline" size={14} color={colors.textMuted} />
                <Text className="text-slate-400 text-xs ml-2">{store.email}</Text>
              </View>
              <View className="flex-row items-center">
                <Ionicons name="time-outline" size={14} color={colors.textMuted} />
                <Text className="text-slate-400 text-xs ml-2">
                  Đăng ký: {new Date(store.appliedAt).toLocaleDateString('vi-VN')}
                </Text>
              </View>
            </View>

            {/* Action buttons — only for pending */}
            {store.status === 'pending' && (
              <View className="flex-row gap-3 mt-1">
                <TouchableOpacity
                  className="flex-1 bg-km-primary/20 rounded-xl py-2.5 items-center flex-row justify-center"
                  activeOpacity={0.7}
                  onPress={() => setModal({ store, action: 'approve' })}
                >
                  <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
                  <Text className="text-km-primary text-sm font-semibold ml-1.5">Duyệt</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="flex-1 bg-red-500/20 rounded-xl py-2.5 items-center flex-row justify-center"
                  activeOpacity={0.7}
                  onPress={() => setModal({ store, action: 'reject' })}
                >
                  <Ionicons name="close-circle" size={18} color={colors.error} />
                  <Text className="text-red-400 text-sm font-semibold ml-1.5">Từ chối</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Status badge for non-pending */}
            {store.status === 'approved' && (
              <View className="flex-row items-center mt-1">
                <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
                <Text className="text-km-primary text-xs font-semibold ml-1">Đã duyệt</Text>
              </View>
            )}
            {store.status === 'rejected' && (
              <View className="flex-row items-center mt-1">
                <Ionicons name="close-circle" size={16} color={colors.error} />
                <Text className="text-red-400 text-xs font-semibold ml-1">Đã từ chối</Text>
              </View>
            )}
          </View>
        ))}
      </ScrollView>

      {/* Confirmation Modal */}
      <Modal visible={!!modal} transparent animationType="fade">
        <View className="flex-1 bg-black/60 items-center justify-center px-6">
          <View className="bg-km-bg-secondary rounded-2xl p-6 w-full max-w-sm">
            <View className="items-center mb-4">
              <Ionicons
                name={modal?.action === 'approve' ? 'checkmark-circle' : 'close-circle'}
                size={48}
                color={modal?.action === 'approve' ? colors.primary : colors.error}
              />
            </View>
            <Text className="text-white text-lg font-bold text-center mb-2">
              {modal?.action === 'approve' ? 'Duyệt cửa hàng?' : 'Từ chối cửa hàng?'}
            </Text>
            <Text className="text-slate-400 text-sm text-center mb-1">
              {modal?.store.storeName}
            </Text>
            <Text className="text-slate-500 text-xs text-center mb-6">
              {modal?.action === 'approve'
                ? 'Cửa hàng sẽ có thể tạo voucher trên hệ thống.'
                : 'Cửa hàng sẽ bị từ chối đăng ký.'}
            </Text>

            <View className="flex-row gap-3">
              <TouchableOpacity
                className="flex-1 bg-km-surface rounded-xl py-3 items-center"
                onPress={() => setModal(null)}
                activeOpacity={0.7}
              >
                <Text className="text-white text-sm font-semibold">Huỷ</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className={`flex-1 rounded-xl py-3 items-center ${modal?.action === 'approve' ? 'bg-km-primary' : 'bg-red-500'}`}
                onPress={() => void confirmAction()}
                activeOpacity={0.7}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <Text className="text-white text-sm font-bold">
                    {modal?.action === 'approve' ? 'Duyệt' : 'Từ chối'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
