// src/navigation/RootNavigator.tsx
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import TodayScreen from '../screens/TodayScreen';

export type RootStackParamList = {
  Today: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="Today"
        component={TodayScreen}
        options={{ title: 'Today' }}
      />
    </Stack.Navigator>
  );
}
