import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * Trigger haptic feedback safely across iOS, Android, and Web
 */
export async function triggerHaptic(
  type: 'success' | 'warning' | 'error' | 'light' | 'medium' | 'heavy' = 'medium'
): Promise<void> {
  if (Platform.OS === 'web') return;

  try {
    switch (type) {
      case 'success':
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        break;
      case 'warning':
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        break;
      case 'error':
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        break;
      case 'light':
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        break;
      case 'medium':
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        break;
      case 'heavy':
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        break;
    }
  } catch {
    // Ignore haptic failures on unsupported hardware or simulator
  }
}
