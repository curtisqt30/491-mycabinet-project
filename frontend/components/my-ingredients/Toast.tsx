import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export default function Toast({
  text,
  onUndo,
  containerStyle,
}: {
  text: string;
  onUndo: () => void;
  containerStyle?: any;
}) {
  return (
    <View style={[s.container, containerStyle]}>
      <Text style={s.text} numberOfLines={1}>
        {text}
      </Text>
      <TouchableOpacity onPress={onUndo} style={s.button}>
        <Text style={s.buttonText}>Undo</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#1C1C22',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#32323C',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  text: { color: '#EDEDED', fontSize: 14, flex: 1, marginRight: 12 },
  button: { paddingHorizontal: 8, paddingVertical: 4 },
  buttonText: { color: '#9DB4FF', fontWeight: '700', fontSize: 14 },
});
