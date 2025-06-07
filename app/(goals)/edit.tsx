// app/(tabs)/goals/edit.tsx

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useGoals } from '../hooks/goalsHook';
import {
  DayOfWeek,
  Goal,
  GoalNotificationFrequency,
  GoalNotificationTimes,
  GoalType,
  generateDefaultNotificationTimes
} from '../types/goals';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const DAYS = [
  { short: 'S', long: 'Sunday', value: 0 as DayOfWeek },
  { short: 'M', long: 'Monday', value: 1 as DayOfWeek },
  { short: 'T', long: 'Tuesday', value: 2 as DayOfWeek },
  { short: 'W', long: 'Wednesday', value: 3 as DayOfWeek },
  { short: 'T', long: 'Thursday', value: 4 as DayOfWeek },
  { short: 'F', long: 'Friday', value: 5 as DayOfWeek },
  { short: 'S', long: 'Saturday', value: 6 as DayOfWeek },
];

const REMINDER_OPTIONS = [
  { label: 'No reminders', value: 0 as GoalNotificationFrequency },
  { label: '1 per day', value: 1 as GoalNotificationFrequency },
  { label: '2 per day', value: 2 as GoalNotificationFrequency },
  { label: '3 per day', value: 3 as GoalNotificationFrequency },
];

