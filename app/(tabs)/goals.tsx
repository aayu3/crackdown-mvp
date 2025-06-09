// app/(tabs)/goals.tsx

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
//import { NotificationTester } from '../components/NotificationTester';
import { useGoals } from '../hooks/goalsHook';
import { Goal } from '../types/goals';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const GoalItem: React.FC<{
  goal: Goal;
  onToggleTask: (goalId: string) => void;
  onUpdateCount: (goalId: string, newCount: number) => void;
}> = ({ goal, onToggleTask, onUpdateCount }) => {
  const handleIncrement = () => {
    onUpdateCount(goal.id, goal.day_count + 1);
  };

  const handleDecrement = () => {
    if (goal.day_count > 0) {
      onUpdateCount(goal.id, goal.day_count - 1);
    }
  };

  const renderRightControls = () => {
    if (goal.goal_type === 'task') {
      return (
        <TouchableOpacity
          onPress={() => onToggleTask(goal.id)}
          style={styles.checkboxContainer}
        >
          <Ionicons
            name={goal.completed ? 'checkmark-circle' : 'checkmark-circle-outline'}
            size={24}
            color={goal.completed ? '#28a745' : '#ccc'}
          />
        </TouchableOpacity>
      );
    } else {
      // Incremental goal controls
      return (
        <View style={styles.incrementalControls}>
          <TouchableOpacity
            onPress={handleDecrement}
            style={styles.incrementalButton}
            disabled={goal.day_count <= 0}
          >
            <Ionicons
              name="remove-circle-outline"
              size={24}
              color={goal.day_count <= 0 ? '#ccc' : '#007AFF'}
            />
          </TouchableOpacity>
          
          <Text style={styles.countText}>
            {goal.day_count}{goal.target_count ? `/${goal.target_count}` : ''}
          </Text>
          
          <TouchableOpacity
            onPress={handleIncrement}
            style={styles.incrementalButton}
          >
            <Ionicons
              name="add-circle-outline"
              size={24}
              color="#007AFF"
            />
          </TouchableOpacity>
        </View>
      );
    }
  };

  return (
    <View style={[
      styles.goalItem,
      goal.completed && styles.completedGoalItem
    ]}>
      <View style={styles.goalInfo}>
        {goal.icon && <Text style={styles.goalIcon}>{goal.icon}</Text>}
        <Text style={[
          styles.goalName,
          goal.completed && styles.completedGoalName
        ]}>
          {goal.goal_name}
        </Text>
      </View>
      
      {renderRightControls()}
    </View>
  );
};

