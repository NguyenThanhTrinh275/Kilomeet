import { useState, useEffect, useCallback } from 'react';
import { View, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { toast } from 'sonner-native';
import { colors } from '../../src/theme/colors';
import { api } from '../../src/api/client';
import type { PendingStore } from '../../src/api/types';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

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
  const [dialog, setDialog] = useState<{ store: StoreItem; action: 'approve' | 'reject' } | null>(null);

  const fetchStores = useCallback(async () => {
    try {
      const data = await api.get<StoreItem[]>('/admin/stores');
      setStores(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchStores(); }, [fetchStores]);

  const filtered = stores.filter((s) => s.status === tab);

  async function confirmAction() {
    if (!dialog) return;
    setActionLoading(true);
    try {
      await api.post(`/admin/stores/${dialog.store.id}`, {
        action: dialog.action,
      });
      toast.success(
        dialog.action === 'approve'
          ? `Đã duyệt ${dialog.store.storeName}`
          : `Đã từ chối ${dialog.store.storeName}`,
      );
      setDialog(null);
      setLoading(true);
      await fetchStores();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Thao tác thất bại');
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
        <Text className="text-foreground text-xl font-bold flex-1">Duyệt cửa hàng</Text>
      </View>

      {/* Tabs */}
      <View className="px-4 mb-4">
        <Tabs value={tab} onValueChange={(v) => setTab(v as StoreTab)}>
          <TabsList className="w-full">
            {TABS.map((t) => {
              const count = stores.filter((s) => s.status === t.key).length;
              return (
                <TabsTrigger key={t.key} value={t.key}>
                  <Text>
                    {t.label} ({count})
                  </Text>
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>
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
          <Card key={store.id} className="mb-3 gap-3">
            <View className="flex-row items-start">
              <View className="w-10 h-10 rounded-full bg-km-surface items-center justify-center mr-3">
                <Ionicons name="storefront" size={20} color={colors.primary} />
              </View>
              <View className="flex-1">
                <Text className="text-foreground text-base font-semibold">{store.storeName}</Text>
                <Text className="text-muted-foreground text-xs mt-0.5">{store.storeAddress}</Text>
              </View>
            </View>

            <View className="ml-13 gap-1">
              <View className="flex-row items-center">
                <Ionicons name="mail-outline" size={14} color={colors.textMuted} />
                <Text className="text-muted-foreground text-xs ml-2">{store.email}</Text>
              </View>
              <View className="flex-row items-center">
                <Ionicons name="time-outline" size={14} color={colors.textMuted} />
                <Text className="text-muted-foreground text-xs ml-2">
                  Đăng ký: {new Date(store.appliedAt).toLocaleDateString('vi-VN')}
                </Text>
              </View>
            </View>

            {store.status === 'pending' && (
              <View className="flex-row gap-3">
                <Button
                  className="flex-1"
                  size="sm"
                  onPress={() => setDialog({ store, action: 'approve' })}>
                  <Ionicons name="checkmark-circle" size={16} color={colors.textInverse} />
                  <Text>Duyệt</Text>
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="flex-1"
                  onPress={() => setDialog({ store, action: 'reject' })}>
                  <Ionicons name="close-circle" size={16} color={colors.white} />
                  <Text>Từ chối</Text>
                </Button>
              </View>
            )}

            {store.status === 'approved' && (
              <View className="flex-row">
                <Badge variant="default">
                  <Ionicons name="checkmark-circle" size={14} color={colors.primary} />
                  <Text>Đã duyệt</Text>
                </Badge>
              </View>
            )}
            {store.status === 'rejected' && (
              <View className="flex-row">
                <Badge variant="destructive">
                  <Ionicons name="close-circle" size={14} color={colors.error} />
                  <Text>Đã từ chối</Text>
                </Badge>
              </View>
            )}
          </Card>
        ))}
      </ScrollView>

      {/* Confirmation AlertDialog */}
      <AlertDialog open={!!dialog} onOpenChange={(open) => { if (!open) setDialog(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <View className="items-center mb-1">
              <Ionicons
                name={dialog?.action === 'approve' ? 'checkmark-circle' : 'close-circle'}
                size={44}
                color={dialog?.action === 'approve' ? colors.primary : colors.error}
              />
            </View>
            <AlertDialogTitle className="text-center">
              {dialog?.action === 'approve' ? 'Duyệt cửa hàng?' : 'Từ chối cửa hàng?'}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              {dialog?.store.storeName} —{' '}
              {dialog?.action === 'approve'
                ? 'Cửa hàng sẽ có thể tạo voucher trên hệ thống.'
                : 'Cửa hàng sẽ bị từ chối đăng ký.'}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel className="flex-1" disabled={actionLoading}>
              <Text>Huỷ</Text>
            </AlertDialogCancel>
            <AlertDialogAction
              variant={dialog?.action === 'approve' ? 'default' : 'destructive'}
              className="flex-1"
              disabled={actionLoading}
              onPress={() => void confirmAction()}>
              {actionLoading ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Text>{dialog?.action === 'approve' ? 'Duyệt' : 'Từ chối'}</Text>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SafeAreaView>
  );
}