// Time picker component
const TimePicker: React.FC<{
  time: GoalNotificationTimes;
  onTimeChange: (time: GoalNotificationTimes) => void;
  onRemove: () => void;
  index: number;
}> = ({ time, onTimeChange, onRemove, index }) => {
  const [showHourPicker, setShowHourPicker] = useState(false);
  const [showMinutePicker, setShowMinutePicker] = useState(false);

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = Array.from({ length: 60 }, (_, i) => i);

  const formatTime = (hour: number, minute: number) => {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minute.toString().padStart(2, '0')} ${period}`;
  };

  return (
    <View style={styles.timePickerContainer}>
      <View style={styles.timePickerHeader}>
        <Text style={styles.timePickerLabel}>Reminder {index + 1}</Text>
        <TouchableOpacity onPress={onRemove} style={styles.removeTimeButton}>
          <Ionicons name="close-circle" size={20} color="#dc3545" />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.timeDisplay}
        onPress={() => setShowHourPicker(true)}
      >
        <Text style={styles.timeText}>
          {formatTime(time.hour, time.minute)}
        </Text>
        <Ionicons name="time-outline" size={20} color="#007AFF" />
      </TouchableOpacity>



      {/* Hour Picker Modal */}
      <Modal visible={showHourPicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.pickerModal}>
            <View style={styles.pickerHeader}>
              <TouchableOpacity onPress={() => setShowHourPicker(false)}>
                <Text style={styles.pickerCancel}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.pickerTitle}>Select Hour</Text>
              <TouchableOpacity onPress={() => setShowMinutePicker(true)}>
                <Text style={styles.pickerNext}>Next</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.pickerList}>
              {hours.map((hour) => (
                <TouchableOpacity
                  key={hour}
                  style={[
                    styles.pickerItem,
                    time.hour === hour && styles.selectedPickerItem,
                  ]}
                  onPress={() => {
                    onTimeChange({ ...time, hour });
                    setShowHourPicker(false);
                    setShowMinutePicker(true);
                  }}
                >
                  <Text
                    style={[
                      styles.pickerItemText,
                      time.hour === hour && styles.selectedPickerItemText,
                    ]}
                  >
                    {hour === 0 ? '12 AM' : hour > 12 ? `${hour - 12} PM` : hour === 12 ? '12 PM' : `${hour} AM`}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Minute Picker Modal */}
      <Modal visible={showMinutePicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.pickerModal}>
            <View style={styles.pickerHeader}>
              <TouchableOpacity onPress={() => setShowMinutePicker(false)}>
                <Text style={styles.pickerCancel}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.pickerTitle}>Select Minutes</Text>
              <TouchableOpacity onPress={() => setShowMinutePicker(false)}>
                <Text style={styles.pickerDone}>Done</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.pickerList}>
              {minutes.map((minute) => (
                <TouchableOpacity
                  key={minute}
                  style={[
                    styles.pickerItem,
                    time.minute === minute && styles.selectedPickerItem,
                  ]}
                  onPress={() => {
                    onTimeChange({ ...time, minute });
                    setShowMinutePicker(false);
                  }}
                >
                  <Text
                    style={[
                      styles.pickerItemText,
                      time.minute === minute && styles.selectedPickerItemText,
                    ]}
                  >
                    :{minute.toString().padStart(2, '0')}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

interface EditGoalFormProps {
  goal?: Goal;
  onSave: (goalData: any) => Promise<void>;
  onCancel: () => void;
  onDelete?: () => Promise<void>;
}

const EditGoalForm: React.FC<EditGoalFormProps> = ({ goal, onSave, onCancel, onDelete }) => {
  const [goalName, setGoalName] = useState(goal?.goal_name || '');
  const [goalType, setGoalType] = useState<GoalType>(goal?.goal_type || 'task');
  const [targetCount, setTargetCount] = useState(goal?.target_count?.toString() || '1');
  const [selectedDays, setSelectedDays] = useState<DayOfWeek[]>(goal?.repeat || [1, 2, 3, 4, 5]);
  const [dailyReminders, setDailyReminders] = useState<GoalNotificationFrequency>(goal?.daily_reminders || 1);
  const [notificationTimes, setNotificationTimes] = useState<GoalNotificationTimes[]>([]);
  const [saving, setSaving] = useState(false);

  // Initialize notification times when component mounts or dailyReminders changes
  useEffect(() => {
    if (goal?.notification_times && goal.notification_times.length === dailyReminders) {
      // Use existing custom times
      setNotificationTimes(goal.notification_times);
    } else {
      // Generate default times for the selected frequency
      const defaultTimes = generateDefaultNotificationTimes(dailyReminders);
      setNotificationTimes(defaultTimes);
    }
  }, [goal, dailyReminders]);

  const toggleDay = (day: DayOfWeek) => {
    setSelectedDays(prev => 
      prev.includes(day) 
        ? prev.filter(d => d !== day)
        : [...prev, day].sort()
    );
  };

  const adjustTargetCount = (delta: number) => {
    const current = parseInt(targetCount) || 1;
    const newValue = Math.max(1, current + delta);
    setTargetCount(newValue.toString());
  };

  const handleReminderFrequencyChange = (frequency: GoalNotificationFrequency) => {
    setDailyReminders(frequency);
    // Generate new default times for the new frequency
    const defaultTimes = generateDefaultNotificationTimes(frequency);
    setNotificationTimes(defaultTimes);
  };

  const updateNotificationTime = (index: number, newTime: GoalNotificationTimes) => {
    const updatedTimes = [...notificationTimes];
    updatedTimes[index] = newTime;
    setNotificationTimes(updatedTimes);
  };

  const removeNotificationTime = (index: number) => {
    if (notificationTimes.length > 1) {
      const updatedTimes = notificationTimes.filter((_, i) => i !== index);
      setNotificationTimes(updatedTimes);
      // Update the frequency to match the new count
      setDailyReminders((updatedTimes.length as GoalNotificationFrequency));
    }
  };

  const addNotificationTime = () => {
    if (notificationTimes.length < 3) {
      const newTime: GoalNotificationTimes = {
        hour: 12,
        minute: 0,
        label: `Reminder ${notificationTimes.length + 1}`,
      };
      const updatedTimes = [...notificationTimes, newTime];
      setNotificationTimes(updatedTimes);
      setDailyReminders((updatedTimes.length as GoalNotificationFrequency));
    }
  };

  const resetToDefaults = () => {
    const defaultTimes = generateDefaultNotificationTimes(dailyReminders);
    setNotificationTimes(defaultTimes);
  };

  const handleSave = async () => {
    if (!goalName.trim()) {
      Alert.alert('Error', 'Goal name is required');
      return;
    }

    if (selectedDays.length === 0) {
      Alert.alert('Error', 'Please select at least one day');
      return;
    }

    if (dailyReminders > 0 && notificationTimes.length !== dailyReminders) {
      Alert.alert('Error', 'Number of notification times must match reminder frequency');
      return;
    }

    setSaving(true);
    try {
      const goalData = {
        goal_name: goalName.trim(),
        goal_type: goalType,
        target_count: goalType === 'incremental' ? parseInt(targetCount) || 1 : undefined,
        repeat: selectedDays,
        daily_reminders: dailyReminders,
        notification_times: dailyReminders > 0 ? notificationTimes : [],
      };

      await onSave(goalData);
    } catch (error) {
      Alert.alert('Error', 'Failed to save goal');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;

    Alert.alert(
      'Delete Goal',
      'Are you sure you want to delete this goal? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await onDelete();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete goal');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.formContainer}>
      {/* Goal Name */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Goal Name</Text>
        <TextInput
          style={styles.textInput}
          value={goalName}
          onChangeText={setGoalName}
          placeholder="Enter goal name..."
          maxLength={50}
        />
      </View>

      {/* Goal Type Switch */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Goal Type</Text>
        <View style={styles.switchContainer}>
          <Text style={[styles.switchLabel, goalType === 'task' && styles.activeSwitchLabel]}>
            Task
          </Text>
          <Switch
            value={goalType === 'incremental'}
            onValueChange={(value) => setGoalType(value ? 'incremental' : 'task')}
            trackColor={{ false: '#ccc', true: '#007AFF' }}
            thumbColor="#fff"
          />
          <Text style={[styles.switchLabel, goalType === 'incremental' && styles.activeSwitchLabel]}>
            Incremental
          </Text>
        </View>
      </View>

      {/* Target Count (for incremental goals) */}
      {goalType === 'incremental' && (
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Daily Target</Text>
          <View style={styles.counterContainer}>
            <TouchableOpacity
              onPress={() => adjustTargetCount(-1)}
              style={styles.counterButton}
            >
              <Ionicons name="remove" size={20} color="#007AFF" />
            </TouchableOpacity>
            <Text style={styles.counterText}>{targetCount}</Text>
            <TouchableOpacity
              onPress={() => adjustTargetCount(1)}
              style={styles.counterButton}
            >
              <Ionicons name="add" size={20} color="#007AFF" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Days Selection */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Reminder Days</Text>
        <View style={styles.daysContainer}>
          {DAYS.map((day) => (
            <TouchableOpacity
              key={day.value}
              onPress={() => toggleDay(day.value)}
              style={[
                styles.dayButton,
                selectedDays.includes(day.value) && styles.activeDayButton,
              ]}
            >
              <Text
                style={[
                  styles.dayText,
                  selectedDays.includes(day.value) && styles.activeDayText,
                ]}
              >
                {day.short}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Reminders Frequency */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Daily Reminders</Text>
        <View style={styles.reminderOptions}>
          {REMINDER_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.value}
              onPress={() => handleReminderFrequencyChange(option.value)}
              style={[
                styles.reminderOption,
                dailyReminders === option.value && styles.activeReminderOption,
              ]}
            >
              <Text
                style={[
                  styles.reminderOptionText,
                  dailyReminders === option.value && styles.activeReminderOptionText,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Custom Notification Times */}
      {dailyReminders > 0 && (
        <View style={styles.inputGroup}>
          <View style={styles.notificationTimesHeader}>
            <Text style={styles.label}>Notification Times</Text>
            <View style={styles.timeActionButtons}>
              <TouchableOpacity onPress={resetToDefaults} style={styles.resetButton}>
                <Text style={styles.resetButtonText}>Reset</Text>
              </TouchableOpacity>
              {notificationTimes.length < 3 && (
                <TouchableOpacity onPress={addNotificationTime} style={styles.addTimeButton}>
                  <Ionicons name="add" size={16} color="#007AFF" />
                  <Text style={styles.addTimeButtonText}>Add</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {notificationTimes.map((time, index) => (
            <TimePicker
              key={index}
              time={time}
              onTimeChange={(newTime) => updateNotificationTime(index, newTime)}
              onRemove={() => removeNotificationTime(index)}
              index={index}
            />
          ))}
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          onPress={onCancel}
          style={[styles.button, styles.cancelButton]}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleSave}
          style={[styles.button, styles.saveButton]}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Text style={styles.saveButtonText}>
              {goal ? 'Update' : 'Create'}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Delete Button (for existing goals) */}
      {goal && onDelete && (
        <TouchableOpacity
          onPress={handleDelete}
          style={[styles.button, styles.deleteButton]}
        >
          <Text style={styles.deleteButtonText}>Delete Goal</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

export default function GoalsEditScreen() {
  const router = useRouter();
  const { goals, createGoal, updateGoal, deleteGoal, loading } = useGoals();
  const [expandedGoal, setExpandedGoal] = useState<string | null>(null);
  const [showNewGoalForm, setShowNewGoalForm] = useState(false);

  const handleCreateGoal = async (goalData: any) => {
    await createGoal(goalData);
    setShowNewGoalForm(false);
  };

  const handleUpdateGoal = async (goalId: string, goalData: any) => {
    await updateGoal(goalId, goalData);
    setExpandedGoal(null);
  };

  const handleDeleteGoal = async (goalId: string) => {
    await deleteGoal(goalId);
    setExpandedGoal(null);
  };

  const toggleGoalExpansion = (goalId: string) => {
    setExpandedGoal(expandedGoal === goalId ? null : goalId);
  };

  if (loading) {
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
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace("/(tabs)/goals")} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Edit Goals</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView}>
        {/* Add New Goal Button */}
        <TouchableOpacity
          onPress={() => setShowNewGoalForm(true)}
          style={styles.addButton}
        >
          <Ionicons name="add-circle-outline" size={24} color="#007AFF" />
          <Text style={styles.addButtonText}>Add New Goal</Text>
        </TouchableOpacity>

        {/* New Goal Form */}
        {showNewGoalForm && (
          <View style={styles.formWrapper}>
            <EditGoalForm
              onSave={handleCreateGoal}
              onCancel={() => setShowNewGoalForm(false)}
            />
          </View>
        )}

        {/* Existing Goals List */}
        <View style={styles.goalsSection}>
          <Text style={styles.sectionTitle}>Existing Goals</Text>
          {goals.length === 0 ? (
            <Text style={styles.emptyText}>No goals created yet</Text>
          ) : (
            goals.map((goal) => (
              <View key={goal.id} style={styles.goalContainer}>
                <TouchableOpacity
                  onPress={() => toggleGoalExpansion(goal.id)}
                  style={styles.goalHeader}
                >
                  <View style={styles.goalHeaderLeft}>
                    {goal.icon && <Text style={styles.goalIcon}>{goal.icon}</Text>}
                    <Text style={styles.goalName}>{goal.goal_name}</Text>
                  </View>
                  <Ionicons
                    name={expandedGoal === goal.id ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color="#666"
                  />
                </TouchableOpacity>

                {expandedGoal === goal.id && (
                  <EditGoalForm
                    goal={goal}
                    onSave={(goalData) => handleUpdateGoal(goal.id, goalData)}
                    onCancel={() => setExpandedGoal(null)}
                    onDelete={() => handleDeleteGoal(goal.id)}
                  />
                )}
              </View>
            ))
          )}
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: screenHeight * 0.02,
    fontSize: screenWidth * 0.04,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: screenWidth * 0.05,
    paddingVertical: screenHeight * 0.02,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingTop: screenHeight * 0.025,
  },
  backButton: {
    padding: screenWidth * 0.01,
  },
  title: {
    fontSize: screenWidth * 0.05,
    fontWeight: '600',
    color: '#333',
  },
  placeholder: {
    width: screenWidth * 0.08,
  },
  scrollView: {
    flex: 1,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    margin: 20,
    padding: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  addButtonText: {
    marginLeft: 12,
    fontSize: 16,
    fontWeight: '500',
    color: '#007AFF',
  },
  formWrapper: {
    backgroundColor: 'white',
    margin: 20,
    marginTop: 0,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  goalsSection: {
    margin: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
  },
  goalContainer: {
    backgroundColor: 'white',
    borderRadius: 8,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  goalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  goalIcon: {
    fontSize: 18,
    marginRight: 12,
  },
  goalName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    flex: 1,
  },
  formContainer: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fafafa',
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  switchLabel: {
    fontSize: 16,
    color: '#666',
  },
  activeSwitchLabel: {
    color: '#007AFF',
    fontWeight: '500',
  },
  counterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  counterButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  counterText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    minWidth: 40,
    textAlign: 'center',
  },
  daysContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeDayButton: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  dayText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  activeDayText: {
    color: 'white',
  },
  reminderOptions: {
    gap: 8,
  },
  reminderOption: {
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fafafa',
  },
  activeReminderOption: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  reminderOptionText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  activeReminderOptionText: {
    color: 'white',
    fontWeight: '500',
  },
  notificationTimesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  timeActionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  resetButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#666',
  },
  resetButtonText: {
    fontSize: 12,
    color: '#666',
  },
  addTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#007AFF',
    gap: 4,
  },
  addTimeButtonText: {
    fontSize: 12,
    color: '#007AFF',
  },
  timePickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fafafa',
    marginBottom: 8,
  },
  timePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  timePickerLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  removeTimeButton: {
    padding: 4,
  },
  timeDisplay: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 12,
    marginBottom: 8,
  },
  timeText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  pickerModal: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: screenHeight * 0.6,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  pickerCancel: {
    fontSize: 16,
    color: '#666',
  },
  pickerNext: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
  pickerDone: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  pickerList: {
    maxHeight: screenHeight * 0.4,
  },
  pickerItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  selectedPickerItem: {
    backgroundColor: '#f0f8ff',
  },
  pickerItemText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
  },
  selectedPickerItemText: {
    color: '#007AFF',
    fontWeight: '600',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  button: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '500',
  },
  saveButton: {
    backgroundColor: '#28a745',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: '#dc3545',
    marginTop: 12,
  },
  deleteButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  }
});