export default function GoalsScreen() {
  const router = useRouter();
  const [showTester, setShowTester] = useState(false);
  const {
    activeGoals,
    completedGoals,
    loading,
    error,
    toggleTaskCompletion,
    updateIncrementalCount,
    refreshGoals,
  } = useGoals();

  const handleToggleTask = async (goalId: string) => {
    try {
      await toggleTaskCompletion(goalId);
    } catch (err) {
      Alert.alert('Error', 'Failed to update task');
    }
  };

  const handleUpdateCount = async (goalId: string, newCount: number) => {
    try {
      await updateIncrementalCount(goalId, newCount);
    } catch (err) {
      Alert.alert('Error', 'Failed to update count');
    }
  };

  const navigateToEdit = () => {
    router.replace('/(goals)/edit');
  };

  if (loading && activeGoals.length === 0 && completedGoals.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading goals...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with edit button */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setShowTester(!showTester)} style={styles.testButton}>
          <Ionicons name={showTester ? "flask" : "flask-outline"} size={20} color="#ff9500" />
        </TouchableOpacity>
        <Text style={styles.title}>My Goals</Text>
        <TouchableOpacity onPress={navigateToEdit} style={styles.editButton}>
          <Ionicons name="create-outline" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refreshGoals} />
        }
      >
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Notification Tester (only show in development) */}
        {/*{showTester && <NotificationTester />}*/}

        {/* Active Goals Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Active Goals</Text>
          {activeGoals.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="flag-outline" size={48} color="#ccc" />
              <Text style={styles.emptyText}>No active goals</Text>
              <Text style={styles.emptySubtext}>
                Tap the edit button to add your first goal!
              </Text>
            </View>
          ) : (
            activeGoals.map((goal) => (
              <GoalItem
                key={goal.id}
                goal={goal}
                onToggleTask={handleToggleTask}
                onUpdateCount={handleUpdateCount}
              />
            ))
          )}
        </View>

        {/* Completed Goals Section */}
        {completedGoals.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Completed Today</Text>
            {completedGoals.map((goal) => (
              <GoalItem
                key={goal.id}
                goal={goal}
                onToggleTask={handleToggleTask}
                onUpdateCount={handleUpdateCount}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: screenHeight * 0.02, // 2% of screen height
    fontSize: screenWidth * 0.04, // 4% of screen width
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: screenWidth * 0.05, // 5% of screen width
    paddingVertical: screenHeight * 0.02, // 2% of screen height
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    // Add extra top padding for devices with notches
    paddingTop: screenHeight * 0.025, // 2.5% of screen height
  },
  title: {
    fontSize: screenWidth * 0.06, // 6% of screen width
    fontWeight: 'bold',
    color: '#333',
  },
  testButton: {
    padding: screenWidth * 0.02, // 2% of screen width
  },
  editButton: {
    padding: screenWidth * 0.02, // 2% of screen width
  },
  scrollView: {
    flex: 1,
  },
  errorContainer: {
    margin: screenWidth * 0.05, // 5% of screen width
    padding: screenHeight * 0.02, // 2% of screen height
    backgroundColor: '#fee',
    borderRadius: 8,
    borderColor: '#fcc',
    borderWidth: 1,
  },
  errorText: {
    color: '#c33',
    textAlign: 'center',
    fontSize: screenWidth * 0.035, // 3.5% of screen width
  },
  section: {
    marginTop: screenHeight * 0.025, // 2.5% of screen height
    paddingHorizontal: screenWidth * 0.05, // 5% of screen width
  },
  sectionTitle: {
    fontSize: screenWidth * 0.045, // 4.5% of screen width
    fontWeight: '600',
    color: '#333',
    marginBottom: screenHeight * 0.015, // 1.5% of screen height
  },
  goalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: screenHeight * 0.02, // 2% of screen height
    marginBottom: screenHeight * 0.01, // 1% of screen height
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  completedGoalItem: {
    backgroundColor: '#f8f9fa',
  },
  goalInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  goalIcon: {
    fontSize: screenWidth * 0.05, // 5% of screen width
    marginRight: screenWidth * 0.03, // 3% of screen width
  },
  goalName: {
    fontSize: screenWidth * 0.04, // 4% of screen width
    fontWeight: '500',
    color: '#333',
    flex: 1,
  },
  completedGoalName: {
    color: '#666',
    textDecorationLine: 'line-through',
  },
  checkboxContainer: {
    padding: screenWidth * 0.01, // 1% of screen width
  },
  incrementalControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: screenWidth * 0.03, // 3% of screen width
  },
  incrementalButton: {
    padding: screenWidth * 0.01, // 1% of screen width
  },
  countText: {
    fontSize: screenWidth * 0.04, // 4% of screen width
    fontWeight: '600',
    color: '#333',
    minWidth: screenWidth * 0.1, // 10% of screen width
    textAlign: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: screenHeight * 0.05, // 5% of screen height
  },
  emptyText: {
    fontSize: screenWidth * 0.045, // 4.5% of screen width
    fontWeight: '500',
    color: '#666',
    marginTop: screenHeight * 0.02, // 2% of screen height
  },
  emptySubtext: {
    fontSize: screenWidth * 0.035, // 3.5% of screen width
    color: '#999',
    marginTop: screenHeight * 0.01, // 1% of screen height
    textAlign: 'center',
  },
});