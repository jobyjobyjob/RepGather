const Colors = {
  light: {
    text: "#1C1C1E",
    textSecondary: "#8E8E93",
    background: "#F2F2F7",
    backgroundSecondary: "#FFFFFF",
    tint: "#FF6B35",
    accent: "#FF9F1C",
    success: "#34C759",
    error: "#FF3B30",
    tabIconDefault: "#8E8E93",
    tabIconSelected: "#FF6B35",
    border: "#E5E5EA",
    card: "#FFFFFF",
    progressBackground: "#E5E5EA",
  },
  dark: {
    text: "#FFFFFF",
    textSecondary: "#8E8E93",
    background: "#0D1117",
    backgroundSecondary: "#161B22",
    tint: "#FF6B35",
    accent: "#FF9F1C",
    success: "#30D158",
    error: "#FF453A",
    tabIconDefault: "#8E8E93",
    tabIconSelected: "#FF6B35",
    border: "#30363D",
    card: "#21262D",
    progressBackground: "#30363D",
  },
};

export default Colors;

export function useColors(isDark: boolean) {
  return isDark ? Colors.dark : Colors.light;
}
