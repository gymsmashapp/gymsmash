import React from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  Pressable,
  SafeAreaView,
} from 'react-native';

type Exercise = {
  name: string;
  sets: number;
  reps: string;
};

const todayWorkout = {
  name: 'Push Day A',
  focus: 'Chest • Shoulders • Triceps',
  durationMinutes: 55,
  exercises: [
    { name: 'Barbell Bench Press', sets: 4, reps: '6–8' },
    { name: 'Incline Dumbbell Press', sets: 3, reps: '8–10' },
    { name: 'Seated Shoulder Press', sets: 3, reps: '8–10' },
    { name: 'Cable Tricep Pushdown', sets: 3, reps: '10–12' },
  ] as Exercise[],
};

const buddyStatus = {
  name: 'Alex',
  isTraining: true,
  lastActiveMinutes: 8,
};

export default function TodayScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
      >
        {/* Header / greeting */}
        <View style={styles.header}>
          <Text style={styles.smallLabel}>TODAY</Text>
          <Text style={styles.greeting}>Let&apos;s smash it 💥</Text>
          <Text style={styles.subGreeting}>
            Here&apos;s your Gym Smash game plan for today.
          </Text>
        </View>

        {/* Today’s workout card */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Today&apos;s workout</Text>
          <Text style={styles.workoutName}>{todayWorkout.name}</Text>
          <Text style={styles.workoutFocus}>{todayWorkout.focus}</Text>
          <Text style={styles.workoutMeta}>
            ~{todayWorkout.durationMinutes} mins • {todayWorkout.exercises.length} exercises
          </Text>

          <View style={styles.exerciseList}>
            {todayWorkout.exercises.map((exercise, index) => (
              <View key={exercise.name} style={styles.exerciseRow}>
                <View style={styles.exerciseBullet} />
                <View style={styles.exerciseTextWrapper}>
                  <Text style={styles.exerciseName}>{exercise.name}</Text>
                  <Text style={styles.exerciseMeta}>
                    {exercise.sets} sets • {exercise.reps} reps
                  </Text>
                </View>
                <Text style={styles.exerciseIndex}>{index + 1}</Text>
              </View>
            ))}
          </View>

          <Pressable style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Start workout</Text>
          </Pressable>
        </View>

        {/* Buddy / accountability card */}
        <View style={[styles.card, styles.buddyCard]}>
          <Text style={styles.cardLabel}>Workout buddy</Text>
          <Text style={styles.buddyTitle}>
            {buddyStatus.isTraining
              ? `${buddyStatus.name} is training now 🏋️`
              : `${buddyStatus.name} is offline`}
          </Text>
          <Text style={styles.buddyText}>
            {buddyStatus.isTraining
              ? `They started ${buddyStatus.lastActiveMinutes} mins ago. Smash it together.`
              : 'No live session right now. Schedule a session and keep each other accountable.'}
          </Text>

          <View style={styles.buddyActions}>
            <Pressable style={[styles.secondaryButton, styles.buddyButton]}>
              <Text style={styles.secondaryButtonText}>Send sticker</Text>
            </Pressable>
            <Pressable style={[styles.secondaryButton, styles.buddyButton]}>
              <Text style={styles.secondaryButtonText}>View history</Text>
            </Pressable>
          </View>
        </View>

        {/* Quick stats row */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Streak</Text>
            <Text style={styles.statValue}>4 days</Text>
            <Text style={styles.statHint}>Keep it going</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statLabel}>This week</Text>
            <Text style={styles.statValue}>3 / 5</Text>
            <Text style={styles.statHint}>Workouts done</Text>
          </View>
        </View>

        <View style={styles.footerSpace} />
      </ScrollView>
    </SafeAreaView>
  );
}

const GS_RED = '#C8102E';

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#050509',
  },
  container: {
    flex: 1,
    backgroundColor: '#050509',
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  header: {
    marginBottom: 16,
  },
  smallLabel: {
    color: '#999',
    fontSize: 12,
    letterSpacing: 2,
    marginBottom: 4,
  },
  greeting: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  subGreeting: {
    color: '#b3b3b3',
    fontSize: 14,
  },
  card: {
    backgroundColor: '#12121a',
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  cardLabel: {
    color: GS_RED,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  workoutName: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 2,
  },
  workoutFocus: {
    color: '#d0d0d0',
    fontSize: 14,
    marginBottom: 4,
  },
  workoutMeta: {
    color: '#888',
    fontSize: 12,
    marginBottom: 12,
  },
  exerciseList: {
    marginBottom: 16,
  },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  exerciseBullet: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: GS_RED,
    marginRight: 8,
  },
  exerciseTextWrapper: {
    flex: 1,
  },
  exerciseName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  exerciseMeta: {
    color: '#aaa',
    fontSize: 12,
  },
  exerciseIndex: {
    color: '#555',
    fontSize: 12,
    marginLeft: 8,
  },
  primaryButton: {
    backgroundColor: GS_RED,
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  buddyCard: {
    borderWidth: 1,
    borderColor: '#262637',
  },
  buddyTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 4,
    marginBottom: 4,
  },
  buddyText: {
    color: '#c0c0c0',
    fontSize: 13,
    marginBottom: 12,
  },
  buddyActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  buddyButton: {
    flex: 1,
    marginRight: 8,
  },
  secondaryButton: {
    borderRadius: 999,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: GS_RED,
  },
  secondaryButtonText: {
    color: GS_RED,
    fontSize: 13,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#12121a',
    borderRadius: 12,
    padding: 12,
    marginRight: 8,
  },
  statLabel: {
    color: '#999',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  statValue: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  statHint: {
    color: '#aaa',
    fontSize: 11,
    marginTop: 2,
  },
  footerSpace: {
    height: 16,
  },
});
