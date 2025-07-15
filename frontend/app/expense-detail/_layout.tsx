import { Stack } from 'expo-router';

export default function ExpenseDetailLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="[id]"
        options={{
          title: 'Edit Expense',
          headerShown: true
        }}
      />
    </Stack>
  );
}
