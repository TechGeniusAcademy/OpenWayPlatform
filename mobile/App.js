import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from './src/context/AuthContext';
import { WebSocketProvider } from './src/context/WebSocketContext';
import Toast from 'react-native-toast-message';

// Screens
import LoginScreen from './src/screens/LoginScreen';
import StudentDashboard from './src/screens/StudentDashboard';
import TeacherDashboard from './src/screens/TeacherDashboard';
import AdminDashboard from './src/screens/AdminDashboard';

const Stack = createStackNavigator();

export default function App() {
  return (
    <AuthProvider>
      <WebSocketProvider>
        <NavigationContainer>
          <StatusBar style="light" />
          <Stack.Navigator
            initialRouteName="Login"
            screenOptions={{
              headerStyle: {
                backgroundColor: '#1a1a2e',
              },
              headerTintColor: '#fff',
              headerTitleStyle: {
                fontWeight: 'bold',
              },
            }}
          >
            <Stack.Screen 
              name="Login" 
              component={LoginScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen 
              name="StudentDashboard" 
              component={StudentDashboard}
              options={{ title: 'OpenWay - Студент', headerLeft: null }}
            />
            <Stack.Screen 
              name="TeacherDashboard" 
              component={TeacherDashboard}
              options={{ title: 'OpenWay - Учитель', headerLeft: null }}
            />
            <Stack.Screen 
              name="AdminDashboard" 
              component={AdminDashboard}
              options={{ title: 'OpenWay - Админ', headerLeft: null }}
            />
          </Stack.Navigator>
          <Toast />
        </NavigationContainer>
      </WebSocketProvider>
    </AuthProvider>
  );
}
