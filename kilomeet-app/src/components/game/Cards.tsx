// Thẻ nghiệp vụ: ô chỉ số, thẻ nhiệm vụ, voucher dạng vé, dòng menu, thẻ giới thiệu quán.
import * as React from 'react';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import { Check, ChevronRight, Flame, Route, Store, type LucideIcon } from 'lucide-react-native';
import type { Rank } from '../../api/types';
import { C, DEPTH, STROKE, TONE, type Tone } from '../../theme/game';
import { Coin, RankChip, XPBar } from './Badges';
import { Card, GText, IconTile, Pill, Row, type PillTone } from './primitives';

// ─── StatTile ───────────────────────────────────────────────────

export function StatTile({
  value,
  label,
  icon,
  tile = C.orange300,
  onPress,
  style,
}: {
  value: string;
  label: string;
  icon: LucideIcon;
  tile?: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Card onPress={onPress} pad={[12, 14]} gap={4} radius={18} style={[{ flex: 1 }, style]}>
      <IconTile icon={icon} size={32} iconSize={18} fill={tile} radius={10} />
      <GText v={value.length > 4 ? 'numM' : 'numL'} numberOfLines={1} adjustsFontSizeToFit style={value.length > 4 ? { fontSize: 24, lineHeight: 36 } : null}>
        {value}
      </GText>
      <GText v="bodyS" color={C.ink500} numberOfLines={1}>
        {label}
      </GText>
    </Card>
  );
}

// ─── QuestCard ──────────────────────────────────────────────────

export function QuestCard({
  done,
  tag,
  tagTone = 'orange',
  title,
  progress,
  reward,
  pct,
  icon = Flame,
  tone = 'orange',
}: {
  done?: boolean;
  tag: string;
  tagTone?: PillTone;
  title: string;
  progress: string;
  reward: string;
  pct: number;
  icon?: LucideIcon;
  tone?: Tone;
}) {
  return (
    <Card row fill={done ? C.green300 : C.surface} pad={14} gap={12}>
      <IconTile icon={done ? Check : icon} size={52} iconSize={28} fill={done ? C.green500 : TONE[tone][500]} radius={16} sw={STROKE} depth="small" />
      <View style={{ flex: 1, gap: 6 }}>
        <Pill tone={done ? 'green' : tagTone} label={tag} />
        <GText v="titleS">{title}</GText>
        <XPBar pct={done ? 1 : pct} tone={done ? 'green' : tone} height={16} />
        <GText v="bodyS" color={C.ink500}>
          {progress}
        </GText>
      </View>
      <View
        style={{
          alignItems: 'center',
          gap: 2,
          paddingVertical: 8,
          paddingHorizontal: 10,
          borderRadius: 14,
          backgroundColor: done ? C.surface : C.coin300,
          borderWidth: 2,
          borderColor: C.ink900,
        }}>
        <Coin size={28} />
        <GText v="numM">{reward}</GText>
      </View>
    </Card>
  );
}

// ─── VoucherTicket ──────────────────────────────────────────────

export type VoucherTicketProps = {
  discount: string;
  store: string;
  title: string;
  price: number | string;
  /** Giá sau nhiệm vụ — có thì gạch giá gốc */
  dealPrice?: number | string;
  rank?: Rank;
  leftLabel?: string;
  leftTone?: PillTone;
  stub?: string;
  stubIcon?: LucideIcon;
  questLabel?: string;
  onPress?: () => void;
  dim?: boolean;
  stamp?: string;
  style?: StyleProp<ViewStyle>;
};

