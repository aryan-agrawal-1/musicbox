import { View, Text, Pressable } from 'react-native';
import { Colors } from '@/constants/colors';

interface SectionHeaderProps {
  title: string;
  action?: { label: string; onPress: () => void };
}

export function SectionHeader({ title, action }: SectionHeaderProps) {
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingBottom: 12,
      }}
    >
      <Text style={{ fontSize: 20, fontWeight: '600', color: Colors.textPrimary }}>
        {title}
      </Text>
      {action && (
        <Pressable onPress={action.onPress} hitSlop={8}>
          <Text style={{ fontSize: 14, color: Colors.accent }}>{action.label}</Text>
        </Pressable>
      )}
    </View>
  );
}
