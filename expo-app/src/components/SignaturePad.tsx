import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, GestureResponderEvent, Alert } from 'react-native';
import Svg, { Path } from 'react-native-svg';

interface Point {
  x: number;
  y: number;
}

interface SignaturePadProps {
  onSave: (svgString: string) => void;
  onCancel: () => void;
}

export default function SignaturePad({ onSave, onCancel }: SignaturePadProps) {
  const [currentPath, setCurrentPath] = useState<Point[]>([]);
  const [paths, setPaths] = useState<Point[][]>([]);

  const handleTouchStart = (event: GestureResponderEvent) => {
    const { locationX, locationY } = event.nativeEvent;
    setCurrentPath([{ x: locationX, y: locationY }]);
  };

  const handleTouchMove = (event: GestureResponderEvent) => {
    const { locationX, locationY } = event.nativeEvent;
    setCurrentPath(prev => [...prev, { x: locationX, y: locationY }]);
  };

  const handleTouchEnd = () => {
    if (currentPath.length > 0) {
      setPaths(prev => [...prev, currentPath]);
      setCurrentPath([]);
    }
  };

  const handleClear = () => {
    setPaths([]);
    setCurrentPath([]);
  };

  const getSvgPathString = (points: Point[]): string => {
    if (points.length === 0) return '';
    return points.reduce((acc, point, index) => {
      if (index === 0) {
        return `M ${point.x.toFixed(1)} ${point.y.toFixed(1)}`;
      }
      return `${acc} L ${point.x.toFixed(1)} ${point.y.toFixed(1)}`;
    }, '');
  };

  const handleSave = () => {
    if (paths.length === 0) {
      Alert.alert('Erro', 'Por favor, faça a assinatura antes de salvar.');
      return;
    }

    const pathsMarkup = paths
      .map(path => `<path d="${getSvgPathString(path)}" fill="none" stroke="black" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />`)
      .join('\n');
    
    const svgString = `<svg viewBox="0 0 300 150" width="300" height="150" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="none" />
      ${pathsMarkup}
    </svg>`;

    onSave(svgString);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>ASSINATURA DO CLIENTE</Text>
      <Text style={styles.subtitle}>Desenhe a assinatura dentro do quadro abaixo</Text>
      
      <View 
        style={styles.canvasContainer}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <Svg style={styles.canvas} viewBox="0 0 300 150">
          {paths.map((path, idx) => (
            <Path
              key={idx}
              d={getSvgPathString(path)}
              fill="none"
              stroke="#fff"
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
          {currentPath.length > 0 && (
            <Path
              d={getSvgPathString(currentPath)}
              fill="none"
              stroke="#3b66ff"
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
        </Svg>
      </View>
      
      <View style={styles.buttonRow}>
        <TouchableOpacity style={[styles.button, styles.cancelBtn]} onPress={onCancel}>
          <Text style={styles.cancelBtnText}>Voltar</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={[styles.button, styles.clearBtn]} onPress={handleClear}>
          <Text style={styles.clearBtnText}>Limpar</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={[styles.button, styles.saveBtn]} onPress={handleSave}>
          <Text style={styles.saveBtnText}>Confirmar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0f1115',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginVertical: 10,
  },
  title: {
    fontSize: 10,
    fontWeight: '900',
    color: '#94a3b8',
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 8,
    color: '#475569',
    marginTop: 2,
    marginBottom: 12,
  },
  canvasContainer: {
    width: '100%',
    height: 150,
    backgroundColor: '#0a0c10',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1e293b',
    overflow: 'hidden',
  },
  canvas: {
    flex: 1,
  },
  buttonRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 14,
  },
  button: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: {
    backgroundColor: '#1e293b',
  },
  cancelBtnText: {
    color: '#cbd5e1',
    fontSize: 10,
    fontWeight: 'bold',
  },
  clearBtn: {
    backgroundColor: '#0a0c10',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  clearBtnText: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: 'bold',
  },
  saveBtn: {
    backgroundColor: '#3b66ff',
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
});
