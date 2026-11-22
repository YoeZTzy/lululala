import { Pressable, StyleSheet, Text, View } from 'react-native';
import { House, Map, Megaphone, User } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, t } from '../theme';

const TAB = {
  BerandaTab: { label: 'Beranda', Ikon: House },
  PetaTab: { label: 'Peta', Ikon: Map },
  LaporTab: { label: 'Lapor', Ikon: Megaphone },
  ProfilTab: { label: 'Profil', Ikon: User },
};

// Tab Bar kustom sesuai Figma: tinggi 80, radius atas 24, tombol Lapor bulat amber 44.
export default function TabBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();
  const fokus = descriptors[state.routes[state.index].key];
  if (fokus.options.tabBarStyle?.display === 'none') return null;

  return (
    <View style={[styles.bar, { height: 80 + insets.bottom, paddingBottom: 10 + insets.bottom }]}>
      {state.routes.map((route, i) => {
        const aktif = state.index === i;
        const { label, Ikon } = TAB[route.name];
        const lapor = route.name === 'LaporTab';
        const tekan = () => {
          const ev = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!aktif && !ev.defaultPrevented) navigation.navigate(route.name);
        };
        return (
          <Pressable
            key={route.key}
            onPress={tekan}
            style={styles.tab}
            accessibilityRole="tab"
            accessibilityState={{ selected: aktif }}
            accessibilityLabel={label}
          >
            {lapor ? (
              <View style={[styles.lapor, aktif && styles.laporAktif]}>
                <Megaphone size={20} color={colors.teks.terbalik} strokeWidth={2} />
              </View>
            ) : (
              <View style={[styles.indikator, aktif && styles.indikatorAktif]}>
                <Ikon size={22} color={aktif ? colors.brand.biru : colors.teks.samar} strokeWidth={2} />
              </View>
            )}
            <Text
              style={
                aktif
                  ? t('extrabold', 11, lapor ? colors.brand.amber800 : colors.brand.biru)
                  : t('semibold', 11, colors.teks.samar)
              }
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    backgroundColor: colors.permukaan.kartu,
    borderTopLeftRadius: radius.tabBar,
    borderTopRightRadius: radius.tabBar,
    // drop-shadow 0 -4 10 rgba(13,41,77,0.08)
    shadowColor: '#0D294D',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 8,
  },
  tab: { flex: 1, alignItems: 'center', gap: 4 },
  indikator: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: radius.indikatorTab },
  indikatorAktif: { backgroundColor: colors.brand.langit50 },
  lapor: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.brand.amber,
    alignItems: 'center',
    justifyContent: 'center',
    // shadow 0 4 10 -2 rgba(240,158,38,0.35)
    shadowColor: '#F09E26',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  laporAktif: { borderWidth: 4, borderColor: colors.brand.amber50 },
});
