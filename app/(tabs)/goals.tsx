// Example Goals Screen
import React, { useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useGoals } from '../hooks/goalsHook';
import { Goal, GoalType } from '../types/goals';

export default function GoalsScreen() {
  const { userProfile } = useAuth();
  const {
    goals,
    todaysLogs,
    weeklyLeaderboard,
    userRank,
    todaysCompletedGoals,
    todaysTotalActions,
    weeklyStats,
    loading,
    createGoal,
    completeReminder,
    incrementCounter,
  } = useGoals(true); // Real-time updates

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalType, setNewGoalType] = useState<GoalType>('reminder');
  const [newGoalTarget, setNewGoalTarget] = useState('8');
  const [newGoalIcon, setNewGoalIcon] = useState('💧');

  const handleCreateGoal = async () => {
    if (!newGoalTitle.trim()) {
      Alert.alert('Error', 'Please enter a goal title');
      return;
    }

    try {
      await createGoal({
        title: newGoalTitle.trim(),
        type: newGoalType,
        status: 'active',
        daily_target: newGoalType === 'counter' ? parseInt(newGoalTarget) : null,
        icon: newGoalIcon,
        reminder_time: '09:00',
      });

      setNewGoalTitle('');
      setNewGoalTarget('8');
      setNewGoalIcon('💧');
      setShowCreateModal(false);
      Alert.alert('Success', 'Goal created!');
    } catch (error) {
      console.error('Error creating goal:', error);
      Alert.alert('Error', 'Failed to create goal');
    }
  };

  const handleGoalAction = async (goal: Goal) => {
    try {
      if (goal.type === 'reminder') {
        if (goal.current_count >= 1) {
          Alert.alert('Already Done', 'You\'ve already completed this reminder today!');
          return;
        }
        await completeReminder(goal.id);
        Alert.alert('✅ Complete!', `"${goal.title}" marked as done!`);
      } else {
        // Counter goal
        await incrementCounter(goal.id, 1);
        const newTotal = goal.current_count + 1;
        const target = goal.daily_target || 1;
        
        if (newTotal >= target) {
          Alert.alert('🎉 Goal Reached!', `Great job! You've reached your daily target for "${goal.title}"`);
        } else {
          Alert.alert('Progress!', `${newTotal}/${target} ${goal.title}`);
        }
      }
    } catch (error) {
      console.error('Error updating goal:', error);
      Alert.alert('Error', 'Failed to update goal');
    }
  };

  const getGoalProgress = (goal: Goal) => {
    if (goal.type === 'reminder') {
      return goal.current_count >= 1 ? 'Complete ✅' : 'Pending';
    } else {
      const target = goal.daily_target || 1;
      return `${goal.current_count}/${target}`;
    }
  };

  const getGoalColor = (goal: Goal) => {
    if (goal.type === 'reminder') {
      return goal.current_count >= 1 ? '#28a745' : '#6c757d';
    } else {
      const target = goal.daily_target || 1;
      return goal.current_count >= target ? '#28a745' : '#007AFF';
    }
  };

  const renderGoal = ({ item: goal }: { item: Goal }) => (
    <View style={styles.goalItem}>
      <View style={styles.goalHeader}>
        <View style={styles.goalInfo}>
          <Text style={styles.goalIcon}>{goal.icon}</Text>
          <View style={styles.goalText}>
            <Text style={styles.goalTitle}>{goal.title}</Text>
            <Text style={[styles.goalProgress, { color: getGoalColor(goal) }]}>
              {getGoalProgress(goal)}
            </Text>
          </View>
        </View>
        
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: getGoalColor(goal) }]}
          onPress={() => handleGoalAction(goal)}
          disabled={goal.type === 'reminder' && goal.current_count >= 1}
        >
          <Text style={styles.actionButtonText}>
            {goal.type === 'reminder' ? 
              (goal.current_count >= 1 ? '✓' : 'Done') : 
              '+1'
            }
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <Text>Loading your goals...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header with user info */}
      {userProfile && (
        <View style={styles.header}>
          <Text style={styles.welcomeText}>Hi, {userProfile.display_name}! 👋</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{todaysCompletedGoals}</Text>
              <Text style={styles.statLabel}>Goals Today</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{weeklyStats.goalsCompleted}</Text>
              <Text style={styles.statLabel}>This Week</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{userProfile.total_goals_completed}</Text>
              <Text style={styles.statLabel}>All Time</Text>
            </View>
          </View>
        </View>
      )}

      {/* Quick Stats */}
      <View style={styles.quickStatsContainer}>
        <Text style={styles.sectionTitle}>Today's Progress</Text>
        <View style={styles.quickStatsRow}>
          <View style={styles.quickStat}>
            <Text style={styles.quickStatNumber}>{todaysCompletedGoals}</Text>
            <Text style={styles.quickStatLabel}>Goals Completed</Text>
          </View>
          <View style={styles.quickStat}>
            <Text style={styles.quickStatNumber}>{todaysTotalActions}</Text>
            <Text style={styles.quickStatLabel}>Total Actions</Text>
          </View>
          {userRank && (
            <View style={styles.quickStat}>
              <Text style={styles.quickStatNumber}>#{userRank.rank}</Text>
              <Text style={styles.quickStatLabel}>Weekly Rank</Text>
            </View>
          )}
        </View>
      </View>

      {/* Goals List */}
      <View style={styles.goalsContainer}>
        <View style={styles.goalsHeader}>
          <Text style={styles.sectionTitle}>Your Goals</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowCreateModal(true)}
          >
            <Text style={styles.addButtonText}>+ Add Goal</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={goals}
          keyExtractor={(item) => item.id}
          renderItem={renderGoal}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No goals yet!</Text>
              <Text style={styles.emptySubtext}>Create your first goal to get started</Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      </View>

      {/* Leaderboard Preview */}
      {weeklyLeaderboard && weeklyLeaderboard.entries.length > 0 && (
        <View style={styles.leaderboardContainer}>
          <Text style={styles.sectionTitle}>Weekly Leaderboard</Text>
          {weeklyLeaderboard.entries.slice(0, 3).map((entry, index) => (
            <View key={entry.user_id} style={styles.leaderboardItem}>
              <Text style={styles.leaderboardRank}>#{entry.rank}</Text>
              <Text style={styles.leaderboardName}>{entry.display_name}</Text>
              <Text style={styles.leaderboardScore}>{entry.score} pts</Text>
            </View>
          ))}
        </View>
      )}

      {/* Create Goal Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowCreateModal(false)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Create Goal</Text>
            <TouchableOpacity onPress={handleCreateGoal}>
              <Text style={styles.modalSave}>Save</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <Text style={styles.inputLabel}>Goal Title</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Drink water, Take a walk"
              value={newGoalTitle}
              onChangeText={setNewGoalTitle}
              autoFocus
            />

            <Text style={styles.inputLabel}>Icon</Text>
            <View style={styles.iconRow}>
              {['💧', '🚶', '📚', '🧘', '💪', '🥗'].map(icon => (
                <TouchableOpacity
                  key={icon}
                  style={[
                    styles.iconButton,
                    newGoalIcon === icon && styles.iconButtonSelected
                  ]}
                  onPress={() => setNewGoalIcon(icon)}
                >
                  <Text style={styles.iconText}>{icon}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>Goal Type</Text>
            <View style={styles.typeRow}>
              <TouchableOpacity
                style={[
                  styles.typeButton,
                  newGoalType === 'reminder' && styles.typeButtonSelected
                ]}
                onPress={() => setNewGoalType('reminder')}
              >
                <Text style={[
                  styles.typeButtonText,
                  newGoalType === 'reminder' && styles.typeButtonTextSelected
                ]}>
                  Simple Reminder
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.typeButton,
                  newGoalType === 'counter' && styles.typeButtonSelected
                ]}
                onPress={() => setNewGoalType('counter')}
              >
                <Text style={[
                  styles.typeButtonText,
                  newGoalType === 'counter' && styles.typeButtonTextSelected
                ]}>
                  Daily Counter
                </Text>
              </TouchableOpacity>
            </View>

            {newGoalType === 'counter' && (
              <>
                <Text style={styles.inputLabel}>Daily Target</Text>
                <TextInput
                  style={styles.input}
                  placeholder="8"
                  value={newGoalTarget}
                  onChangeText={setNewGoalTarget}
                  keyboardType="number-pad"
                />
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
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
  },
  header: {
    backgroundColor: 'white',
    padding: 20,
    paddingTop: 60,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  quickStatsContainer: {
    backgroundColor: 'white',
    margin: 16,
    padding: 16,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  quickStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  quickStat: {
    alignItems: 'center',
  },
  quickStatNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#28a745',
  },
  quickStatLabel: {
    fontSize: 11,
    color: '#666',
    marginTop: 4,
  },
  goalsContainer: {
    flex: 1,
    margin: 16,
    marginTop: 0,
  },
  goalsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  addButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  goalItem: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  goalInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  goalIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  goalText: {
    flex: 1,
  },
  goalTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  goalProgress: {
    fontSize: 14,
    fontWeight: '500',
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  actionButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
  leaderboardContainer: {
    backgroundColor: 'white',
    margin: 16,
    padding: 16,
    borderRadius: 12,
  },
  leaderboardItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  leaderboardRank: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#007AFF',
    width: 40,
  },
  leaderboardName: {
    fontSize: 14,
    flex: 1,
  },
  leaderboardScore: {
    fontSize: 14,
    fontWeight: '600',
    color: '#28a745',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalCancel: {
    fontSize: 16,
    color: '#666',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalSave: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  modalContent: {
    padding: 16,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
  },
  iconRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  iconButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconButtonSelected: {
    backgroundColor: '#007AFF',
  },
  iconText: {
    fontSize: 24,
  },
  typeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  typeButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  typeButtonSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  typeButtonTextSelected: {
    color: 'white',
  },
});