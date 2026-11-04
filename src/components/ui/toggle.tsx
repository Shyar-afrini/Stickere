import { Switch, type SwitchProps } from "react-native";

import { useTheme } from "@/hooks/use-theme";

/** iOS switch: green track when on. */
export function Toggle(props: SwitchProps) {
  const theme = useTheme();

  return <Switch trackColor={{ true: theme.systemGreen }} {...props} />;
}
