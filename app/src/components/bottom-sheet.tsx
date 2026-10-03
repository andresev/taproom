import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/use-theme';
import { Radius, Spacing } from '@/theme';

type Props = {
  visible: boolean;
  /** Called when the user taps outside the sheet or uses the system back gesture. */
  onClose: () => void;
  children: React.ReactNode;
};

/**
 * A sheet that rises from the bottom over a dimmed screen: the buy and sell
 * review. Flat, with a hairline at its top edge; it scrolls if its content is
 * taller than the screen and moves above the keyboard.
 */
export function BottomSheet({ visible, onClose, children }: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.fill}>
        <Pressable
          style={[styles.fill, { backgroundColor: theme.scrim }]}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close"
        />
        <View style={[styles.sheet, { backgroundColor: theme.card, borderColor: theme.border, paddingBottom: insets.bottom + Spacing.three }]}>
          <View style={[styles.grabber, { backgroundColor: theme.border }]} />
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  sheet: {
    maxHeight: '88%',
    borderTopLeftRadius: Radius.card,
    borderTopRightRadius: Radius.card,
    borderTopWidth: 1,
    paddingTop: Spacing.twoHalf - 2,
  },
  grabber: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    marginBottom: Spacing.twoHalf,
  },
  content: {
    paddingHorizontal: Spacing.three,
    gap: Spacing.two,
  },
});
