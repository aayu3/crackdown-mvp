// app/(tabs)/settings.tsx

import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Dimensions,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { notificationService } from '../services/notificationService';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function SettingsScreen() {
  const { logout, userProfile } = useAuth();
  const [permissionStatus, setPermissionStatus] = useState<string>('unknown');
  const [testing, setTesting] = useState(false);

  // Check permission status when component loads
  useEffect(() => {
    checkCurrentPermissions();
  }, []);

  const checkCurrentPermissions = async () => {
    const status = await notificationService.checkPermissions();
    setPermissionStatus(status);
  };

  const handleRequestPermissions = async () => {
    try {
      setTesting(true);
      const granted = await notificationService.requestPermissions();
      
      if (granted) {
        setPermissionStatus('granted');
        Alert.alert('Success!', 'Notification permissions granted');
      } else {
        Alert.alert('Permission Denied', 'Please enable notifications in device settings');
      }
      
      await checkCurrentPermissions();
    } catch (error) {
      Alert.alert('Error', 'Failed to request permissions');
    } finally {
      setTesting(false);
    }
  };

  const handleImmediateNotification = async () => {
    try {
      setTesting(true);
      await notificationService.triggerImmediateNotification();
      Alert.alert('Triggered!', 'Immediate notification sent');
    } catch (error) {
      Alert.alert('Error', 'Failed to trigger notification');
      console.error(error);
    } finally {
      setTesting(false);
    }
  };

  const handleDelayedNotification = async (seconds: number) => {
    try {
      setTesting(true);
      await notificationService.scheduleDelayedNotification(seconds);
      Alert.alert('Scheduled!', `Notification will appear in ${seconds} seconds`);
    } catch (error) {
      Alert.alert('Error', 'Failed to schedule notification');
      console.error(error);
    } finally {
      setTesting(false);
    }
  };

  const handleCancelAll = async () => {
    try {
      await notificationService.cancelAll();
      Alert.alert('Cancelled', 'All notifications cancelled');
    } catch (error) {
      Alert.alert('Error', 'Failed to cancel notifications');
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
            } catch (error) {
              Alert.alert('Error', 'Failed to logout');
            }
          }
        }
      ]
    );
  };

  const getPermissionStatusColor = () => {
    switch (permissionStatus) {
      case 'granted': return '#28a745';
      case 'denied': return '#dc3545';
      default: return '#ffc107';
    }
  };

  const getPermissionStatusText = () => {
    switch (permissionStatus) {
      case 'granted': return 'Granted ✅';
      case 'denied': return 'Denied ❌';
      default: return 'Unknown ❓';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
      </View>

      <ScrollView style={styles.scrollView}>
        {/* User Profile Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profile</Text>
          <View style={styles.profileCard}>
            <Text style={styles.profileName}>
              {userProfile?.firstname} {userProfile?.lastname}
            </Text>
            <Text style={styles.profileUsername}>@{userProfile?.username}</Text>
            <Text style={styles.profileEmail}>{userProfile?.email}</Text>
            <Text style={styles.profileStats}>
              {userProfile?.days_active} days active • {userProfile?.streak} day streak
            </Text>
          </View>
        </View>

        {/* Notification Testing Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🧪 Notification Testing</Text>
          
          {/* Permission Status */}
          <View style={styles.statusCard}>
            <Text style={styles.statusLabel}>Permission Status:</Text>
            <Text style={[styles.statusValue, { color: getPermissionStatusColor() }]}>
              {getPermissionStatusText()}
            </Text>
          </View>

          {/* Test Buttons */}
          <View style={styles.buttonGroup}>
            <TouchableOpacity
              style={[styles.testButton, styles.primaryButton]}
              onPress={handleRequestPermissions}
              disabled={testing}
            >
              <Ionicons name="notifications-outline" size={20} color="white" />
              <Text style={styles.primaryButtonText}>
                {testing ? 'Requesting...' : 'Request Permissions'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.testButton, styles.successButton]}
              onPress={handleImmediateNotification}
              disabled={testing || permissionStatus !== 'granted'}
            >
              <Ionicons name="flash-outline" size={20} color="white" />
              <Text style={styles.successButtonText}>
                {testing ? 'Sending...' : 'Immediate Notification'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.testButton, styles.warningButton]}
              onPress={() => handleDelayedNotification(5)}
              disabled={testing || permissionStatus !== 'granted'}
            >
              <Ionicons name="timer-outline" size={20} color="white" />
              <Text style={styles.warningButtonText}>
                {testing ? 'Scheduling...' : '5 Second Delay'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.testButton, styles.warningButton]}
              onPress={() => handleDelayedNotification(10)}
              disabled={testing || permissionStatus !== 'granted'}
            >
              <Ionicons name="timer-outline" size={20} color="white" />
              <Text style={styles.warningButtonText}>
                {testing ? 'Scheduling...' : '10 Second Delay'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.testButton, styles.dangerButton]}
              onPress={handleCancelAll}
              disabled={testing}
            >
              <Ionicons name="trash-outline" size={20} color="white" />
              <Text style={styles.dangerButtonText}>
                Cancel All
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.helpText}>
            💡 After scheduling delayed notifications, put the app in background to see them appear
          </Text>
        </View>

        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <TouchableOpacity
            style={[styles.testButton, styles.dangerButton]}
            onPress={handleLogout}
          >
            <Ionicons name="log-out-outline" size={20} color="white" />
            <Text style={styles.dangerButtonText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    paddingHorizontal: screenWidth * 0.05,
    paddingVertical: screenHeight * 0.02,
    paddingTop: screenHeight * 0.025,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: screenWidth * 0.06,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    margin: screenWidth * 0.05,
    marginBottom: screenHeight * 0.02,
  },
  sectionTitle: {
    fontSize: screenWidth * 0.045,
    fontWeight: '600',
    color: '#333',
    marginBottom: screenHeight * 0.015,
  },
  profileCard: {
    backgroundColor: 'white',
    padding: screenHeight * 0.025,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  profileName: {
    fontSize: screenWidth * 0.05,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  profileUsername: {
    fontSize: screenWidth * 0.04,
    color: '#007AFF',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: screenWidth * 0.035,
    color: '#666',
    marginBottom: 8,
  },
  profileStats: {
    fontSize: screenWidth * 0.03,
    color: '#999',
  },
  statusCard: {
    backgroundColor: 'white',
    padding: screenHeight * 0.02,
    borderRadius: 8,
    marginBottom: screenHeight * 0.015,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: screenWidth * 0.04,
    color: '#333',
    fontWeight: '500',
  },
  statusValue: {
    fontSize: screenWidth * 0.04,
    fontWeight: 'bold',
  },
  buttonGroup: {
    gap: screenHeight * 0.015,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: screenHeight * 0.02,
    borderRadius: 8,
    gap: screenWidth * 0.03,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
  },
  primaryButtonText: {
    color: 'white',
    fontSize: screenWidth * 0.04,
    fontWeight: '600',
  },
  successButton: {
    backgroundColor: '#28a745',
  },
  successButtonText: {
    color: 'white',
    fontSize: screenWidth * 0.04,
    fontWeight: '600',
  },
  warningButton: {
    backgroundColor: '#ffc107',
  },
  warningButtonText: {
    color: 'white',
    fontSize: screenWidth * 0.04,
    fontWeight: '600',
  },
  dangerButton: {
    backgroundColor: '#dc3545',
  },
  dangerButtonText: {
    color: 'white',
    fontSize: screenWidth * 0.04,
    fontWeight: '600',
  },
  helpText: {
    fontSize: screenWidth * 0.03,
    color: '#666',
    textAlign: 'center',
    marginTop: screenHeight * 0.015,
    fontStyle: 'italic',
  },
});