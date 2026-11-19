// Toaster dùng chung: gắn ở gốc app VÀ trong mỗi Modal (sheet / hộp thoại).
// Android vẽ Modal ở cửa sổ riêng nằm trên cửa sổ gốc → toast của Toaster gốc bị che khi đang mở sheet
// (vd. lỗi "Không thể tự tặng voucher cho mình", lỗi nạp ví phí). Toaster trong Modal hiện cùng hàng đợi toast.
import { Toaster } from 'sonner-native';
import { C, FONT } from '../../theme/game';

export function GameToaster() {
  return (
    <Toaster
      position="top-center"
      theme="light"
      richColors
      toastOptions={{
        style: { borderWidth: 2.5, borderColor: C.ink900, borderRadius: 18, boxShadow: `0px 4px 0px ${C.ink900}` },
        titleStyle: { fontFamily: FONT.displayBold, fontSize: 16, color: C.ink900 },
        descriptionStyle: { fontFamily: FONT.body, fontSize: 13, color: C.ink700 },
      }}
    />
  );
}
