import { Text, View } from 'react-native';

export default function Index() {
  return (
    <View style={{ flex: 1, backgroundColor: '#0B0B0B', alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: '#FFFFFF', fontSize: 24, fontWeight: '700' }}>Muze</Text>
      <Text style={{ color: '#ABABAB', fontSize: 15, marginTop: 8 }}>Phase 0 complete</Text>
    </View>
  );
}