export function VoucherTicket({
  discount,
  store,
  title,
  price,
  dealPrice,
  rank,
  leftLabel,
  leftTone = 'sky',
  stub,
  stubIcon: StubIcon = Store,
  questLabel,
  onPress,
  dim,
  stamp,
  style,
}: VoucherTicketProps) {
  const quest = dealPrice != null;
  const stubColor = stub ?? (quest ? C.grape500 : C.orange500);
  const stubText = stubColor === C.grape500 || stubColor === C.red500 ? C.white : C.ink900;
  const content = (
    <>
      <View style={{ width: 96, backgroundColor: stubColor, alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 14, paddingHorizontal: 6 }}>
        <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: C.surface, borderWidth: 2, borderColor: C.ink900, alignItems: 'center', justifyContent: 'center' }}>
          <StubIcon size={22} color={C.ink900} strokeWidth={2.5} />
        </View>
        <GText v="numL" color={stubText} align="center" numberOfLines={1} adjustsFontSizeToFit>
          {discount}
        </GText>
        <GText v="caps" color={stubText}>
          Giảm giá
        </GText>
      </View>
      <View style={{ width: STROKE, backgroundColor: C.ink900 }} />
      <View style={{ flex: 1, gap: 6, paddingVertical: 12, paddingHorizontal: 14 }}>
        <GText v="caps" color={C.ink500} numberOfLines={1}>
          {store}
        </GText>
        <GText v="titleS" numberOfLines={2}>
          {title}
        </GText>
        {rank || leftLabel ? (
          <Row gap={6} style={{ flexWrap: 'wrap' }}>
            {rank ? <RankChip rank={rank} small /> : null}
            {leftLabel ? <Pill tone={leftTone} label={leftLabel} /> : null}
          </Row>
        ) : null}
        <Row gap={6}>
          <Coin size={22} />
          {quest ? (
            <>
              <GText v="bodyMStrong" color={C.ink500} strike>
                {String(price)}
              </GText>
              <GText v="numM" color={C.grape700}>
                {String(dealPrice)}
              </GText>
            </>
          ) : (
            <GText v="numM">{String(price)}</GText>
          )}
        </Row>
        {questLabel ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingVertical: 3, paddingHorizontal: 8, borderRadius: 8, backgroundColor: C.grape300, borderWidth: 1.5, borderColor: C.ink900 }}>
            <Route size={14} color={C.ink900} strokeWidth={2.5} />
            <GText v="bodyS">{questLabel}</GText>
          </View>
        ) : null}
      </View>
      {stamp ? (
        <View style={{ position: 'absolute', right: 14, top: 26, transform: [{ rotate: '-8deg' }], paddingVertical: 6, paddingHorizontal: 14, borderRadius: 10, backgroundColor: C.red500, borderWidth: 3, borderColor: C.ink900 }}>
          <GText v="titleS" color={C.white}>
            {stamp}
          </GText>
        </View>
      ) : null}
    </>
  );
  const box: ViewStyle = {
    flexDirection: 'row',
    backgroundColor: C.surface,
    borderRadius: 20,
    borderWidth: STROKE,
    borderColor: C.ink900,
    overflow: 'hidden',
    opacity: dim ? 0.55 : 1,
  };
  if (!onPress) return <View style={[box, DEPTH.chunky, style]}>{content}</View>;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [box, pressed ? { boxShadow: `0px 1px 0px ${C.ink900}`, transform: [{ translateY: 3 }] } : DEPTH.chunky, style]}>
      {content}
    </Pressable>
  );
}

// ─── MenuRow ────────────────────────────────────────────────────

export function MenuRow({
  icon,
  tile = C.sky300,
  title,
  subtitle,
  right,
  onPress,
  last,
  titleColor = C.ink900,
}: {
  icon: LucideIcon;
  tile?: string;
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  onPress?: () => void;
  last?: boolean;
  titleColor?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 12,
        paddingHorizontal: 14,
        backgroundColor: pressed ? C.sunken : 'transparent',
        borderBottomWidth: last ? 0 : 1.5,
        borderBottomColor: C.ink300,
      })}>
      <IconTile icon={icon} size={40} iconSize={20} fill={tile} radius={12} />
      <View style={{ flex: 1 }}>
        <GText v="bodyL" color={titleColor}>
          {title}
        </GText>
        {subtitle ? (
          <GText v="bodyS" color={C.ink500}>
            {subtitle}
          </GText>
        ) : null}
      </View>
      {right ?? (onPress ? <ChevronRight size={20} color={C.ink500} strokeWidth={2.5} /> : null)}
    </Pressable>
  );
}

// ─── StoreIntroCard ─────────────────────────────────────────────

export function StoreIntroCard({
  name,
  meta,
  intro,
  tags,
  open = true,
  onPress,
}: {
  name: string;
  meta: string;
  intro: string;
  tags: string[];
  open?: boolean;
  onPress?: () => void;
}) {
  return (
    <Card onPress={onPress} gap={10}>
      <Row gap={12}>
        <IconTile icon={Store} size={52} iconSize={28} fill={C.orange500} radius={16} sw={STROKE} depth="small" />
        <View style={{ flex: 1, gap: 2 }}>
          <GText v="titleS" numberOfLines={1}>
            {name}
          </GText>
          <Row gap={6}>
            <Pill tone={open ? 'green' : 'red'} label={open ? 'Đang mở' : 'Đã đóng'} />
            <GText v="bodyS" color={C.ink500} numberOfLines={1} style={{ flexShrink: 1 }}>
              {meta}
            </GText>
          </Row>
        </View>
        <ChevronRight size={20} color={C.ink500} strokeWidth={2.5} />
      </Row>
      <GText v="bodyM" color={C.ink700} numberOfLines={3}>
        {intro}
      </GText>
      {tags.length > 0 ? (
        <Row gap={6} style={{ flexWrap: 'wrap' }}>
          {tags.map((t) => (
            <View key={t} style={{ paddingVertical: 3, paddingHorizontal: 9, borderRadius: 999, backgroundColor: C.sunken, borderWidth: 1.5, borderColor: C.ink900 }}>
              <GText v="bodyS">{t}</GText>
            </View>
          ))}
        </Row>
      ) : null}
      {onPress ? (
        <Row gap={4}>
          <GText v="bodyMStrong" color={C.orange700}>
            Xem trang giới thiệu quán
          </GText>
          <ChevronRight size={16} color={C.orange700} strokeWidth={2.5} />
        </Row>
      ) : null}
    </Card>
  );
}
