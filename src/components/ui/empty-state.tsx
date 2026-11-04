import type { SFSymbol } from "expo-symbols";

import { Box } from "./box";
import { Button } from "./button";
import { Icon } from "./icon";
import { Text } from "./text";

type Props = {
  symbol: SFSymbol;
  title: string;
  description: string;
  action?: { label: string; onPress: () => void };
};

/** iOS "content unavailable" view: symbol, title, description and optional action. */
export function EmptyState({ symbol, title, description, action }: Props) {
  return (
    <Box flex={1} center px="xxxl" gap="sm">
      <Icon name={symbol} size={56} color="tertiaryLabel" />
      <Text variant="title2" weight="bold" align="center" style={{ marginTop: 8 }}>
        {title}
      </Text>
      <Text variant="subheadline" color="secondaryLabel" align="center">
        {description}
      </Text>
      {action && (
        <Box style={{ marginTop: 16 }}>
          <Button title={action.label} onPress={action.onPress} />
        </Box>
      )}
    </Box>
  );
}
