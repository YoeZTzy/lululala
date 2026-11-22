import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer, DefaultTheme, getFocusedRouteNameFromRoute } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../context/AuthContext';
import { TabBar } from '../components';
import { colors } from '../theme';
import LoginScreen from '../screens/LoginScreen';
import DaftarScreen from '../screens/DaftarScreen';
import BerandaScreen from '../screens/BerandaScreen';
import TambahRuteScreen from '../screens/TambahRuteScreen';
import PilihLokasiScreen from '../screens/PilihLokasiScreen';
import DetailRuteScreen from '../screens/DetailRuteScreen';
import PetaScreen from '../screens/PetaScreen';
import DetailTitikRawanScreen from '../screens/DetailTitikRawanScreen';
import LaporScreen from '../screens/LaporScreen';
import ProfilScreen from '../screens/ProfilScreen';
import LaporanTerkirimModal from '../screens/LaporanTerkirimModal';

const Root = createNativeStackNavigator();
const Auth = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const BerandaNav = createNativeStackNavigator();
const PetaNav = createNativeStackNavigator();

const tanpaHeader = { headerShown: false, contentStyle: { backgroundColor: colors.permukaan.latar } };

// Layar detail di dalam tab: tab bar disembunyikan.
const LAYAR_TANPA_TAB = ['TambahRute', 'PilihLokasi', 'DetailRute', 'DetailTitikRawan'];

function opsiTab(route) {
  const nama = getFocusedRouteNameFromRoute(route);
  return { tabBarStyle: LAYAR_TANPA_TAB.includes(nama) ? { display: 'none' } : undefined };
}

function BerandaStack() {
  return (
    <BerandaNav.Navigator screenOptions={tanpaHeader}>
      <BerandaNav.Screen name="Beranda" component={BerandaScreen} />
      <BerandaNav.Screen name="TambahRute" component={TambahRuteScreen} />
      <BerandaNav.Screen name="PilihLokasi" component={PilihLokasiScreen} />
      <BerandaNav.Screen name="DetailRute" component={DetailRuteScreen} />
      <BerandaNav.Screen name="DetailTitikRawan" component={DetailTitikRawanScreen} />
    </BerandaNav.Navigator>
  );
}

function PetaStack() {
  return (
    <PetaNav.Navigator screenOptions={tanpaHeader}>
      <PetaNav.Screen name="Peta" component={PetaScreen} />
      <PetaNav.Screen name="DetailTitikRawan" component={DetailTitikRawanScreen} />
    </PetaNav.Navigator>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tab.Screen name="BerandaTab" component={BerandaStack} options={({ route }) => opsiTab(route)} />
      <Tab.Screen name="PetaTab" component={PetaStack} options={({ route }) => opsiTab(route)} />
      <Tab.Screen name="LaporTab" component={LaporScreen} />
      <Tab.Screen name="ProfilTab" component={ProfilScreen} />
    </Tab.Navigator>
  );
}

function AuthStack() {
  return (
    <Auth.Navigator screenOptions={tanpaHeader}>
      <Auth.Screen name="Login" component={LoginScreen} />
      <Auth.Screen name="Daftar" component={DaftarScreen} />
    </Auth.Navigator>
  );
}

const tema = { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: colors.permukaan.latar } };

export default function AppNavigator() {
  const { isAuthenticated, initializing } = useAuth();

  if (initializing) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.permukaan.latar }}>
        <ActivityIndicator size="large" color={colors.brand.biru} />
      </View>
    );
  }

  return (
    <NavigationContainer theme={tema}>
      <Root.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <>
            <Root.Screen name="Main" component={MainTabs} />
            <Root.Screen
              name="LaporanTerkirim"
              component={LaporanTerkirimModal}
              options={{ presentation: 'transparentModal', animation: 'fade' }}
            />
          </>
        ) : (
          <Root.Screen name="Auth" component={AuthStack} />
        )}
      </Root.Navigator>
    </NavigationContainer>
  );
}
