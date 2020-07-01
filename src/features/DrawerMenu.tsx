import { DrawerContentComponentProps } from '@react-navigation/drawer';
import { DrawerActions } from '@react-navigation/native';
import * as Updates from 'expo-updates';
import React, { useState, useEffect } from 'react';
import { Alert, Image, Linking, StyleSheet, TouchableOpacity, View, SafeAreaView } from 'react-native';

import { closeIcon } from '@assets';
import i18n from '@covid/locale/i18n';
import { isGBCountry, isSECountry, IUserService } from '@covid/core/user/UserService';
import Analytics, { events } from '@covid/core/Analytics';
import { CaptionText, HeaderText } from '@covid/components/Text';
import { useInjection } from '@covid/provider/services.hooks';
import { Services } from '@covid/provider/services.types';

type MenuItemProps = {
  testID?: string;
  label: string;
  onPress: () => void;
};

const manifest = Updates.manifest as Updates.Manifest;

const isDevChannel = () => {
  try {
    return manifest.releaseChannel === '0-dev';
  } catch (_) {
    return false;
  }
};

const MenuItem = (props: MenuItemProps) => {
  return (
    <TouchableOpacity style={styles.iconNameRow} {...props}>
      <HeaderText>{props.label}</HeaderText>
    </TouchableOpacity>
  );
};

export function DrawerMenu(props: DrawerContentComponentProps) {
  const userService = useInjection<IUserService>(Services.User);
  const [userEmail, setUserEmail] = useState<string>('');

  const fetchEmail = async () => {
    try {
      const profile = await userService.getProfile();
      setUserEmail(profile?.username ?? '');
    } catch (_) {
      setUserEmail('');
    }
  };

  useEffect(() => {
    if (userEmail !== '') return;
    fetchEmail();
  }, [userService.hasUser]);

  function showDeleteAlert() {
    Alert.alert(
      i18n.t('delete-data-alert-title'),
      i18n.t('delete-data-alert-text'),
      [
        {
          text: i18n.t('cancel'),
          style: 'cancel',
        },
        {
          text: i18n.t('delete'),
          style: 'destructive',
          onPress: async () => {
            Analytics.track(events.DELETE_ACCOUNT_DATA);
            await userService.deleteRemoteUserData();
            logout();
          },
        },
      ],
      { cancelable: false }
    );
  }

  function logout() {
    setUserEmail(''); // Reset email
    userService.logout();
    props.navigation.reset({
      index: 0,
      routes: [{ name: 'Welcome' }],
    });
    props.navigation.dispatch(DrawerActions.closeDrawer());
  }

  function goToPrivacy() {
    isGBCountry()
      ? props.navigation.navigate('PrivacyPolicyUK', { viewOnly: true })
      : isSECountry()
      ? props.navigation.navigate('PrivacyPolicySV', { viewOnly: true })
      : props.navigation.navigate('PrivacyPolicyUS', { viewOnly: true });
  }

  function version(): string {
    const version = '0.?';
    try {
      const value = manifest.revisionId ? manifest.revisionId : manifest.version;
      return value ? value.toString() : version;
    } catch (e) {
      return version;
    }
  }

  return (
    <SafeAreaView style={styles.drawerRoot}>
      <View style={styles.container}>
        <View style={styles.topBar}>
          <CaptionText>
            {version()}
            {isDevChannel() && ` (DEV)`}
          </CaptionText>
          <TouchableOpacity onPress={() => props.navigation.goBack()}>
            <Image style={styles.closeIcon} source={closeIcon} />
          </TouchableOpacity>
        </View>
        <MenuItem
          label={i18n.t('research-updates')}
          onPress={() => {
            Linking.openURL(i18n.t('blog-link'));
          }}
        />
        <MenuItem
          label={i18n.t('faqs')}
          onPress={() => {
            Linking.openURL(i18n.t('faq-link'));
          }}
        />
        <MenuItem label={i18n.t('privacy-policy')} onPress={() => goToPrivacy()} />
        <MenuItem label={i18n.t('delete-my-data')} onPress={() => showDeleteAlert()} />
        <View style={{ flex: 1 }} />
        <MenuItem testID="logout-nav-item" label={i18n.t('logout')} onPress={() => logout()} />
        <CaptionText style={styles.versionText}>{userEmail}</CaptionText>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  drawerRoot: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: 24,
  },
  closeIcon: {
    height: 20,
    width: 20,
    alignSelf: 'flex-end',
  },
  iconNameRow: {
    marginStart: 8,
    marginTop: 32,
    flexDirection: 'row',
  },
  drawerIcon: {
    height: 24,
    width: 24,
    marginEnd: 16,
  },
  topBar: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingLeft: 8,
  },
  versionText: {
    marginTop: 8,
    paddingLeft: 8,
  },
});
