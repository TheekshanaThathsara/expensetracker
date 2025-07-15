import { useRouter } from 'expo-router';
import type { Route } from 'expo-router';

type ScreenParams = {
  '/': undefined;
  '/(tabs)': undefined;
  '/(tabs)/add-expense': undefined;
  '/(tabs)/reports': undefined;
  '/(tabs)/explore': undefined;
  '/expense-detail/[id]': { id: string };
};

type ScreenRoutes = keyof ScreenParams;

export function useAppNavigation() {
  const router = useRouter();

  return {
    // Navigate to main tabs
    goToHome: () => router.push('/' as ScreenRoutes),
    goToAddExpense: () => router.push('/(tabs)/add-expense' as ScreenRoutes),
    goToReports: () => router.push('/(tabs)/reports' as ScreenRoutes),
    
    // Navigate to expense detail screen
    goToExpenseDetail: (id: string) => router.push({
      pathname: '/expense-detail/[id]' as ScreenRoutes,
      params: { id }
    }),
    
    // Navigation actions
    goBack: () => router.back(),
    replace: (screen: ScreenRoutes) => router.replace(screen),
  };
}

export default useAppNavigation;
